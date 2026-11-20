import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseEmail } from "./parseEmail.js";

describe("parseEmail", () => {
    it("reads headers and body from a .eml fixture", async () => {
        const eml = await readFile(new URL("./fixtures/sample.eml", import.meta.url), "utf8");
        const parsed = await parseEmail(eml);
        expect(parsed.from).toContain("alice@example.com");
        expect(parsed.subject).toBe("Test incident");
        expect(parsed.text).toContain("Please review the attached details.");
        expect(parsed.attachments).toBe(0);
    });

    it("rejects empty input", async () => {
        await expect(parseEmail("  ")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    });
});
