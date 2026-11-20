import { For, Show, createSignal, onCleanup } from "solid-js";
import { ShieldCheck } from "lucide-solid";
import { useI18n } from "../../../../i18n/index.js";
import { MediaProtectionController } from "../controllers/MediaProtectionController";
import type {
    ProtectedExportView,
    ProtectionResultView,
} from "../controllers/MediaProtectionController";
import { ShareCheckController } from "../controllers/ShareCheckController";
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
    onToggle: (optionId: string) => void;
    onCheck: () => void;
    onInspect: (payload: {
        fileName: string;
        fields: Record<string, string | number | boolean | null>;
    }) => void;
    onPlanExport: () => void;
    onExecuteRedaction: () => void;
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

interface FieldRow {
    key: string;
    value: string;
}

const experimentalNote =
    "Experimental: protection is not independently evaluated, does not guarantee prevention of misuse, and requires documented consent. The engine may be unavailable in this build.";

export function ShareCheckView(props: ShareCheckViewProps) {
    const { t } = useI18n();
    const [rows, setRows] = createSignal<FieldRow[]>([{ key: "", value: "" }]);
    const [fileName, setFileName] = createSignal("");
    const [voiceAssetId, setVoiceAssetId] = createSignal("");
    const [voiceFile, setVoiceFile] = createSignal<File | null>(null);
    const [voiceConsent, setVoiceConsent] = createSignal(false);
    const [faceAssetId, setFaceAssetId] = createSignal("");
    const [faceFile, setFaceFile] = createSignal<File | null>(null);
    const [faceConsent, setFaceConsent] = createSignal(false);
    const [faceSizePx, setFaceSizePx] = createSignal("");
    const updateRow = (index: number, patch: Partial<FieldRow>) => {
        setRows((current) =>
            current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
        );
    };

    const inspect = () => {
        const fields = Object.fromEntries(
            rows()
                .filter((row) => row.key.trim().length > 0)
                .map((row) => [row.key.trim(), row.value]),
        );
        props.onInspect({ fileName: fileName(), fields });
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

            <h2>{t("protect.metadataTitle")}</h2>
            <p>{t("protect.metadataIntro")}</p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    inspect();
                }}
            >
                <label>
                    {t("protect.fileName")}
                    <input
                        value={fileName()}
                        placeholder="photo.jpg"
                        onInput={(event) => setFileName(event.currentTarget.value)}
                    />
                </label>
                <For each={rows()}>
                    {(row, index) => (
                        <div>
                            <label>
                                {t("protect.fieldName")}
                                <input
                                    value={row.key}
                                    placeholder="GPSPosition"
                                    onInput={(event) =>
                                        updateRow(index(), { key: event.currentTarget.value })
                                    }
                                />
                            </label>
                            <label>
                                {t("protect.fieldValue")}
                                <input
                                    value={row.value}
                                    onInput={(event) =>
                                        updateRow(index(), { value: event.currentTarget.value })
                                    }
                                />
                            </label>
                        </div>
                    )}
                </For>
                <button
                    type="button"
                    onClick={() => setRows((current) => [...current, { key: "", value: "" }])}
                >
                    {t("protect.addField")}
                </button>
                <button type="submit">{t("protect.inspectMetadata")}</button>
            </form>

            <Show when={props.metadataView} keyed>
                {(view) => (
                    <div>
                        <h3>{view.summary}</h3>
                        <Show when={view.issues.length > 0}>
                            <table>
                                <caption>{view.fileName}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Detected</th>
                                        <th scope="col">Where</th>
                                        <th scope="col">Why it matters</th>
                                        <th scope="col">How to resolve</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <For each={view.issues}>
                                        {(issue) => (
                                            <tr>
                                                <td>{issue.label}</td>
                                                <td>{issue.where}</td>
                                                <td>{issue.why}</td>
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
                            Execute redaction
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
                        <p role="note">{t("protect.planNote")}</p>
                    </div>
                )}
            </Show>
            <Show when={props.redaction} keyed>
                {(redaction) => (
                    <div>
                        <h3>Redaction descriptor</h3>
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
                            <For each={result.limitations}>
                                {(limit) => <li>{limit}</li>}
                            </For>
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
                            <For each={result.limitations}>
                                {(limit) => <li>{limit}</li>}
                            </For>
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
                            <For each={view.limitations}>
                                {(limit) => <li>{limit}</li>}
                            </For>
                        </ul>
                    </div>
                )}
            </Show>
        </section>
    );
}

export function ShareCheckPage() {
    const controller = new ShareCheckController();
    const protection = new MediaProtectionController();
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
            onToggle={(optionId) => controller.toggle(optionId)}
            onCheck={() => controller.check()}
            onInspect={(payload) => controller.inspectMetadata(payload)}
            onPlanExport={() => controller.planSanitizedExport(controller.getMetadataFindings())}
            onExecuteRedaction={() => controller.executeRedaction()}
            onProtectVoice={(input) => protection.protectVoice(input)}
            onProtectFace={(input) => protection.protectFace(input)}
        />
    );
}
