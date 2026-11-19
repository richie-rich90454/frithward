import type { Reader } from "@contentauth/c2pa-node";
import { describe, expect, it } from "vitest";
import { C2paInspectionUseCase } from "@frithward/provenance-core";
import type { C2paVerificationPort } from "@frithward/provenance-core";
import { C2paSdkAdapter, C2paSdkUnavailableError } from "./infrastructure/C2paSdkAdapter.js";

function readerReturning(store: unknown): Reader {
    return { json: () => store } as unknown as Reader;
}

const verifiedStore = {
    active_manifest: "urn:uuid:claim",
    validation_state: "Valid",
    manifests: {
        "urn:uuid:claim": {
            signature_info: {
                common_name: "Camera Manufacturer",
                issuer: "Example CA",
                time: "2026-02-01T10:00:00Z",
            },
            assertions: [
                { label: "c2pa.actions", data: {} },
                { label: "c2pa.hash.data", data: { hash: "abc" } },
            ],
        },
    },
    validation_status: [{ code: "claimSignature.validated", success: true }],
};

describe("C2paSdkAdapter", () => {
    it("reads signature status, signer, timestamp and assertions from a verified manifest", async () => {
        const adapter = new C2paSdkAdapter(async () => readerReturning(verifiedStore));
        const result = await adapter.verify(new Uint8Array([1, 2, 3]));

        expect(result.signatureStatus).toBe("valid");
        expect(result.signer).toBe("Camera Manufacturer");
        expect(result.timestamp).toBe("2026-02-01T10:00:00Z");
        expect(result.assertions.map((assertion) => assertion.label)).toEqual([
            "c2pa.actions",
            "c2pa.hash.data",
        ]);
        expect(result.validationFailures).toEqual([]);
    });

    it("maps SDK validation failures to an invalid signature status", async () => {
        const adapter = new C2paSdkAdapter(async () =>
            readerReturning({
                ...verifiedStore,
                validation_state: "Invalid",
                validation_status: [
                    {
                        code: "assertion.hashMismatch",
                        success: false,
                        explanation: "Hash mismatch",
                    },
                ],
            }),
        );
        const result = await adapter.verify(new Uint8Array([1]));

        expect(result.signatureStatus).toBe("invalid");
        expect(result.validationFailures).toEqual([
            { code: "assertion.hashMismatch", message: "Hash mismatch" },
        ]);
    });

    it("reports a missing manifest when the SDK finds no embedded C2PA data", async () => {
        const adapter = new C2paSdkAdapter(async () => null);
        const result = await adapter.verify(new Uint8Array([1]));

        expect(result.signatureStatus).toBe("missing");
        expect(result.limitations.join(" ")).toContain("No embedded C2PA manifest");
    });

    it("never claims verification when the SDK is unavailable", async () => {
        const adapter = new C2paSdkAdapter(async () => {
            throw new C2paSdkUnavailableError(new Error("package not found"));
        });
        const result = await adapter.verify(new Uint8Array([1]));

        expect(result.signatureStatus).toBe("unverified");
        expect(result.validationFailures[0]?.code).toBe("sdk.error");
        expect(result.limitations.join(" ")).toContain("Signature was NOT verified");
    });

    it("rejects inputs that are not binary assets", async () => {
        const adapter = new C2paSdkAdapter(async () => null);
        await expect(adapter.verify({ nonsense: true })).rejects.toThrow(TypeError);
    });
});

describe("C2paInspectionUseCase verification paths", () => {
    it("uses the SDK port when injected instead of the JSON inspector", async () => {
        const port: C2paVerificationPort = {
            async verify() {
                return {
                    signatureStatus: "valid",
                    signer: "SDK Signer",
                    timestamp: "2026-03-01T00:00:00Z",
                    assertions: [{ label: "c2pa.actions", present: true }],
                    validationFailures: [],
                    limitations: ["SDK limitation"],
                };
            },
        };
        const result = await new C2paInspectionUseCase(undefined, port).execute({
            manifest: new Uint8Array([1]),
        });

        expect(result.signatureStatus).toBe("valid");
        expect(result.signer).toBe("SDK Signer");
        expect(result.signedAt).toBe("2026-03-01T00:00:00Z");
        expect(result.limitations).toEqual(["SDK limitation"]);
    });

    it("does not claim verification when the injected port throws", async () => {
        const port: C2paVerificationPort = {
            async verify() {
                throw new C2paSdkUnavailableError();
            },
        };
        const result = await new C2paInspectionUseCase(undefined, port).execute({
            manifest: new Uint8Array([1]),
        });

        expect(result.signatureStatus).toBe("unverified");
        expect(result.limitations).toContain("signature not verified via C2PA SDK");
    });

    it("falls back to the JSON inspector and states the SDK did not verify", async () => {
        const result = await new C2paInspectionUseCase().execute({
            manifest: {
                signature: { issuer: "JSON Only", alg: "ES256" },
                assertions: [{ label: "c2pa.actions", data: {} }],
            },
        });

        expect(result.signatureStatus).toBe("valid");
        expect(result.limitations).toContain("signature not verified via C2PA SDK");
    });
});
