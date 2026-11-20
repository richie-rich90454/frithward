import { describe, expect, it } from "vitest";
import {
    ProvenanceController,
    sha256Hex,
    type EmbeddedManifestExtractor,
    type FileLike,
} from "./ProvenanceController";

function fileOf(name: string, content: string | Uint8Array): FileLike {
    const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return { name, arrayBuffer: async () => buffer };
}

describe("ProvenanceController file input", () => {
    it("hashes bytes with SHA-256", async () => {
        expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        );
    });

    it("reads claimed signature details from a manifest JSON file", async () => {
        const controller = new ProvenanceController();
        const json = JSON.stringify({
            claimGenerator: "Test/1.0",
            signature: {
                alg: "ES256",
                issuer: "Signer A",
                time: "2026-01-01T00:00:00Z",
            },
            assertions: [{ label: "c2pa.hash.data" }, { label: "c2pa.actions" }],
        });
        await controller.verifyFile(fileOf("manifest.json", json));

        const result = controller.getResult();
        expect(controller.getError()).toBeNull();
        expect(result?.source).toBe("json-file");
        expect(result?.fileName).toBe("manifest.json");
        expect(result?.sha256).toBe(await sha256Hex(new TextEncoder().encode(json)));
        expect(result?.signatureStatus).toBe("valid");
        expect(result?.summary).toContain("claims a valid signature");
        expect(result?.signer).toBe("Signer A");
        expect(result?.timestamp).toBe("2026-01-01T00:00:00Z");
        expect(result?.assertions.map((assertion) => assertion.label)).toEqual([
            "c2pa.hash.data",
            "c2pa.actions",
        ]);
    });

    it("rejects an invalid manifest JSON file and clears prior output", async () => {
        const controller = new ProvenanceController();
        controller.verify(JSON.stringify({ signature: { alg: "ES256", issuer: "A" } }));
        await controller.verifyFile(fileOf("bad.json", "not json"));

        expect(controller.getError()).toContain("not valid JSON");
        expect(controller.getResult()).toBeNull();
    });

    it("reports a missing embedded manifest for media bytes", async () => {
        const extractor: EmbeddedManifestExtractor = {
            async extract() {
                return { kind: "missing" };
            },
        };
        const controller = new ProvenanceController(extractor);
        const bytes = new TextEncoder().encode("image bytes");
        await controller.verifyFile(fileOf("photo.jpg", bytes));

        const result = controller.getResult();
        expect(controller.getError()).toBeNull();
        expect(result?.source).toBe("binary-file");
        expect(result?.sha256).toBe(await sha256Hex(bytes));
        expect(result?.signatureStatus).toBe("missing");
        expect(result?.summary).toContain("No embedded C2PA manifest was found");
        expect(result?.summary).toContain("no signature was checked");
        expect(result?.limitations.length).toBeGreaterThan(0);
    });

    it("never claims a valid signature when extraction is unavailable", async () => {
        const controller = new ProvenanceController();
        await controller.verifyFile(fileOf("clip.mp4", "video bytes"));

        const result = controller.getResult();
        expect(result?.signatureStatus).toBe("unverified");
        expect(result?.signatureStatus).not.toBe("valid");
        expect(result?.summary).toContain("cryptographic verification are unavailable");
        expect(result?.limitations.at(-1)).toContain("@contentauth/c2pa-node");
    });

    it("reads an injected extractor's manifest as claims only", async () => {
        const extractor: EmbeddedManifestExtractor = {
            async extract() {
                return {
                    kind: "found",
                    manifest: {
                        signature: { alg: "ES256", issuer: "Embedded Signer" },
                        assertions: [{ label: "c2pa.actions" }],
                    },
                };
            },
        };
        const controller = new ProvenanceController(extractor);
        await controller.verifyFile(fileOf("photo.png", "bytes"));

        const result = controller.getResult();
        expect(result?.summary).toContain("claims a valid signature");
        expect(result?.signer).toBe("Embedded Signer");
        expect(result?.limitations.at(-1)).toContain("not cryptographically verified");
    });

    it("reports an unreadable file as an error", async () => {
        const controller = new ProvenanceController();
        await controller.verifyFile({
            name: "locked.png",
            arrayBuffer: async () => {
                throw new Error("blocked");
            },
        });

        expect(controller.getError()).toContain("could not be read");
        expect(controller.getResult()).toBeNull();
    });

    it("keeps the paste-JSON path working", () => {
        const controller = new ProvenanceController();
        controller.verify(
            JSON.stringify({ signature: { alg: "ES256", issuer: "A", time: "2026-01-01" } }),
        );

        expect(controller.getResult()?.source).toBe("paste");
        expect(controller.getResult()?.sha256).toBeNull();
        expect(controller.getResult()?.signer).toBe("A");
    });
});
