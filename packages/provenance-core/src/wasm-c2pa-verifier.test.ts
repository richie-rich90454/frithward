import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createWasmC2paVerifier, detectC2paFormat } from "./infrastructure/WasmC2paVerifier.js";

const wasm = readFile(new URL(import.meta.resolve("@contentauth/c2pa-wasm/assets/c2pa_bg.wasm")));

async function fixture(name: string): Promise<Uint8Array> {
    return new Uint8Array(await readFile(new URL(`./fixtures/${name}`, import.meta.url)));
}

describe("WasmC2paVerifier (real @contentauth/c2pa-wasm SDK)", () => {
    it("verifies a signed JPEG from the official c2pa-rs test fixtures", async () => {
        const verifier = createWasmC2paVerifier(wasm);
        const result = await verifier.verify(await fixture("c2pa-signed-c.jpg"));

        expect(verifier.isAvailable()).toBe(true);
        // The SDK validated the claim signature, assertion hashes and timestamp, but its
        // test certificate is not trusted. The adapter must surface that, never "valid".
        expect(result.signatureStatus).toBe("invalid");
        expect(result.signer).toBe("C2PA Signer");
        expect(result.timestamp).toBe("2024-08-06T21:53:37+00:00");
        expect(result.assertions.map((assertion) => assertion.label)).toContain("c2pa.actions.v2");
        expect(result.validationFailures.map((failure) => failure.code)).toContain(
            "signingCredential.untrusted",
        );
        expect(result.limitations.join(" ")).toContain("trust depends on the configured trust settings");
    });

    it("returns an explicit error state, never valid, for bytes the SDK cannot parse", async () => {
        const verifier = createWasmC2paVerifier(wasm);
        const result = await verifier.verify(new Uint8Array([1, 2, 3, 4, 5]));

        expect(result.signatureStatus).not.toBe("valid");
        expect(result.signatureStatus).toBe("unverified");
        expect(result.validationFailures[0]?.code).toBe("sdk.error");
        expect(result.validationFailures[0]?.message).toContain("C2PA WASM SDK could not read this asset");
        expect(result.limitations.join(" ")).toContain("Signature was NOT verified");
    });

    it("reports a missing manifest for a real JPEG with no embedded C2PA data", async () => {
        const verifier = createWasmC2paVerifier(wasm);
        const result = await verifier.verify(await fixture("no-manifest.jpg"));

        expect(result.signatureStatus).toBe("missing");
        expect(result.validationFailures).toEqual([]);
        expect(result.limitations.join(" ")).toContain("No embedded C2PA manifest");
    });

    it("detects asset formats from magic bytes", () => {
        const webp = new Uint8Array(12);
        webp.set([0x52, 0x49, 0x46, 0x46], 0);
        webp.set([0x57, 0x45, 0x42, 0x50], 8);
        const mp4 = new Uint8Array(12);
        mp4.set([0x66, 0x74, 0x79, 0x70], 4);

        expect(detectC2paFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
        expect(detectC2paFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
        expect(detectC2paFormat(webp)).toBe("image/webp");
        expect(detectC2paFormat(mp4)).toBe("video/mp4");
        expect(detectC2paFormat(new Uint8Array([1, 2, 3]))).toBe("");
    });
});
