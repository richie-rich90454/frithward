import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import { ScanSearch } from "lucide-solid";
import type { Case } from "@frithward/contracts";
import type { GuidedFlowStep, ScamAnalysis } from "@frithward/security-core";
import { useI18n } from "../../../../i18n/index.js";
import { useCases } from "../../../../cases/CaseProvider.js";
import { ScamCheckController } from "../controllers/ScamCheckController";
import { checkResultToCaseInput } from "../toCaseInput.js";
import type { CheckFindingView } from "../controllers/ScamCheckController";
import type { ReviewedMatch } from "../../domain/ReviewedPatterns.js";
import { translateReviewedLimitations, translateReviewedMatch } from "../patternTranslations.js";
import { Watchlist } from "../Watchlist.js";
import { ReportButtons } from "../../../reports/index.js";
import { normalizeCase } from "../../../../cases/IndexedDbCaseRepository.js";
import { addToWatchlist } from "../../infrastructure/WatchlistStore.js";

const FILE_PATTERN = /\.(txt|eml|json)$/i;

interface ScamCheckViewProps {
    initialText?: string;
    analysis: ScamAnalysis | null;
    urlView: ReturnType<ScamCheckController["getUrlView"]>;
    qrView: ReturnType<ScamCheckController["getQrView"]>;
    error: string | null;
    saveError: string | null;
    saved: boolean;
    reviewedFindings: readonly ReviewedMatch[];
    guidedStep: GuidedFlowStep;
    guidedIndex: number;
    guidedTotal: number;
    guidedComplete: boolean;
    onCheck: (text: string) => void;
    onCheckUrl: (input: string) => void;
    onCheckQr: (input: string) => void;
    onGenerateReport: () => void;
    reportCase: Case | null;
    onGuidedNext: () => void;
    onGuidedBack: () => void;
    onGuidedComplete: () => void;
}

function Findings(props: { findings: readonly CheckFindingView[] }) {
    return (
        <For each={props.findings}>
            {(finding) => (
                <p>
                    <strong>{finding.label}</strong> ({finding.severity}): {finding.detail}
                </p>
            )}
        </For>
    );
}

export function ScamCheckView(props: ScamCheckViewProps) {
    const [text, setText] = createSignal(props.initialText ?? "");
    const [url, setUrl] = createSignal("");
    const [qr, setQr] = createSignal("");
    const [simplified, setSimplified] = createSignal(false);
    const [clipboardError, setClipboardError] = createSignal<string | null>(null);
    const [fileError, setFileError] = createSignal<string | null>(null);
    const [dragging, setDragging] = createSignal(false);
    const [watchlistStatus, setWatchlistStatus] = createSignal("");
    const { t } = useI18n();

    const addToWatch = (value: string) => {
        addToWatchlist({
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            label: value,
            kind: "domain",
            createdAt: new Date().toISOString(),
        });
        setWatchlistStatus(t("watchlist.added"));
    };

    const pasteFromClipboard = async () => {
        setClipboardError(null);
        if (!navigator.clipboard?.readText) {
            setClipboardError(
                "Clipboard access is unavailable in this browser. Use the file option instead.",
            );
            return;
        }
        try {
            setText(await navigator.clipboard.readText());
        } catch {
            setClipboardError(
                "Clipboard permission was denied. Allow access or paste into the box manually.",
            );
        }
    };

    const readFile = async (file: File | undefined) => {
        setFileError(null);
        if (!file) return;
        if (!FILE_PATTERN.test(file.name)) {
            setFileError("Only .txt, .eml, and .json files are supported.");
            return;
        }
        try {
            const content = await file.text();
            setText(content);
            props.onCheck(content);
        } catch {
            setFileError("Could not read that file. Please try again.");
        }
    };

    return (
        <section
            onDragOver={(event) => {
                if (!event.dataTransfer?.types.includes("Files")) return;
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDragging(false);
                }
            }}
            onDrop={(event) => {
                if (!event.dataTransfer?.types.includes("Files")) return;
                event.preventDefault();
                setDragging(false);
                void readFile(event.dataTransfer.files[0]);
            }}
            style={dragging() ? { outline: "2px dashed var(--fw-accent)" } : undefined}
        >
            <h1>
                <ScanSearch class="fw-icon" />
                {t("check.title")}
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onCheck(text());
                }}
            >
                <label>
                    {t("check.messageLabel")}
                    <textarea
                        value={text()}
                        onInput={(event) => setText(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("check.button")}</button>
                <button
                    type="button"
                    style={{ "min-height": "44px" }}
                    onClick={() => void pasteFromClipboard()}
                >
                    Paste from clipboard
                </button>
            </form>
            <Show when={clipboardError()}>
                <p role="alert">{clipboardError()}</p>
            </Show>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onCheckUrl(url());
                }}
            >
                <label>
                    {t("check.linkLabel")}
                    <input
                        value={url()}
                        placeholder="example.com/invoice"
                        onInput={(event) => setUrl(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">{t("check.linkButton")}</button>
            </form>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onCheckQr(qr());
                }}
            >
                <label>
                    {t("check.qrLabel")}
                    <textarea value={qr()} onInput={(event) => setQr(event.currentTarget.value)} />
                </label>
                <button type="submit">{t("check.qrButton")}</button>
            </form>
            <p role="note">
                Drop a .txt, .eml, or .json file here to check its text locally. Nothing is
                uploaded.
            </p>
            <label>
                Choose a text file (.txt, .eml, .json)
                <input
                    type="file"
                    accept=".txt,.eml,.json"
                    onChange={(event) => {
                        void readFile(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                    }}
                />
            </label>
            <Show when={fileError()}>
                <p role="alert">{fileError()}</p>
            </Show>
            <p role="note">{t("check.heuristicNote")}</p>
            <label class="check-option">
                <input
                    type="checkbox"
                    checked={simplified()}
                    onChange={() => setSimplified(!simplified())}
                />
                <span>{t("check.simplified")}</span>
            </label>
            <Show when={simplified()}>
                <div aria-live="polite">
                    <h2>
                        {t("check.guidedStep")} {props.guidedIndex + 1} / {props.guidedTotal}
                    </h2>
                    <h3>{props.guidedStep.title}</h3>
                    <p>{props.guidedStep.plainLanguage}</p>
                    <p>
                        <strong>{props.guidedStep.action}</strong>
                    </p>
                    <div>
                        <button
                            type="button"
                            disabled={props.guidedIndex === 0}
                            onClick={props.onGuidedBack}
                        >
                            {t("check.guidedBack")}
                        </button>
                        <button type="button" onClick={props.onGuidedComplete}>
                            {t("check.guidedDone")}
                        </button>
                        <button type="button" onClick={props.onGuidedNext}>
                            {t("check.guidedNext")}
                        </button>
                    </div>
                    <Show when={props.guidedComplete}>
                        <p role="status">{t("check.guidedComplete")}</p>
                    </Show>
                </div>
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.saveError}>
                <p role="alert">{props.saveError}</p>
            </Show>
            <Show when={props.saved}>
                <p role="status">{t("cases.saved")}</p>
            </Show>
            <Show when={props.analysis} keyed>
                {(analysis) => (
                    <div>
                        <h2>{analysis.summary}</h2>
                        <Findings findings={analysis.indicators} />
                        <h2>{t("check.nextSteps")}</h2>
                        <ul>
                            <For each={analysis.nextSteps}>{(step) => <li>{step}</li>}</For>
                        </ul>
                        <h2>{t("check.limitations")}</h2>
                        <ul>
                            <For each={analysis.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                        <button type="button" onClick={props.onGenerateReport}>
                            {t("check.generateReport")}
                        </button>
                    </div>
                )}
            </Show>
            <Show when={props.urlView} keyed>
                {(view) => (
                    <div>
                        <h2>{view.summary}</h2>
                        <p>
                            {t("check.host")} {view.hostname ?? t("check.unknown")}
                        </p>
                        <Findings findings={view.findings} />
                        <h2>{t("check.limitations")}</h2>
                        <ul>
                            <For each={view.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                        <button
                            type="button"
                            style={{ "min-height": "44px" }}
                            onClick={() => addToWatch(view.normalizedUrl ?? view.original)}
                        >
                            {t("watchlist.add")}
                        </button>
                        <Show when={watchlistStatus()}>
                            <p role="status">{watchlistStatus()}</p>
                        </Show>
                    </div>
                )}
            </Show>
            <Show when={props.qrView} keyed>
                {(view) => (
                    <div>
                        <h2>{view.summary}</h2>
                        <p>
                            {t("check.payloadType")} {view.payloadKind}
                        </p>
                        <Findings findings={view.findings} />
                        <h2>{t("check.limitations")}</h2>
                        <ul>
                            <For each={view.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
            <Show when={props.analysis || props.urlView || props.qrView}>
                <div>
                    <h2>{t("check.reviewed.title")}</h2>
                    <p role="note">{t("check.reviewed.intro")}</p>
                    <Show
                        when={props.reviewedFindings.length > 0}
                        fallback={<p>{t("check.reviewed.none")}</p>}
                    >
                        <ul>
                            <For each={props.reviewedFindings}>
                                {(match) => {
                                    const translated = translateReviewedMatch(t, match);
                                    return (
                                        <li>
                                            <strong>{translated.label}</strong>: {translated.detail}
                                        </li>
                                    );
                                }}
                            </For>
                        </ul>
                    </Show>
                    <h3>{t("check.limitations")}</h3>
                    <ul>
                        <For each={translateReviewedLimitations(t)}>
                            {(limit) => <li>{limit}</li>}
                        </For>
                    </ul>
                </div>
            </Show>
            <Show when={props.reportCase} keyed>
                {(caseData) => (
                    <div>
                        <h2>{t("respond.export")}</h2>
                        <ReportButtons caseData={caseData} />
                    </div>
                )}
            </Show>
            <Watchlist />
        </section>
    );
}

function readSharedText(): string {
    if (typeof window === "undefined") return "";
    try {
        const query = new URLSearchParams(window.location.search);
        const shared = query.get("text") ?? query.get("url");
        if (shared) return shared;
        const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        return fragment.get("text") ?? "";
    } catch {
        return "";
    }
}

export function ScamCheckPage() {
    const { t } = useI18n();
    const controller = new ScamCheckController({ translate: t });
    const { saveCase } = useCases();
    const initialText = readSharedText();
    const [analysis, setAnalysis] = createSignal(controller.getAnalysis());
    const [reviewedFindings, setReviewedFindings] = createSignal(controller.getReviewedFindings());
    const [urlView, setUrlView] = createSignal(controller.getUrlView());
    const [qrView, setQrView] = createSignal(controller.getQrView());
    const [error, setError] = createSignal(controller.getError());
    const [guidedStep, setGuidedStep] = createSignal(controller.getGuidedStep());
    const [guidedIndex, setGuidedIndex] = createSignal(controller.getGuidedIndex());
    const [guidedComplete, setGuidedComplete] = createSignal(controller.isGuidedComplete());
    const [saveError, setSaveError] = createSignal<string | null>(null);
    const [saved, setSaved] = createSignal(false);
    const sync = () => {
        setAnalysis(controller.getAnalysis());
        setReviewedFindings(controller.getReviewedFindings());
        setUrlView(controller.getUrlView());
        setQrView(controller.getQrView());
        setError(controller.getError());
        setGuidedStep(controller.getGuidedStep());
        setGuidedIndex(controller.getGuidedIndex());
        setGuidedComplete(controller.isGuidedComplete());
    };
    onCleanup(controller.subscribe(sync));
    if (initialText) controller.check(initialText);

    const persist = async (): Promise<void> => {
        const result = controller.getLastResult();
        if (!result) return;
        setSaveError(null);
        setSaved(false);
        try {
            await saveCase(checkResultToCaseInput(result));
            setSaved(true);
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : t("verify.saveCaseFailed"));
        }
    };

    const generateReport = async () => {
        const report = await controller.generateReport();
        if (!report) return;
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "scam-report.json";
        link.click();
        URL.revokeObjectURL(url);
    };
    const reportCase = createMemo<Case | null>(() => {
        analysis();
        urlView();
        qrView();
        const result = controller.getLastResult();
        return result ? normalizeCase(checkResultToCaseInput(result)) : null;
    });

    return (
        <ScamCheckView
            initialText={initialText}
            analysis={analysis()}
            reviewedFindings={reviewedFindings()}
            urlView={urlView()}
            qrView={qrView()}
            error={error()}
            saveError={saveError()}
            saved={saved()}
            guidedStep={guidedStep()}
            guidedIndex={guidedIndex()}
            guidedTotal={controller.getGuidedSteps().length}
            guidedComplete={guidedComplete()}
            onCheck={(text) => {
                controller.check(text);
                if (!controller.getError()) void persist();
            }}
            onCheckUrl={(input) => {
                controller.checkUrl(input);
                if (!controller.getError()) void persist();
            }}
            onCheckQr={(input) => {
                controller.checkQr(input);
                if (!controller.getError()) void persist();
            }}
            onGenerateReport={() => void generateReport()}
            reportCase={reportCase()}
            onGuidedNext={() => controller.guidedNext()}
            onGuidedBack={() => controller.guidedBack()}
            onGuidedComplete={() => controller.guidedComplete()}
        />
    );
}
