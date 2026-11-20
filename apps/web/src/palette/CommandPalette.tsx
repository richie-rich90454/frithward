import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useI18n } from "../i18n/index.js";
import { isCommandShortcut } from "./shortcut.js";
import "./palette.css";

const ACTIONS = [
    { path: "/", labelKey: "nav.home" },
    { path: "/make", labelKey: "nav.make" },
    { path: "/protect", labelKey: "nav.protect" },
    { path: "/check", labelKey: "nav.check" },
    { path: "/verify", labelKey: "nav.verify" },
    { path: "/respond", labelKey: "nav.respond" },
    { path: "/learn", labelKey: "nav.learn" },
    { path: "/community", labelKey: "nav.community" },
    { path: "/tools", labelKey: "nav.tools" },
    { path: "/tools/captions", labelKey: "tools.captionStudio" },
    { path: "/tools/documents", labelKey: "tools.documentWorkshop" },
    { path: "/tools/diagrams", labelKey: "tools.diagramWorkshop" },
    { path: "/tools/charts", labelKey: "tools.charts" },
    { path: "/tools/runtime", labelKey: "tools.browserRuntime" },
    { path: "/tools/models", labelKey: "tools.modelManager" },
] as const;

export function CommandPalette() {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [isOpen, setIsOpen] = createSignal(false);
    const [filter, setFilter] = createSignal("");
    let input: HTMLInputElement | undefined;
    let previouslyFocused: HTMLElement | null = null;

    const visible = createMemo(() => {
        const query = filter().trim().toLowerCase();
        return ACTIONS.filter((action) => {
            const label = t(action.labelKey).toLowerCase();
            return query === "" || label.includes(query) || action.path.includes(query);
        });
    });

    const close = () => {
        setIsOpen(false);
        setFilter("");
        const target = previouslyFocused;
        previouslyFocused = null;
        target?.focus();
    };

    const openPalette = () => {
        previouslyFocused =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setIsOpen(true);
        queueMicrotask(() => input?.focus());
    };

    const onKeyDown = (event: KeyboardEvent) => {
        if (isCommandShortcut(event)) {
            event.preventDefault();
            if (isOpen()) close();
            else openPalette();
            return;
        }
        if (event.key === "Escape" && isOpen()) {
            event.preventDefault();
            close();
        }
    };

    onMount(() => {
        window.addEventListener("keydown", onKeyDown);
    });
    onCleanup(() => {
        window.removeEventListener("keydown", onKeyDown);
    });

    const choose = (path: string) => {
        close();
        navigate(path);
    };

    return (
        <Show when={isOpen()}>
            <div
                class="fw-palette-backdrop"
                onClick={close}
                data-testid="palette-backdrop"
                role="presentation"
            >
                <div
                    class="fw-palette"
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("palette.title")}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div class="fw-palette-head">
                        <h2>{t("palette.title")}</h2>
                        <button type="button" class="fw-palette-close" onClick={close}>
                            {t("tools.close")}
                        </button>
                    </div>
                    <p class="fw-palette-hint">{t("palette.shortcutHint")}</p>
                    <input
                        ref={(element) => {
                            input = element;
                        }}
                        type="search"
                        class="fw-palette-input"
                        aria-label={t("palette.filter")}
                        placeholder={t("palette.filter")}
                        value={filter()}
                        onInput={(event) => setFilter(event.currentTarget.value)}
                    />
                    <Show when={visible().length > 0} fallback={<p>{t("palette.empty")}</p>}>
                        <ul class="fw-palette-list" role="list">
                            <For each={visible()}>
                                {(action) => (
                                    <li>
                                        <button
                                            type="button"
                                            class="fw-palette-action"
                                            onClick={() => choose(action.path)}
                                        >
                                            <span>{t(action.labelKey)}</span>
                                            <span class="fw-palette-path">{action.path}</span>
                                        </button>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>
                </div>
            </div>
        </Show>
    );
}
