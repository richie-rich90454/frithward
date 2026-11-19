import { For, Show, createSignal, onCleanup } from "solid-js";
import { Clapperboard } from "lucide-solid";
import { MediaWorkshopController } from "../controllers/MediaWorkshopController";
import type { MediaWorkshopSegment } from "../controllers/MediaWorkshopController";

interface MediaWorkshopViewProps {
    segments: readonly MediaWorkshopSegment[];
    selectedSegmentId: string | null;
    error: string | null;
    transcodeStatus: string | null;
    redactionStatus: string | null;
    previewUrl: string | null;
    onAddSegment: (input: { startMs: string; endMs: string; text: string }) => void;
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
    onAudioSelected: (file: File) => void;
    onRedactImage: (input: {
        file: File;
        x: string;
        y: string;
        width: string;
        height: string;
    }) => void;
}

export function MediaWorkshopView(props: MediaWorkshopViewProps) {
    const [startMs, setStartMs] = createSignal("");
    const [endMs, setEndMs] = createSignal("");
    const [text, setText] = createSignal("");
    const [draft, setDraft] = createSignal("");
    const [imageFile, setImageFile] = createSignal<File | null>(null);
    const [x, setX] = createSignal("0");
    const [y, setY] = createSignal("0");
    const [width, setWidth] = createSignal("");
    const [height, setHeight] = createSignal("");
    return (
        <section>
            <h1>
                <Clapperboard class="fw-icon" />
                Media workshop
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const file = imageFile();
                    if (!file) return;
                    props.onRedactImage({ file, x: x(), y: y(), width: width(), height: height() });
                }}
            >
                <label>
                    Audio file (decode and transcode)
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) props.onAudioSelected(file);
                        }}
                    />
                </label>
                <label>
                    Image file
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    Region x
                    <input value={x()} onInput={(event) => setX(event.currentTarget.value)} />
                </label>
                <label>
                    Region y
                    <input value={y()} onInput={(event) => setY(event.currentTarget.value)} />
                </label>
                <label>
                    Region width
                    <input
                        value={width()}
                        onInput={(event) => setWidth(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Region height
                    <input
                        value={height()}
                        onInput={(event) => setHeight(event.currentTarget.value)}
                    />
                </label>
                <button type="submit" disabled={!imageFile() || !width() || !height()}>
                    Redact region
                </button>
            </form>
            <Show when={props.transcodeStatus}>
                <p>{props.transcodeStatus}</p>
            </Show>
            <Show when={props.redactionStatus}>
                <p>{props.redactionStatus}</p>
            </Show>
            <Show when={props.previewUrl}>
                {(url) => <img src={url()} alt="Redacted preview" />}
            </Show>
            <p>
                Processing is local: audio uses AudioContext and WebCodecs (AAC), and redaction uses
                createImageBitmap and Canvas 2D. Unsupported browsers report an error instead of a
                fake result.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onAddSegment({ startMs: startMs(), endMs: endMs(), text: text() });
                    setStartMs("");
                    setEndMs("");
                    setText("");
                }}
            >
                <label>
                    Start (ms)
                    <input
                        type="number"
                        value={startMs()}
                        onInput={(event) => setStartMs(event.currentTarget.value)}
                    />
                </label>
                <label>
                    End (ms)
                    <input
                        type="number"
                        value={endMs()}
                        onInput={(event) => setEndMs(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Text
                    <input value={text()} onInput={(event) => setText(event.currentTarget.value)} />
                </label>
                <button type="submit">Add segment</button>
            </form>
            <ul>
                <For each={props.segments}>
                    {(segment) => (
                        <li>
                            <button
                                type="button"
                                aria-pressed={segment.id === props.selectedSegmentId}
                                onClick={() => {
                                    props.onSelect(segment.id);
                                    setDraft(segment.text);
                                }}
                            >
                                {segment.startMs}&ndash;{segment.endMs} {segment.text}
                            </button>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.selectedSegmentId} keyed>
                {(segmentId) => (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (draft().trim().length === 0) return;
                            props.onApplyEdit({ segmentId, text: draft() });
                        }}
                    >
                        <label>
                            Segment text
                            <input
                                value={draft()}
                                onInput={(event) => setDraft(event.currentTarget.value)}
                            />
                        </label>
                        <button type="submit">Save segment</button>
                    </form>
                )}
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function MediaWorkshopPage() {
    const controller = new MediaWorkshopController();
    const [segments, setSegments] = createSignal(controller.getSegments());
    const [selectedSegmentId, setSelectedSegmentId] = createSignal(
        controller.getSelectedSegmentId(),
    );
    const [error, setError] = createSignal(controller.getError());
    const [transcodeStatus, setTranscodeStatus] = createSignal(controller.getTranscodeStatus());
    const [redactionStatus, setRedactionStatus] = createSignal(controller.getRedactionStatus());
    const [previewUrl, setPreviewUrl] = createSignal(controller.getPreviewUrl());
    onCleanup(
        controller.subscribe(() => {
            setSegments(controller.getSegments());
            setSelectedSegmentId(controller.getSelectedSegmentId());
            setError(controller.getError());
            setTranscodeStatus(controller.getTranscodeStatus());
            setRedactionStatus(controller.getRedactionStatus());
            setPreviewUrl(controller.getPreviewUrl());
        }),
    );
    onCleanup(() => controller.dispose());
    return (
        <MediaWorkshopView
            segments={segments()}
            selectedSegmentId={selectedSegmentId()}
            error={error()}
            transcodeStatus={transcodeStatus()}
            redactionStatus={redactionStatus()}
            previewUrl={previewUrl()}
            onAddSegment={(input) => controller.addSegment(input)}
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
            onAudioSelected={(file) => void controller.transcodeAudio(file)}
            onRedactImage={(input) => void controller.redactImage(input)}
        />
    );
}
