import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { PdfRenderController } from "../../application/PdfRenderController";

type Status = "idle" | "loading" | "ready" | "error";

export function PdfPreview(props: { pdf: ArrayBuffer }) {
    const controller = new PdfRenderController();
    let canvas!: HTMLCanvasElement;
    const [status, setStatus] = createSignal<Status>("idle");
    const [detail, setDetail] = createSignal("");

    createEffect(() => {
        const data = props.pdf;
        let cancelled = false;
        setStatus("loading");
        setDetail("");
        void controller
            .render(data, canvas)
            .then((result) => {
                if (cancelled) return;
                setStatus("ready");
                setDetail(`${result.pageCount} page(s)`);
            })
            .catch((cause: unknown) => {
                if (cancelled) return;
                setStatus("error");
                setDetail(cause instanceof Error ? cause.message : "Could not render the PDF.");
            });
        onCleanup(() => {
            cancelled = true;
        });
    });

    return (
        <section>
            <h2>PDF preview</h2>
            <Show when={status() === "loading"}>
                <p role="status">Rendering&hellip;</p>
            </Show>
            <Show when={status() === "error"}>
                <p role="alert">{detail()}</p>
            </Show>
            <Show when={status() === "ready"}>
                <p role="status">{detail()}</p>
            </Show>
            <canvas ref={canvas} hidden={status() !== "ready"} />
        </section>
    );
}
