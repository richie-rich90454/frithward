import { describe, expect, it } from "vitest";
import {
    C2paInspectionUseCase,
    InMemoryProvenanceRecordRepository,
    VerifyProvenanceUseCase,
} from "@frithward/provenance-core";

describe("C2paInspectionUseCase", () => {
    const useCase = new C2paInspectionUseCase();

    it("reports a valid signature with assertions and an asset hash", async () => {
        const manifest = {
            claimGenerator: "test/1.0",
            createdAt: "2026-01-01T00:00:00Z",
            assertions: [
                { label: "c2pa.hash.data", data: { hash: "abc123" } },
                { label: "c2pa.actions", data: {} },
            ],
            signature: { alg: "ES256", issuer: "Test Signer", time: "2026-01-01T00:00:00Z" },
        };
        const result = await useCase.execute({ manifest });
        expect(result.signatureStatus).toBe("valid");
        expect(result.signer).toBe("Test Signer");
        expect(result.signedAt).toBe("2026-01-01T00:00:00Z");
        expect(result.assetHash).toBe("abc123");
        expect(result.assertions.map((assertion) => assertion.label)).toContain("c2pa.hash.data");
        expect(result.missingInfo).toHaveLength(0);
    });

    it("reports validation failures", async () => {
        const manifest = {
            signature: { alg: "ES256", issuer: "Test Signer" },
            validations: [
                { code: "claimSignature.valid", success: false, message: "Signature mismatch" },
            ],
        };
        const result = await useCase.execute({ manifest });
        expect(result.signatureStatus).toBe("invalid");
        expect(result.validationFailures).toHaveLength(1);
        expect(result.validationFailures[0]?.message).toBe("Signature mismatch");
    });

    it("reports unverified when the signature lacks a signer or algorithm", async () => {
        const result = await useCase.execute({
            manifest: { signature: { serialNumber: "12345" } },
        });
        expect(result.signatureStatus).toBe("unverified");
        expect(result.missingInfo).toContain("signer");
    });

    it("reports missing information when no signature exists", async () => {
        const result = await useCase.execute({ manifest: { title: "No signature" } });
        expect(result.signatureStatus).toBe("missing");
        expect(result.missingInfo).toContain("signer");
        expect(result.missingInfo).toContain("asset hash");
        expect(result.missingInfo).toContain("assertions");
    });

    it("handles a JSON string manifest", async () => {
        const result = await useCase.execute({
            manifest: JSON.stringify({ signature: { issuer: "A", alg: "ES256" } }),
        });
        expect(result.signatureStatus).toBe("valid");
        expect(result.signer).toBe("A");
    });

    it("handles unreadable input", async () => {
        const result = await useCase.execute({ manifest: "not json" });
        expect(result.signatureStatus).toBe("missing");
        expect(result.summary).toContain("No readable");
    });

    it("persists a record through the repository", async () => {
        const repository = new InMemoryProvenanceRecordRepository();
        const useCase = new C2paInspectionUseCase(repository);
        const result = await useCase.execute({
            manifest: {
                signature: { issuer: "A", alg: "ES256", time: "2026-01-01T00:00:00Z" },
                assertions: [{ label: "c2pa.hash.data", data: { hash: "deadbeef" } }],
            },
            id: "record-1",
        });
        expect(result.signatureStatus).toBe("valid");
        const stored = await repository.load("record-1");
        expect(stored?.signer).toBe("A");
        expect(stored?.assetSha256).toBe("deadbeef");
        expect(stored?.manifest).toContain("deadbeef");
    });

    it("always reports limitations", async () => {
        const result = await useCase.execute({
            manifest: { signature: { issuer: "A", alg: "ES256" } },
        });
        expect(result.limitations.length).toBeGreaterThan(0);
    });

    it("parses c2pa.actions assertions into transformation steps", async () => {
        const manifest = {
            signature: { issuer: "A", alg: "ES256" },
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
                                timestamp: "2026-01-02T00:00:00Z",
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
        const result = await useCase.execute({ manifest });
        expect(result.transformations).toEqual([
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
        expect(result.limitations.some((item) => item.includes("no transformation history"))).toBe(
            false,
        );
    });

    it("returns an empty history with a limitation when c2pa.actions is absent", async () => {
        const result = await useCase.execute({
            manifest: { signature: { issuer: "A", alg: "ES256" } },
        });
        expect(result.transformations).toEqual([]);
        expect(result.limitations).toContain(
            "No c2pa.actions assertion was available; no transformation history could be parsed.",
        );
    });

    it("persists parsed transformations on the record", async () => {
        const repository = new InMemoryProvenanceRecordRepository();
        const useCase = new C2paInspectionUseCase(repository);
        await useCase.execute({
            manifest: {
                signature: { issuer: "A", alg: "ES256" },
                assertions: [
                    { label: "c2pa.hash.data", data: { hash: "deadbeef" } },
                    {
                        label: "c2pa.actions",
                        data: { actions: [{ action: "c2pa.created" }] },
                    },
                ],
            },
            id: "record-t",
        });
        const stored = await repository.load("record-t");
        expect(stored?.transformations).toHaveLength(1);
        expect(stored?.transformations[0]?.action).toBe("c2pa.created");
    });
});

describe("VerifyProvenanceUseCase", () => {
    it("describes an unverified record", () => {
        const useCase = new VerifyProvenanceUseCase();
        expect(
            useCase.describe({
                id: "r",
                signatureStatus: "unverified",
                signer: "A",
                assetSha256: "h",
                manifest: null,
                transformations: [],
            }),
        ).toContain("unverified");
    });

    it("summarizes recorded and missing transformation history", () => {
        const useCase = new VerifyProvenanceUseCase();
        const base = {
            id: "r",
            signatureStatus: "valid" as const,
            signer: "A",
            assetSha256: "h",
            manifest: null,
        };
        expect(useCase.describe({ ...base, transformations: [] })).toContain(
            "No transformation history available.",
        );
        expect(
            useCase.describe({
                ...base,
                transformations: [
                    {
                        action: "c2pa.created",
                        actor: null,
                        timestamp: null,
                        assetHashBefore: null,
                        assetHashAfter: null,
                        detail: null,
                    },
                ],
            }),
        ).toContain("1 transformation(s) recorded.");
    });
});
