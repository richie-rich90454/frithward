declare module "whisper.cpp" {
    export interface WhisperEmscriptenModule {
        ready: Promise<WhisperEmscriptenModule>;
        init(pathModel: string): boolean;
        free(): void;
        full_default(audio: Float32Array, lang: string, translate: boolean): number;
        print: ((text: string) => void) | null;
        printErr: ((text: string) => void) | null;
        FS: {
            writeFile(path: string, data: ArrayBufferView | ArrayBuffer): void;
        };
    }

    export default function whisper_factory(config?: {
        wasmBinary?: ArrayBuffer;
        locateFile?: (path: string, prefix: string) => string;
        print?: (text: string) => void;
        printErr?: (text: string) => void;
        [key: string]: unknown;
    }): Promise<WhisperEmscriptenModule>;
}
