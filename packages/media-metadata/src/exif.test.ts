import { describe, expect, it } from "vitest";
import { parseFileMetadata } from "./exif.js";

interface Entry {
    tag: number;
    type: number;
    count: number;
    data: number[];
}

class TiffWriter {
    private readonly bytes: number[] = [];

    public constructor(private readonly littleEndian: boolean) {
        this.bytes.push(...(littleEndian ? [0x49, 0x49] : [0x4d, 0x4d]));
        this.bytes.push(...this.u16(0x2a));
        this.bytes.push(...this.u32(0));
    }

    public u16(value: number): number[] {
        return this.littleEndian
            ? [value & 0xff, (value >> 8) & 0xff]
            : [(value >> 8) & 0xff, value & 0xff];
    }

    public u32(value: number): number[] {
        return this.littleEndian
            ? [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >>> 24) & 0xff]
            : [(value >>> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
    }

    public get offset(): number {
        return this.bytes.length;
    }

    public writeIfd(entries: readonly Entry[]): number {
        const start = this.bytes.length;
        this.bytes.push(0, 0);
        const entryStart = this.bytes.length;
        for (let index = 0; index < entries.length; index++) {
            this.bytes.push(...Array(12).fill(0));
            void index;
        }
        this.bytes.push(...this.u32(0));
        for (const [index, entry] of entries.entries()) {
            const position = entryStart + index * 12;
            this.bytes.splice(position, 2, ...this.u16(entry.tag));
            this.bytes.splice(position + 2, 2, ...this.u16(entry.type));
            this.bytes.splice(position + 4, 4, ...this.u32(entry.count));
            if (entry.data.length <= 4) {
                this.bytes.splice(
                    position + 8,
                    4,
                    ...entry.data,
                    ...Array(4 - entry.data.length).fill(0),
                );
            } else {
                while (this.bytes.length % 2 !== 0) this.bytes.push(0);
                const dataOffset = this.bytes.length;
                this.bytes.push(...entry.data);
                this.bytes.splice(position + 8, 4, ...this.u32(dataOffset));
            }
        }
        this.bytes.splice(start, 2, ...this.u16(entries.length));
        return start;
    }

    public patchIfdOffset(offset: number): void {
        this.bytes.splice(4, 4, ...this.u32(offset));
    }

    public toUint8Array(): Uint8Array {
        return new Uint8Array(this.bytes);
    }
}

function ascii(value: string): number[] {
    return [...new TextEncoder().encode(value), 0];
}

function rationals(pairs: readonly (readonly [number, number])[], le: boolean): number[] {
    const writer = new TiffWriter(le);
    return pairs.flatMap(([numerator, denominator]) => [
        ...writer.u32(numerator),
        ...writer.u32(denominator),
    ]);
}

function tiffFixture(le: boolean): Uint8Array {
    const writer = new TiffWriter(le);
    const exifOffset = writer.offset;
    writer.writeIfd([{ tag: 0x9003, type: 2, count: 20, data: ascii("2024:01:02 03:04:05") }]);
    const gpsOffset = writer.offset;
    writer.writeIfd([
        { tag: 0x0001, type: 2, count: 2, data: [0x4e, 0x00] },
        {
            tag: 0x0002,
            type: 5,
            count: 3,
            data: rationals(
                [
                    [51, 1],
                    [30, 1],
                    [0, 1],
                ],
                le,
            ),
        },
        { tag: 0x0003, type: 2, count: 2, data: [0x57, 0x00] },
        {
            tag: 0x0004,
            type: 5,
            count: 3,
            data: rationals(
                [
                    [0, 1],
                    [6, 1],
                    [0, 1],
                ],
                le,
            ),
        },
    ]);
    const ifd0Offset = writer.offset;
    writer.writeIfd([
        { tag: 0x010f, type: 2, count: 5, data: ascii("ACME") },
        { tag: 0x0110, type: 2, count: 6, data: ascii("CAM-1") },
        { tag: 0x0112, type: 3, count: 1, data: le ? [6, 0, 0, 0] : [0, 6, 0, 0] },
        { tag: 0x8769, type: 4, count: 1, data: writer.u32(exifOffset) },
        { tag: 0x8825, type: 4, count: 1, data: writer.u32(gpsOffset) },
        { tag: 0xc123, type: 2, count: 6, data: ascii("hello!") },
    ]);
    writer.patchIfdOffset(ifd0Offset);
    return writer.toUint8Array();
}

function jpegFixture(le: boolean, withIptc = false): Uint8Array {
    const tiff = tiffFixture(le);
    const parts: number[] = [0xff, 0xd8];
    const exif = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, ...tiff];
    parts.push(0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 0xff, ...exif);
    if (withIptc) {
        const iptc = [
            ...new TextEncoder().encode("Photoshop 3.0\0"),
            0x38,
            0x42,
            0x49,
            0x4d,
            0x04,
            0x04,
            0x00,
            0x00,
            0x00,
            0x00,
            0x00,
            0x09,
            0x1c,
            0x02,
            0x50,
            0x00,
            0x04,
            0x4a,
            0x61,
            0x6e,
            0x65,
        ];
        parts.push(0xff, 0xed, (iptc.length + 2) >> 8, (iptc.length + 2) & 0xff, ...iptc);
    }
    parts.push(0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xff, 0xd9);
    return new Uint8Array(parts);
}

function blobOf(bytes: Uint8Array, name = "photo.jpg"): Blob & { name: string } {
    const copy = new Uint8Array(bytes);
    const blob = new Blob([copy]);
    return Object.assign(blob, { name });
}

describe("parseFileMetadata", () => {
    it.each([true, false])(
        "reads littleEndian=%s EXIF device, timestamp, GPS and generic tags",
        async (le) => {
            const parsed = await parseFileMetadata(blobOf(jpegFixture(le)));
            expect(parsed.format).toBe("jpeg");
            expect(parsed.hasMetadata).toBe(true);
            expect(parsed.fields).toMatchObject({
                Make: "ACME",
                Model: "CAM-1",
                DateTimeOriginal: "2024:01:02 03:04:05",
                GPSLatitude: 51.5,
                GPSLongitude: -0.1,
                GPSLatitudeRef: "N",
                GPSLongitudeRef: "W",
                Orientation: 6,
                Exif_0xC123: "hello!",
            });
        },
    );

    it("reads IPTC bylines from Photoshop APP13 segments", async () => {
        const parsed = await parseFileMetadata(blobOf(jpegFixture(true, true)));
        expect(parsed.fields.ByLine).toBe("Jane");
    });

    it("returns no fields for unsupported bytes", async () => {
        const parsed = await parseFileMetadata(blobOf(new Uint8Array([1, 2, 3]), "notes.txt"));
        expect(parsed.format).toBe("unknown");
        expect(parsed.hasMetadata).toBe(false);
        expect(parsed.fields).toEqual({});
    });
});
