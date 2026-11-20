import { For, Show, createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { buildCheckUrl } from "../../config";
import type { RecentCheck } from "../../history";
import { PopupController, type PageInfo } from "./PopupController";
import { initTheme, ThemeToggle } from "./theme.jsx";
import "./popup.css";

interface PopupViewProps {
    info: PageInfo | null;
    busy: boolean;
    recent: readonly RecentCheck[];
    onCheck: () => void;
    onCheckSelection: () => void;
    onClearHistory: () => void;
}

function hostOf(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

function PopupView(props: PopupViewProps) {
    const webUrl = () => {
        const info = props.info;
        return info !== null && info.error === null ? buildCheckUrl(info.text) : null;
    };

    return (
        <main class="popup">
            <div class="popup__header">
                <h1>Frithward</h1>
                <ThemeToggle />
            </div>
            <p>Keep people safe. Keep media honest.</p>

            <div class="popup__actions">
                <button type="button" onClick={() => props.onCheck()} disabled={props.busy}>
                    {props.busy ? "Checking…" : "Check this page"}
                </button>
                <button
                    type="button"
                    onClick={() => props.onCheckSelection()}
                    disabled={props.busy}
                >
                    Check selection
                </button>
            </div>

            <Show when={props.info} keyed>
                {(info) => (
                    <Show when={info.error === null} fallback={<p role="alert">{info.error}</p>}>
                        <Show when={info.analysis} keyed>
                            {(analysis) => (
                                <section class="fw-result" aria-label="Analysis">
                                    <h2>Analysis</h2>
                                    <p class="fw-summary">{analysis.summary}</p>
                                    <Show when={analysis.findings.length > 0}>
                                        <h3>Findings</h3>
                                        <ul class="fw-findings">
                                            <For each={analysis.findings}>
                                                {(finding) => (
                                                    <li class="fw-finding">
                                                        <span
                                                            class="fw-severity"
                                                            data-severity={finding.severity}
                                                        >
                                                            {finding.severity}
                                                        </span>
                                                        <strong>{finding.label}</strong>
                                                        <span>{finding.detail}</span>
                                                    </li>
                                                )}
                                            </For>
                                        </ul>
                                    </Show>
                                    <h3>Next steps</h3>
                                    <ul>
                                        <For each={analysis.nextSteps}>
                                            {(step) => <li>{step}</li>}
                                        </For>
                                    </ul>
                                    <h3>Limitations</h3>
                                    <ul>
                                        <For each={analysis.limitations}>
                                            {(item) => <li>{item}</li>}
                                        </For>
                                    </ul>
                                </section>
                            )}
                        </Show>

                        <details class="fw-details">
                            <summary>Page details</summary>
                            <p>
                                URL: <code>{info.url || "not available"}</code>
                            </p>
                            <p>
                                Text read locally: {info.textLength} characters ({info.source}).
                            </p>
                        </details>

                        <Show when={webUrl()}>
                            {(url) => (
                                <a
                                    class="fw-open-link"
                                    href={url()}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open in Frithward
                                </a>
                            )}
                        </Show>
                    </Show>
                )}
            </Show>

            <section class="fw-history" aria-label="Recent checks">
                <div class="fw-history__header">
                    <h2>Recent checks</h2>
                    <Show when={props.recent.length > 0}>
                        <button
                            type="button"
                            class="fw-clear"
                            onClick={() => props.onClearHistory()}
                        >
                            Clear
                        </button>
                    </Show>
                </div>
                <Show
                    when={props.recent.length > 0}
                    fallback={<p class="fw-note">Nothing checked yet.</p>}
                >
                    <ul class="fw-recent-list">
                        <For each={props.recent}>
                            {(item) => (
                                <li>
                                    <span class="fw-recent__meta">
                                        {new Date(item.at).toLocaleString()} · {item.source} ·{" "}
                                        {hostOf(item.url) || "no address"}
                                    </span>
                                    <span>{item.summary}</span>
                                    <span class="fw-recent__count" data-severity={item.topSeverity}>
                                        {item.findingCount} indicator(s)
                                    </span>
                                </li>
                            )}
                        </For>
                    </ul>
                </Show>
            </section>

            <p class="fw-note">
                Analysis runs locally in your browser; nothing is uploaded. "Open in Frithward"
                opens the web app with the captured text in the URL fragment, so only use it when
                you trust that app.
            </p>
        </main>
    );
}

export function Popup() {
    const controller = new PopupController();
    const [info, setInfo] = createSignal(controller.getInfo());
    const [busy, setBusy] = createSignal(controller.isBusy());
    const [recent, setRecent] = createSignal<readonly RecentCheck[]>(controller.getRecentChecks());
    onCleanup(
        controller.subscribe(() => {
            setInfo(controller.getInfo());
            setBusy(controller.isBusy());
            setRecent([...controller.getRecentChecks()]);
        }),
    );
    return (
        <PopupView
            info={info()}
            busy={busy()}
            recent={recent()}
            onCheck={() => void controller.checkPage()}
            onCheckSelection={() => void controller.checkSelection()}
            onClearHistory={() => void controller.clearHistory()}
        />
    );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
initTheme();
render(() => <Popup />, root);
