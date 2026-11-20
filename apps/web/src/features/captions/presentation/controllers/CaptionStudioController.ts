import { AppError } from "@frithward/contracts";
import { BrowserWhisper } from "browser-whisper";
import { BrowserWhisperAdapter } from "../../infrastructure/BrowserWhisperAdapter.js";
import {
    CaptionProject,
    CaptionStudioController as MediaCaptionStudioController,
    CaptionStudioViewModel,
    EditSubtitleUseCase,
    ExportSubtitlesUseCase,
    GenerateCaptionsUseCase,
    SubtitleSegment,
    WhisperWasmAdapter,
} from "@frithward/media-core";
import type {
    CaptionRepository,
    CaptionStudioViewModelSegment,
    SpeechRecognitionPort,
} from "@frithward/media-core";
import { LocalStorageCaptionRepository } from "../../infrastructure/LocalStorageCaptionRepository.js";
import { LocalModelResolver, type ModelResolver } from "../../infrastructure/LocalModelResolver.js";

export interface CaptionGenerationRecognizer extends SpeechRecognitionPort {
    start?(): Promise<void>;
    stop?(): Promise<void>;
}

export interface CaptionGenerationInput {
    audio: ArrayBuffer;
    /** Local whisper.cpp model URL. Only used together with wasmUrl on the opt-in WASM path. */
    modelUrl?: string;
    /** Local Whisper WASM runtime URL. Supplying it opts into the legacy WASM path. */
    wasmUrl?: string;
    language: string;
    /** MIME type of the uploaded audio, used by the WebGPU path to decode the file. */
    mimeType?: string;
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

type SegmentSnapshot = CaptionStudioViewModelSegment;

const MAX_UNDO_HISTORY = 50;

export interface CaptionBrowserWhisperFactoryInput {
    language: string;
    mimeType?: string;
    signal: AbortSignal;
    onStatus: (stage: string) => void;
}

export interface CaptionStudioControllerOptions {
    /** Optional legacy whisper.cpp/WASM recognizer, used only when wasmUrl is supplied. */
    recognizerFactory?: (input: {
        modelUrl: string;
        wasmUrl: string;
    }) => CaptionGenerationRecognizer;
    /** Default local WebGPU recognizer factory; injectable for tests. */
    browserWhisperFactory?: (
        input: CaptionBrowserWhisperFactoryInput,
    ) => CaptionGenerationRecognizer;
    repository?: CaptionRepository;
    modelResolver?: ModelResolver;
}

export class CaptionStudioController {
    private readonly controller: MediaCaptionStudioController;
    private readonly editor: EditSubtitleUseCase;
    private readonly project: CaptionProject;
    private readonly repository: CaptionRepository;
    private readonly modelResolver: ModelResolver;
    private readonly recognizerFactory: NonNullable<
        CaptionStudioControllerOptions["recognizerFactory"]
    >;
    private readonly browserWhisperFactory: NonNullable<
        CaptionStudioControllerOptions["browserWhisperFactory"]
    >;
    private readonly listeners = new Set<() => void>();
    private viewModel: CaptionStudioViewModel;
    private error: string | null = null;
    private generation: CaptionGenerationStatus = { stage: "idle", message: null };
    private generationAbort: AbortController | null = null;
    private nextSegmentId = 0;
    private undoStack: SegmentSnapshot[][] = [];
    private redoStack: SegmentSnapshot[][] = [];

    public constructor(options: CaptionStudioControllerOptions = {}) {
        this.project = new CaptionProject({
            id: "caption-studio",
            title: "Untitled captions",
            language: "en",
        });
        this.repository = options.repository ?? new LocalStorageCaptionRepository();
        this.modelResolver = options.modelResolver ?? new LocalModelResolver();
        this.recognizerFactory =
            options.recognizerFactory ??
            ((input) =>
                new WhisperWasmAdapter({ modelUrl: input.modelUrl, wasmUrl: input.wasmUrl }));
        this.browserWhisperFactory =
            options.browserWhisperFactory ??
            ((input) => {
                const whisper = new BrowserWhisper({ language: input.language });
                return new BrowserWhisperAdapter({
                    engine: whisper,
                    language: input.language,
                    signal: input.signal,
                    onStatus: input.onStatus,
                    ...(input.mimeType ? { fileType: input.mimeType } : {}),
                });
            });
        this.editor = new EditSubtitleUseCase(this.repository);
        this.controller = new MediaCaptionStudioController({
            project: this.project,
            editor: this.editor,
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
        const before = this.captureSnapshot();
        try {
            await this.controller.applyEdit(input);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Edit failed.";
        }
        this.commitUndoIfChanged(before);
        this.refresh();
    }

    public addSegment(input: {
        startMs: number;
        endMs: number;
        text: string;
        speakerId?: string | null;
    }): void {
        const before = this.captureSnapshot();
        try {
            this.project.addSegment(
                new SubtitleSegment({
                    id: this.createSegmentId(),
                    startMs: input.startMs,
                    endMs: input.endMs,
                    text: input.text,
                    speakerId: input.speakerId ?? null,
                }),
            );
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not add segment.";
            this.refresh();
            return;
        }
        this.commitUndoIfChanged(before);
        this.persist();
        this.refresh();
    }

    public removeSegment(id: string): void {
        const before = this.captureSnapshot();
        try {
            this.project.removeSegment(id);
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not remove segment.";
            this.refresh();
            return;
        }
        this.commitUndoIfChanged(before);
        this.persist();
        this.refresh();
    }

    public async retimeSegment(input: {
        segmentId: string;
        startMs: number;
        endMs: number;
    }): Promise<void> {
        const before = this.captureSnapshot();
        try {
            await this.editor.execute({
                project: this.project,
                segmentId: input.segmentId,
                startMs: input.startMs,
                endMs: input.endMs,
            });
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not retime segment.";
        }
        this.commitUndoIfChanged(before);
        this.refresh();
    }

    public search(query: string): readonly CaptionStudioViewModelSegment[] {
        const needle = query.trim().toLowerCase();
        if (needle.length === 0) return [];
        return this.captureSnapshot().filter((segment) =>
            segment.text.toLowerCase().includes(needle),
        );
    }

    public async replaceAll(from: string, to: string): Promise<void> {
        if (from.length === 0) {
            this.error = "Enter text to replace.";
            this.refresh();
            return;
        }
        const before = this.captureSnapshot();
        const matches = this.project
            .listSegments()
            .filter((segment) => segment.text.includes(from));
        try {
            for (const segment of matches) {
                await this.editor.execute({
                    project: this.project,
                    segmentId: segment.id,
                    text: segment.text.split(from).join(to),
                });
            }
            this.error = null;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Replace failed.";
        }
        this.commitUndoIfChanged(before);
        this.refresh();
    }

    public exportSubtitles(format: "vtt" | "srt"): string {
        try {
            return new ExportSubtitlesUseCase().execute({ project: this.project, format });
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Export failed.";
            this.refresh();
            throw cause;
        }
    }

    public undo(): void {
        const snapshot = this.undoStack.pop();
        if (!snapshot) return;
        this.pushRedo(this.captureSnapshot());
        this.restore(snapshot);
    }

    public redo(): void {
        const snapshot = this.redoStack.pop();
        if (!snapshot) return;
        this.pushUndo(this.captureSnapshot());
        this.restore(snapshot);
    }

    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /** Restores the locally saved project on startup; call once from the view. */
    public async hydrate(): Promise<void> {
        try {
            const loaded = await this.repository.load(this.project.id);
            if (!loaded) return;
            this.undoStack = [];
            this.redoStack = [];
            this.nextSegmentId = 0;
            this.restore(
                loaded.listSegments().map((segment) => ({
                    id: segment.id,
                    startMs: segment.startMs,
                    endMs: segment.endMs,
                    text: segment.text,
                    speakerId: segment.speakerId,
                })),
            );
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Could not load captions.";
            this.refresh();
        }
    }

    public async generateCaptions(input: CaptionGenerationInput): Promise<void> {
        const before = this.captureSnapshot();
        const abort = new AbortController();
        this.generationAbort = abort;
        const onExternalAbort = () => abort.abort(input.signal?.reason);
        if (input.signal) {
            if (input.signal.aborted) onExternalAbort();
            else input.signal.addEventListener("abort", onExternalAbort, { once: true });
        }

        let recognizer: CaptionGenerationRecognizer | null = null;
        try {
            if (input.wasmUrl) {
                // Opt-in legacy path: user-supplied WASM runtime + model, no auto download.
                this.setGeneration("loading model", "Loading speech model...");
                const model = await this.modelResolver.resolve(input.modelUrl);
                if (abort.signal.aborted)
                    throw new AppError("CANCELLED", "Caption generation cancelled.");
                recognizer = this.recognizerFactory({
                    modelUrl: model.url,
                    wasmUrl: input.wasmUrl,
                });
            } else {
                // Default path: local WebGPU transcription, no user-supplied assets.
                this.setGeneration("loading model", "Preparing WebGPU transcription...");
                recognizer = this.browserWhisperFactory({
                    language: input.language,
                    ...(input.mimeType ? { mimeType: input.mimeType } : {}),
                    signal: abort.signal,
                    onStatus: (stage) => this.onRecognitionStatus(stage),
                });
            }
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
            this.commitUndoIfChanged(before);
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
            mimeType: file.type,
            ...rest,
        });
    }

    public cancelGeneration(): void {
        this.generationAbort?.abort();
    }

    private onRecognitionStatus(stage: string): void {
        if (stage === "loading") this.setGeneration("loading model", "Loading speech model...");
        else if (stage === "decoding" || stage === "transcribing")
            this.setGeneration("transcribing", "Transcribing audio...");
    }

    private setGeneration(stage: CaptionGenerationStage, message: string): void {
        this.generation = { stage, message };
        this.refresh();
    }

    private createSegmentId(): string {
        let candidate = this.nextSegmentId++;
        const prefix = `${this.project.id}-seg-`;
        while (this.project.listSegments().some((segment) => segment.id === prefix + candidate)) {
            candidate = this.nextSegmentId++;
        }
        return prefix + candidate;
    }

    private captureSnapshot(): SegmentSnapshot[] {
        return this.project.listSegments().map((segment) => ({
            id: segment.id,
            startMs: segment.startMs,
            endMs: segment.endMs,
            text: segment.text,
            speakerId: segment.speakerId,
        }));
    }

    private snapshotsEqual(a: readonly SegmentSnapshot[], b: readonly SegmentSnapshot[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((segment, index) => {
            const other = b[index];
            return (
                other !== undefined &&
                other.id === segment.id &&
                other.startMs === segment.startMs &&
                other.endMs === segment.endMs &&
                other.text === segment.text &&
                other.speakerId === segment.speakerId
            );
        });
    }

    private pushUndo(snapshot: SegmentSnapshot[]): void {
        this.undoStack.push(snapshot);
        if (this.undoStack.length > MAX_UNDO_HISTORY) this.undoStack.shift();
    }

    private pushRedo(snapshot: SegmentSnapshot[]): void {
        this.redoStack.push(snapshot);
        if (this.redoStack.length > MAX_UNDO_HISTORY) this.redoStack.shift();
    }

    private recordUndo(snapshot: SegmentSnapshot[]): void {
        this.pushUndo(snapshot);
        this.redoStack = [];
    }

    private commitUndoIfChanged(before: SegmentSnapshot[]): void {
        if (!this.snapshotsEqual(before, this.captureSnapshot())) this.recordUndo(before);
    }

    private restore(snapshot: readonly SegmentSnapshot[]): void {
        for (const id of this.project.listSegments().map((segment) => segment.id)) {
            this.project.removeSegment(id);
        }
        for (const segment of snapshot) {
            this.project.addSegment(new SubtitleSegment(segment));
        }
        this.error = null;
        this.persist();
        this.refresh();
    }

    private persist(): void {
        void this.repository.save(this.project).catch((cause: unknown) => {
            this.error = cause instanceof Error ? cause.message : "Could not save captions.";
            this.refresh();
        });
    }

    private refresh(): void {
        this.viewModel = this.controller.getViewModel();
        for (const listener of this.listeners) listener();
    }
}
