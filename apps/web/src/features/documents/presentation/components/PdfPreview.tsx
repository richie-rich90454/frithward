import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { PdfRenderController } from "../../application/PdfRenderController";
import { useI18n } from "../../../../i18n/index.js";
import { translatedError } from "../../../../i18n/errors.js";

type Status = "idle" | "loading" | "ready" | "error";

export function PdfPreview(props: { pdf: ArrayBuffer }) {
    const { t } = useI18n();
    const controller = new PdfRenderController();
    const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
    const [status, setStatus] = createSignal<Status>("idle");
    const [detail, setDetail] = createSignal("");

    createEffect(() => {
        const data = props.pdf;
        const element = canvas();
        if (!element) return;
        let cancelled = false;
        setStatus("loading");
        setDetail("");
        void controller
            .render(data, element)
            .then((result) => {
                if (cancelled) return;
                setStatus("ready");
                setDetail(t("pdf.pages").replace("{n}", String(result.pageCount)));
            })
            .catch((cause: unknown) => {
                if (cancelled) return;
                setStatus("error");
                setDetail(translatedError(cause, t, "pdf.error.render"));
            });
        onCleanup(() => {
            cancelled = true;
        });
    });

    return (
        <section>
            <h2>{t("pdf.title")}</h2>
            <Show when={status() === "loading"}>
                <p role="status">{t("pdf.rendering")}</p>
            </Show>
            <Show when={status() === "error"}>
                <p role="alert">{detail()}</p>
            </Show>
            <Show when={status() === "ready"}>
                <p role="status">{detail()}</p>
            </Show>
            <canvas ref={setCanvas} hidden={status() !== "ready"} />
        </section>
    );
}
