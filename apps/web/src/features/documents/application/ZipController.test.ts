import { describe, expect, it } from "vitest";
import { ZipController } from "./ZipController";

describe("ZipController", () => {
    it("round trips named entries", async () => {
        const controller = new ZipController();
        const entries = [
            { name: "a.txt", data: new TextEncoder().encode("hello") },
            { name: "b.bin", data: new Uint8Array([0, 1, 2, 3]) },
        ];
        const zipped = await controller.zip(entries);
        expect(zipped).toBeInstanceOf(Uint8Array);
        expect(zipped.byteLength).toBeGreaterThan(0);

        const unzipped = await controller.unzip(zipped);
        expect(unzipped.map((entry) => entry.name)).toEqual(["a.txt", "b.bin"]);
        expect(new TextDecoder().decode(unzipped[0]?.data)).toBe("hello");
        expect([...(unzipped[1]?.data ?? [])]).toEqual([0, 1, 2, 3]);
    });

    it("rejects empty input", async () => {
        const controller = new ZipController();
        await expect(controller.zip([])).rejects.toThrow();
        await expect(controller.unzip(new Uint8Array())).rejects.toThrow();
    });
});
