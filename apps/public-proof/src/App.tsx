import { For, Show, createSignal, onCleanup } from "solid-js";
import { ProvenanceController } from "./presentation/controllers/ProvenanceController";
import type { ProvenanceResult } from "./presentation/controllers/ProvenanceController";
import { ThemeToggle } from "./theme.jsx";

interface ProofViewProps {
    result: ProvenanceResult | null;
    error: string | null;
    onVerify: (manifestText: string) => void;
}

function ProofView(props: ProofViewProps) {
    const [text, setText] = createSignal("");
    return (
        <div class="fw-shell">
            <header>
                <h1>Verify provenance</h1>
                <ThemeToggle />
            </header>
            <main>
                <p>
                    Paste a C2PA manifest as JSON and inspect what it claims. This page runs in your
                    browser and does not upload the manifest.
                </p>
                <form
                    class="proof-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        props.onVerify(text());
                    }}
                >
                    <label>
                        C2PA manifest JSON
                        <textarea
                            class="proof-input"
                            value={text()}
                            onInput={(event) => setText(event.currentTarget.value)}
                            rows={12}
                        />
                    </label>
                    <button type="submit">Verify</button>
                </form>

                <Show when={props.error}>
                    <p role="alert">{props.error}</p>
                </Show>

                <Show when={props.result} keyed>
                    {(result) => (
                        <section>
                            <h2>Result</h2>
                            <p role="status">{result.summary}</p>
                            <dl class="proof-details">
                                <dt>Signature status</dt>
                                <dd>{result.signatureStatus}</dd>
                                <dt>Signer</dt>
                                <dd>{result.signer ?? "not stated"}</dd>
                                <dt>Timestamp</dt>
                                <dd>{result.timestamp ?? "not stated"}</dd>
                            </dl>
                            <h3>Assertions</h3>
                            <Show
                                when={result.assertions.length > 0}
                                fallback={<p>No assertions were listed in the manifest.</p>}
                            >
                                <ul class="proof-list">
                                    <For each={result.assertions}>
                                        {(assertion) => <li>{assertion.label}</li>}
                                    </For>
                                </ul>
                            </Show>
                            <h3>Limitations</h3>
                            <ul class="proof-list">
                                <For each={result.limitations}>{(limit) => <li>{limit}</li>}</For>
                            </ul>
                        </section>
                    )}
                </Show>
            </main>
        </div>
    );
}

export function ProofApp() {
    const controller = new ProvenanceController();
    const [result, setResult] = createSignal(controller.getResult());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setResult(controller.getResult());
            setError(controller.getError());
        }),
    );
    return (
        <ProofView
            result={result()}
            error={error()}
            onVerify={(manifestText) => controller.verify(manifestText)}
        />
    );
}
