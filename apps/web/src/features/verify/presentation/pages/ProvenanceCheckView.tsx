import { For, Show, createSignal, onCleanup } from "solid-js";
import { BadgeCheck } from "lucide-solid";
import { useCases } from "../../../../cases/CaseProvider.js";
import { ProvenanceCheckController } from "../controllers/ProvenanceCheckController";
import type { ProvenanceInspectionView } from "../controllers/ProvenanceCheckController";

interface ProvenanceCheckViewProps {
    result: ProvenanceInspectionView | null;
    error: string | null;
    saveError: string | null;
    onInspect: (manifestText: string) => Promise<void>;
    onInspectFile: (input: { name: string; bytes: Uint8Array }) => Promise<void>;
}

const ACCEPTED_FILES =
    ".jpg,.jpeg,.png,.webp,.mp4,.json,application/json,image/jpeg,image/png,image/webp,video/mp4";

function Value(props: { value: string | null }) {
    return <>{props.value ?? "Not provided"}</>;
}

export function ProvenanceCheckView(props: ProvenanceCheckViewProps) {
    const [manifest, setManifest] = createSignal("");
    const [file, setFile] = createSignal<File | null>(null);
    return (
        <section>
            <h1>
                <BadgeCheck class="fw-icon" />
                Provenance check
            </h1>
            <p role="note">
                No native C2PA SDK is connected here. The signature is read from the manifest and is
                not cryptographically verified. Binary files are checked locally only; when no
                embedded manifest can be read, the result is reported as unavailable rather than
                valid.
            </p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const selected = file();
                    if (!selected) return;
                    void selected.arrayBuffer().then((buffer) =>
                        props.onInspectFile({
                            name: selected.name,
                            bytes: new Uint8Array(buffer),
                        }),
                    );
                }}
            >
                <label>
                    File to check
                    <input
                        type="file"
                        accept={ACCEPTED_FILES}
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">Inspect file</button>
            </form>
            <details>
                <summary>Advanced: paste C2PA JSON</summary>
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
            </details>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.saveError}>
                <p role="alert">{props.saveError}</p>
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
                                <small>
                                    Time stated by the manifest, not an independent time proof.
                                </small>
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
                                                    {assertion.label}:{" "}
                                                    {assertion.present ? "present" : "absent"}
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <small>
                                    Names of claims present; their contents were not validated.
                                </small>
                            </dd>
                            <dt>Asset hash</dt>
                            <dd>
                                <Value value={result.assetHash} />
                                <small>
                                    Hash recorded in the manifest; no file was re-hashed here.
                                </small>
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
                                                    <strong>{failure.code}</strong>:{" "}
                                                    {failure.message}
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <small>
                                    Failures listed by the manifest; they need human review.
                                </small>
                            </dd>
                            <dt>Missing information</dt>
                            <dd>
                                <Show
                                    when={result.missingInfo.length > 0}
                                    fallback={<span>None</span>}
                                >
                                    <ul>
                                        <For each={result.missingInfo}>
                                            {(item) => <li>{item}</li>}
                                        </For>
                                    </ul>
                                </Show>
                                <small>
                                    Absent fields reduce how much provenance can be shown.
                                </small>
                            </dd>
                        </dl>
                        <h2>Transformation history</h2>
                        <Show
                            when={result.transformations.length > 0}
                            fallback={
                                <p role="note">
                                    No transformation history available. The supplied manifest had
                                    no c2pa.actions assertion, so no steps could be parsed.
                                </p>
                            }
                        >
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Action</th>
                                        <th scope="col">Actor</th>
                                        <th scope="col">Timestamp</th>
                                        <th scope="col">Hash (before to after)</th>
                                        <th scope="col">Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={result.transformations}>
                                        {(step) => (
                                            <tr>
                                                <td>{step.action}</td>
                                                <td>
                                                    <Value value={step.actor} />
                                                </td>
                                                <td>
                                                    <Value value={step.timestamp} />
                                                </td>
                                                <td>
                                                    <Show
                                                        when={
                                                            step.assetHashBefore ||
                                                            step.assetHashAfter
                                                        }
                                                        fallback={<span>Not provided</span>}
                                                    >
                                                        <Value value={step.assetHashBefore} /> to{" "}
                                                        <Value value={step.assetHashAfter} />
                                                    </Show>
                                                </td>
                                                <td>
                                                    <Value value={step.detail} />
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </Show>
                        <small>
                            Steps are read from the supplied c2pa.actions assertion; they were not
                            independently verified.
                        </small>
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

async function sha256(bytes: Uint8Array): Promise<string> {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const digest = await crypto.subtle.digest("SHA-256", copy);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
    );
}

export function ProvenanceCheckPage() {
    const controller = new ProvenanceCheckController();
    const { saveCase } = useCases();
    const [result, setResult] = createSignal(controller.getResult());
    const [error, setError] = createSignal(controller.getError());
    const [saveError, setSaveError] = createSignal<string | null>(null);
    onCleanup(
        controller.subscribe(() => {
            setResult(controller.getResult());
            setError(controller.getError());
        }),
    );

    const persistCase = async (title: string, hash: string | null): Promise<void> => {
        const view = controller.getResult();
        if (!view) return;
        setSaveError(null);
        try {
            await saveCase({
                kind: "provenance",
                title,
                inputs: { source: title },
                findings: view.validationFailures.map((failure) => ({
                    label: failure.code,
                    severity: "medium",
                    detail: failure.message,
                })),
                limitations: [...view.limitations],
                artifacts: hash ? [{ kind: "provenance-file", name: title, hash }] : [],
                nextSteps: [],
            });
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : "Unable to save case.");
        }
    };

    return (
        <ProvenanceCheckView
            result={result()}
            error={error()}
            saveError={saveError()}
            onInspect={async (manifestText) => {
                await controller.inspect(manifestText);
                await persistCase("Pasted C2PA manifest", null);
            }}
            onInspectFile={async ({ name, bytes }) => {
                const hash = await sha256(bytes);
                await controller.inspectFile({ name, bytes });
                await persistCase(name, hash);
            }}
        />
    );
}
