import { describe, expect, it } from "vitest";
import { analyze } from "./analysis";

describe("analyze (local extension catalog)", () => {
    it("flags credential and payment pressure without issuing a verdict", () => {
        const result = analyze(
            "Act now: pay the invoice and enter your password to verify your account.",
            "https://example.com/notice",
        );
        const ids = result.findings.map((finding) => finding.id);
        expect(ids).toContain("urgency");
        expect(ids).toContain("payment");
        expect(ids).toContain("credential");
        expect(result.summary).toContain("does not establish fraud");
        expect(result.summary.toLowerCase()).not.toContain("scam");
        expect(result.summary.toLowerCase()).not.toContain("safe to use");
        expect(result.findings.find((finding) => finding.id === "credential")?.severity).toBe(
            "high",
        );
        expect(result.nextSteps.length).toBeGreaterThan(0);
        expect(result.limitations.length).toBeGreaterThan(0);
    });

    it("reports no findings for benign text on an ordinary https address", () => {
        const result = analyze("Meeting notes for Tuesday.", "https://example.com/notes");
        expect(result.findings).toHaveLength(0);
        expect(result.summary).toContain("does not prove the page is safe");
    });

    it("applies URL host heuristics", () => {
        const result = analyze("Hello there.", "http://192.168.0.1:8080/login");
        const ids = result.findings.map((finding) => finding.id);
        expect(ids).toContain("insecure-transport");
        expect(ids).toContain("ip-host");
    });

    it("detects a homoglyph brand lookalike on a throwaway TLD", () => {
        const result = analyze("Verify your account.", "https://paypa1-secure.xyz/verify");
        const ids = result.findings.map((finding) => finding.id);
        expect(ids).toContain("suspicious-tld");
        expect(ids.some((id) => id.startsWith("brand-lookalike-"))).toBe(true);
        expect(result.findings.some((finding) => finding.severity === "high")).toBe(true);
    });

    it("does not claim certainty even when several indicators match", () => {
        const result = analyze(
            "Urgent: wire transfer now, keep secret, send your password.",
            "http://bit.ly/abc",
        );
        expect(result.findings.length).toBeGreaterThan(2);
        expect(result.summary).toMatch(/indicator\(s\) found/);
        expect(result.limitations.join(" ")).toContain("cannot prove intent");
    });
});
