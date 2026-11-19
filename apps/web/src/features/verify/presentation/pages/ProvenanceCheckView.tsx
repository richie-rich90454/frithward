import { For, Show, createSignal, onCleanup } from "solid-js";
import { BadgeCheck } from "lucide-solid";
import { ProvenanceCheckController } from "../controllers/ProvenanceCheckController";
import type { ProvenanceInspectionView } from "../controllers/ProvenanceCheckController";

interface ProvenanceCheckViewProps {
    result: ProvenanceInspectionView | null;
    error: string | null;
    onInspect: (manifestText: string) => Promise<unknown>;
}

function Value(props: { value: string | null }) {
    return <>{props.value ?? "Not provided"}</>;
}

export function ProvenanceCheckView(props: ProvenanceCheckViewProps) {
    const [manifest, setManifest] = createSignal("");
    return (
        <section>
            <h1>
                <BadgeCheck class="fw-icon" />
                Provenance check
            </h1>
            <p role="note">
                No native C2PA SDK is connected here. The signature is read from the manifest and is
                not cryptographically verified.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void props.onInspect(manifest());
                }}
            >
                <label>
                    C2PA manifest (JSON)
                    <textarea
                        value={manifest()}
                        rows={6}
                        placeholder='{"signature":{"issuer":"...","alg":"..."}}'
                        onInput={(event) => setManifest(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Inspect manifest</button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.result} keyed>
                {(result) => (
                    <div>
                        <h2>{result.summary}</h2>
                        <dl>
                            <dt>Signature status</dt>
                            <dd>
                                <Value value={result.signatureStatus} />
                                <small>
                                    Status reported in the manifest; it is not a new cryptographic
                                    verification.
                                </small>
                            </dd>
                            <dt>Signer</dt>
                            <dd>
                                <Value value={result.signer} />
                                <small>Identity claimed in the manifest, if present.</small>
                            </dd>
                            <dt>Signature timestamp</dt>
                            <dd>
                                <Value value={result.signedAt} />
                                <small>Time stated by the manifest, not an independent time proof.</small>
                            </dd>
                            <dt>Assertions</dt>
                            <dd>
                                <Show
                                    when={result.assertions.length > 0}
                                    fallback={<span>None provided</span>}
                                >
                                    <ul>
                                        <For each={result.assertions}>
                                            {(assertion) => (
                                                <li>
                                                    {assertion.label}: {assertion.present ? "present" : "absent"}
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <small>Names of claims present; their contents were not validated.</small>
                            </dd>
                            <dt>Asset hash</dt>
                            <dd>
                                <Value value={result.assetHash} />
                                <small>Hash recorded in the manifest; no file was re-hashed here.</small>
                            </dd>
                            <dt>Validation failures</dt>
                            <dd>
                                <Show
                                    when={result.validationFailures.length > 0}
                                    fallback={<span>None reported</span>}
                                >
                                    <ul>
                                        <For each={result.validationFailures}>
                                            {(failure) => (
                                                <li>
                                                    <strong>{failure.code}</strong>: {failure.message}
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <small>Failures listed by the manifest; they need human review.</small>
                            </dd>
                            <dt>Missing information</dt>
                            <dd>
                                <Show
                                    when={result.missingInfo.length > 0}
                                    fallback={<span>None</span>}
                                >
                                    <ul>
                                        <For each={result.missingInfo}>{(item) => <li>{item}</li>}</For>
                                    </ul>
                                </Show>
                                <small>Absent fields reduce how much provenance can be shown.</small>
                            </dd>
                        </dl>
                        <h2>Limitations</h2>
                        <ul>
                            <For each={result.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
        </section>
    );
}

export function ProvenanceCheckPage() {
    const controller = new ProvenanceCheckController();
    const [result, setResult] = createSignal(controller.getResult());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setResult(controller.getResult());
            setError(controller.getError());
        }),
    );
    return (
        <ProvenanceCheckView
            result={result()}
            error={error()}
            onInspect={(manifestText) => controller.inspect(manifestText)}
        />
    );
}
