import { describe, expect, it } from "vitest";
import { UrlInspectionUseCase } from "@frithward/security-core";

describe("UrlInspectionUseCase", () => {
    const useCase = new UrlInspectionUseCase();

    it("flags a homoglyph lookalike brand domain", () => {
        const result = useCase.execute("https://paypa1.com/login");
        expect(result.hostname).toBe("paypa1.com");
        expect(result.riskLevel).toBe("high");
        expect(result.findings.map((finding) => finding.id)).toContain("brand-lookalike-paypal");
    });

    it("flags a brand used in a subdomain", () => {
        const result = useCase.execute("https://paypal.com.evil.example/verify");
        expect(result.riskLevel).toBe("high");
        expect(result.findings.map((finding) => finding.id)).toContain("brand-lookalike-paypal");
    });

    it("flags a brand prefixed lookalike domain", () => {
        const result = useCase.execute("https://paypalverify.example.com/account");
        expect(result.riskLevel).toBe("high");
        expect(result.findings.map((finding) => finding.id)).toContain("brand-lookalike-paypal");
    });

    it("flags suspicious TLDs and shortened links", () => {
        const tld = useCase.execute("https://example.xyz/account");
        expect(tld.findings.map((finding) => finding.id)).toContain("suspicious-tld");
        expect(tld.riskLevel).toBe("medium");

        const short = useCase.execute("https://bit.ly/abc123");
        expect(short.findings.map((finding) => finding.id)).toContain("shortened-link");
        expect(short.limitations.some((line) => line.includes("short link"))).toBe(true);
    });

    it("treats an official brand domain as low risk", () => {
        const result = useCase.execute("https://www.paypal.com/account");
        expect(result.riskLevel).toBe("low");
        expect(result.findings).toHaveLength(0);
    });

    it("flags an IP address host and insecure transport", () => {
        const result = useCase.execute("http://192.168.1.10/login");
        const ids = result.findings.map((finding) => finding.id);
        expect(ids).toContain("ip-host");
        expect(ids).toContain("insecure-transport");
        expect(result.riskLevel).toBe("medium");
    });

    it("reports limitations for every inspection", () => {
        const result = useCase.execute("https://example.com");
        expect(result.limitations.length).toBeGreaterThan(0);
        expect(result.riskLevel).toBe("low");
    });

    it("handles unparseable input", () => {
        const result = useCase.execute("not a valid url at all !!!");
        expect(result.riskLevel).toBe("high");
        expect(result.normalizedUrl).toBeNull();
        expect(result.findings.map((finding) => finding.id)).toContain("unparseable-url");
    });

    it("rejects empty input", () => {
        expect(() => useCase.execute("   ")).toThrow();
    });
});
