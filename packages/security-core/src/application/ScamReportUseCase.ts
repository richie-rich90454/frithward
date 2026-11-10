import { AppError } from "@frithward/contracts";
import type { ScamChannel } from "@frithward/contracts";

export interface ScamReportInput {
    channel: ScamChannel;
    description: string;
    source: string;
    id?: string;
    reportedAt?: string;
    evidenceSha256?: string;
}

export interface ScamReport {
    id: string;
    channel: ScamChannel;
    description: string;
    source: string;
    evidenceSha256: string;
    reportedAt: string;
    status: "open" | "under-review" | "closed";
}

export class ScamReportUseCase {
    public async execute(input: ScamReportInput): Promise<ScamReport> {
        if (input.description.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Report description required.");
        if (input.description.length > 20000)
            throw new AppError("VALIDATION_FAILED", "Report description exceeds limit.");
        if (input.source.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Report source required.");

        const reportedAt = input.reportedAt ?? new Date().toISOString();
        const id = input.id ?? globalThis.crypto.randomUUID();
        const evidenceSha256 = input.evidenceSha256 ?? (await this.hashEvidence(input, reportedAt));

        return {
            id,
            channel: input.channel,
            description: input.description.trim(),
            source: input.source.trim(),
            evidenceSha256,
            reportedAt,
            status: "open",
        };
    }

    private async hashEvidence(input: ScamReportInput, reportedAt: string): Promise<string> {
        const content = `${input.channel}\n${input.source.trim()}\n${input.description.trim()}\n${reportedAt}`;
        const digest = await globalThis.crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(content),
        );
        return [...new Uint8Array(digest)]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }
}
