import { For, Show, createSignal, onCleanup } from "solid-js";
import { ShieldCheck } from "lucide-solid";
import { useI18n } from "../../../../i18n/index.js";
import { MediaProtectionController } from "../controllers/MediaProtectionController";
import type {
    ProtectedExportView,
    ProtectionResultView,
} from "../controllers/MediaProtectionController";
import { useCases } from "../../../../cases/CaseProvider.js";
import type { Case } from "@frithward/contracts";
import { ShareCheckController } from "../controllers/ShareCheckController";
import { metadataInspectionToCaseInput, redactionCaseInput } from "../toCaseInput.js";
import type {
    MetadataInspectionView,
    RedactionResultView,
    SanitizedExportPlanView,
    ShareCheckOption,
} from "../controllers/ShareCheckController";

interface ShareCheckViewProps {
    options: readonly ShareCheckOption[];
    passed: boolean | null;
    error: string | null;
    metadataView: MetadataInspectionView | null;
    exportPlan: SanitizedExportPlanView | null;
    redaction: RedactionResultView | null;
    voiceResult: ProtectionResultView | null;
    faceResult: ProtectionResultView | null;
    exportView: ProtectedExportView | null;
    protectionError: string | null;
    saveError: string | null;
    saved: boolean;
    onToggle: (optionId: string) => void;
    onCheck: () => void;
    onInspect: (file: File) => Promise<void>;
    onPlanExport: () => void;
    onExecuteRedaction: () => void;
    onDownload: () => void;
    onProtectVoice: (input: {
        assetId: string;
        consentDocumented: boolean;
        byteSize: number;
        audio: ArrayBuffer;
    }) => Promise<void>;
    onProtectFace: (input: {
        assetId: string;
        consentDocumented: boolean;
        byteSize: number;
        image: ArrayBuffer;
        faceSizePx?: number | undefined;
    }) => Promise<void>;
}

const experimentalNote =
    "Experimental: protection is not independently evaluated, does not guarantee prevention of misuse, and requires documented consent. The engine may be unavailable in this build.";
const SAVED_MESSAGE = "Saved to cases";

export function ShareCheckView(props: ShareCheckViewProps) {
    const { t } = useI18n();
    const [selectedFile, setSelectedFile] = createSignal<File | null>(null);
    const [downloaded, setDownloaded] = createSignal(false);
    const [voiceAssetId, setVoiceAssetId] = createSignal("");
    const [voiceFile, setVoiceFile] = createSignal<File | null>(null);
    const [voiceConsent, setVoiceConsent] = createSignal(false);
    const [faceAssetId, setFaceAssetId] = createSignal("");
    const [faceFile, setFaceFile] = createSignal<File | null>(null);
    const [faceConsent, setFaceConsent] = createSignal(false);
    const [faceSizePx, setFaceSizePx] = createSignal("");

    const selectFile = async (file: File | null) => {
        setSelectedFile(file);
        setDownloaded(false);
        if (file) await props.onInspect(file);
    };

    const download = (artifact: { blob: Blob; fileName: string }): void => {
        const url = URL.createObjectURL(artifact.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = artifact.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        props.onDownload();
    };

    const protectVoice = async () => {
        const file = voiceFile();
        if (!file) return;
        await props.onProtectVoice({
            assetId: voiceAssetId(),
            consentDocumented: voiceConsent(),
            byteSize: file.size,
            audio: await file.arrayBuffer(),
        });
    };

    const protectFace = async () => {
        const file = faceFile();
        if (!file) return;
        const size = faceSizePx().trim();
        const parsed = size.length > 0 ? Number(size) : Number.NaN;
        await props.onProtectFace({
            assetId: faceAssetId(),
            consentDocumented: faceConsent(),
            byteSize: file.size,
            image: await file.arrayBuffer(),
            ...(Number.isInteger(parsed) && parsed > 0 ? { faceSizePx: parsed } : {}),
        });
    };

    return (
        <section>
            <h1>
                <ShieldCheck class="fw-icon" />
                {t("protect.title")}
            </h1>
            <p>{t("protect.intro")}</p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onCheck();
                }}
            >
                <For each={props.options}>
                    {(option) => (
                        <label class="check-option">
                            <input
                                type="checkbox"
                                checked={option.selected}
                                onChange={() => props.onToggle(option.id)}
                            />
                            <span>
                                <strong>{option.label}</strong>
                                {option.detail}
                            </span>
                        </label>
                    )}
                </For>
                <button type="submit">{t("protect.button")}</button>
            </form>
            <Show when={props.passed === true}>
                <p role="status">{t("protect.safe")}</p>
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.saveError}>
                <p role="alert">{props.saveError}</p>
            </Show>
            <Show when={props.saved}>
                <p role="status">{SAVED_MESSAGE}</p>
            </Show>

            <h2>{t("protect.metadataTitle")}</h2>
            <p role="note">
                Choose a file to inspect in your browser. Supported formats are JPEG and PNG (EXIF
                and IPTC); other formats are labelled as unverified.
            </p>
            <fieldset>
                <legend>{t("share.fileLabel")}</legend>
                <label>
                    {t("share.chooseFile")}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                            void selectFile(event.currentTarget.files?.[0] ?? null)
                        }
                    />
                </label>
                <label>
                    {t("share.takePhoto")}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(event) =>
                            void selectFile(event.currentTarget.files?.[0] ?? null)
                        }
                    />
                </label>
            </fieldset>
            <Show when={selectedFile()}>
                {(file) => <p role="status">Selected: {file().name}</p>}
            </Show>

            <Show when={props.metadataView} keyed>
                {(view) => (
                    <div>
                        <h3>{view.summary}</h3>
                        <p role="note">
                            Read {view.fieldCount} tag(s) from {view.fileName}. Review the findings
                            before sharing. Redaction downloads a new copy; your original is never
                            modified.
                        </p>
                        <Show when={view.issues.length > 0}>
                            <table>
                                <caption>{view.fileName}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Detected</th>
                                        <th scope="col">Value</th>
                                        <th scope="col">Where</th>
                                        <th scope="col">{t("share.whyItMatters")}</th>
                                        <th scope="col">{t("share.risk")}</th>
                                        <th scope="col">How to resolve</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={view.issues}>
                                        {(issue) => (
                                            <tr>
                                                <td>{issue.label}</td>
                                                <td>{issue.value}</td>
                                                <td>{issue.where}</td>
                                                <td>{issue.why}</td>
                                                <td>{issue.severity}</td>
                                                <td>{issue.how}</td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </Show>
                        <button type="button" onClick={props.onPlanExport}>
                            {t("protect.planExport")}
                        </button>
                        <button type="button" onClick={props.onExecuteRedaction}>
                            {t("share.redactAndDownload")}
                        </button>
                    </div>
                )}
            </Show>
            <Show when={props.exportPlan} keyed>
                {(plan) => (
                    <div>
                        <h3>Sanitized export plan</h3>
                        <p>{plan.summary}</p>
                        <ul>
                            <For each={plan.actions}>
                                {(action) => <li>{action.description}</li>}
                            </For>
                        </ul>
                        <p role="note">
                            This plan is advisory only. Use Execute redaction to download a
                            sanitized copy.
                        </p>
                    </div>
                )}
            </Show>
            <Show when={props.redaction} keyed>
                {(redaction) => (
                    <div>
                        <h3>Sanitized file ready</h3>
                        <p role="status">{redaction.summary}</p>
                        <ul>
                            <For each={redaction.remaining}>
                                {(finding) => (
                                    <li>
                                        <strong>{finding.kind}</strong>: {finding.detail}
                                    </li>
                                )}
                            </For>
                        </ul>
                        <button type="button" onClick={() => download(redaction.artifact)}>
                            Download sanitized file
                        </button>
                        <Show when={downloaded()}>
                            <p role="status">{t("share.redactedDownloaded")}</p>
                        </Show>
                        <p role="note">{redaction.note}</p>
                    </div>
                )}
            </Show>

            <h2>Experimental media protection</h2>
            <p role="note">{experimentalNote}</p>
            <Show when={props.protectionError}>
                <p role="alert">{props.protectionError}</p>
            </Show>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void protectVoice();
                }}
            >
                <h3>Protect voice (experimental)</h3>
                <label>
                    Asset ID
                    <input
                        value={voiceAssetId()}
                        onInput={(event) => setVoiceAssetId(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Audio file
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) => setVoiceFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label class="check-option">
                    <input
                        type="checkbox"
                        checked={voiceConsent()}
                        onChange={() => setVoiceConsent(!voiceConsent())}
                    />
                    <span>I have documented consent</span>
                </label>
                <button type="submit" disabled={!voiceConsent() || !voiceFile()}>
                    Protect voice (experimental)
                </button>
            </form>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void protectFace();
                }}
            >
                <h3>Protect face (experimental)</h3>
                <label>
                    Asset ID
                    <input
                        value={faceAssetId()}
                        onInput={(event) => setFaceAssetId(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Image file
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setFaceFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    Face size in pixels (optional)
                    <input
                        value={faceSizePx()}
                        inputmode="numeric"
                        onInput={(event) => setFaceSizePx(event.currentTarget.value)}
                    />
                </label>
                <label class="check-option">
                    <input
                        type="checkbox"
                        checked={faceConsent()}
                        onChange={() => setFaceConsent(!faceConsent())}
                    />
                    <span>I have documented consent</span>
                </label>
                <button type="submit" disabled={!faceConsent() || !faceFile()}>
                    Protect face (experimental)
                </button>
            </form>
            <Show when={props.voiceResult} keyed>
                {(result) => (
                    <div>
                        <h3>Voice protection result</h3>
                        <p role="status">{result.summary}</p>
                        <ul>
                            <For each={result.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
            <Show when={props.faceResult} keyed>
                {(result) => (
                    <div>
                        <h3>Face protection result</h3>
                        <p role="status">{result.summary}</p>
                        <ul>
                            <For each={result.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
            <Show when={props.exportView} keyed>
                {(view) => (
                    <div>
                        <h3>Protected media manifest (experimental)</h3>
                        <pre>{view.manifest}</pre>
                        <ul>
                            <For each={view.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>
        </section>
    );
}

export function ShareCheckPage() {
    const { t } = useI18n();
    const controller = new ShareCheckController({ translate: t });
    const protection = new MediaProtectionController();
    const { saveCase } = useCases();
    const [options, setOptions] = createSignal(controller.getOptions());
    const [passed, setPassed] = createSignal(controller.getPassed());
    const [error, setError] = createSignal(controller.getError());
    const [metadataView, setMetadataView] = createSignal(controller.getMetadataView());
    const [exportPlan, setExportPlan] = createSignal(controller.getExportPlan());
    const [redaction, setRedaction] = createSignal(controller.getRedaction());
    const [voiceResult, setVoiceResult] = createSignal(protection.getVoiceResult());
    const [faceResult, setFaceResult] = createSignal(protection.getFaceResult());
    const [exportView, setExportView] = createSignal(protection.getExportView());
    const [protectionError, setProtectionError] = createSignal(protection.getError());
    const [saveError, setSaveError] = createSignal<string | null>(null);
    const [saved, setSaved] = createSignal(false);
    const [savedCase, setSavedCase] = createSignal<Case | null>(null);
    const sync = () => {
        setOptions(controller.getOptions());
        setPassed(controller.getPassed());
        setError(controller.getError());
        setMetadataView(controller.getMetadataView());
        setExportPlan(controller.getExportPlan());
        setRedaction(controller.getRedaction());
        setVoiceResult(protection.getVoiceResult());
        setFaceResult(protection.getFaceResult());
        setExportView(protection.getExportView());
        setProtectionError(protection.getError());
    };
    onCleanup(controller.subscribe(sync));
    onCleanup(protection.subscribe(sync));

    const persistInspection = async (): Promise<void> => {
        const view = controller.getMetadataView();
        if (!view) return;
        setSaveError(null);
        setSaved(false);
        setSavedCase(null);
        try {
            const record = await saveCase(metadataInspectionToCaseInput(view));
            setSavedCase(record);
            setSaved(true);
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : t("verify.saveCaseFailed"));
        }
    };

    const persistRedaction = async (): Promise<void> => {
        const result = controller.getRedaction();
        if (!result) return;
        setSaveError(null);
        setSaved(false);
        try {
            await saveCase(redactionCaseInput(result, savedCase()));
            setSaved(true);
        } catch (cause) {
            setSaveError(cause instanceof Error ? cause.message : t("verify.saveCaseFailed"));
        }
    };

    return (
        <ShareCheckView
            options={options()}
            passed={passed()}
            error={error()}
            metadataView={metadataView()}
            exportPlan={exportPlan()}
            redaction={redaction()}
            voiceResult={voiceResult()}
            faceResult={faceResult()}
            exportView={exportView()}
            protectionError={protectionError()}
            saveError={saveError()}
            saved={saved()}
            onToggle={(optionId) => controller.toggle(optionId)}
            onCheck={() => controller.check()}
            onInspect={async (file) => {
                await controller.inspectFile(file);
                if (!controller.getError()) await persistInspection();
            }}
            onPlanExport={() => controller.planSanitizedExport(controller.getMetadataFindings())}
            onExecuteRedaction={() => void controller.executeRedaction()}
            onDownload={() => void persistRedaction()}
            onProtectVoice={(input) => protection.protectVoice(input)}
            onProtectFace={(input) => protection.protectFace(input)}
        />
    );
}
