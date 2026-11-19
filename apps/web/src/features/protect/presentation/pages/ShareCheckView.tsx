import { For, Show, createSignal, onCleanup } from "solid-js";
import { ShieldCheck } from "lucide-solid";
import { useI18n } from "../../../../i18n/index.js";
import { ShareCheckController } from "../controllers/ShareCheckController";
import type { ShareCheckOption } from "../controllers/ShareCheckController";

interface ShareCheckViewProps {
    options: readonly ShareCheckOption[];
    passed: boolean | null;
    error: string | null;
    onToggle: (optionId: string) => void;
    onCheck: () => void;
}

export function ShareCheckView(props: ShareCheckViewProps) {
    const { t } = useI18n();
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
        </section>
    );
}

export function ShareCheckPage() {
    const controller = new ShareCheckController();
    const [options, setOptions] = createSignal(controller.getOptions());
    const [passed, setPassed] = createSignal(controller.getPassed());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setOptions(controller.getOptions());
            setPassed(controller.getPassed());
            setError(controller.getError());
        }),
    );
    return (
        <ShareCheckView
            options={options()}
            passed={passed()}
            error={error()}
            onToggle={(optionId) => controller.toggle(optionId)}
            onCheck={() => controller.check()}
        />
    );
}
