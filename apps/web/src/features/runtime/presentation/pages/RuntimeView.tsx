import { For, Show, createSignal, onCleanup } from "solid-js";
import { Cpu, HardDrive, Scissors } from "lucide-solid";
import type { TranscodeRequest } from "../../ports/TranscoderPort";
import {
    buildTranscodeRequest,
    createRuntimeController,
    readFileBytes,
} from "../controllers/RuntimeController";
import type { RuntimeState } from "../controllers/RuntimeController";
import { useI18n } from "../../../../i18n/index.js";

interface RuntimeViewProps {
    state: RuntimeState;
    onStore: (name: string, data: ArrayBuffer) => void;
    onRead: (name: string) => void;
    onRefresh: () => void;
    onTranscode: (request: TranscodeRequest) => void;
    onDetectGpu: () => void;
}

export function RuntimeView(props: RuntimeViewProps) {
    const { t } = useI18n();
    const [name, setName] = createSignal("asset.bin");
    const [file, setFile] = createSignal<File | null>(null);
    const [codec, setCodec] = createSignal("vp8");

    function store() {
        const selected = file();
        if (!selected) return;
        void readFileBytes(selected).then((data) => props.onStore(name(), data));
    }

    function transcode() {
        const selected = file();
        if (!selected) return;
        void readFileBytes(selected).then((data) =>
            props.onTranscode(
                buildTranscodeRequest({
                    kind: "video",
                    codec: codec(),
                    width: 64,
                    height: 64,
                    sampleRate: 48000,
                    channels: 1,
                    data,
                }),
            ),
        );
    }

    return (
        <section>
            <h1>{t("runtime.title")}</h1>
            <p>{t("runtime.intro")}</p>

            <h2>
                <HardDrive class="fw-icon" /> {t("runtime.opfs")}
            </h2>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    store();
                }}
            >
                <label>
                    {t("runtime.assetName")}
                    <input value={name()} onInput={(event) => setName(event.currentTarget.value)} />
                </label>
                <label>
                    {t("runtime.file")}
                    <input
                        type="file"
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">{t("runtime.storeFile")}</button>
                <button type="button" onClick={() => props.onRead(name())}>
                    {t("runtime.readFile")}
                </button>
                <button type="button" onClick={() => props.onRefresh()}>
                    {t("runtime.refreshList")}
                </button>
            </form>
            <Show when={props.state.storageMessage}>
                <p role="status">{props.state.storageMessage}</p>
            </Show>
            <Show when={props.state.lastReadBytes !== null}>
                <p>{t("runtime.lastRead").replace("{n}", String(props.state.lastReadBytes))}</p>
            </Show>
            <ul>
                <For each={props.state.stored}>
                    {(asset) => (
                        <li>
                            {asset.name} (
                            {t("runtime.assetBytes").replace("{n}", String(asset.size))})
                        </li>
                    )}
                </For>
            </ul>

            <h2>
                <Scissors class="fw-icon" /> {t("runtime.webcodecs")}
            </h2>
            <p>{t("runtime.webcodecsIntro")}</p>
            <label>
                {t("runtime.videoCodec")}
                <input value={codec()} onInput={(event) => setCodec(event.currentTarget.value)} />
            </label>
            <button type="button" onClick={transcode} disabled={file() === null}>
                {t("runtime.transcodeFile")}
            </button>
            <Show when={props.state.transcode} keyed>
                {(result) => (
                    <p role="status">
                        {t("runtime.transcodeResult")
                            .replace("{codec}", result.codec)
                            .replace("{encoded}", String(result.encodedChunks))
                            .replace("{bytes}", String(result.encodedBytes))
                            .replace("{decoded}", String(result.decodedChunks))}
                    </p>
                )}
            </Show>

            <h2>
                <Cpu class="fw-icon" /> {t("runtime.webgpu")}
            </h2>
            <button type="button" onClick={() => props.onDetectGpu()}>
                {t("runtime.detectGpu")}
            </button>
            <Show when={props.state.gpu} keyed>
                {(gpu) => (
                    <div>
                        <p role="status">
                            {gpu.available
                                ? t("runtime.adapter")
                                      .replace(
                                          "{adapter}",
                                          gpu.adapterName ?? t("runtime.unspecified"),
                                      )
                                      .replace("{vendor}", gpu.vendor ?? t("runtime.unspecified"))
                                : t("runtime.webgpuUnavailable")}
                        </p>
                        <p>
                            {gpu.computePassRan ? t("runtime.computeRan") : t("runtime.noCompute")}
                        </p>
                        <Show when={gpu.error}>
                            <p role="alert">{gpu.error}</p>
                        </Show>
                        <ul>
                            <For each={gpu.limitations}>{(limit) => <li>{limit}</li>}</For>
                        </ul>
                    </div>
                )}
            </Show>

            <Show when={props.state.error}>
                <p role="alert">{props.state.error}</p>
            </Show>
        </section>
    );
}

export function RuntimePage() {
    const { t } = useI18n();
    const controller = createRuntimeController(t);
    const [state, setState] = createSignal(controller.getState());
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    return (
        <RuntimeView
            state={state()}
            onStore={(name, data) => void controller.store(name, data)}
            onRead={(name) => void controller.read(name)}
            onRefresh={() => void controller.refresh()}
            onTranscode={(request) => void controller.transcode(request)}
            onDetectGpu={() => void controller.detectGpu()}
        />
    );
}
