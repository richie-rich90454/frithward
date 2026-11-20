import { CodedError, ERROR_CODES } from "@frithward/contracts";

export interface RedactionRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

export class ImageRedactor {
    public async redact(image: ArrayBuffer, region: RedactionRegion): Promise<Blob> {
        if (image.byteLength === 0)
            throw new CodedError(ERROR_CODES.IMAGE_EMPTY, "The selected image is empty.");
        if (typeof createImageBitmap === "undefined")
            throw new CodedError(
                ERROR_CODES.IMAGE_DECODE_UNAVAILABLE,
                "Image decoding (createImageBitmap) is not available in this browser.",
            );
        const values = [region.x, region.y, region.width, region.height];
        if (
            values.some((value) => !Number.isFinite(value)) ||
            region.width <= 0 ||
            region.height <= 0
        )
            throw new CodedError(
                ERROR_CODES.REDACTION_REGION_INVALID,
                "Provide a valid region with positive width and height.",
            );

        const bitmap = await createImageBitmap(new Blob([image]));
        try {
            const x = Math.max(0, Math.floor(region.x));
            const y = Math.max(0, Math.floor(region.y));
            const width = Math.min(Math.floor(region.width), bitmap.width - x);
            const height = Math.min(Math.floor(region.height), bitmap.height - y);
            if (width <= 0 || height <= 0)
                throw new CodedError(
                    ERROR_CODES.REDACTION_REGION_OUTSIDE,
                    "The redaction region is outside the image.",
                );

            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext("2d");
            if (!context)
                throw new CodedError(
                    ERROR_CODES.CANVAS_2D_UNAVAILABLE,
                    "Canvas 2D is not available in this browser.",
                );
            context.drawImage(bitmap, 0, 0);

            const block = 8;
            const small = document.createElement("canvas");
            small.width = Math.max(1, Math.ceil(width / block));
            small.height = Math.max(1, Math.ceil(height / block));
            const smallContext = small.getContext("2d");
            if (!smallContext)
                throw new CodedError(
                    ERROR_CODES.CANVAS_2D_UNAVAILABLE,
                    "Canvas 2D is not available in this browser.",
                );
            smallContext.drawImage(canvas, x, y, width, height, 0, 0, small.width, small.height);
            context.imageSmoothingEnabled = false;
            context.drawImage(small, 0, 0, small.width, small.height, x, y, width, height);

            return await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) =>
                        blob
                            ? resolve(blob)
                            : reject(
                                  new CodedError(
                                      ERROR_CODES.REDACTION_ENCODE_FAILED,
                                      "Could not encode the redacted image.",
                                  ),
                              ),
                    "image/png",
                );
            });
        } finally {
            bitmap.close();
        }
    }
}
