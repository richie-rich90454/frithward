import { AppError } from "@frithward/contracts";
import { FaceProtectionPolicy } from "../domain/FaceProtectionPolicy.js";
import { ProtectionResult } from "../domain/ProtectionResult.js";
import type { FaceProtectionPort } from "../ports/FaceProtectionPort.js";

export class ProtectFaceUseCase {
    private readonly port: FaceProtectionPort;
    private readonly policy: FaceProtectionPolicy;

    public constructor(port: FaceProtectionPort, policy?: FaceProtectionPolicy) {
        this.port = port;
        this.policy = policy ?? new FaceProtectionPolicy();
    }

    public async execute(input: {
        assetId: string;
        image: ArrayBuffer;
        consentDocumented: boolean;
        faceSizePx?: number;
        signal: AbortSignal;
    }): Promise<ProtectionResult> {
        this.policy.assertCanProtect({
            consentDocumented: input.consentDocumented,
            ...(input.faceSizePx === undefined ? {} : { faceSizePx: input.faceSizePx }),
        });
        if (input.signal.aborted) throw new AppError("CANCELLED", "Face protection cancelled.");
        if (input.image.byteLength === 0)
            throw new AppError("VALIDATION_FAILED", "Image payload required.");
        const outcome = await this.port.protect({
            assetId: input.assetId,
            image: input.image,
            signal: input.signal,
        });
        return new ProtectionResult({
            assetId: input.assetId,
            status: "applied",
            method: outcome.method,
            artifactId: outcome.artifactId,
            limitations: outcome.limitations,
            models: outcome.models,
        });
    }
}
