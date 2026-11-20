import { For, Show, createSignal, onCleanup } from "solid-js";
import { Captions } from "lucide-solid";
import type { CaptionStudioViewModel } from "@frithward/media-core";
import type { CaptionGenerationStage } from "../controllers/CaptionStudioController";
import { CaptionStudioController } from "../controllers/CaptionStudioController";

interface CaptionStudioViewProps {
    viewModel: CaptionStudioViewModel;
    error: string | null;
    generationStage: CaptionGenerationStage;
    generationMessage: string | null;
    canUndo: boolean;
    canRedo: boolean;
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
    onGenerateCaptions: (input: {
        file: File;
        modelUrl?: string;
        wasmUrl?: string;
        language: string;
    }) => void;
    onCancelGeneration: () => void;
    onAddSegment: (input: {
        startMs: number;
        endMs: number;
        text: string;
        speakerId?: string | null;
    }) => void;
    onRemoveSegment: (id: string) => void;
    onRetimeSegment: (input: { segmentId: string; startMs: number; endMs: number }) => void;
    onReplaceAll: (from: string, to: string) => void;
    onUndo: () => void;
    onRedo: () => void;
    onExport: (format: "vtt" | "srt") => void;
}

export function CaptionStudioView(props: CaptionStudioViewProps) {
    const [draft, setDraft] = createSignal("");
    const [audioFile, setAudioFile] = createSignal<File | null>(null);
    const [modelUrl, setModelUrl] = createSignal("");
    const [wasmUrl, setWasmUrl] = createSignal("");
    const [language, setLanguage] = createSignal("en");
    const [newStart, setNewStart] = createSignal("");
    const [newEnd, setNewEnd] = createSignal("");
    const [newText, setNewText] = createSignal("");
    const [newSpeaker, setNewSpeaker] = createSignal("");
    const [searchQuery, setSearchQuery] = createSignal("");
    const [replaceText, setReplaceText] = createSignal("");

    const selectedSegment = () =>
        props.viewModel.segments.find(
            (segment) => segment.id === props.viewModel.selectedSegmentId,
        );

    return (
        <section>
            <h1>
                <Captions class="fw-icon" />
                Caption studio
            </h1>
            <p>
                {props.viewModel.title} &middot; {props.viewModel.language}
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const file = audioFile();
                    if (!file) return;
                    props.onGenerateCaptions({
                        file,
                        ...(modelUrl().trim().length > 0 ? { modelUrl: modelUrl() } : {}),
                        ...(wasmUrl().trim().length > 0 ? { wasmUrl: wasmUrl() } : {}),
                        language: language(),
                    });
                }}
            >
                <label>
                    Audio or video file (decoded locally with WebCodecs)
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) => setAudioFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <details>
                    <summary>Advanced: supply your own Whisper WASM runtime and model</summary>
                    <label>
                        Whisper model URL (blank uses /models/whisper-tiny.bin if installed)
                        <input
                            value={modelUrl()}
                            onInput={(event) => setModelUrl(event.currentTarget.value)}
                        />
                    </label>
                    <label>
                        Whisper WASM URL (blank uses the local WebGPU engine above)
                        <input
                            value={wasmUrl()}
                            onInput={(event) => setWasmUrl(event.currentTarget.value)}
                        />
                    </label>
                </details>
                <label>
                    Language code
                    <input
                        value={language()}
                        onInput={(event) => setLanguage(event.currentTarget.value)}
                    />
                </label>
                <button
                    type="submit"
                    disabled={
                        !audioFile() ||
                        props.generationStage === "loading model" ||
                        props.generationStage === "transcribing"
                    }
                >
                    Generate captions
                </button>
                <button
                    type="button"
                    onClick={props.onCancelGeneration}
                    disabled={
                        props.generationStage !== "loading model" &&
                        props.generationStage !== "transcribing"
                    }
                >
                    Cancel
                </button>
            </form>
            <p>
                Status: {props.generationStage}
                <Show when={props.generationMessage}>{(message) => ` - ${message()}`}</Show>
            </p>
            <p>Transcription runs locally with WebGPU (Chrome/Edge 113+). No upload.</p>
            <p>
                The default engine needs no model files from you: model weights are downloaded from
                Hugging Face on first use and cached in the browser, so the first run needs network
                and later runs can work offline. No native install and no cross-origin isolation
                (COOP/COEP) headers are required. To use fully local/offline weights instead, supply
                your own Whisper WASM runtime and a 16-bit mono 16 kHz .bin model under Advanced
                (that path needs a cross-origin-isolated page).
            </p>
            <div>
                <button type="button" onClick={props.onUndo} disabled={!props.canUndo}>
                    Undo
                </button>
                <button type="button" onClick={props.onRedo} disabled={!props.canRedo}>
                    Redo
                </button>
                <button type="button" onClick={() => props.onExport("vtt")}>
                    Export VTT
                </button>
                <button type="button" onClick={() => props.onExport("srt")}>
                    Export SRT
                </button>
            </div>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onAddSegment({
                        startMs: Number(newStart()),
                        endMs: Number(newEnd()),
                        text: newText(),
                        speakerId: newSpeaker().trim().length > 0 ? newSpeaker().trim() : null,
                    });
                    setNewStart("");
                    setNewEnd("");
                    setNewText("");
                    setNewSpeaker("");
                }}
            >
                <h2>Caption segments</h2>
                <label>
                    Start (ms)
                    <input
                        type="number"
                        value={newStart()}
                        onInput={(event) => setNewStart(event.currentTarget.value)}
                    />
                </label>
                <label>
                    End (ms)
                    <input
                        type="number"
                        value={newEnd()}
                        onInput={(event) => setNewEnd(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Caption text
                    <input
                        value={newText()}
                        onInput={(event) => setNewText(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Speaker (optional)
                    <input
                        value={newSpeaker()}
                        onInput={(event) => setNewSpeaker(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Add segment</button>
            </form>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onReplaceAll(searchQuery(), replaceText());
                }}
            >
                <label>
                    Search captions
                    <input
                        value={searchQuery()}
                        onInput={(event) => setSearchQuery(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Replace with
                    <input
                        value={replaceText()}
                        onInput={(event) => setReplaceText(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Replace all</button>
            </form>
            <ul>
                <For each={props.viewModel.segments}>
                    {(segment) => {
                        const [start, setStart] = createSignal(String(segment.startMs));
                        const [end, setEnd] = createSignal(String(segment.endMs));
                        return (
                            <li>
                                <button
                                    type="button"
                                    aria-pressed={segment.id === props.viewModel.selectedSegmentId}
                                    onClick={() => {
                                        props.onSelect(segment.id);
                                        setDraft(segment.text);
                                    }}
                                >
                                    {segment.text}
                                </button>
                                <label>
                                    Start (ms)
                                    <input
                                        type="number"
                                        value={start()}
                                        onInput={(event) => setStart(event.currentTarget.value)}
                                    />
                                </label>
                                <label>
                                    End (ms)
                                    <input
                                        type="number"
                                        value={end()}
                                        onInput={(event) => setEnd(event.currentTarget.value)}
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        props.onRetimeSegment({
                                            segmentId: segment.id,
                                            startMs: Number(start()),
                                            endMs: Number(end()),
                                        })
                                    }
                                >
                                    Apply retime
                                </button>
                                <button
                                    type="button"
                                    onClick={() => props.onRemoveSegment(segment.id)}
                                >
                                    Remove
                                </button>
                            </li>
                        );
                    }}
                </For>
            </ul>
            <Show when={selectedSegment()} keyed>
                {(segment) => (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (draft().trim().length === 0) return;
                            props.onApplyEdit({ segmentId: segment.id, text: draft() });
                        }}
                    >
                        <label>
                            Caption text
                            <input
                                value={draft()}
                                onInput={(event) => setDraft(event.currentTarget.value)}
                            />
                        </label>
                        <button type="submit">Save caption</button>
                    </form>
                )}
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function CaptionStudioPage() {
    const controller = new CaptionStudioController();
    const [viewModel, setViewModel] = createSignal(controller.getViewModel());
    const [error, setError] = createSignal(controller.getError());
    const [canUndo, setCanUndo] = createSignal(controller.canUndo());
    const [canRedo, setCanRedo] = createSignal(controller.canRedo());
    const [generationStage, setGenerationStage] = createSignal(
        controller.getGenerationStatus().stage,
    );
    const [generationMessage, setGenerationMessage] = createSignal(
        controller.getGenerationStatus().message,
    );
    onCleanup(
        controller.subscribe(() => {
            setViewModel(controller.getViewModel());
            setError(controller.getError());
            setCanUndo(controller.canUndo());
            setCanRedo(controller.canRedo());
            const status = controller.getGenerationStatus();
            setGenerationStage(status.stage);
            setGenerationMessage(status.message);
        }),
    );
    return (
        <CaptionStudioView
            viewModel={viewModel()}
            error={error()}
            generationStage={generationStage()}
            generationMessage={generationMessage()}
            canUndo={canUndo()}
            canRedo={canRedo()}
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
            onGenerateCaptions={(input) => void controller.generateCaptionsFromFile(input)}
            onCancelGeneration={() => controller.cancelGeneration()}
            onAddSegment={(input) => controller.addSegment(input)}
            onRemoveSegment={(id) => controller.removeSegment(id)}
            onRetimeSegment={(input) => void controller.retimeSegment(input)}
            onReplaceAll={(from, to) => void controller.replaceAll(from, to)}
            onUndo={() => controller.undo()}
            onRedo={() => controller.redo()}
            onExport={(format) => {
                let contents: string;
                try {
                    contents = controller.exportSubtitles(format);
                } catch {
                    return;
                }
                const blob = new Blob([contents], {
                    type: format === "vtt" ? "text/vtt" : "text/plain",
                });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${viewModel().projectId}.${format}`;
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
                URL.revokeObjectURL(url);
            }}
        />
    );
}
