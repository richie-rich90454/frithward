import { ApiError, AnalyzeMessageRequest, ScamAnalysisResult } from "@frithward/contracts";
import { z } from "zod";

export const HealthResponse = z.object({
    status: z.string(),
    service: z.string(),
    database: z.enum(["connected", "unavailable", "not-configured"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export const EnqueueResponse = z.object({ jobId: z.string() });
export type EnqueueResponse = z.infer<typeof EnqueueResponse>;

export const SessionResponse = z.object({
    authenticated: z.boolean(),
    user: z.object({ id: z.string(), email: z.string() }).nullable(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;

export const JobStatusRecord = z.object({
    jobId: z.string(),
    status: z.enum(["queued", "running", "completed", "failed"]),
    result: z.unknown(),
    error: z.string().nullable(),
});
export type JobStatusRecord = z.infer<typeof JobStatusRecord>;

export const PrivacyFinding = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    detail: z.string(),
    remediation: z.string(),
});
export type PrivacyFinding = z.infer<typeof PrivacyFinding>;

export const PrivacyInspectRequest = z.object({
    findings: z.array(PrivacyFinding).max(1000),
});

export const PrivacyInspectResponse = z.object({
    findings: z.array(PrivacyFinding),
    safe: z.boolean(),
    remediation: z.array(z.string()),
});
export type PrivacyInspectResponse = z.infer<typeof PrivacyInspectResponse>;

export const ProvenanceInspectRequest = z.object({
    id: z.string().min(1),
    signatureStatus: z.enum(["valid", "invalid", "missing"]),
    signer: z.string().nullable(),
    assetSha256: z.string().min(1),
    manifest: z.string().nullable(),
});
export type ProvenanceInspectRequest = z.infer<typeof ProvenanceInspectRequest>;

export const ProvenanceInspectResponse = z.object({ description: z.string() });
export type ProvenanceInspectResponse = z.infer<typeof ProvenanceInspectResponse>;

export const CaptionSegmentInput = z.object({
    id: z.string().min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1),
    speakerId: z.string().nullable().optional(),
});

export const CaptionExportRequest = z.object({
    projectId: z.string().min(1),
    title: z.string().min(1),
    language: z.string().min(1),
    format: z.enum(["vtt", "srt"]),
    segments: z.array(CaptionSegmentInput).max(1000),
});
export type CaptionExportRequest = z.infer<typeof CaptionExportRequest>;

export type ScamAnalysis = ScamAnalysisResult;
export type AnalyzeMessageResult = ScamAnalysisResult | EnqueueResponse;

export class SDKError extends Error {
    public readonly status: number;
    public readonly code: string;

    public constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "SDKError";
        this.status = status;
        this.code = code;
    }
}

export interface FrithwardClientOptions {
    baseUrl: string;
    fetch?: typeof fetch;
}

export class FrithwardClient {
    private readonly baseUrl: string;
    private readonly fetchImpl: typeof fetch;

    public constructor(options: FrithwardClientOptions) {
        const baseUrl = options.baseUrl.trim();
        if (baseUrl.length === 0) throw new Error("Base URL required.");
        this.baseUrl = baseUrl.replace(/\/+$/, "");
        this.fetchImpl = options.fetch ?? globalThis.fetch;
    }

    public endpoint(path: string): string {
        return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    }

    public async health(): Promise<HealthResponse> {
        const response = await this.send("/health", { method: "GET" });
        return this.parseJson(HealthResponse, response);
    }

    public async analyzeMessage(text: string): Promise<AnalyzeMessageResult> {
        const body = AnalyzeMessageRequest.parse({ text });
        const response = await this.send("/api/scam/message", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return response.status === 202
            ? this.parseJson(EnqueueResponse, response)
            : this.parseJson(ScamAnalysisResult, response);
    }

    public async getSession(): Promise<SessionResponse> {
        const response = await this.send("/api/auth/session", { method: "GET" });
        return this.parseJson(SessionResponse, response);
    }

    public async getJob(id: string): Promise<JobStatusRecord> {
        const response = await this.send(`/api/jobs/${encodeURIComponent(id)}`, { method: "GET" });
        return this.parseJson(JobStatusRecord, response);
    }

    public async inspectPrivacy(findings: PrivacyFinding[]): Promise<PrivacyInspectResponse> {
        const body = PrivacyInspectRequest.parse({ findings });
        const response = await this.send("/api/privacy/inspect", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return this.parseJson(PrivacyInspectResponse, response);
    }

    public async verifyProvenance(
        manifest: ProvenanceInspectRequest,
    ): Promise<ProvenanceInspectResponse> {
        const body = ProvenanceInspectRequest.parse(manifest);
        const response = await this.send("/api/provenance/inspect", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return this.parseJson(ProvenanceInspectResponse, response);
    }

    public async exportCaptions(request: CaptionExportRequest): Promise<string> {
        const body = CaptionExportRequest.parse(request);
        const response = await this.send("/api/captions/export", {
            method: "POST",
            body: JSON.stringify(body),
        });
        return response.text();
    }

    private async send(path: string, init: RequestInit): Promise<Response> {
        const response = await this.fetchImpl(this.endpoint(path), {
            ...init,
            headers: { "content-type": "application/json" },
        });
        if (!response.ok) await this.throwSdkError(response);
        return response;
    }

    private async parseJson<T>(schema: z.ZodType<T>, response: Response): Promise<T> {
        const payload: unknown = await response.json();
        const result = schema.safeParse(payload);
        if (!result.success) {
            throw new SDKError(
                response.status,
                "INVALID_RESPONSE",
                `Unexpected response: ${result.error.message}`,
            );
        }
        return result.data;
    }

    private async throwSdkError(response: Response): Promise<never> {
        let code = "HTTP_ERROR";
        let message = `Request failed with status ${response.status}.`;
        try {
            const payload: unknown = await response.json();
            const parsed = ApiError.safeParse(payload);
            if (parsed.success) {
                code = parsed.data.code;
                message = parsed.data.message;
            }
        } catch {
            // A non-JSON error body keeps the generic status message.
        }
        throw new SDKError(response.status, code, message);
    }
}
