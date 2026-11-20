import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFileMetadata } from "./exif.js";
import { sanitizeFile } from "./redaction.js";

const PNG_1PX = new Uint8Array(
    Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
        "base64",
    ),
);

function jpegBytes(): Uint8Array {
    return new Uint8Array([
        0xff, 0xd8, 0xff, 0xe1, 0x00, 0x0a, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xd9,
    ]);
}

function stubCanvas(width: number, height: number) {
    const drawImage = vi.fn();
    const close = vi.fn();
    const toBlob = vi.fn((callback: (blob: Blob | null) => void, type?: string) => {
        callback(new Blob([PNG_1PX], { type: type ?? "image/png" }));
    });
    vi.stubGlobal(
        "createImageBitmap",
        vi.fn(async () => ({ width, height, close })),
    );
    vi.stubGlobal("document", {
        createElement: () => ({
            width: 0,
            height: 0,
            getContext: () => ({ drawImage }),
            toBlob,
        }),
    });
    return { drawImage, close, toBlob };
}

afterEach(() => vi.unstubAllGlobals());

describe("sanitizeFile", () => {
    it("re-encodes JPEG pixels and drops embedded EXIF bytes", async () => {
        const canvas = stubCanvas(1200, 800);
        const source = Object.assign(new Blob([jpegBytes()]), { name: "photo.jpg" });
        const result = await sanitizeFile(source);
        expect(result.method).toBe("re-encoded");
        expect(result.blob.size).toBeGreaterThan(0);
        expect(result.blob.type).toBe("image/png");
        expect(result.fileName).toBe("photo-redacted.png");
        expect(canvas.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1200, 800);
        expect(canvas.close).toHaveBeenCalledOnce();
        const reparsed = await parseFileMetadata(
            Object.assign(result.blob, { name: result.fileName }),
        );
        expect(reparsed.hasMetadata).toBe(false);
    });

    it("caps the decoded dimensions before drawing to the canvas", async () => {
        const canvas = stubCanvas(8000, 4000);
        const source = Object.assign(new Blob([jpegBytes()]), { name: "huge.jpg" });
        await sanitizeFile(source, { maxDimension: 1000 });
        expect(canvas.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1000, 500);
        expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
    });

    it("labels unsupported formats as unverified byte-for-byte copies", async () => {
        const bytes = new Uint8Array([1, 2, 3, 4]);
        const source = Object.assign(new Blob([bytes]), { name: "notes.txt" });
        const result = await sanitizeFile(source);
        expect(result.method).toBe("unverified-copy");
        expect(result.label).toContain("Metadata may still be present");
        expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(bytes);
    });

    it("rejects empty files", async () => {
        await expect(sanitizeFile(new Blob([]))).rejects.toThrow("empty");
    });
});
