import { For, Show, createSignal, onCleanup } from "solid-js";
import { ShieldCheck } from "lucide-solid";
import { useI18n } from "../../../../i18n/index.js";
import { ShareCheckController } from "../controllers/ShareCheckController";
import type {
    MetadataInspectionView,
    SanitizedExportPlanView,
    ShareCheckOption,
} from "../controllers/ShareCheckController";

interface ShareCheckViewProps {
    options: readonly ShareCheckOption[];
    passed: boolean | null;
    error: string | null;
    metadataView: MetadataInspectionView | null;
    exportPlan: SanitizedExportPlanView | null;
    onToggle: (optionId: string) => void;
    onCheck: () => void;
    onInspect: (payload: {
        fileName: string;
        fields: Record<string, string | number | boolean | null>;
    }) => void;
    onPlanExport: () => void;
}

interface FieldRow {
    key: string;
    value: string;
}

export function ShareCheckView(props: ShareCheckViewProps) {
    const { t } = useI18n();
    const [rows, setRows] = createSignal<FieldRow[]>([{ key: "", value: "" }]);
    const [fileName, setFileName] = createSignal("");
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
        </section>
    );
}

export function ShareCheckPage() {
    const controller = new ShareCheckController();
    const [options, setOptions] = createSignal(controller.getOptions());
    const [passed, setPassed] = createSignal(controller.getPassed());
    const [error, setError] = createSignal(controller.getError());
    const [metadataView, setMetadataView] = createSignal(controller.getMetadataView());
    const [exportPlan, setExportPlan] = createSignal(controller.getExportPlan());
    const sync = () => {
        setOptions(controller.getOptions());
        setPassed(controller.getPassed());
        setError(controller.getError());
        setMetadataView(controller.getMetadataView());
        setExportPlan(controller.getExportPlan());
    };
    onCleanup(controller.subscribe(sync));
    return (
        <ShareCheckView
            options={options()}
            passed={passed()}
            error={error()}
            metadataView={metadataView()}
            exportPlan={exportPlan()}
            onToggle={(optionId) => controller.toggle(optionId)}
            onCheck={() => controller.check()}
            onInspect={(payload) => controller.inspectMetadata(payload)}
            onPlanExport={() => controller.planSanitizedExport(controller.getMetadataFindings())}
        />
    );
}
