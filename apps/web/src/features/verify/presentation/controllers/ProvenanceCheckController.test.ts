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
