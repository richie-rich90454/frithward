import { describe, expect, it } from "vitest";
import { CaptionProject, SubtitleSegment } from "@frithward/media-core";
import {
    LocalStorageCaptionRepository,
    type StorageLike,
} from "./LocalStorageCaptionRepository.js";

function createStorage(): StorageLike {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
    };
}

describe("LocalStorageCaptionRepository", () => {
    it("round-trips a project with its segments", async () => {
        const storage = createStorage();
        const repository = new LocalStorageCaptionRepository(storage);
        const project = new CaptionProject({ id: "p1", title: "Interview", language: "en" });
        project.addSegment(
            new SubtitleSegment({
                id: "s1",
                startMs: 0,
                endMs: 1000,
                text: "Hello",
                speakerId: "a",
            }),
        );

        await repository.save(project);
        const loaded = await repository.load("p1");

        expect(loaded).not.toBeNull();
        expect(loaded?.id).toBe("p1");
        expect(loaded?.title).toBe("Interview");
        expect(loaded?.language).toBe("en");
        expect(loaded?.listSegments()).toHaveLength(1);
        expect(loaded?.listSegments()[0]).toMatchObject({
            id: "s1",
            startMs: 0,
            endMs: 1000,
            text: "Hello",
            speakerId: "a",
        });
    });

    it("returns null for a missing project", async () => {
        const repository = new LocalStorageCaptionRepository(createStorage());
        expect(await repository.load("missing")).toBeNull();
    });

    it("rejects corrupt stored data instead of returning fabricated state", async () => {
        const storage = createStorage();
        storage.setItem("frithward.caption.p1", "{not json");
        const repository = new LocalStorageCaptionRepository(storage);

        await expect(repository.load("p1")).rejects.toThrow("not valid JSON");
    });
});
