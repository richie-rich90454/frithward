import { AppError } from "@frithward/contracts";
import {
    CaptionProject,
    CaptionStudioController as MediaCaptionStudioController,
    CaptionStudioViewModel,
    EditSubtitleUseCase,
    GenerateCaptionsUseCase,
    WhisperWasmAdapter,
} from "@frithward/media-core";
import type { CaptionRepository, SpeechRecognitionPort } from "@frithward/media-core";
import { LocalStorageCaptionRepository } from "../../infrastructure/LocalStorageCaptionRepository.js";

export interface CaptionGenerationRecognizer extends SpeechRecognitionPort {
    start?(): Promise<void>;
    stop?(): Promise<void>;
}

export interface CaptionGenerationInput {
    audio: ArrayBuffer;
    modelUrl: string;
    wasmUrl: string;
    language: string;
    signal?: AbortSignal;
}

export type CaptionGenerationStage =
    | "idle"
    | "loading model"
    | "transcribing"
    | "done"
    | "cancelled"
    | "error";

export interface CaptionGenerationStatus {
    stage: CaptionGenerationStage;
    message: string | null;
}

export interface CaptionStudioControllerOptions {
    recognizerFactory?: (input: {
        modelUrl: string;
        wasmUrl: string;
    }) => CaptionGenerationRecognizer;
    repository?: CaptionRepository;
}

export class CaptionStudioController {
    private readonly controller: MediaCaptionStudioController;
    private readonly project: CaptionProject;
    private readonly repository: CaptionRepository;
    private readonly recognizerFactory: NonNullable<
        CaptionStudioControllerOptions["recognizerFactory"]
    >;
    private readonly listeners = new Set<() => void>();
    private viewModel: CaptionStudioViewModel;
    private error: string | null = null;
    private generation: CaptionGenerationStatus = { stage: "idle", message: null };
    private generationAbort: AbortController | null = null;

    public constructor(options: CaptionStudioControllerOptions = {}) {
        this.project = new CaptionProject({
            id: "caption-studio",
            title: "Untitled captions",
            language: "en",
        });
        this.repository = options.repository ?? new LocalStorageCaptionRepository();
        this.recognizerFactory =
            options.recognizerFactory ??
            ((input) =>
                new WhisperWasmAdapter({ modelUrl: input.modelUrl, wasmUrl: input.wasmUrl }));
        this.controller = new MediaCaptionStudioController({
            project: this.project,
            editor: new EditSubtitleUseCase(this.repository),
        });
        this.viewModel = this.controller.getViewModel();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getViewModel(): CaptionStudioViewModel {
        return this.viewModel;
    }

    public getError(): string | null {
        return this.error;
    }

    public getGenerationStatus(): CaptionGenerationStatus {
        return this.generation;
    }

    public select(segmentId: string): void {
        this.controller.select(segmentId);
        this.refresh();
    }

    public async applyEdit(input: { segmentId: string; text: string }): Promise<void> {
        try {
            await this.controller.applyEdit(input);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Edit failed.";
        }
        this.refresh();
    }

    public async generateCaptions(input: CaptionGenerationInput): Promise<void> {
        const abort = new AbortController();
        this.generationAbort = abort;
        const onExternalAbort = () => abort.abort(input.signal?.reason);
        if (input.signal) {
            if (input.signal.aborted) onExternalAbort();
            else input.signal.addEventListener("abort", onExternalAbort, { once: true });
        }

        let recognizer: CaptionGenerationRecognizer | null = null;
        try {
            this.setGeneration("loading model", "Loading speech model...");
            recognizer = this.recognizerFactory({
                modelUrl: input.modelUrl,
                wasmUrl: input.wasmUrl,
            });
            await recognizer.start?.();
            if (abort.signal.aborted)
                throw new AppError("CANCELLED", "Caption generation cancelled.");

            this.setGeneration("transcribing", "Transcribing audio...");
            this.project.language = input.language;
            const generate = new GenerateCaptionsUseCase(recognizer, this.repository);
            await generate.execute({
                project: this.project,
                audio: input.audio,
                signal: abort.signal,
            });

            const count = this.project.segmentCount;
            this.error = null;
            this.setGeneration("done", `${count} caption${count === 1 ? "" : "s"} generated.`);
        } catch (cause) {
            const cancelled =
                abort.signal.aborted || (cause instanceof AppError && cause.code === "CANCELLED");
            const message = cancelled
                ? "Caption generation cancelled."
                : cause instanceof Error
                  ? cause.message
                  : "Caption generation failed.";
            this.error = cancelled ? null : message;
            this.setGeneration(cancelled ? "cancelled" : "error", message);
        } finally {
            input.signal?.removeEventListener("abort", onExternalAbort);
            if (this.generationAbort === abort) this.generationAbort = null;
            try {
                await recognizer?.stop?.();
            } catch {
                // Model cleanup is best-effort; the generation result is already final.
            }
        }
    }

    public async generateCaptionsFromFile(
        input: Omit<CaptionGenerationInput, "audio"> & { file: File },
    ): Promise<void> {
        const { file, ...rest } = input;
        await this.generateCaptions({
            audio: await file.arrayBuffer(),
            ...rest,
        });
    }

    public cancelGeneration(): void {
        this.generationAbort?.abort();
    }

    private setGeneration(stage: CaptionGenerationStage, message: string): void {
        this.generation = { stage, message };
        this.refresh();
    }

    private refresh(): void {
        this.viewModel = this.controller.getViewModel();
        for (const listener of this.listeners) listener();
    }
}
