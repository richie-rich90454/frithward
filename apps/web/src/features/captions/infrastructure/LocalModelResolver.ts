import { AppError } from "@frithward/contracts";

export const BUNDLED_WHISPER_MODEL_URL = "/models/whisper-tiny.bin";

export const WHISPER_MODEL_MISSING_MESSAGE =
    "No local Whisper model is available. Place whisper-tiny.bin in apps/web/public/models/ and rebuild, or supply a model URL. Model weights are not distributed with this application.";

export type LocalModelSource = "bundled" | "user";

export interface LocalModelResult {
    readonly url: string;
    readonly source: LocalModelSource;
}

export interface ModelResolver {
    resolve(userUrl?: string): Promise<LocalModelResult>;
}

export interface LocalModelResolverOptions {
    readonly bundledUrl?: string;
    readonly probe?: (url: string) => Promise<boolean>;
}

async function headProbe(url: string): Promise<boolean> {
    if (typeof fetch !== "function") return false;
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch {
        return false;
    }
}

// Candidates are probed same-origin first so an offline install needs no network.
export class LocalModelResolver implements ModelResolver {
    private readonly bundledUrl: string;
    private readonly probe: (url: string) => Promise<boolean>;

    public constructor(options: LocalModelResolverOptions = {}) {
        this.bundledUrl = options.bundledUrl ?? BUNDLED_WHISPER_MODEL_URL;
        this.probe = options.probe ?? headProbe;
    }

    public async resolve(userUrl?: string): Promise<LocalModelResult> {
        const supplied = userUrl?.trim();
        const candidates: readonly LocalModelResult[] = [
            { url: this.bundledUrl, source: "bundled" },
            ...(supplied ? [{ url: supplied, source: "user" as const }] : []),
        ];
        for (const candidate of candidates) {
            if (await this.probe(candidate.url)) return candidate;
        }
        throw new AppError("EXTERNAL_UNAVAILABLE", WHISPER_MODEL_MISSING_MESSAGE);
    }
}
