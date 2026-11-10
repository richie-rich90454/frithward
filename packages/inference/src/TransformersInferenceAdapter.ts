import {
    pipeline,
    type FeatureExtractionPipeline,
    type PretrainedModelOptions,
    type Tensor,
} from "@huggingface/transformers";

export interface FeatureExtractionRequest {
    readonly text: string | string[];
    readonly pooling?: "none" | "mean" | "cls" | "first_token" | "eos" | "last_token";
    readonly normalize?: boolean;
    readonly signal?: AbortSignal;
}

export interface FeatureExtractionResult {
    readonly data: Tensor["data"];
    readonly dims: Tensor["dims"];
}

export class TransformersInferenceAdapter {
    private extractor: FeatureExtractionPipeline | null = null;

    public constructor(
        private readonly model: string,
        private readonly options?: PretrainedModelOptions,
    ) {}

    public async start(): Promise<void> {
        if (this.extractor) return;
        this.extractor = await pipeline("feature-extraction", this.model, this.options);
    }

    public async stop(): Promise<void> {
        this.extractor = null;
    }

    public async extract(request: FeatureExtractionRequest): Promise<FeatureExtractionResult> {
        // Complexity: O(tokens); inference runs in the calling thread.
        if (!this.extractor) throw new Error("Transformers inference adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const output = await this.extractor._call(request.text, {
            ...(request.pooling === undefined ? {} : { pooling: request.pooling }),
            ...(request.normalize === undefined ? {} : { normalize: request.normalize }),
        });
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return { data: output.data, dims: output.dims };
    }
}
