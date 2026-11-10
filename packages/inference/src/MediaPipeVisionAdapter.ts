import {
    FaceDetector,
    FilesetResolver,
    type Detection,
    type ImageSource,
} from "@mediapipe/tasks-vision";

export interface VisionDetectionResult {
    readonly score: number;
    readonly categoryName: string;
    readonly displayName: string;
    readonly boundingBox: {
        readonly originX: number;
        readonly originY: number;
        readonly width: number;
        readonly height: number;
    } | null;
    readonly keypoints: readonly {
        readonly x: number;
        readonly y: number;
        readonly score: number | null;
    }[];
}

export interface MediaPipeVisionRequest {
    readonly image: ImageSource;
    readonly signal?: AbortSignal;
}

export interface MediaPipeVisionOptions {
    readonly wasmPath: string;
    readonly modelAssetPath?: string;
    readonly modelAssetBuffer?: Uint8Array;
    readonly minDetectionConfidence?: number;
}

export class MediaPipeVisionAdapter {
    private detector: FaceDetector | null = null;

    public constructor(private readonly options: MediaPipeVisionOptions) {}

    public async start(): Promise<void> {
        if (this.detector) return;
        const fileset = await FilesetResolver.forVisionTasks(this.options.wasmPath);
        this.detector = await FaceDetector.createFromOptions(fileset, {
            baseOptions: {
                ...(this.options.modelAssetPath === undefined
                    ? {}
                    : { modelAssetPath: this.options.modelAssetPath }),
                ...(this.options.modelAssetBuffer === undefined
                    ? {}
                    : { modelAssetBuffer: this.options.modelAssetBuffer }),
            },
            ...(this.options.minDetectionConfidence === undefined
                ? {}
                : { minDetectionConfidence: this.options.minDetectionConfidence }),
        });
    }

    public stop(): void {
        this.detector?.close();
        this.detector = null;
    }

    public detect(request: MediaPipeVisionRequest): readonly VisionDetectionResult[] {
        // Complexity: O(detections x keypoints) to copy results into plain objects.
        if (!this.detector) throw new Error("MediaPipe vision adapter is not started.");
        if (request.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const result = this.detector.detect(request.image);
        return result.detections.map((detection) => toVisionDetection(detection));
    }
}

function toVisionDetection(detection: Detection): VisionDetectionResult {
    const category = detection.categories[0];
    return {
        score: category?.score ?? 0,
        categoryName: category?.categoryName ?? "",
        displayName: category?.displayName ?? "",
        boundingBox: detection.boundingBox
            ? {
                  originX: detection.boundingBox.originX,
                  originY: detection.boundingBox.originY,
                  width: detection.boundingBox.width,
                  height: detection.boundingBox.height,
              }
            : null,
        keypoints: detection.keypoints.map((keypoint) => ({
            x: keypoint.x,
            y: keypoint.y,
            score: keypoint.score ?? null,
        })),
    };
}
