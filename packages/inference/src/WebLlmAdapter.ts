import {
    MLCEngine,
    type ChatCompletionMessageParam,
    type ChatCompletionRequestNonStreaming,
    type MLCEngineConfig,
} from "@mlc-ai/web-llm";

export interface WebLlmCompletionRequest {
    readonly messages: ChatCompletionMessageParam[];
    readonly maxTokens?: number;
    readonly temperature?: number;
    readonly signal?: AbortSignal;
}

export interface WebLlmCompletionResult {
    readonly content: string;
    readonly finishReason: string;
}

export class WebLlmAdapter {
    private engine: MLCEngine | null = null;

    public constructor(
        private readonly modelId: string,
        private readonly engineConfig?: MLCEngineConfig,
    ) {}

    public async start(): Promise<void> {
        if (this.engine) return;
        const engine = new MLCEngine(this.engineConfig);
        await engine.reload(this.modelId);
        this.engine = engine;
    }

    public async stop(): Promise<void> {
        const engine = this.engine;
        this.engine = null;
        if (engine) await engine.unload();
    }

    public async complete(request: WebLlmCompletionRequest): Promise<WebLlmCompletionResult> {
        // Complexity: O(generated tokens); WebLLM runs on its GPU worker.
        if (!this.engine) throw new Error("WebLLM adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const completionPromise = this.engine.chatCompletion({
            messages: request.messages,
            ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
            ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        } as ChatCompletionRequestNonStreaming);
        const completion = await raceWithAbort(completionPromise, request.signal, () => {
            void this.engine?.interruptGenerate();
        });
        const choice = completion.choices[0];
        if (!choice) throw new Error("WebLLM returned no completion.");
        return { content: choice.message.content ?? "", finishReason: choice.finish_reason };
    }
}

function raceWithAbort<T>(
    operation: Promise<T>,
    signal: AbortSignal | undefined,
    onAbort: () => void,
): Promise<T> {
    if (!signal) return operation;
    return new Promise<T>((resolve, reject) => {
        const abort = () => {
            onAbort();
            reject(new DOMException("Aborted", "AbortError"));
        };
        if (signal.aborted) {
            abort();
            return;
        }
        signal.addEventListener("abort", abort, { once: true });
        operation.then(
            (value) => {
                signal.removeEventListener("abort", abort);
                resolve(value);
            },
            (error: unknown) => {
                signal.removeEventListener("abort", abort);
                reject(error);
            },
        );
    });
}
