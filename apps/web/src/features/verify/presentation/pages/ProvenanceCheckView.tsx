import { For, Show, createSignal, onCleanup } from "solid-js";
import { BadgeCheck } from "lucide-solid";
import { useCases } from "../../../../cases/CaseProvider.js";
import { ProvenanceCheckController } from "../controllers/ProvenanceCheckController";
import { useI18n } from "../../../../i18n/index.js";
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
    const { t } = useI18n();
    return <>{props.value ?? t("verify.notProvided")}</>;
}

export function ProvenanceCheckView(props: ProvenanceCheckViewProps) {
    const { t } = useI18n();
    const [manifest, setManifest] = createSignal("");
    const [file, setFile] = createSignal<File | null>(null);
    return (
        <section>
            <h1>
                <BadgeCheck class="fw-icon" />
                {t("verify.title")}
            </h1>
            <p role="note">{t("verify.intro")}</p>
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
                    {t("verify.fileLabel")}
                    <input
                        type="file"
                        accept={ACCEPTED_FILES}
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">{t("verify.inspectFile")}</button>
            </form>
            <details>
                <summary>{t("verify.advanced")}</summary>
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void props.onInspect(manifest());
                    }}
                >
                    <label>
                        {t("verify.manifestLabel")}
                        <textarea
                            value={manifest()}
                            rows={6}
                            placeholder='{"signature":{"issuer":"...","alg":"..."}}'
                            onInput={(event) => setManifest(event.currentTarget.value)}
                        />
                    </label>
                    <button type="submit">{t("verify.inspectManifest")}</button>
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
                            <dt>{t("verify.signatureStatus")}</dt>
                            <dd>
                                <Value value={result.signatureStatus} />
                                <small>{t("verify.signatureStatusNote")}</small>
                            </dd>
                            <dt>{t("verify.signer")}</dt>
                            <dd>
                                <Value value={result.signer} />
                                <small>{t("verify.signerNote")}</small>
                            </dd>
                            <dt>{t("verify.timestamp")}</dt>
                            <dd>
                                <Value value={result.signedAt} />
                                <small>{t("verify.timestampNote")}</small>
                            </dd>
                            <dt>{t("verify.assertions")}</dt>
                            <dd>
                                <Show
                                    when={result.assertions.length > 0}
                                    fallback={<span>{t("verify.noneProvided")}</span>}
                                >
                                    <ul>
                                        <For each={result.assertions}>
                                            {(assertion) => (
                                                <li>
                                                    {assertion.label}:{" "}
                                                    {assertion.present
                                                        ? t("verify.present")
                                                        : t("verify.absent")}
                                                </li>
                                            )}
                                        </For>
                                    </ul>
                                </Show>
                                <small>{t("verify.assertionsNote")}</small>
                            </dd>
                            <dt>{t("verify.assetHash")}</dt>
                            <dd>
                                <Value value={result.assetHash} />
                                <small>{t("verify.assetHashNote")}</small>
                            </dd>
                            <dt>{t("verify.validationFailures")}</dt>
                            <dd>
                                <Show
                                    when={result.validationFailures.length > 0}
                                    fallback={<span>{t("verify.noneReported")}</span>}
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
                                <small>{t("verify.failuresNote")}</small>
                            </dd>
                            <dt>{t("verify.missingInfo")}</dt>
                            <dd>
                                <Show
                                    when={result.missingInfo.length > 0}
                                    fallback={<span>{t("verify.none")}</span>}
                                >
                                    <ul>
                                        <For each={result.missingInfo}>
                                            {(item) => <li>{item}</li>}
                                        </For>
                                    </ul>
                                </Show>
                                <small>{t("verify.missingNote")}</small>
                            </dd>
                        </dl>
                        <h2>{t("verify.transformations")}</h2>
                        <Show
                            when={result.transformations.length > 0}
                            fallback={<p role="note">{t("verify.noTransformations")}</p>}
                        >
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">{t("verify.tableAction")}</th>
                                        <th scope="col">{t("verify.tableActor")}</th>
                                        <th scope="col">{t("verify.tableTimestamp")}</th>
                                        <th scope="col">{t("verify.tableHash")}</th>
                                        <th scope="col">{t("verify.tableDetail")}</th>
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
                                                        fallback={
                                                            <span>{t("verify.notProvided")}</span>
                                                        }
                                                    >
                                                        <Value value={step.assetHashBefore} />{" "}
                                                        {t("verify.beforeToAfter")}{" "}
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
                        <small>{t("verify.transformNote")}</small>
                        <h2>{t("check.limitations")}</h2>
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
    const { t } = useI18n();
    const controller = new ProvenanceCheckController({ translate: t });
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
            setSaveError(cause instanceof Error ? cause.message : t("verify.saveCaseFailed"));
        }
    };

    return (
        <ProvenanceCheckView
            result={result()}
            error={error()}
            saveError={saveError()}
            onInspect={async (manifestText) => {
                await controller.inspect(manifestText);
                await persistCase(t("verify.pastedManifest"), null);
            }}
            onInspectFile={async ({ name, bytes }) => {
                const hash = await sha256(bytes);
                await controller.inspectFile({ name, bytes });
                await persistCase(name, hash);
            }}
        />
    );
}
