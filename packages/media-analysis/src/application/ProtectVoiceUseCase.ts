import { AppError } from "@frithward/contracts";
import { ProtectionResult } from "../domain/ProtectionResult.js";
import { VoiceProtectionPolicy } from "../domain/VoiceProtectionPolicy.js";
import type { VoiceProtectionPort } from "../ports/VoiceProtectionPort.js";

export class ProtectVoiceUseCase {
    private readonly port: VoiceProtectionPort;
    private readonly policy: VoiceProtectionPolicy;

    public constructor(port: VoiceProtectionPort, policy?: VoiceProtectionPolicy) {
        this.port = port;
        this.policy = policy ?? new VoiceProtectionPolicy();
    }

    public async execute(input: {
        assetId: string;
        audio: ArrayBuffer;
        consentDocumented: boolean;
        signal: AbortSignal;
    }): Promise<ProtectionResult> {
        this.policy.assertCanProtect({ consentDocumented: input.consentDocumented });
        if (input.signal.aborted) throw new AppError("CANCELLED", "Voice protection cancelled.");
        if (input.audio.byteLength === 0)
            throw new AppError("VALIDATION_FAILED", "Audio payload required.");
        const outcome = await this.port.protect({
            assetId: input.assetId,
            audio: input.audio,
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
