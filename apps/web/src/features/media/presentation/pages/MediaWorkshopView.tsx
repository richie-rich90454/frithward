import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { Clapperboard } from "lucide-solid";
import { MediaWorkshopController } from "../controllers/MediaWorkshopController";
import type { MediaWorkshopSegment } from "../controllers/MediaWorkshopController";
import { paintWaveform } from "../painters/WaveformPainter";
import { useI18n } from "../../../../i18n/index.js";

interface MediaWorkshopViewProps {
    segments: readonly MediaWorkshopSegment[];
    selectedSegmentId: string | null;
    error: string | null;
    transcodeStatus: string | null;
    redactionStatus: string | null;
    previewUrl: string | null;
    waveformData: readonly number[] | null;
    canDownloadAudio: boolean;
    canDownloadImage: boolean;
    onAddSegment: (input: { startMs: string; endMs: string; text: string }) => void;
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
    onAudioSelected: (file: File) => void;
    onRedactImage: (input: {
        file: File;
        x: string;
        y: string;
        width: string;
        height: string;
    }) => void;
    onDownloadTranscodedAudio: () => void;
    onDownloadRedactedImage: () => void;
}

export function MediaWorkshopView(props: MediaWorkshopViewProps) {
    const { t } = useI18n();
    const [startMs, setStartMs] = createSignal("");
    const [endMs, setEndMs] = createSignal("");
    const [text, setText] = createSignal("");
    const [draft, setDraft] = createSignal("");
    const [imageFile, setImageFile] = createSignal<File | null>(null);
    const [x, setX] = createSignal("0");
    const [y, setY] = createSignal("0");
    const [width, setWidth] = createSignal("");
    const [height, setHeight] = createSignal("");
    const [waveformCanvas, setWaveformCanvas] = createSignal<HTMLCanvasElement>();
    createEffect(() => {
        const samples = props.waveformData;
        const canvas = waveformCanvas();
        if (canvas && samples) paintWaveform(canvas, samples);
    });
    return (
        <section>
            <h1>
                <Clapperboard class="fw-icon" />
                {t("media.title")}
            </h1>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    const file = imageFile();
                    if (!file) return;
                    props.onRedactImage({ file, x: x(), y: y(), width: width(), height: height() });
                }}
            >
                <label>
                    {t("media.audioLabel")}
                    <input
                        type="file"
                        accept="audio/*"
                        onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) props.onAudioSelected(file);
                        }}
                    />
                </label>
                <label>
                    {t("media.imageLabel")}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <label>
                    {t("media.regionX")}
                    <input value={x()} onInput={(event) => setX(event.currentTarget.value)} />
                </label>
                <label>
                    {t("media.regionY")}
                    <input value={y()} onInput={(event) => setY(event.currentTarget.value)} />
                </label>
                <label>
                    {t("media.regionWidth")}
                    <input
                        value={width()}
                        onInput={(event) => setWidth(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("media.regionHeight")}
                    <input
                        value={height()}
                        onInput={(event) => setHeight(event.currentTarget.value)}
                    />
                </label>
                <button type="submit" disabled={!imageFile() || !width() || !height()}>
                    {t("media.redactRegion")}
                </button>
            </form>
            <Show when={props.transcodeStatus}>
                <p>{props.transcodeStatus}</p>
            </Show>
            <Show when={props.redactionStatus}>
                <p>{props.redactionStatus}</p>
            </Show>
            <Show when={props.previewUrl}>
                {(url) => <img src={url()} alt={t("media.redactedPreview")} />}
            </Show>
            <Show when={props.waveformData}>
                <canvas
                    class="waveform-canvas"
                    ref={setWaveformCanvas}
                    width={512}
                    height={128}
                    role="img"
                    aria-label={t("media.waveform")}
                />
            </Show>
            <div>
                <button
                    type="button"
                    disabled={!props.canDownloadAudio}
                    onClick={props.onDownloadTranscodedAudio}
                >
                    {t("media.downloadAudio")}
                </button>
                <button
                    type="button"
                    disabled={!props.canDownloadImage}
                    onClick={props.onDownloadRedactedImage}
                >
                    {t("media.downloadImage")}
                </button>
            </div>
            <p>{t("media.localNote")}</p>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    props.onAddSegment({ startMs: startMs(), endMs: endMs(), text: text() });
                    setStartMs("");
                    setEndMs("");
                    setText("");
                }}
            >
                <label>
                    {t("time.startMs")}
                    <input
                        type="number"
                        value={startMs()}
                        onInput={(event) => setStartMs(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("time.endMs")}
                    <input
                        type="number"
                        value={endMs()}
                        onInput={(event) => setEndMs(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("media.text")}
                    <input value={text()} onInput={(event) => setText(event.currentTarget.value)} />
                </label>
                <button type="submit">{t("action.addSegment")}</button>
            </form>
            <ul>
                <For each={props.segments}>
                    {(segment) => (
                        <li>
                            <button
                                type="button"
                                aria-pressed={segment.id === props.selectedSegmentId}
                                onClick={() => {
                                    props.onSelect(segment.id);
                                    setDraft(segment.text);
                                }}
                            >
                                {segment.startMs}&ndash;{segment.endMs} {segment.text}
                            </button>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.selectedSegmentId} keyed>
                {(segmentId) => (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (draft().trim().length === 0) return;
                            props.onApplyEdit({ segmentId, text: draft() });
                        }}
                    >
                        <label>
                            {t("media.segmentText")}
                            <input
                                value={draft()}
                                onInput={(event) => setDraft(event.currentTarget.value)}
                            />
                        </label>
                        <button type="submit">{t("media.saveSegment")}</button>
                    </form>
                )}
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function MediaWorkshopPage() {
    const { t } = useI18n();
    const controller = new MediaWorkshopController({ translate: t });
    const [segments, setSegments] = createSignal(controller.getSegments());
    const [selectedSegmentId, setSelectedSegmentId] = createSignal(
        controller.getSelectedSegmentId(),
    );
    const [error, setError] = createSignal(controller.getError());
    const [transcodeStatus, setTranscodeStatus] = createSignal(controller.getTranscodeStatus());
    const [redactionStatus, setRedactionStatus] = createSignal(controller.getRedactionStatus());
    const [previewUrl, setPreviewUrl] = createSignal(controller.getPreviewUrl());
    const [waveformData, setWaveformData] = createSignal(controller.getWaveformData());
    const [canDownloadAudio, setCanDownloadAudio] = createSignal(
        controller.getTranscodedAudio() !== null,
    );
    const [canDownloadImage, setCanDownloadImage] = createSignal(
        controller.getRedactedImage() !== null,
    );
    onCleanup(
        controller.subscribe(() => {
            setSegments(controller.getSegments());
            setSelectedSegmentId(controller.getSelectedSegmentId());
            setError(controller.getError());
            setTranscodeStatus(controller.getTranscodeStatus());
            setRedactionStatus(controller.getRedactionStatus());
            setPreviewUrl(controller.getPreviewUrl());
            setWaveformData(controller.getWaveformData());
            setCanDownloadAudio(controller.getTranscodedAudio() !== null);
            setCanDownloadImage(controller.getRedactedImage() !== null);
        }),
    );
    onCleanup(() => controller.dispose());
    const download = (artifact: { blob: Blob; fileName: string } | null): void => {
        if (!artifact) return;
        const url = URL.createObjectURL(artifact.blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = artifact.fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };
    return (
        <MediaWorkshopView
            segments={segments()}
            selectedSegmentId={selectedSegmentId()}
            error={error()}
            transcodeStatus={transcodeStatus()}
            redactionStatus={redactionStatus()}
            previewUrl={previewUrl()}
            waveformData={waveformData()}
            canDownloadAudio={canDownloadAudio()}
            canDownloadImage={canDownloadImage()}
            onAddSegment={(input) => controller.addSegment(input)}
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
            onAudioSelected={(file) => void controller.transcodeAudio(file)}
            onRedactImage={(input) => void controller.redactImage(input)}
            onDownloadTranscodedAudio={() => download(controller.getTranscodedAudio())}
            onDownloadRedactedImage={() => download(controller.getRedactedImage())}
        />
    );
}
