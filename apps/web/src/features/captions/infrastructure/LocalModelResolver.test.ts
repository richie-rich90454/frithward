import { describe, expect, it, vi } from "vitest";
import { AppError } from "@frithward/contracts";
import {
    BUNDLED_WHISPER_MODEL_URL,
    LocalModelResolver,
    WHISPER_MODEL_MISSING_MESSAGE,
} from "./LocalModelResolver";

function probeFor(available: readonly string[]) {
    return vi.fn(async (url: string) => available.includes(url));
}

describe("LocalModelResolver", () => {
    it("prefers the bundled model when it is present", async () => {
        const probe = probeFor([BUNDLED_WHISPER_MODEL_URL, "https://example.test/model.bin"]);
        const resolver = new LocalModelResolver({ probe });

        expect(await resolver.resolve("https://example.test/model.bin")).toEqual({
            url: BUNDLED_WHISPER_MODEL_URL,
            source: "bundled",
        });
        expect(probe).toHaveBeenCalledTimes(1);
    });

    it("falls back to a trimmed user-supplied URL when the bundled model is absent", async () => {
        const probe = probeFor(["https://example.test/model.bin"]);
        const resolver = new LocalModelResolver({ probe });

        expect(await resolver.resolve("  https://example.test/model.bin  ")).toEqual({
            url: "https://example.test/model.bin",
            source: "user",
        });
        expect(probe).toHaveBeenCalledTimes(2);
    });

    it("returns an explicit EXTERNAL_UNAVAILABLE error with install instructions", async () => {
        const resolver = new LocalModelResolver({ probe: probeFor([]) });

        const error = await resolver.resolve().catch((cause: unknown) => cause);
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("EXTERNAL_UNAVAILABLE");
        expect((error as AppError).message).toBe(WHISPER_MODEL_MISSING_MESSAGE);
        expect((error as AppError).message).toContain("public/models");
    });

    it("does not probe a user URL when none is supplied", async () => {
        const probe = probeFor([]);

        await new LocalModelResolver({ probe }).resolve().catch(() => undefined);

        expect(probe).toHaveBeenCalledTimes(1);
    });
});
