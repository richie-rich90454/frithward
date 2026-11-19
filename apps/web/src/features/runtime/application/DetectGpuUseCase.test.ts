import { describe, expect, it } from "vitest";
import type { GpuDetectionPort, GpuReport } from "../ports/GpuDetectionPort";
import { DetectGpuUseCase } from "./DetectGpuUseCase";

const available: GpuReport = {
    available: true,
    adapterName: "Test adapter",
    vendor: "Test vendor",
    architecture: "test",
    computePassRan: true,
    limitations: ["A device-specific check."],
    error: null,
};

class FakeGpuDetector implements GpuDetectionPort {
    public calledWith: AbortSignal | null = null;

    public constructor(private readonly report: GpuReport = available) {}

    public async detect(signal: AbortSignal): Promise<GpuReport> {
        this.calledWith = signal;
        return this.report;
    }
}

describe("DetectGpuUseCase", () => {
    it("passes through the report and adds an honest capability limitation", async () => {
        const detector = new FakeGpuDetector();
        const useCase = new DetectGpuUseCase(detector);
        const signal = new AbortController().signal;

        const report = await useCase.execute(signal);
        expect(detector.calledWith).toBe(signal);
        expect(report.available).toBe(true);
        expect(report.computePassRan).toBe(true);
        expect(report.limitations).toContain("A device-specific check.");
        expect(report.limitations.some((item) => item.includes("capability check"))).toBe(true);
    });

    it("does not duplicate the standard limitation", async () => {
        const report = await new DetectGpuUseCase(new FakeGpuDetector()).execute(
            new AbortController().signal,
        );
        const count = report.limitations.filter((item) => item.includes("capability check")).length;
        expect(count).toBe(1);
    });

    it("reports unavailable results honestly", async () => {
        const unavailable: GpuReport = {
            available: false,
            adapterName: null,
            vendor: null,
            architecture: null,
            computePassRan: false,
            limitations: [],
            error: "WebGPU is not available in this browser.",
        };
        const report = await new DetectGpuUseCase(new FakeGpuDetector(unavailable)).execute(
            new AbortController().signal,
        );
        expect(report.available).toBe(false);
        expect(report.error).toContain("not available");
    });

    it("rejects an aborted signal without calling the detector", async () => {
        const controller = new AbortController();
        controller.abort();
        const detector = new FakeGpuDetector();
        await expect(new DetectGpuUseCase(detector).execute(controller.signal)).rejects.toThrow(
            "aborted",
        );
        expect(detector.calledWith).toBeNull();
    });
});
