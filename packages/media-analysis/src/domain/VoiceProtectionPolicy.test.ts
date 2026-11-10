import { describe, expect, it } from "vitest";
import { VoiceProtectionPolicy } from "@frithward/media-analysis";

describe("VoiceProtectionPolicy", () => {
    it("requires documented consent by default", () => {
        const policy = new VoiceProtectionPolicy();
        expect(() => policy.assertCanProtect({ consentDocumented: false })).toThrow();
    });

    it("requires explicit experimental opt-in even with consent", () => {
        const policy = new VoiceProtectionPolicy({ requireConsent: true });
        expect(() => policy.assertCanProtect({ consentDocumented: true })).toThrow();
    });

    it("allows protection when consent and experimental opt-in are present", () => {
        const policy = new VoiceProtectionPolicy({ allowExperimentalProtection: true });
        expect(() => policy.assertCanProtect({ consentDocumented: true })).not.toThrow();
    });
});
