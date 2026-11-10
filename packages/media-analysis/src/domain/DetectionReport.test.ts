import type { ModelEntry } from "@frithward/model-registry";
import { describe, expect, it } from "vitest";
import {
    AnalysisLimitations,
    DetectionReport,
    type DetectionSignal,
} from "@frithward/media-analysis";

const model: ModelEntry = {
    id: "test-model",
    stage: "experimental",
    license: "Research only",
    intendedUse: "Testing",
    limitations: "Test model limitations",
};

const signal: DetectionSignal = {
    id: "signal-1",
    label: "Inconsistent noise floor",
    detail: "The noise floor changes abruptly in one segment.",
    severity: "medium",
    evidence: "Spectral analysis of the provided file.",
    source: "test-model",
};

describe("DetectionReport", () => {
    it("always includes indicators, limitations, model metadata, and next steps", () => {
        const report = new DetectionReport({
            assetId: "asset-1",
            kind: "audio",
            indicators: [signal],
            models: [model],
            createdAt: "2026-01-01T00:00:00.000Z",
        });
        expect(report.indicators).toEqual([signal]);
        expect(report.limitations).toEqual(AnalysisLimitations.forKind("audio"));
        expect(report.models).toEqual([model]);
        expect(report.nextSteps.length).toBeGreaterThan(0);
    });

    it("defaults to non-empty limitations and next steps", () => {
        const report = new DetectionReport({ assetId: "asset-1", kind: "video" });
        expect(report.indicators).toHaveLength(0);
        expect(report.limitations.length).toBeGreaterThan(0);
        expect(report.models).toHaveLength(0);
        expect(report.nextSteps.length).toBeGreaterThan(0);
    });

    it("never claims authenticity, uses percentages, or calls media fake", () => {
        const report = new DetectionReport({
            assetId: "asset-1",
            kind: "image",
            indicators: [signal],
            models: [model],
        });
        const serialized = JSON.stringify(report);
        expect(report.summary).toContain("does not establish authenticity");
        expect(serialized).not.toMatch(/\d+%/);
        expect(serialized.toLowerCase()).not.toContain("fake");
    });

    it("requires an asset id", () => {
        expect(() => new DetectionReport({ assetId: "  ", kind: "multimodal" })).toThrow();
    });
});
