import { For, Show, createSignal, onCleanup } from "solid-js";
import { CalendarClock } from "lucide-solid";
import { IncidentTimelineController } from "../controllers/IncidentTimelineController";
import type { IncidentTimelineEntry } from "../controllers/IncidentTimelineController";

interface IncidentTimelineViewProps {
    entries: readonly IncidentTimelineEntry[];
    error: string | null;
    onAnalyze: (input: { text: string; receivedAt: string }) => void;
    onReset: () => void;
}

export function IncidentTimelineView(props: IncidentTimelineViewProps) {
    const [text, setText] = createSignal("");
    const [receivedAt, setReceivedAt] = createSignal("");
    return (
        <section>
            <h1>
                <CalendarClock class="fw-icon" />
                Incident timeline
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onAnalyze({ text: text(), receivedAt: receivedAt() });
                }}
            >
                <label>
                    Message text
                    <textarea
                        value={text()}
                        onInput={(event) => setText(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Received at
                    <input
                        value={receivedAt()}
                        placeholder="2026-01-01 12:00"
                        onInput={(event) => setReceivedAt(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Add to timeline</button>
                <button type="button" onClick={props.onReset}>
                    Reset
                </button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.entries.length > 0}>
                <ol>
                    <For each={props.entries}>
                        {(entry) => (
                            <li>
                                <strong>{entry.title}</strong>
                                {entry.detail}
                            </li>
                        )}
                    </For>
                </ol>
            </Show>
        </section>
    );
}

export function IncidentTimelinePage() {
    const controller = new IncidentTimelineController();
    const [entries, setEntries] = createSignal(controller.getEntries());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setEntries(controller.getEntries());
            setError(controller.getError());
        }),
    );
    return (
        <IncidentTimelineView
            entries={entries()}
            error={error()}
            onAnalyze={(input) => controller.analyze(input)}
            onReset={() => controller.reset()}
        />
    );
}
