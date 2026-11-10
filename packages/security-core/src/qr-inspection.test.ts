import { describe, expect, it } from "vitest";
import { QrInspectionUseCase } from "@frithward/security-core";

describe("QrInspectionUseCase", () => {
    const useCase = new QrInspectionUseCase();

    it("inspects a URL payload", () => {
        const result = useCase.execute("https://paypa1.com/offer");
        expect(result.payloadKind).toBe("url");
        expect(result.riskLevel).toBe("high");
        expect(result.findings.map((finding) => finding.id)).toContain(
            "url-brand-lookalike-paypal",
        );
    });

    it("recognizes a Wi-Fi payload", () => {
        const result = useCase.execute("WIFI:T:WPA;S:CoffeeShop;P:password123;;");
        expect(result.payloadKind).toBe("wifi");
        expect(result.riskLevel).toBe("medium");
    });

    it("recognizes a vCard payload", () => {
        const result = useCase.execute("BEGIN:VCARD\nVERSION:3.0\nFN:Jane Doe\nEND:VCARD");
        expect(result.payloadKind).toBe("vcard");
        expect(result.findings.map((finding) => finding.id)).toContain("vcard-data");
    });

    it("recognizes a crypto address payload", () => {
        const result = useCase.execute("0x1234567890abcdef1234567890abcdef12345678");
        expect(result.payloadKind).toBe("crypto");
        expect(result.findings.map((finding) => finding.id)).toContain("crypto-address");
    });

    it("recognizes a contact action payload", () => {
        const result = useCase.execute("mailto:someone@example.com");
        expect(result.payloadKind).toBe("contact");
    });

    it("flags urgency and payment language", () => {
        const result = useCase.execute("Urgent! Pay now to claim your prize.");
        expect(result.riskLevel).toBe("high");
        const ids = result.findings.map((finding) => finding.id);
        expect(ids).toContain("urgency");
        expect(ids).toContain("payment");
    });

    it("reports limitations for a plain text payload", () => {
        const result = useCase.execute("hello world");
        expect(result.payloadKind).toBe("text");
        expect(result.riskLevel).toBe("low");
        expect(result.limitations.length).toBeGreaterThan(0);
    });

    it("rejects an empty payload", () => {
        expect(() => useCase.execute("   ")).toThrow();
    });
});
