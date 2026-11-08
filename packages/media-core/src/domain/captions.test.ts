import { describe, expect, it } from "vitest";
import { CaptionProject, SubtitleSegment, CaptionPolicy, ExportSubtitlesUseCase } from "@frithward/media-core";

describe("CaptionProject", () => {
    it("rejects overlapping segments", () => {
        const project = new CaptionProject({ id: "p1", title: "Interview", language: "en" });
        project.addSegment(new SubtitleSegment({ id: "s1", startMs: 0, endMs: 1000, text: "Hello" }));
        expect(() => project.addSegment(new SubtitleSegment({ id: "s2", startMs: 500, endMs: 1500, text: "Overlap" }))).toThrow();
    });

    it("exports vtt and srt", () => {
        const project = new CaptionProject({ id: "p1", title: "Interview", language: "en" });
        project.addSegment(new SubtitleSegment({ id: "s1", startMs: 0, endMs: 1000, text: "Hello" }));
        const useCase = new ExportSubtitlesUseCase();
        expect(useCase.execute({ project, format: "vtt" })).toContain("WEBVTT");
        expect(useCase.execute({ project, format: "srt" })).toContain("00:00:00,000 --> 00:00:01,000");
    });
});

describe("CaptionPolicy", () => {
    it("enforces duration limits", () => {
        const policy = new CaptionPolicy({ maxDurationMs: 1000 });
        const long = new SubtitleSegment({ id: "s1", startMs: 0, endMs: 5000, text: "Long" });
        expect(() => policy.assertNoOverlap([], long)).toThrow();
    });
});
