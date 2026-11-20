import { For, Show, createSignal, onCleanup } from "solid-js";
import { CalendarClock } from "lucide-solid";
import { IncidentTimelineController } from "../controllers/IncidentTimelineController";
import { useI18n } from "../../../../i18n/index.js";
import { useCases } from "../../../../cases/CaseProvider.js";
import { evidenceToCaseInput } from "../toCaseInput.js";
import type {
    EvidenceItem,
    IncidentTimelineEntry,
    ReportHistoryEntry,
} from "../controllers/IncidentTimelineController";

const SAVED_MESSAGE = "Saved to cases";

interface IncidentTimelineViewProps {
    entries: readonly IncidentTimelineEntry[];
    evidence: readonly EvidenceItem[];
    history: readonly ReportHistoryEntry[];
    error: string | null;
    saveError: string | null;
    saved: boolean;
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
    const { t } = useI18n();
    const [text, setText] = createSignal("");
    const [receivedAt, setReceivedAt] = createSignal("");
    const [file, setFile] = createSignal<File | null>(null);
    const [source, setSource] = createSignal("");
    const [reportFile, setReportFile] = createSignal<File | null>(null);
    const [localError, setLocalError] = createSignal<string | null>(null);

    const addEvidence = async () => {
        const selected = file();
        if (!selected) {
            setLocalError(t("respond.chooseFile"));
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
            setLocalError(cause instanceof Error ? cause.message : t("respond.error.hashFailed"));
        }
    };

    const importReport = async () => {
        const selected = reportFile();
        if (!selected) {
            setLocalError(t("respond.chooseReport"));
            return;
        }
        let report: unknown;
        try {
            report = JSON.parse(await selected.text());
        } catch {
            setLocalError(t("respond.invalidJson"));
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
            setLocalError(cause instanceof Error ? cause.message : t("respond.error.importFailed"));
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
            setLocalError(cause instanceof Error ? cause.message : t("respond.error.exportFailed"));
        }
    };

    return (
        <section>
            <h1>
                <CalendarClock class="fw-icon" />
                {t("respond.title")}
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onAnalyze({ text: text(), receivedAt: receivedAt() });
                }}
            >
                <label>
                    {t("respond.messageLabel")}
                    <textarea
                        value={text()}
                        onInput={(event) => setText(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("respond.receivedAt")}
                    <input
                        value={receivedAt()}
                        placeholder="2026-01-01 12:00"
                        onInput={(event) => setReceivedAt(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("respond.addToTimeline")}</button>
                <button type="button" onClick={props.onReset}>
                    {t("respond.reset")}
                </button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.saveError}>
                <p role="alert">{props.saveError}</p>
            </Show>
            <Show when={props.saved}>
                <p role="status">{SAVED_MESSAGE}</p>
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

            <h2>{t("respond.evidenceLog")}</h2>
            <p role="note">{t("respond.evidenceNote")}</p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void addEvidence();
                }}
            >
                <label>
                    {t("respond.evidenceFile")}
                    <input
                        type="file"
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    {t("respond.source")}
                    <input
                        value={source()}
                        placeholder={t("respond.sourcePlaceholder")}
                        onInput={(event) => setSource(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("respond.hashEvidence")}</button>
            </form>
            <Show when={localError()}>
                <p role="alert">{localError()}</p>
            </Show>
            <Show when={props.evidence.length > 0} fallback={<p>{t("respond.noEvidence")}</p>}>
                <table>
                    <caption>{t("respond.recordedEvidence")}</caption>
                    <thead>
                        <tr>
                            <th scope="col">{t("respond.tableId")}</th>
                            <th scope="col">{t("respond.tableFileName")}</th>
                            <th scope="col">{t("respond.tableHash")}</th>
                            <th scope="col">{t("respond.tableCollected")}</th>
                            <th scope="col">{t("respond.tableSource")}</th>
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
                    {t("respond.export")}
                </button>
            </Show>

            <h2>{t("respond.importTitle")}</h2>
            <p role="note">{t("respond.importNote")}</p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void importReport();
                }}
            >
                <label>
                    {t("respond.reportJsonLabel")}
                    <input
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) => setReportFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">{t("respond.importButton")}</button>
            </form>

            <h2>{t("respond.historyTitle")}</h2>
            <p role="note">{t("respond.historyNote")}</p>
            <Show when={props.history.length > 0} fallback={<p>{t("respond.noReports")}</p>}>
                <ul>
                    <For each={props.history}>
                        {(item) => (
                            <li>
                                <strong>{item.createdAt}</strong> — {item.summary}
                                <br />
                                {t("respond.idLabel")} {item.id}
                                <br />
                                {t("respond.sha256Label")}{" "}
                                <span style={tabular}>{item.sha256}</span>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </section>
    );
}

export function IncidentTimelinePage() {
    const { t } = useI18n();
    const controller = new IncidentTimelineController({ translate: t });
    const { saveCase } = useCases();
    const [entries, setEntries] = createSignal(controller.getEntries());
    const [evidence, setEvidence] = createSignal(controller.getEvidence());
    const [history, setHistory] = createSignal(controller.getReportHistory());
    const [error, setError] = createSignal(controller.getError());
    const [saveError, setSaveError] = createSignal<string | null>(null);
    const [saved, setSaved] = createSignal(false);
    onCleanup(
        controller.subscribe(() => {
            setEntries(controller.getEntries());
            setEvidence(controller.getEvidence());
            setHistory(controller.getReportHistory());
            setError(controller.getError());
        }),
    );
    const persist = async (item: EvidenceItem, report: unknown = null): Promise<void> => {
        setSaveError(null);
        setSaved(false);
        try {
            await saveCase(evidenceToCaseInput(item, report));
            setSaved(true);
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : t("verify.saveCaseFailed"));
        }
    };

    return (
        <IncidentTimelineView
            entries={entries()}
            evidence={evidence()}
            history={history()}
            error={error()}
            saveError={saveError()}
            saved={saved()}
            onAnalyze={(input) => controller.analyze(input)}
            onAddEvidence={async (input) => {
                const item = await controller.addEvidence(input);
                await persist(item);
                return item;
            }}
            onImportReport={async (input) => {
                const item = await controller.importScamReport(input);
                await persist(item, input.report);
                return item;
            }}
            onExport={() => controller.exportReport()}
            onReset={() => controller.reset()}
        />
    );
}
