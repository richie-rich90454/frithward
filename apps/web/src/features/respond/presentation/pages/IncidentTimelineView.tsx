import { For, Show, createSignal, onCleanup } from "solid-js";
import { CalendarClock } from "lucide-solid";
import { IncidentTimelineController } from "../controllers/IncidentTimelineController";
import type {
    EvidenceItem,
    IncidentTimelineEntry,
    ReportHistoryEntry,
} from "../controllers/IncidentTimelineController";

interface IncidentTimelineViewProps {
    entries: readonly IncidentTimelineEntry[];
    evidence: readonly EvidenceItem[];
    history: readonly ReportHistoryEntry[];
    error: string | null;
    onAnalyze: (input: { text: string; receivedAt: string }) => void;
    onAddEvidence: (input: {
        fileName: string;
        content: ArrayBuffer;
        source: string;
    }) => Promise<unknown>;
    onImportReport: (input: {
        fileName: string;
        content: ArrayBuffer;
        report: unknown;
    }) => Promise<unknown>;
    onExport: () => Promise<string>;
    onReset: () => void;
}

const tabular = { "font-variant-numeric": "tabular-nums" };

export function IncidentTimelineView(props: IncidentTimelineViewProps) {
    const [text, setText] = createSignal("");
    const [receivedAt, setReceivedAt] = createSignal("");
    const [file, setFile] = createSignal<File | null>(null);
    const [source, setSource] = createSignal("");
    const [reportFile, setReportFile] = createSignal<File | null>(null);
    const [localError, setLocalError] = createSignal<string | null>(null);

    const addEvidence = async () => {
        const selected = file();
        if (!selected) {
            setLocalError("Choose a file to hash first.");
            return;
        }
        setLocalError(null);
        try {
            await props.onAddEvidence({
                fileName: selected.name,
                content: await selected.arrayBuffer(),
                source: source(),
            });
        } catch (cause) {
            setLocalError(cause instanceof Error ? cause.message : "Could not hash evidence.");
        }
    };

    const importReport = async () => {
        const selected = reportFile();
        if (!selected) {
            setLocalError("Choose a scam check report JSON file first.");
            return;
        }
        let report: unknown;
        try {
            report = JSON.parse(await selected.text());
        } catch {
            setLocalError("The selected file is not valid JSON.");
            return;
        }
        setLocalError(null);
        try {
            await props.onImportReport({
                fileName: selected.name,
                content: await selected.arrayBuffer(),
                report,
            });
        } catch (cause) {
            setLocalError(cause instanceof Error ? cause.message : "Could not import report.");
        }
    };

    const exportReport = async () => {
        try {
            const json = await props.onExport();
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "evidence-report.json";
            link.click();
            URL.revokeObjectURL(url);
        } catch (cause) {
            setLocalError(cause instanceof Error ? cause.message : "Could not export report.");
        }
    };

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

            <h2>Evidence log</h2>
            <p role="note">
                Files are hashed locally in your browser. Nothing is uploaded, and no example
                evidence is added for you.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void addEvidence();
                }}
            >
                <label>
                    Evidence file
                    <input
                        type="file"
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    Source
                    <input
                        value={source()}
                        placeholder="Where this file came from"
                        onInput={(event) => setSource(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Hash and add evidence</button>
            </form>
            <Show when={localError()}>
                <p role="alert">{localError()}</p>
            </Show>
            <Show when={props.evidence.length > 0} fallback={<p>No evidence recorded yet.</p>}>
                <table>
                    <caption>Recorded evidence</caption>
                    <thead>
                        <tr>
                            <th scope="col">ID</th>
                            <th scope="col">File name</th>
                            <th scope="col">SHA-256</th>
                            <th scope="col">Collected at</th>
                            <th scope="col">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        <For each={props.evidence}>
                            {(item) => (
                                <tr>
                                    <td>{item.id}</td>
                                    <td>{item.fileName}</td>
                                    <td style={{ ...tabular, "overflow-wrap": "anywhere" }}>
                                        {item.sha256}
                                    </td>
                                    <td style={tabular}>{item.collectedAt}</td>
                                    <td>{item.source}</td>
                                </tr>
                            )}
                        </For>
                    </tbody>
                </table>
                <button type="button" onClick={() => void exportReport()}>
                    Export report
                </button>
            </Show>

            <h2>Import a scam check report</h2>
            <p role="note">
                Add the JSON downloaded from the scam check as evidence. The file is hashed locally
                in your browser; its findings are not re-analysed here.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void importReport();
                }}
            >
                <label>
                    Scam check report JSON
                    <input
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => setReportFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">Import report as evidence</button>
            </form>

            <h2>Report history</h2>
            <p role="note">Exports are recorded locally in this browser. Nothing is uploaded.</p>
            <Show when={props.history.length > 0} fallback={<p>No reports exported yet.</p>}>
                <ul>
                    <For each={props.history}>
                        {(item) => (
                            <li>
                                <strong>{item.createdAt}</strong> — {item.summary}
                                <br />
                                ID: {item.id}
                                <br />
                                SHA-256: <span style={tabular}>{item.sha256}</span>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </section>
    );
}

export function IncidentTimelinePage() {
    const controller = new IncidentTimelineController();
    const [entries, setEntries] = createSignal(controller.getEntries());
    const [evidence, setEvidence] = createSignal(controller.getEvidence());
    const [history, setHistory] = createSignal(controller.getReportHistory());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setEntries(controller.getEntries());
            setEvidence(controller.getEvidence());
            setHistory(controller.getReportHistory());
            setError(controller.getError());
        }),
    );
    return (
        <IncidentTimelineView
            entries={entries()}
            evidence={evidence()}
            history={history()}
            error={error()}
            onAnalyze={(input) => controller.analyze(input)}
            onAddEvidence={(input) => controller.addEvidence(input)}
            onImportReport={(input) => controller.importScamReport(input)}
            onExport={() => controller.exportReport()}
            onReset={() => controller.reset()}
        />
    );
}
