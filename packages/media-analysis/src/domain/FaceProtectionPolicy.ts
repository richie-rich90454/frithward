import { AppError } from "@frithward/contracts";

export class FaceProtectionPolicy {
    public readonly requireConsent: boolean;
    public readonly allowExperimentalProtection: boolean;
    public readonly minFaceSizePx: number;

    public constructor(input?: {
        requireConsent?: boolean;
        allowExperimentalProtection?: boolean;
        minFaceSizePx?: number;
    }) {
        this.requireConsent = input?.requireConsent ?? true;
        this.allowExperimentalProtection = input?.allowExperimentalProtection ?? false;
        this.minFaceSizePx = input?.minFaceSizePx ?? 64;
        if (!Number.isInteger(this.minFaceSizePx) || this.minFaceSizePx < 1) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Minimum face size must be a positive integer.",
            );
        }
    }

    public assertCanProtect(input: { consentDocumented: boolean; faceSizePx?: number }): void {
        if (this.requireConsent && !input.consentDocumented) {
            throw new AppError(
                "UNAUTHORIZED",
                "Face protection requires documented consent from the person depicted.",
            );
        }
        if (!this.allowExperimentalProtection) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Face protection is experimental and must be explicitly enabled.",
            );
        }
        if (input.faceSizePx !== undefined && input.faceSizePx < this.minFaceSizePx) {
            throw new AppError(
                "VALIDATION_FAILED",
                "Face is smaller than the minimum size supported by the protection method.",
            );
        }
    }
}
