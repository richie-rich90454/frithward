import { For, Show, createSignal, onCleanup } from "solid-js";
import { ScanSearch } from "lucide-solid";
import type { GuidedFlowStep, ScamAnalysis } from "@frithward/security-core";
import { useI18n } from "../../../../i18n/index.js";
import { ScamCheckController } from "../controllers/ScamCheckController";
import type { CheckFindingView } from "../controllers/ScamCheckController";

interface ScamCheckViewProps {
    analysis: ScamAnalysis | null;
    urlView: ReturnType<ScamCheckController["getUrlView"]>;
    qrView: ReturnType<ScamCheckController["getQrView"]>;
    error: string | null;
    guidedStep: GuidedFlowStep;
    guidedIndex: number;
    guidedTotal: number;
    guidedComplete: boolean;
    onCheck: (text: string) => void;
    onCheckUrl: (input: string) => void;
    onCheckQr: (input: string) => void;
    onGenerateReport: () => void;
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
    const [text, setText] = createSignal("");
    const [url, setUrl] = createSignal("");
    const [qr, setQr] = createSignal("");
    const [simplified, setSimplified] = createSignal(false);
    const { t } = useI18n();
    return (
        <section>
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
            </form>
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
                            Generate scam report
                        </button>
                    </div>
                )}
            </Show>
            <Show when={props.urlView} keyed>
                {(view) => (
                    <div>
                        <h2>{view.summary}</h2>
                        <p>Host: {view.hostname ?? "unknown"}</p>
                        <Findings findings={view.findings} />
                        <h2>{t("check.limitations")}</h2>
                        <ul>
                            <For each={view.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
            <Show when={props.qrView} keyed>
                {(view) => (
                    <div>
                        <h2>{view.summary}</h2>
                        <p>Payload type: {view.payloadKind}</p>
                        <Findings findings={view.findings} />
                        <h2>{t("check.limitations")}</h2>
                        <ul>
                            <For each={view.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
        </section>
    );
}

export function ScamCheckPage() {
    const controller = new ScamCheckController();
    const [analysis, setAnalysis] = createSignal(controller.getAnalysis());
    const [urlView, setUrlView] = createSignal(controller.getUrlView());
    const [qrView, setQrView] = createSignal(controller.getQrView());
    const [error, setError] = createSignal(controller.getError());
    const [guidedStep, setGuidedStep] = createSignal(controller.getGuidedStep());
    const [guidedIndex, setGuidedIndex] = createSignal(controller.getGuidedIndex());
    const [guidedComplete, setGuidedComplete] = createSignal(controller.isGuidedComplete());
    const sync = () => {
        setAnalysis(controller.getAnalysis());
        setUrlView(controller.getUrlView());
        setQrView(controller.getQrView());
        setError(controller.getError());
        setGuidedStep(controller.getGuidedStep());
        setGuidedIndex(controller.getGuidedIndex());
        setGuidedComplete(controller.isGuidedComplete());
    };
    onCleanup(controller.subscribe(sync));
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
    return (
        <ScamCheckView
            analysis={analysis()}
            urlView={urlView()}
            qrView={qrView()}
            error={error()}
            guidedStep={guidedStep()}
            guidedIndex={guidedIndex()}
            guidedTotal={controller.getGuidedSteps().length}
            guidedComplete={guidedComplete()}
            onCheck={(text) => controller.check(text)}
            onCheckUrl={(input) => controller.checkUrl(input)}
            onCheckQr={(input) => controller.checkQr(input)}
            onGenerateReport={() => void generateReport()}
            onGuidedNext={() => controller.guidedNext()}
            onGuidedBack={() => controller.guidedBack()}
            onGuidedComplete={() => controller.guidedComplete()}
        />
    );
}
