import { For, Show, createSignal, onCleanup } from "solid-js";
import { Clapperboard } from "lucide-solid";
import { MediaWorkshopController } from "../controllers/MediaWorkshopController";
import type { MediaWorkshopSegment } from "../controllers/MediaWorkshopController";

interface MediaWorkshopViewProps {
    segments: readonly MediaWorkshopSegment[];
    selectedSegmentId: string | null;
    error: string | null;
    onAddSegment: (input: { startMs: string; endMs: string; text: string }) => void;
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
}

export function MediaWorkshopView(props: MediaWorkshopViewProps) {
    const [startMs, setStartMs] = createSignal("");
    const [endMs, setEndMs] = createSignal("");
    const [text, setText] = createSignal("");
    const [draft, setDraft] = createSignal("");
    return (
        <section>
            <h1>
                <Clapperboard class="fw-icon" />
                Media workshop
            </h1>
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
    onCleanup(
        controller.subscribe(() => {
            setSegments(controller.getSegments());
            setSelectedSegmentId(controller.getSelectedSegmentId());
            setError(controller.getError());
        }),
    );
    return (
        <MediaWorkshopView
            segments={segments()}
            selectedSegmentId={selectedSegmentId()}
            error={error()}
            onAddSegment={(input) => controller.addSegment(input)}
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
        />
    );
}
