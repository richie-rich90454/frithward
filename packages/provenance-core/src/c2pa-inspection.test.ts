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
            }),
        ).toContain("unverified");
    });
});
