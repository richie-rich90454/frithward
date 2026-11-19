import { Show, createSignal, onCleanup } from "solid-js";
import { DiagramRenderer } from "../application/DiagramRenderer";

interface DiagramViewProps {
    source: string;
    svg: string | null;
    error: string | null;
    busy: boolean;
    onSourceChange: (value: string) => void;
    onRender: () => void;
}

const EXAMPLE = "flowchart TD\n  A[Start] --> B{Valid?}\n  B -->|yes| C[Continue]\n  B -->|no| D[Stop]";

export function DiagramView(props: DiagramViewProps) {
    return (
        <section>
            <h1>Diagrams</h1>
            <label>
                Mermaid source
                <textarea
                    rows={8}
                    value={props.source}
                    placeholder={EXAMPLE}
                    onInput={(event) => props.onSourceChange(event.currentTarget.value)}
                />
            </label>
            <button type="button" disabled={props.busy} onClick={props.onRender}>
                Render
            </button>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
            <Show when={props.svg}>
                {(svg) => (
                    <img
                        alt="Rendered diagram"
                        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}`}
                    />
                )}
            </Show>
        </section>
    );
}

export function DiagramPage() {
    const renderer = new DiagramRenderer();
    const [source, setSource] = createSignal(EXAMPLE);
    const [svg, setSvg] = createSignal<string | null>(null);
    const [error, setError] = createSignal<string | null>(null);
    const [busy, setBusy] = createSignal(false);
    let disposed = false;
    onCleanup(() => {
        disposed = true;
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
                setError(cause instanceof Error ? cause.message : "Could not render the diagram.");
            }
        } finally {
            if (!disposed) setBusy(false);
        }
    };

    return (
        <DiagramView
            source={source()}
            svg={svg()}
            error={error()}
            busy={busy()}
            onSourceChange={(value) => setSource(value)}
            onRender={() => void render()}
        />
    );
}
