import { expose } from "comlink";
import whisper_factory from "whisper.cpp";

export interface WhisperUtterance {
    startMs: number;
    endMs: number;
    text: string;
    speakerId: string | null;
}

export interface WhisperWorkerApi {
    initialize(input: { modelUrl: string; wasmUrl: string }): Promise<void>;
    transcribe(input: { audio: Float32Array; language: string }): Promise<readonly WhisperUtterance[]>;
    dispose(): Promise<void>;
}

interface WhisperModule {
    init(pathModel: string): boolean;
    free(): void;
    full_default(audio: Float32Array, lang: string, translate: boolean): number;
    FS: {
        writeFile(path: string, data: ArrayBufferView | ArrayBuffer): void;
    };
}

let module: WhisperModule | null = null;
let outputLines: string[] = [];

const api: WhisperWorkerApi = {
    async initialize(input) {
        if (module) return;
        const [wasmBuffer, modelBuffer] = await Promise.all([
            fetchArrayBuffer(input.wasmUrl),
            fetchArrayBuffer(input.modelUrl),
        ]);
        const instance = await whisper_factory({
            wasmBinary: wasmBuffer,
            print: (text) => {
                outputLines.push(...text.split("\n"));
            },
            printErr: (text) => {
                outputLines.push(...text.split("\n"));
            },
        });
        instance.FS.writeFile("/whisper-model.bin", new Uint8Array(modelBuffer));
        if (!instance.init("/whisper-model.bin")) {
            throw new Error("whisper.cpp failed to load the model.");
        }
        module = instance;
    },

    async transcribe(input) {
        if (!module) throw new Error("whisper.cpp worker is not initialized.");
        outputLines = [];
        const exitCode = module.full_default(input.audio, input.language, false);
        if (exitCode !== 0) throw new Error(`whisper.cpp failed with code ${exitCode}.`);
        return parseUtterances(outputLines);
    },

    async dispose() {
        module?.free();
        module = null;
    },
};

expose(api);

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}.`);
    return response.arrayBuffer();
}

// Complexity: O(lines) with a single regex pass per line.
function parseUtterances(lines: readonly string[]): readonly WhisperUtterance[] {
    const utterances: WhisperUtterance[] = [];
    const pattern =
        /^\[(\d{2}):(\d{2}):(\d{2}\.\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}\.\d{3})\]\s+(.*)$/;
    for (const line of lines) {
        const match = pattern.exec(line.trim());
        if (!match) continue;
        const text = (match[7] ?? "").trim();
        if (text.length === 0) continue;
        utterances.push({
            startMs: toMs(match[1] ?? "0", match[2] ?? "0", match[3] ?? "0"),
            endMs: toMs(match[4] ?? "0", match[5] ?? "0", match[6] ?? "0"),
            text,
            speakerId: null,
        });
    }
    return utterances;
}

function toMs(hours: string, minutes: string, seconds: string): number {
    return (Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 1000;
}
