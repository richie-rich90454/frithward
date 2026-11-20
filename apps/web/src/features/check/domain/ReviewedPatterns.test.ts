import { describe, expect, it } from "vitest";
import {
    buildReviewedInput,
    findReviewedPatterns,
    hostnameOf,
    registrableOf,
    REVIEWED_LIMITATIONS,
    REVIEWED_PATTERNS,
} from "./ReviewedPatterns";

const ids = (text: string): string[] =>
    findReviewedPatterns(buildReviewedInput(text)).map((match) => match.id);

describe("ReviewedPatterns text heuristics", () => {
    it("detects urgency, payment and gift-card phrasing with severity and rationale", () => {
        const matches = findReviewedPatterns(
            buildReviewedInput("URGENT: pay the invoice now or buy a gift card immediately."),
        );
        expect(matches.map((match) => match.id)).toEqual(
            expect.arrayContaining(["reviewed-urgency", "reviewed-payment", "reviewed-gift-card"]),
        );
        for (const match of matches) {
            expect(match.rationale.length).toBeGreaterThan(0);
            expect(["low", "medium", "high"]).toContain(match.severity);
        }
    });

    it("detects grammar-independent markers without relying on sentence quality", () => {
        expect(ids("Dear customer click here")).toContain("reviewed-generic-greeting");
        expect(ids("Please send your bitcoin to this wallet address")).toContain("reviewed-crypto");
        expect(ids("keep this secret do not tell anyone")).toContain("reviewed-secrecy");
    });

    it("does not flag ordinary messages as scams", () => {
        expect(ids("Lunch is at noon. See you there!")).toEqual([]);
        expect(ids("Thanks for the photos from the weekend.")).toEqual([]);
    });
});

describe("ReviewedPatterns domain heuristics", () => {
    it("flags mismatched display and target domains", () => {
        const input = buildReviewedInput(
            "[paypal.com](https://paypa1.example/verify) click here to sign in",
        );
        const matches = findReviewedPatterns(input);
        expect(matches.map((match) => match.id)).toContain("reviewed-mismatched-link");
        expect(matches.map((match) => match.id)).toContain("reviewed-lookalike-domain");
    });

    it("flags homograph and hyphen variants of known brands", () => {
        expect(ids("visit micros0ft-support.example for help")).toContain(
            "reviewed-lookalike-domain",
        );
        expect(ids("http://paypa1.com")).toContain("reviewed-lookalike-domain");
    });

    it("does not flag the exact brand domain as a lookalike", () => {
        expect(ids("https://paypal.com")).not.toContain("reviewed-lookalike-domain");
    });

    it("reports an uncommon TLD only when another signal is present", () => {
        expect(ids("https://my-notes.xyz")).toEqual([]);
        expect(ids("URGENT pay now https://my-notes.xyz")).toContain("reviewed-suspicious-tld");
    });

    it("flags numeric hosts, embedded credentials, shorteners and punycode", () => {
        expect(ids("http://192.168.1.2/login")).toContain("reviewed-ip-host");
        expect(ids("https://user:pass@example.com")).toContain("reviewed-embedded-credentials");
        expect(ids("https://bit.ly/abc")).toContain("reviewed-shortened-link");
        expect(ids("https://xn--bcher-kva.example")).toContain("reviewed-punycode-host");
    });
});

describe("ReviewedPatterns honesty", () => {
    it("makes no machine-learning or certainty claims", () => {
        const text = REVIEWED_PATTERNS.map((pattern) => `${pattern.label} ${pattern.detail}`).join(
            " ",
        );
        expect(text.toLowerCase()).not.toContain("machine learning");
        expect(text.toLowerCase()).not.toContain("confirmed");
        expect(REVIEWED_LIMITATIONS.join(" ").toLowerCase()).toContain("not machine learning");
        expect(REVIEWED_LIMITATIONS.join(" ").toLowerCase()).toContain("not proof of fraud");
    });

    it("extracts hosts and registrable domains defensively", () => {
        expect(hostnameOf("not a url")).toBeNull();
        expect(hostnameOf("example.com/login")).toBe("example.com");
        expect(registrableOf("shop.example.co.uk")).toBe("example.co.uk");
        expect(registrableOf("localhost")).toBeNull();
    });
});
