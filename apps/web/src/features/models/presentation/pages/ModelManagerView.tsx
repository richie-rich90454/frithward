import { For, Show, createSignal, onCleanup } from "solid-js";
import type {
    ModelManagerViewModel,
    RegisterCardInput,
} from "../controllers/ModelManagerController";
import { ModelManagerController } from "../controllers/ModelManagerController";
import { useI18n } from "../../../../i18n/index.js";

interface ModelManagerViewProps {
    viewModel: ModelManagerViewModel;
    error: string | null;
    onRegisterCard: (input: RegisterCardInput) => void;
}

const STAGES = ["experimental", "candidate", "stable", "deprecated"] as const;

function field(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function ModelManagerView(props: ModelManagerViewProps) {
    const { t } = useI18n();
    return (
        <section>
            <h1>{t("models.title")}</h1>

            <h2>{t("models.installed")}</h2>
            <p>
                {t("models.totalSize").replace(
                    "{size}",
                    formatBytes(props.viewModel.totalSizeBytes),
                )}
            </p>
            <Show
                when={props.viewModel.installed.length > 0}
                fallback={<p>{t("models.noInstalled")}</p>}
            >
                <ul>
                    <For each={props.viewModel.installed}>
                        {(model) => (
                            <li>
                                <strong>{model.id}</strong> — {t(`models.stage.${model.stage}`)} —{" "}
                                {formatBytes(model.sizeBytes)} (
                                {t("models.installedAt").replace("{date}", model.installedAt)})
                                <Show when={model.license}>
                                    <div>
                                        {t("models.license")} {model.license}
                                    </div>
                                </Show>
                                <Show when={model.intendedUse}>
                                    <div>
                                        {t("models.intendedUse")} {model.intendedUse}
                                    </div>
                                </Show>
                                <Show when={model.limitations}>
                                    <div>
                                        {t("models.limitations")} {model.limitations}
                                    </div>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>{t("models.registryCards")}</h2>
            <Show
                when={props.viewModel.registryCards.length > 0}
                fallback={<p>{t("models.noCards")}</p>}
            >
                <ul>
                    <For each={props.viewModel.registryCards}>
                        {(card) => (
                            <li>
                                <strong>{card.id}</strong> — {t(`models.stage.${card.stage}`)} —{" "}
                                {card.license}
                                <div>
                                    {t("models.intendedUse")} {card.intendedUse}
                                </div>
                                <div>
                                    {t("models.limitations")} {card.limitations}
                                </div>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>{t("models.registerCard")}</h2>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    props.onRegisterCard({
                        id: field(data, "id"),
                        stage: field(data, "stage") as RegisterCardInput["stage"],
                        license: field(data, "license"),
                        intendedUse: field(data, "intendedUse"),
                        limitations: field(data, "limitations"),
                    });
                }}
            >
                <label>
                    {t("models.field.id")}
                    <input name="id" required />
                </label>
                <label>
                    {t("models.field.stage")}
                    <select name="stage">
                        <For each={STAGES}>
                            {(stage) => <option value={stage}>{t(`models.stage.${stage}`)}</option>}
                        </For>
                    </select>
                </label>
                <label>
                    {t("models.field.license")}
                    <input name="license" required />
                </label>
                <label>
                    {t("models.field.intendedUse")}
                    <input name="intendedUse" required />
                </label>
                <label>
                    {t("models.field.limitations")}
                    <input name="limitations" required />
                </label>
                <button type="submit">{t("models.registerCard")}</button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function ModelManagerPage() {
    const { t } = useI18n();
    const controller = new ModelManagerController(undefined, undefined, t);
    const [viewModel, setViewModel] = createSignal(controller.getViewModel());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setViewModel(controller.getViewModel());
            setError(controller.getError());
        }),
    );
    return (
        <ModelManagerView
            viewModel={viewModel()}
            error={error()}
            onRegisterCard={(input) => controller.registerCard(input)}
        />
    );
}
