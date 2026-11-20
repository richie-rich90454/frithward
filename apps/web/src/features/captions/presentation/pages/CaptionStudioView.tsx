import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Captions } from "lucide-solid";
import type { CaptionStudioViewModel } from "@frithward/media-core";
import type { CaptionGenerationStage } from "../controllers/CaptionStudioController";
import { CaptionStudioController } from "../controllers/CaptionStudioController";
import { useI18n } from "../../../../i18n/index.js";
import "../captions.css";

// Solid's JSX types restrict capture to "user"/"environment"; pass the requested
// "microphone" hint through to the DOM unchanged.
const microphoneCapture = "microphone" as unknown as "user";

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
    );
}

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
    const { t } = useI18n();
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

    onMount(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const modifier = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();
            if (modifier && key === "z") {
                event.preventDefault();
                if (event.shiftKey) props.onRedo();
                else props.onUndo();
                return;
            }
            if (modifier && key === "y") {
                event.preventDefault();
                props.onRedo();
                return;
            }
            if (
                (event.key === "Delete" || event.key === "Backspace") &&
                !modifier &&
                !event.altKey &&
                !isEditableTarget(event.target)
            ) {
                const selectedId = props.viewModel.selectedSegmentId;
                if (selectedId) {
                    event.preventDefault();
                    props.onRemoveSegment(selectedId);
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        onCleanup(() => window.removeEventListener("keydown", onKeyDown));
    });

    return (
        <section
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer?.files?.[0];
                if (file) setAudioFile(file);
            }}
        >
            <h1>
                <Captions class="fw-icon" />
                {t("captions.title")}
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
                <p>{t("captions.dragDrop")}</p>
                <label>
                    {t("captions.fileLabel")}
                    <input
                        type="file"
                        accept="audio/*,video/*"
                        onChange={(event) => setAudioFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    {t("captions.recordAudio")}
                    <input
                        type="file"
                        accept="audio/*"
                        capture={microphoneCapture}
                        onChange={(event) => setAudioFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <details>
                    <summary>{t("captions.advanced")}</summary>
                    <label>
                        {t("captions.modelUrl")}
                        <input
                            value={modelUrl()}
                            onInput={(event) => setModelUrl(event.currentTarget.value)}
                        />
                    </label>
                    <label>
                        {t("captions.wasmUrl")}
                        <input
                            value={wasmUrl()}
                            onInput={(event) => setWasmUrl(event.currentTarget.value)}
                        />
                    </label>
                </details>
                <label>
                    {t("captions.languageCode")}
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
                    {t("captions.generate")}
                </button>
                <button
                    type="button"
                    onClick={props.onCancelGeneration}
                    disabled={
                        props.generationStage !== "loading model" &&
                        props.generationStage !== "transcribing"
                    }
                >
                    {t("captions.cancel")}
                </button>
            </form>
            <p>
                {t("captions.status")} {props.generationStage}
                <Show when={props.generationMessage}>{(message) => ` - ${message()}`}</Show>
            </p>
            <p>{t("captions.localNote")}</p>
            <p>{t("captions.modelNote")}</p>
            <div class="caption-studio-actions">
                <button type="button" onClick={props.onUndo} disabled={!props.canUndo}>
                    {t("captions.undo")}
                </button>
                <button type="button" onClick={props.onRedo} disabled={!props.canRedo}>
                    {t("captions.redo")}
                </button>
                <button type="button" onClick={() => props.onExport("vtt")}>
                    {t("captions.exportVtt")}
                </button>
                <button type="button" onClick={() => props.onExport("srt")}>
                    {t("captions.exportSrt")}
                </button>
            </div>
            <p class="caption-studio-shortcuts">{t("captions.shortcuts")}</p>
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
                <h2>{t("captions.segments")}</h2>
                <label>
                    {t("time.startMs")}
                    <input
                        type="number"
                        value={newStart()}
                        onInput={(event) => setNewStart(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("time.endMs")}
                    <input
                        type="number"
                        value={newEnd()}
                        onInput={(event) => setNewEnd(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("captions.captionText")}
                    <input
                        value={newText()}
                        onInput={(event) => setNewText(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("captions.speaker")}
                    <input
                        value={newSpeaker()}
                        onInput={(event) => setNewSpeaker(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("action.addSegment")}</button>
            </form>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onReplaceAll(searchQuery(), replaceText());
                }}
            >
                <label>
                    {t("captions.search")}
                    <input
                        value={searchQuery()}
                        onInput={(event) => setSearchQuery(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("captions.replaceWith")}
                    <input
                        value={replaceText()}
                        onInput={(event) => setReplaceText(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("captions.replaceAll")}</button>
            </form>
            <div class="caption-studio-editor">
                <ul>
                    <For each={props.viewModel.segments}>
                        {(segment) => {
                            const [start, setStart] = createSignal(String(segment.startMs));
                            const [end, setEnd] = createSignal(String(segment.endMs));
                            return (
                                <li>
                                    <button
                                        type="button"
                                        aria-pressed={
                                            segment.id === props.viewModel.selectedSegmentId
                                        }
                                        onClick={() => {
                                            props.onSelect(segment.id);
                                            setDraft(segment.text);
                                        }}
                                    >
                                        {segment.text}
                                    </button>
                                    <div class="caption-studio-timings">
                                        <label>
                                            {t("time.startMs")}
                                            <input
                                                type="number"
                                                value={start()}
                                                onInput={(event) =>
                                                    setStart(event.currentTarget.value)
                                                }
                                            />
                                        </label>
                                        <label>
                                            {t("time.endMs")}
                                            <input
                                                type="number"
                                                value={end()}
                                                onInput={(event) =>
                                                    setEnd(event.currentTarget.value)
                                                }
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
                                            {t("captions.applyRetime")}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => props.onRemoveSegment(segment.id)}
                                    >
                                        {t("captions.remove")}
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
                                {t("captions.captionText")}
                                <input
                                    value={draft()}
                                    onInput={(event) => setDraft(event.currentTarget.value)}
                                />
                            </label>
                            <button type="submit">{t("captions.saveCaption")}</button>
                        </form>
                    )}
                </Show>
            </div>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function CaptionStudioPage() {
    const { t } = useI18n();
    const controller = new CaptionStudioController({ translate: t });
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
    onMount(() => void controller.hydrate());
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
