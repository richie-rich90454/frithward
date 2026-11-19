import { For, Show, createSignal, onCleanup } from "solid-js";
import type {
    ModelManagerViewModel,
    RegisterCardInput,
} from "../controllers/ModelManagerController";
import { ModelManagerController } from "../controllers/ModelManagerController";

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
    return (
        <section>
            <h1>Model manager</h1>

            <h2>Installed models</h2>
            <p>Total installed size: {formatBytes(props.viewModel.totalSizeBytes)}</p>
            <Show
                when={props.viewModel.installed.length > 0}
                fallback={<p>No models are installed.</p>}
            >
                <ul>
                    <For each={props.viewModel.installed}>
                        {(model) => (
                            <li>
                                <strong>{model.id}</strong> — {model.stage} —{" "}
                                {formatBytes(model.sizeBytes)} (installed {model.installedAt})
                                <Show when={model.license}>
                                    <div>License: {model.license}</div>
                                </Show>
                                <Show when={model.intendedUse}>
                                    <div>Intended use: {model.intendedUse}</div>
                                </Show>
                                <Show when={model.limitations}>
                                    <div>Limitations: {model.limitations}</div>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>Registry cards</h2>
            <Show
                when={props.viewModel.registryCards.length > 0}
                fallback={<p>No model cards have been registered.</p>}
            >
                <ul>
                    <For each={props.viewModel.registryCards}>
                        {(card) => (
                            <li>
                                <strong>{card.id}</strong> — {card.stage} — {card.license}
                                <div>Intended use: {card.intendedUse}</div>
                                <div>Limitations: {card.limitations}</div>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>Register model card</h2>
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
                    Model id
                    <input name="id" required />
                </label>
                <label>
                    Stage
                    <select name="stage">
                        <For each={STAGES}>{(stage) => <option value={stage}>{stage}</option>}</For>
                    </select>
                </label>
                <label>
                    License
                    <input name="license" required />
                </label>
                <label>
                    Intended use
                    <input name="intendedUse" required />
                </label>
                <label>
                    Limitations
                    <input name="limitations" required />
                </label>
                <button type="submit">Register card</button>
            </form>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function ModelManagerPage() {
    const controller = new ModelManagerController();
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
