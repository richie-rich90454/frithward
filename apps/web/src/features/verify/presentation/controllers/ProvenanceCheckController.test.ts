import { describe, expect, it, vi } from "vitest";
import type { C2paInspectionResult } from "@frithward/provenance-core";
import { ProvenanceCheckController } from "./ProvenanceCheckController";
import type { C2paInspector } from "./ProvenanceCheckController";
import { C2paInspectionUseCase } from "@frithward/provenance-core";

const result: C2paInspectionResult = {
    signatureStatus: "invalid",
    signer: "Example Studio",
    signedAt: "2026-01-01T00:00:00.000Z",
    assertions: [{ label: "c2pa.actions", present: true }],
    assetHash: "abc123",
    transformations: [
        {
            action: "c2pa.created",
            actor: "Camera App",
            timestamp: "2026-01-01T00:00:00Z",
            assetHashBefore: null,
            assetHashAfter: "hash-1",
            detail: "Original capture",
        },
    ],
    validationFailures: [{ code: "signature.invalid", message: "Signature does not match." }],
    missingInfo: ["signer"],
    summary: "Signature validation failed (1 failure(s)); evidence requires review.",
    limitations: ["signature not verified via C2PA SDK"],
};

describe("ProvenanceCheckController C2PA inspection", () => {
    it("passes the parsed manifest to the inspector and maps every field", async () => {
        const execute = vi.fn(async () => result);
        const inspector: C2paInspector = { execute };
        const controller = new ProvenanceCheckController({ inspector });
        const manifest = { signature: { issuer: "Example Studio", alg: "es256" } };
        await controller.inspect(JSON.stringify(manifest));
        expect(execute).toHaveBeenCalledWith({ manifest });
        expect(controller.getResult()).toEqual(result);
        expect(controller.getError()).toBeNull();
    });

    it("keeps the no-SDK limitation and validation failures visible", async () => {
        const inspector: C2paInspector = { execute: async () => result };
        const controller = new ProvenanceCheckController({ inspector });
        await controller.inspect("{}");
        const view = controller.getResult();
        expect(view?.limitations).toContain("signature not verified via C2PA SDK");
        expect(view?.validationFailures[0]?.code).toBe("signature.invalid");
        expect(view?.missingInfo).toContain("signer");
    });

    it("does not invent a result when the manifest is invalid", async () => {
        const execute = vi.fn(async () => result);
        const controller = new ProvenanceCheckController({ inspector: { execute } });
        await controller.inspect("not json");
        expect(execute).not.toHaveBeenCalled();
        expect(controller.getResult()).toBeNull();
        expect(controller.getError()).toBe("Manifest must be valid JSON.");
    });

    it("reads a JSON file and inspects its parsed manifest", async () => {
        const execute = vi.fn(async () => result);
        const controller = new ProvenanceCheckController({ inspector: { execute } });
        const manifest = { signature: { issuer: "Example Studio", alg: "es256" } };
        const bytes = new TextEncoder().encode(JSON.stringify(manifest));
        await controller.inspectFile({ name: "manifest.json", bytes });
        expect(execute).toHaveBeenCalledWith({ manifest });
        expect(controller.getResult()).toEqual(result);
        expect(controller.getError()).toBeNull();
    });

    it("reports an honest unavailable status for a binary file with no local extractor", async () => {
        const execute = vi.fn(async () => result);
        const controller = new ProvenanceCheckController({ inspector: { execute } });
        await controller.inspectFile({ name: "photo.jpg", bytes: new Uint8Array([1, 2, 3]) });
        expect(execute).not.toHaveBeenCalled();
        const view = controller.getResult();
        expect(view?.signatureStatus).toBe("missing");
        expect(view?.summary).toContain("unavailable");
        expect(view?.limitations).toContain(
            "No signature was verified. Do not treat this file as having valid provenance.",
        );
        expect(controller.getError()).toBeNull();
    });

    it("uses an injected extractor to inspect a manifest found in a binary file", async () => {
        const execute = vi.fn(async () => result);
        const manifest = { signature: { issuer: "Camera App", alg: "es256" } };
        const extract = vi.fn(async () => manifest);
        const controller = new ProvenanceCheckController({
            inspector: { execute },
            extractor: { extract },
        });
        const bytes = new Uint8Array([1, 2, 3]);
        await controller.inspectFile({ name: "photo.jpg", bytes });
        expect(extract).toHaveBeenCalledWith(bytes);
        expect(execute).toHaveBeenCalledWith({ manifest });
        expect(controller.getResult()).toEqual(result);
    });

    it("verifies binary bytes with an injected C2PA verifier", async () => {
        const verify = vi.fn(async () => ({
            signatureStatus: "invalid" as const,
            signer: "SDK Signer",
            timestamp: "2026-04-01T00:00:00Z",
            assertions: [{ label: "c2pa.actions.v2", present: true }],
            validationFailures: [
                { code: "signingCredential.untrusted", message: "signing certificate untrusted" },
            ],
            limitations: ["trust depends on the configured trust settings"],
        }));
        const controller = new ProvenanceCheckController({ verifier: { verify } });
        const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
        await controller.inspectFile({ name: "photo.jpg", bytes });

        expect(verify).toHaveBeenCalledWith(bytes);
        expect(controller.getResult()?.signatureStatus).toBe("invalid");
        expect(controller.getResult()?.signer).toBe("SDK Signer");
        expect(controller.getResult()?.limitations).toContain(
            "trust depends on the configured trust settings",
        );
    });

    it("surfaces a verifier SDK error without faking a valid result", async () => {
        const controller = new ProvenanceCheckController({
            verifier: {
                async verify() {
                    return {
                        signatureStatus: "unverified" as const,
                        signer: null,
                        timestamp: null,
                        assertions: [],
                        validationFailures: [
                            {
                                code: "sdk.error",
                                message: "C2PA WASM SDK could not read this asset",
                            },
                        ],
                        limitations: ["Signature was NOT verified"],
                    };
                },
            },
        });
        await controller.inspectFile({ name: "clip.mp4", bytes: new Uint8Array([1, 2, 3]) });

        expect(controller.getResult()?.signatureStatus).not.toBe("valid");
        expect(controller.getResult()?.validationFailures[0]?.code).toBe("sdk.error");
    });

    it("does not invent a result for an invalid JSON file", async () => {
        const execute = vi.fn(async () => result);
        const controller = new ProvenanceCheckController({ inspector: { execute } });
        await controller.inspectFile({
            name: "bad.json",
            bytes: new TextEncoder().encode("not json"),
        });
        expect(execute).not.toHaveBeenCalled();
        expect(controller.getResult()).toBeNull();
        expect(controller.getError()).toBe("File must contain valid JSON.");
    });

    it("translates C2PA summary, limitations, missing info and failures by code", async () => {
        const coded: C2paInspectionResult = {
            ...result,
            summaryCode: "C2PA_SUMMARY_INVALID",
            limitationCodes: ["C2PA_LIMIT_UNVERIFIED"],
            missingInfoCodes: ["C2PA_MISSING_SIGNER"],
            validationFailures: [{ code: "signature.invalid", message: "Validation failed." }],
        };
        const t = (key: string) => {
            const values: Record<string, string> = {
                "result.C2PA_SUMMARY_INVALID": "Fallo de firma ({n}).{missing}",
                "result.C2PA_SUMMARY_MISSING_FRAGMENT": " Faltan {n} datos.",
                "result.C2PA_LIMIT_UNVERIFIED": "Firma no verificada por el SDK.",
                "result.C2PA_MISSING_SIGNER": "firmante",
                "result.C2PA_VALIDATION_FAILED": "Validación fallida.",
            };
            return values[key] ?? key;
        };
        const controller = new ProvenanceCheckController({
            inspector: { execute: async () => coded },
            translate: t,
        });
        await controller.inspect("{}");
        const view = controller.getResult();
        expect(view?.summary).toBe("Fallo de firma (1). Faltan 1 datos.");
        expect(view?.limitations).toEqual(["Firma no verificada por el SDK."]);
        expect(view?.missingInfo).toEqual(["firmante"]);
        expect(view?.validationFailures[0]?.message).toBe("Validación fallida.");
    });

    it("exposes transformation history parsed from a manifest with two actions", async () => {
        const manifest = {
            signature: { issuer: "Example Studio", alg: "es256" },
            assertions: [
                {
                    label: "c2pa.actions",
                    data: {
                        actions: [
                            {
                                action: "c2pa.created",
                                when: "2026-01-01T00:00:00Z",
                                actors: [{ name: "Camera App" }],
                                parameters: { assetHashAfter: "hash-1" },
                                description: "Original capture",
                            },
                            {
                                action: "c2pa.edited",
                                when: "2026-01-02T00:00:00Z",
                                actor: "Editor",
                                assetHashBefore: "hash-1",
                                assetHashAfter: "hash-2",
                                detail: "Cropped",
                            },
                        ],
                    },
                },
            ],
        };
        const controller = new ProvenanceCheckController({
            inspector: new C2paInspectionUseCase(),
        });
        await controller.inspect(JSON.stringify(manifest));
        expect(controller.getResult()?.transformations).toEqual([
            {
                action: "c2pa.created",
                actor: "Camera App",
                timestamp: "2026-01-01T00:00:00Z",
                assetHashBefore: null,
                assetHashAfter: "hash-1",
                detail: "Original capture",
            },
            {
                action: "c2pa.edited",
                actor: "Editor",
                timestamp: "2026-01-02T00:00:00Z",
                assetHashBefore: "hash-1",
                assetHashAfter: "hash-2",
                detail: "Cropped",
            },
        ]);
    });
});
