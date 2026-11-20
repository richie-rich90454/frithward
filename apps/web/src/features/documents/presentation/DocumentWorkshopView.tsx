import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { DocumentGenerationController } from "../application/DocumentGenerationController";
import type {
    DocumentWorkshopState,
    ExportFormat,
} from "../application/DocumentGenerationController";
import { DocumentDraftStore } from "../infrastructure/DocumentDraftStore";
import { PdfPreview } from "./components/PdfPreview";
import { useI18n } from "../../../i18n/index.js";
import "./documents.css";

interface DocumentWorkshopViewProps {
    state: DocumentWorkshopState;
    onTitleChange: (value: string) => void;
    onSectionsChange: (value: string) => void;
    onSheetChange: (value: string) => void;
    onSlidesChange: (value: string) => void;
    onImport: (file: File) => void;
    onOcrImage: (file: File) => void;
    onExport: (format: ExportFormat) => void;
    onPreview: () => void;
    onBundle: () => void;
    draftSaved: boolean;
    onClear: () => void;
}

const FORMATS: readonly ExportFormat[] = ["docx", "pdf", "xlsx", "pptx"];

export function DocumentWorkshopView(props: DocumentWorkshopViewProps) {
    const { t } = useI18n();
    return (
        <section class="document-workshop">
            <h1>{t("documents.title")}</h1>
            <Show when={props.draftSaved}>
                <p class="document-workshop__status" role="status" aria-live="polite">
                    {t("draft.saved")}
                </p>
            </Show>
            <label>
                {t("documents.field.title")}
                <input
                    value={props.state.title}
                    onInput={(event) => props.onTitleChange(event.currentTarget.value)}
                />
            </label>
            <label>
                {t("documents.field.sections")}
                <textarea
                    rows={6}
                    value={props.state.sectionsText}
                    onInput={(event) => props.onSectionsChange(event.currentTarget.value)}
                />
            </label>
            <label>
                {t("documents.field.sheet")}
                <textarea
                    rows={4}
                    value={props.state.sheetText}
                    onInput={(event) => props.onSheetChange(event.currentTarget.value)}
                />
            </label>
            <label>
                {t("documents.field.slides")}
                <textarea
                    rows={4}
                    value={props.state.slidesText}
                    onInput={(event) => props.onSlidesChange(event.currentTarget.value)}
                />
            </label>
            <div class="document-workshop__actions">
                {FORMATS.map((format) => (
                    <button
                        type="button"
                        disabled={props.state.busy}
                        onClick={() => props.onExport(format)}
                    >
                        {t("documents.export").replace("{format}", format.toUpperCase())}
                    </button>
                ))}
                <button type="button" disabled={props.state.busy} onClick={props.onPreview}>
                    {t("documents.previewPdf")}
                </button>
                <button type="button" disabled={props.state.busy} onClick={props.onBundle}>
                    {t("documents.exportBundle")}
                </button>
                <button type="button" disabled={props.state.busy} onClick={props.onClear}>
                    {t("action.clear")}
                </button>
            </div>
            <label>
                {t("documents.importDocx")}
                <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) props.onImport(file);
                    }}
                />
            </label>
            <label>
                {t("documents.importOcr")}
                <input
                    type="file"
                    accept="image/*"
                    disabled={props.state.busy}
                    onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        if (file) props.onOcrImage(file);
                    }}
                />
            </label>
            <Show when={props.state.ocrStatus}>
                <p>{props.state.ocrStatus}</p>
            </Show>
            <Show when={props.state.error}>
                <p role="alert">{props.state.error}</p>
            </Show>
            <Show when={props.state.importedHtml}>
                {(html) => (
                    <details>
                        <summary>{t("documents.importedHtml")}</summary>
                        <pre>{html()}</pre>
                    </details>
                )}
            </Show>
            <Show when={props.state.pdfData}>{(pdf) => <PdfPreview pdf={pdf()} />}</Show>
        </section>
    );
}

export function DocumentWorkshopPage() {
    const { t } = useI18n();
    const controller = new DocumentGenerationController(undefined, t);
    const store = new DocumentDraftStore();
    const [state, setState] = createSignal(controller.getState());
    const [draftSaved, setDraftSaved] = createSignal(false);
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    onMount(() => {
        const draft = store.load();
        if (draft === null) return;
        controller.setTitle(draft.title);
        controller.setSectionsText(draft.sectionsText);
        controller.setSheetText(draft.sheetText);
        controller.setSlidesText(draft.slidesText);
    });
    createEffect(() => {
        const draft = {
            title: state().title,
            sectionsText: state().sectionsText,
            sheetText: state().sheetText,
            slidesText: state().slidesText,
        };
        const empty =
            draft.title.trim() === "" &&
            draft.sectionsText.trim() === "" &&
            draft.sheetText.trim() === "" &&
            draft.slidesText.trim() === "";
        if (empty) {
            store.clear();
            setDraftSaved(false);
            return;
        }
        store.saveSoon(draft);
        setDraftSaved(true);
    });
    onCleanup(() => store.flush());

    const clear = () => {
        store.clear();
        controller.setTitle("");
        controller.setSectionsText("");
        controller.setSheetText("");
        controller.setSlidesText("");
        setDraftSaved(false);
    };

    return (
        <DocumentWorkshopView
            state={state()}
            draftSaved={draftSaved()}
            onClear={clear}
            onTitleChange={(value) => controller.setTitle(value)}
            onSectionsChange={(value) => controller.setSectionsText(value)}
            onSheetChange={(value) => controller.setSheetText(value)}
            onSlidesChange={(value) => controller.setSlidesText(value)}
            onImport={(file) => void controller.importDocx(file)}
            onOcrImage={(file) => void controller.importImageForOcr(file)}
            onExport={(format) => void controller.exportDocument(format)}
            onPreview={() => void controller.previewPdf()}
            onBundle={() => void controller.exportBundle()}
        />
    );
}
