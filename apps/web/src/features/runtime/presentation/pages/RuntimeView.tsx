import { For, Show, createSignal, onCleanup } from "solid-js";
import { Cpu, HardDrive, Scissors } from "lucide-solid";
import type { TranscodeRequest } from "../../ports/TranscoderPort";
import {
    buildTranscodeRequest,
    createRuntimeController,
    readFileBytes,
} from "../controllers/RuntimeController";
import type { RuntimeState } from "../controllers/RuntimeController";

interface RuntimeViewProps {
    state: RuntimeState;
    onStore: (name: string, data: ArrayBuffer) => void;
    onRead: (name: string) => void;
    onRefresh: () => void;
    onTranscode: (request: TranscodeRequest) => void;
    onDetectGpu: () => void;
}

export function RuntimeView(props: RuntimeViewProps) {
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
            <h1>Runtime capabilities</h1>
            <p>
                These tools use browser APIs directly in this device. Nothing is uploaded by these
                actions. Unsupported browsers report an error rather than a simulated result.
            </p>

            <h2>
                <HardDrive class="fw-icon" /> Local file storage (OPFS)
            </h2>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    store();
                }}
            >
                <label>
                    Asset name
                    <input value={name()} onInput={(event) => setName(event.currentTarget.value)} />
                </label>
                <label>
                    File
                    <input
                        type="file"
                        onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
                    />
                </label>
                <button type="submit">Store file</button>
                <button type="button" onClick={() => props.onRead(name())}>
                    Read file
                </button>
                <button type="button" onClick={() => props.onRefresh()}>
                    Refresh list
                </button>
            </form>
            <Show when={props.state.storageMessage}>
                <p role="status">{props.state.storageMessage}</p>
            </Show>
            <Show when={props.state.lastReadBytes !== null}>
                <p>Last read returned {props.state.lastReadBytes} bytes.</p>
            </Show>
            <ul>
                <For each={props.state.stored}>
                    {(asset) => (
                        <li>
                            {asset.name} ({asset.size} bytes)
                        </li>
                    )}
                </For>
            </ul>

            <h2>
                <Scissors class="fw-icon" /> Encode and decode (WebCodecs)
            </h2>
            <p>
                Provide a raw RGBA video frame (64 by 64 pixels) to round-trip it through the
                browser's encoder and decoder. Invalid input fails with the browser's own error.
            </p>
            <label>
                Video codec
                <input value={codec()} onInput={(event) => setCodec(event.currentTarget.value)} />
            </label>
            <button type="button" onClick={transcode} disabled={file() === null}>
                Transcode file
            </button>
            <Show when={props.state.transcode} keyed>
                {(result) => (
                    <p role="status">
                        {result.codec}: encoded {result.encodedChunks} chunk(s) (
                        {result.encodedBytes} bytes), decoded {result.decodedChunks} chunk(s).
                    </p>
                )}
            </Show>

            <h2>
                <Cpu class="fw-icon" /> GPU capability (WebGPU)
            </h2>
            <button type="button" onClick={() => props.onDetectGpu()}>
                Detect GPU
            </button>
            <Show when={props.state.gpu} keyed>
                {(gpu) => (
                    <div>
                        <p role="status">
                            {gpu.available
                                ? `Adapter: ${gpu.adapterName ?? "unspecified"}; vendor: ${gpu.vendor ?? "unspecified"}.`
                                : "WebGPU is unavailable."}
                        </p>
                        <p>
                            {gpu.computePassRan
                                ? "A minimal compute shader ran successfully."
                                : "No compute pass was confirmed."}
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
    const controller = createRuntimeController();
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
