import { CodedError, ERROR_CODES } from "@frithward/contracts";
import type { GpuDetectionPort, GpuReport } from "../ports/GpuDetectionPort";

const STANDARD_LIMITATION =
    "This is a capability check, not a benchmark: it does not measure sustained performance.";

export class DetectGpuUseCase {
    public constructor(private readonly detector: GpuDetectionPort) {}

    public async execute(signal: AbortSignal): Promise<GpuReport> {
        if (signal.aborted)
            throw new CodedError(ERROR_CODES.GPU_DETECTION_ABORTED, "GPU detection was aborted.");
        const report = await this.detector.detect(signal);
        const limitations = report.limitations.includes(STANDARD_LIMITATION)
            ? report.limitations
            : [...report.limitations, STANDARD_LIMITATION];
        return { ...report, limitations };
    }
}
