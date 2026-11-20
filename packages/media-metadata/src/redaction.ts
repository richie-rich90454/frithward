import { parseFileMetadata } from "./exif.js";

export interface SanitizeOptions {
    maxDimension?: number;
    mimeType?: string;
}

export interface SanitizedFile {
    blob: Blob;
    fileName: string;
    method: "re-encoded" | "unverified-copy";
    label: string;
}

const DEFAULT_MAX_DIMENSION = 4096;

function outputName(name: string, extension: string): string {
    const base = name.replace(/\.[^.]+$/, "");
    return `${base || "file"}-redacted.${extension}`;
}

function isDecodableImage(bytes: Uint8Array): boolean {
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    return jpeg || png;
}

async function reEncode(
    file: Blob,
    name: string,
    mimeType: string,
    maxDimension: number,
): Promise<SanitizedFile> {
    if (typeof createImageBitmap === "undefined")
        throw new Error("Image decoding (createImageBitmap) is not available in this browser.");
    if (typeof document === "undefined")
        throw new Error("Canvas redaction is not available outside a browser.");

    const bitmap = await createImageBitmap(file);
    try {
        const longest = Math.max(bitmap.width, bitmap.height);
        const scale = longest > maxDimension ? maxDimension / longest : 1;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas 2D is not available in this browser.");
        context.drawImage(bitmap, 0, 0, width, height);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (encoded) =>
                    encoded
                        ? resolve(encoded)
                        : reject(new Error("Could not encode the sanitized image.")),
                mimeType,
            );
        });
        const suffix = `Re-encoded from decoded pixels at ${width}x${height}; embedded metadata is not carried over.`;
        return {
            blob,
            fileName: outputName(name, mimeType === "image/png" ? "png" : "jpg"),
            method: "re-encoded",
            label:
                scale < 1 ? `${suffix} Downscaled to respect the ${maxDimension}px limit.` : suffix,
        };
    } finally {
        bitmap.close();
    }
}

export async function sanitizeFile(
    file: Blob & { name?: string },
    options: SanitizeOptions = {},
): Promise<SanitizedFile> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error("The selected file is empty.");
    const mimeType = options.mimeType ?? "image/png";
    const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
    if (isDecodableImage(bytes))
        return reEncode(file, file.name ?? "image", mimeType, maxDimension);

    const parsed = await parseFileMetadata(file);
    if (parsed.hasMetadata)
        throw new Error(
            "Metadata was detected in an unsupported format; the original bytes are not copied.",
        );
    const name = file.name ?? "file";
    return {
        blob: new Blob([bytes]),
        fileName: outputName(name, name.includes(".") ? (name.split(".").pop() ?? "bin") : "bin"),
        method: "unverified-copy",
        label: "Unverified copy: original bytes were copied without decoding. Metadata may still be present.",
    };
}
