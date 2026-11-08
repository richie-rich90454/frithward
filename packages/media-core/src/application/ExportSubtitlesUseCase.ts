import { AppError } from "@frithward/contracts";
import { CaptionProject } from "../domain/CaptionProject.js";

export class ExportSubtitlesUseCase {
    public execute(input: { project: CaptionProject; format: "vtt" | "srt" }): string {
        const segments = input.project.listSegments();
        if (segments.length === 0)
            throw new AppError("VALIDATION_FAILED", "Project has no segments to export.");
        if (input.format === "vtt") return toVtt(input.project, segments);
        return toSrt(segments);
    }
}

function formatTimestamp(ms: number, separator: string): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    const pad = (value: number, width: number) => String(value).padStart(width, "0");
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}${separator}${pad(millis, 3)}`;
}

function toVtt(
    project: CaptionProject,
    segments: readonly {
        id: string;
        startMs: number;
        endMs: number;
        text: string;
        speakerId: string | null;
    }[],
): string {
    const lines = ["WEBVTT", ""];
    for (const segment of segments) {
        lines.push(segment.id);
        lines.push(
            `${formatTimestamp(segment.startMs, ".")} --> ${formatTimestamp(segment.endMs, ".")}`,
        );
        lines.push(
            segment.speakerId ? `<v ${segment.speakerId}>${segment.text}</v>` : segment.text,
        );
        lines.push("");
    }
    void project;
    return lines.join("\n");
}

function toSrt(segments: readonly { startMs: number; endMs: number; text: string }[]): string {
    const lines: string[] = [];
    let index = 1;
    for (const segment of segments) {
        lines.push(String(index));
        lines.push(
            `${formatTimestamp(segment.startMs, ",")} --> ${formatTimestamp(segment.endMs, ",")}`,
        );
        lines.push(segment.text);
        lines.push("");
        index += 1;
    }
    return lines.join("\n");
}
