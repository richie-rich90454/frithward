import { For, Show, createSignal, onCleanup } from "solid-js";
import { ScanSearch } from "lucide-solid";
import type { ScamAnalysis } from "@frithward/security-core";
import { ScamCheckController } from "../controllers/ScamCheckController";

interface ScamCheckViewProps {
    analysis: ScamAnalysis | null;
    error: string | null;
    onCheck: (text: string) => void;
}

export function ScamCheckView(props: ScamCheckViewProps) {
    const [text, setText] = createSignal("");
    return (
        <section>
            <h1>
                <ScanSearch class="fw-icon" />
                Scam check
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onCheck(text());
                }}
            >
                <label>
                    Message text
                    <textarea
                        value={text()}
                        onInput={(event) => setText(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Check message</button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.analysis} keyed>
                {(analysis) => (
                    <div>
                        <h2>{analysis.summary}</h2>
                        <For each={analysis.indicators}>
                            {(indicator) => (
                                <p>
                                    <strong>{indicator.label}</strong> ({indicator.severity}):{" "}
                                    {indicator.detail}
                                </p>
                            )}
                        </For>
                        <h2>Next steps</h2>
                        <ul>
                            <For each={analysis.nextSteps}>{(step) => <li>{step}</li>}</For>
                        </ul>
                        <h2>Limitations</h2>
                        <ul>
                            <For each={analysis.limitations}>{(limit) => <li>{limit}</li>}</For>
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
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setAnalysis(controller.getAnalysis());
            setError(controller.getError());
        }),
    );
    return (
        <ScamCheckView
            analysis={analysis()}
            error={error()}
            onCheck={(text) => controller.check(text)}
        />
    );
}
