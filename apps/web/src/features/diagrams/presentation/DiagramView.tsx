import { Show, createEffect, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { CodeHighlighter } from "../application/CodeHighlighter";
import { DiagramRenderer } from "../application/DiagramRenderer";
import { DiagramDraftStore } from "../infrastructure/DiagramDraftStore";
import { useThemeVersion } from "./useThemeVersion";
import { useI18n } from "../../../i18n/index.js";
import "./diagrams.css";

interface DiagramViewProps {
    source: string;
    svg: string | null;
    error: string | null;
    busy: boolean;
    onSourceChange: (value: string) => void;
    onRender: () => void;
    draftSaved: boolean;
    onClear: () => void;
}

const EXAMPLE =
    "flowchart TD\n  A[Start] --> B{Valid?}\n  B -->|yes| C[Continue]\n  B -->|no| D[Stop]";

export function DiagramView(props: DiagramViewProps) {
    const { t } = useI18n();
    const highlighter = new CodeHighlighter();
    const [highlighted, setHighlighted] = createSignal<string | null>(null);
    createEffect(() => {
        const source = props.source;
        let cancelled = false;
        onCleanup(() => {
            cancelled = true;
        });
        void highlighter.highlight(source).then(
            (html) => {
                if (!cancelled) setHighlighted(html);
            },
            () => {
                if (!cancelled) setHighlighted(null);
            },
        );
    });

    return (
        <section class="diagram-workshop">
            <h1>{t("diagrams.title")}</h1>
            <Show when={props.draftSaved}>
                <p class="diagram-workshop__status" role="status" aria-live="polite">
                    {t("draft.saved")}
                </p>
            </Show>
            <label>
                {t("diagrams.mermaidSource")}
                <textarea
                    rows={8}
                    value={props.source}
                    placeholder={EXAMPLE}
                    onInput={(event) => props.onSourceChange(event.currentTarget.value)}
                />
            </label>
            <Show when={highlighted()}>
                {(html) => <div class="code-highlight" innerHTML={html()} />}
            </Show>
            <div class="diagram-workshop__actions">
                <button type="button" disabled={props.busy} onClick={props.onRender}>
                    {t("diagrams.render")}
                </button>
                <button type="button" disabled={props.busy} onClick={props.onClear}>
                    {t("action.clear")}
                </button>
            </div>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.svg}>
                {(svg) => (
                    <img
                        alt={t("diagrams.diagramAlt").replace(
                            "{source}",
                            `${props.source.trim().replace(/\s+/g, " ").slice(0, 80)}${props.source.trim().length > 80 ? "..." : ""}`,
                        )}
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}`}
                    />
                )}
            </Show>
        </section>
    );
}

export function DiagramPage() {
    const { t } = useI18n();
    const renderer = new DiagramRenderer();
    const store = new DiagramDraftStore();
    const themeVersion = useThemeVersion();
    const [source, setSource] = createSignal(EXAMPLE);
    const [svg, setSvg] = createSignal<string | null>(null);
    const [error, setError] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    const [draftSaved, setDraftSaved] = createSignal(false);
    let disposed = false;
    onCleanup(() => {
        disposed = true;
        store.flush();
    });
    onMount(() => {
        const draft = store.load();
        if (draft === null || draft.source.trim() === "") return;
        setSource(draft.source);
        void render();
    });
    createEffect(() => {
        if (source().trim() === "") {
            store.clear();
            setDraftSaved(false);
            return;
        }
        store.saveSoon({ source: source() });
        setDraftSaved(true);
    });

    const render = async (): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            const result = await renderer.render(source());
            if (!disposed) setSvg(result.svg);
        } catch (cause) {
            if (!disposed) {
                setSvg(null);
                setError(cause instanceof Error ? cause.message : t("diagrams.error.render"));
            }
        } finally {
            if (!disposed) setBusy(false);
        }
    };

    createEffect(() => {
        themeVersion();
        untrack(() => {
            if (svg() !== null) void render();
        });
    });

    const clear = () => {
        store.clear();
        setSource("");
        setSvg(null);
        setError(null);
        setDraftSaved(false);
    };

    return (
        <DiagramView
            source={source()}
            svg={svg()}
            error={error()}
            busy={busy()}
            draftSaved={draftSaved()}
            onClear={clear}
            onSourceChange={(value) => setSource(value)}
            onRender={() => void render()}
        />
    );
}
