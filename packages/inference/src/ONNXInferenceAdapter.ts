import { InferenceSession, Tensor } from "onnxruntime-web";

export interface OnnxTensorInput {
    readonly name: string;
    readonly type: "float32" | "uint8";
    readonly data: Float32Array | Uint8Array;
    readonly dims: readonly number[];
}

export interface OnnxInferenceRequest {
    readonly inputs: readonly OnnxTensorInput[];
    readonly outputNames?: readonly string[];
    readonly signal?: AbortSignal;
}

export interface OnnxInferenceResult {
    readonly name: string;
    readonly data: Tensor.DataType;
    readonly dims: readonly number[];
}

export class ONNXInferenceAdapter {
    private session: InferenceSession | null = null;

    public constructor(
        private readonly modelUrl: string,
        private readonly sessionOptions?: InferenceSession.SessionOptions,
    ) {}

    public async start(): Promise<void> {
        if (this.session) return;
        this.session = await InferenceSession.create(this.modelUrl, this.sessionOptions);
    }

    public async stop(): Promise<void> {
        const session = this.session;
        this.session = null;
        if (session) await session.release();
    }

    public async run(request: OnnxInferenceRequest): Promise<readonly OnnxInferenceResult[]> {
        if (!this.session) throw new Error("ONNX inference adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const feeds: Record<string, Tensor> = {};
        for (const input of request.inputs) {
            feeds[input.name] = new Tensor(
                input.type,
                input.data as Tensor.DataTypeMap[typeof input.type],
                input.dims,
            );
        }
        const runPromise =
            request.outputNames === undefined
                ? this.session.run(feeds)
                : this.session.run(feeds, request.outputNames);
        const result = await raceWithAbort(runPromise, request.signal);
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return Object.entries(result).map(([name, value]) => ({
            name,
            data: value.data,
            dims: value.dims,
        }));
    }
}

function raceWithAbort<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return operation;
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
        if (signal.aborted) {
            onAbort();
            return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
        operation.then(
            (value) => {
                signal.removeEventListener("abort", onAbort);
                resolve(value);
            },
            (error: unknown) => {
                signal.removeEventListener("abort", onAbort);
                reject(error);
            },
        );
    });
}
