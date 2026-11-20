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
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
    onGenerateCaptions: (input: {
        file: File;
        modelUrl?: string;
        wasmUrl: string;
        language: string;
    }) => void;
    onCancelGeneration: () => void;
}

export function CaptionStudioView(props: CaptionStudioViewProps) {
    const [draft, setDraft] = createSignal("");
    const [audioFile, setAudioFile] = createSignal<File | null>(null);
    const [modelUrl, setModelUrl] = createSignal("");
    const [wasmUrl, setWasmUrl] = createSignal("");
    const [language, setLanguage] = createSignal("en");
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
                    if (!file || !wasmUrl()) return;
                    props.onGenerateCaptions({
                        file,
                        ...(modelUrl().trim().length > 0 ? { modelUrl: modelUrl() } : {}),
                        wasmUrl: wasmUrl(),
                        language: language(),
                    });
                }}
            >
                <label>
                    Audio file (16-bit mono PCM, 16 kHz)
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) => setAudioFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    Whisper model URL (optional; blank uses /models/whisper-tiny.bin if installed)
                    <input
                        value={modelUrl()}
                        onInput={(event) => setModelUrl(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Whisper WASM URL
                    <input
                        value={wasmUrl()}
                        onInput={(event) => setWasmUrl(event.currentTarget.value)}
                    />
                </label>
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
                        !wasmUrl() ||
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
            <p>
                Local generation needs a Whisper WASM runtime supplied by you and a model: either
                place whisper-tiny.bin in public/models/ and rebuild, or supply a model URL. No
                model is downloaded automatically. A cross-origin-isolated page (COOP/COEP) and raw
                16-bit little-endian mono audio at 16 kHz are also required. No audio is uploaded.
            </p>
            <ul>
                <For each={props.viewModel.segments}>
                    {(segment) => (
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
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.viewModel.selectedSegmentId} keyed>
                {(segmentId) => (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (draft().trim().length === 0) return;
                            props.onApplyEdit({ segmentId, text: draft() });
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
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
            onGenerateCaptions={(input) => void controller.generateCaptionsFromFile(input)}
            onCancelGeneration={() => controller.cancelGeneration()}
        />
    );
}
