import { AppError } from "@frithward/contracts";

export class VoiceProtectionPolicy {
    public readonly requireConsent: boolean;
    public readonly allowExperimentalProtection: boolean;

    public constructor(input?: {
        requireConsent?: boolean;
        allowExperimentalProtection?: boolean;
    }) {
        this.requireConsent = input?.requireConsent ?? true;
        this.allowExperimentalProtection = input?.allowExperimentalProtection ?? false;
    }

    public assertCanProtect(input: { consentDocumented: boolean }): void {
        if (this.requireConsent && !input.consentDocumented) {
            throw new AppError(
                "UNAUTHORIZED",
                "Voice protection requires documented consent from the speaker.",
            );
        }
        if (!this.allowExperimentalProtection) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Voice protection is experimental and must be explicitly enabled.",
            );
        }
    }
}
