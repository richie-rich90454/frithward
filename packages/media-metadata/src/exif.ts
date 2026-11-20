export interface MetadataRecord {
    kind: string;
    entries: Readonly<Record<string, string>>;
}

export class MetadataInspector {
    public inspect(record: MetadataRecord): readonly string[] {
        const findings: string[] = [];
        for (const [key, value] of Object.entries(record.entries)) {
            if (key.toLowerCase().includes("gps") || key.toLowerCase().includes("location")) {
                findings.push(`Location metadata present: ${key}=${value}`);
            }
        }
        return findings;
    }
}

export type ParsedFieldValue = string | number | boolean | null;

export type ParsedFormat = "jpeg" | "png" | "unknown";

export interface ParsedMetadata {
    fileName: string;
    format: ParsedFormat;
    fields: Record<string, ParsedFieldValue>;
    hasMetadata: boolean;
}

const EXIF_MARKER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PHOTOSHOP_MARKER = [
    0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20, 0x33, 0x2e, 0x30, 0x00,
];

const IFD0_TAGS: Record<number, string> = {
    0x010e: "ImageDescription",
    0x010f: "Make",
    0x0110: "Model",
    0x0112: "Orientation",
    0x0131: "Software",
    0x0132: "DateTime",
    0x013b: "Artist",
    0x8298: "Copyright",
    0x8769: "ExifIFDPointer",
    0x8825: "GPSInfoIFDPointer",
};

const EXIF_TAGS: Record<number, string> = {
    0x829a: "ExposureTime",
    0x829d: "FNumber",
    0x9003: "DateTimeOriginal",
    0x9004: "DateTimeDigitized",
    0x9209: "Flash",
    0xa402: "ExposureMode",
    0xa403: "WhiteBalance",
    0xa431: "BodySerialNumber",
    0xa433: "LensMake",
    0xa434: "LensModel",
};

const GPS_TAGS: Record<number, string> = {
    0x0001: "GPSLatitudeRef",
    0x0002: "GPSLatitude",
    0x0003: "GPSLongitudeRef",
    0x0004: "GPSLongitude",
    0x0005: "GPSAltitudeRef",
    0x0006: "GPSAltitude",
    0x0007: "GPSTimeStamp",
    0x001d: "GPSDateStamp",
};

const IPTC_TAGS: Record<string, string> = {
    "2:5": "ObjectName",
    "2:25": "Keywords",
    "2:40": "Caption",
    "2:55": "SupplementalCategories",
    "2:80": "ByLine",
    "2:85": "ByLineTitle",
    "2:90": "City",
    "2:95": "ProvinceState",
    "2:100": "CountryCode",
    "2:101": "DateCreated",
    "2:110": "Credit",
    "2:115": "Source",
    "2:116": "CopyrightNotice",
    "2:120": "CaptionWriter",
};

const TYPE_SIZES: Record<number, number> = {
    1: 1,
    2: 1,
    3: 2,
    4: 4,
    5: 8,
    6: 1,
    7: 1,
    8: 2,
    9: 4,
    10: 8,
    11: 4,
    12: 8,
};

function matches(bytes: Uint8Array, offset: number, prefix: readonly number[]): boolean {
    if (offset + prefix.length > bytes.length) return false;
    return prefix.every((value, index) => bytes[offset + index] === value);
}

function decodeText(bytes: Uint8Array, start: number, end: number): string {
    let stop = end;
    while (stop > start && bytes[stop - 1] === 0) stop--;
    return new TextDecoder().decode(bytes.subarray(start, stop)).trim();
}

function hexTag(tag: number): string {
    return `Exif_0x${tag.toString(16).toUpperCase().padStart(4, "0")}`;
}

class TiffReader {
    private readonly view: DataView;
    private readonly littleEndian: boolean;
    private readonly visitedIfds = new Set<number>();

    public constructor(private readonly bytes: Uint8Array) {
        if (bytes.length < 8) throw new Error("Truncated TIFF header.");
        const first = bytes[0];
        const second = bytes[1];
        if (first !== 0x49 || second !== 0x49) {
            if (first !== 0x4d || second !== 0x4d) throw new Error("Unknown TIFF byte order.");
        }
        this.littleEndian = first === 0x49;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        if (this.u16(2) !== 0x2a) throw new Error("Invalid TIFF magic.");
    }

    public read(fields: Record<string, ParsedFieldValue>): void {
        const ifd0 = this.u32(4);
        if (ifd0 > 0) this.readIfd(ifd0, IFD0_TAGS, fields, 0);
    }

    private u16(offset: number): number {
        return this.view.getUint16(offset, this.littleEndian);
    }

    private u32(offset: number): number {
        return this.view.getUint32(offset, this.littleEndian);
    }

    private i32(offset: number): number {
        return this.view.getInt32(offset, this.littleEndian);
    }

    private dataOffset(valueOffset: number, size: number): number | null {
        if (size <= 4) return valueOffset;
        const offset = this.u32(valueOffset);
        if (offset + size > this.bytes.length) return null;
        return offset;
    }

    private numberAt(offset: number, type: number): number | null {
        if (offset + 4 > this.bytes.length) return null;
        if (type === 3) return this.u16(offset);
        if (type === 4) return this.u32(offset);
        if (type === 9) return this.i32(offset);
        if (type === 5 || type === 10) {
            if (offset + 8 > this.bytes.length) return null;
            const numerator = type === 5 ? this.u32(offset) : this.i32(offset);
            const denominator = type === 5 ? this.u32(offset + 4) : this.i32(offset + 4);
            if (denominator === 0) return null;
            return Math.round((numerator / denominator) * 1e6) / 1e6;
        }
        return null;
    }

    private readValue(valueOffset: number, type: number, count: number): ParsedFieldValue {
        const unit = TYPE_SIZES[type];
        if (unit === undefined || count < 1 || count > 1024) return null;
        const offset = this.dataOffset(valueOffset, unit * count);
        if (offset === null) return null;
        if (type === 2) return decodeText(this.bytes, offset, offset + count) || null;
        if (type === 1 || type === 7) {
            const length = Math.min(count, 8);
            const parts: string[] = [];
            for (let index = 0; index < length; index++)
                parts.push((this.bytes[offset + index] ?? 0).toString(16).padStart(2, "0"));
            return parts.join(" ");
        }
        if (type === 6 || type === 8 || type === 11 || type === 12) return null;
        const values: number[] = [];
        for (let index = 0; index < count; index++) {
            const value = this.numberAt(offset + index * unit, type);
            if (value === null) return null;
            values.push(value);
        }
        return values.length === 1 ? (values[0] ?? null) : values.join(", ");
    }

    private readIfd(
        offset: number,
        tags: Record<number, string>,
        fields: Record<string, ParsedFieldValue>,
        depth: number,
    ): void {
        if (depth > 4 || this.visitedIfds.has(offset) || offset + 2 > this.bytes.length) return;
        this.visitedIfds.add(offset);
        const count = this.u16(offset);
        for (let index = 0; index < count; index++) {
            const entry = offset + 2 + index * 12;
            if (entry + 12 > this.bytes.length) break;
            const tag = this.u16(entry);
            const type = this.u16(entry + 2);
            const valueCount = this.u32(entry + 4);
            const name = tags[tag] ?? hexTag(tag);
            const value = this.readValue(entry + 8, type, valueCount);
            const isPointer = tags === IFD0_TAGS && (tag === 0x8769 || tag === 0x8825);
            if (value !== null && !isPointer) fields[name] = value;
            if (tags === IFD0_TAGS && tag === 0x8769 && typeof value === "number")
                this.readIfd(value, EXIF_TAGS, fields, depth + 1);
            if (tags === IFD0_TAGS && tag === 0x8825 && typeof value === "number")
                this.readGps(value, fields, depth + 1);
        }
        const next = offset + 2 + count * 12;
        if (next + 4 <= this.bytes.length) {
            const nextOffset = this.u32(next);
            if (nextOffset > 0) this.readIfd(nextOffset, tags, fields, depth + 1);
        }
    }

    private readGps(offset: number, fields: Record<string, ParsedFieldValue>, depth: number): void {
        if (depth > 4 || this.visitedIfds.has(offset) || offset + 2 > this.bytes.length) return;
        this.visitedIfds.add(offset);
        const count = this.u16(offset);
        const refs: Record<number, string> = {};
        const entries: { tag: number; type: number; valueCount: number; valueOffset: number }[] =
            [];
        for (let index = 0; index < count; index++) {
            const entry = offset + 2 + index * 12;
            if (entry + 12 > this.bytes.length) break;
            const tag = this.u16(entry);
            const type = this.u16(entry + 2);
            const valueCount = this.u32(entry + 4);
            if (tag === 0x0001 || tag === 0x0003) {
                const ref = this.readValue(entry + 8, type, valueCount);
                if (typeof ref === "string") refs[tag] = ref;
            }
            entries.push({ tag, type, valueCount, valueOffset: entry + 8 });
        }
        for (const entry of entries) {
            if (
                (entry.tag === 0x0002 || entry.tag === 0x0004) &&
                entry.type === 5 &&
                entry.valueCount === 3
            ) {
                const block = this.dataOffset(entry.valueOffset, 24);
                const components: number[] = [];
                for (let index = 0; index < 3 && block !== null; index++) {
                    const component = this.numberAt(block + index * 8, 5);
                    if (component === null) break;
                    components.push(component);
                }
                if (components.length !== 3) continue;
                const decimal = components[0]! + components[1]! / 60 + components[2]! / 3600;
                const ref = entry.tag === 0x0002 ? refs[0x0001] : refs[0x0003];
                const sign = ref === "S" || ref === "W" ? -1 : 1;
                const key = entry.tag === 0x0002 ? "GPSLatitude" : "GPSLongitude";
                fields[key] = Math.round(sign * decimal * 1e6) / 1e6;
                continue;
            }
            const name = GPS_TAGS[entry.tag] ?? hexTag(entry.tag);
            const value = this.readValue(entry.valueOffset, entry.type, entry.valueCount);
            if (value !== null) fields[name] = value;
        }
    }
}

function parseTiff(bytes: Uint8Array, fields: Record<string, ParsedFieldValue>): void {
    try {
        new TiffReader(bytes).read(fields);
    } catch {
        // Malformed EXIF is ignored; other segments are still inspected.
    }
}

function parseIptc(bytes: Uint8Array, fields: Record<string, ParsedFieldValue>): void {
    let offset = PHOTOSHOP_MARKER.length;
    while (offset + 6 <= bytes.length && matches(bytes, offset, [0x38, 0x42, 0x49, 0x4d])) {
        const resourceId = ((bytes[offset + 4] ?? 0) << 8) | (bytes[offset + 5] ?? 0);
        offset += 6;
        if (offset >= bytes.length) return;
        const nameLength = bytes[offset] ?? 0;
        let advance = 1 + nameLength;
        if (advance % 2 === 1) advance++;
        offset += advance;
        if (offset + 4 > bytes.length) return;
        const dataLength =
            ((bytes[offset] ?? 0) << 24) |
            ((bytes[offset + 1] ?? 0) << 16) |
            ((bytes[offset + 2] ?? 0) << 8) |
            (bytes[offset + 3] ?? 0);
        offset += 4;
        if (dataLength < 0 || offset + dataLength > bytes.length) return;
        if (resourceId === 0x0404)
            parseIptcData(bytes.subarray(offset, offset + dataLength), fields);
        offset += dataLength;
    }
}

function parseIptcData(bytes: Uint8Array, fields: Record<string, ParsedFieldValue>): void {
    let offset = 0;
    while (offset + 5 <= bytes.length && bytes[offset] === 0x1c) {
        const record = bytes[offset + 1] ?? 0;
        const dataset = bytes[offset + 2] ?? 0;
        const length = ((bytes[offset + 3] ?? 0) << 8) | (bytes[offset + 4] ?? 0);
        const start = offset + 5;
        if (start + length > bytes.length) return;
        const value = decodeText(bytes, start, start + length);
        if (value.length > 0) {
            const key = `${record}:${dataset}`;
            fields[IPTC_TAGS[key] ?? `IPTC_${record}_${dataset}`] = value;
        }
        offset = start + length;
    }
}

function parsePng(bytes: Uint8Array, fields: Record<string, ParsedFieldValue>): void {
    let offset = PNG_SIGNATURE.length;
    while (offset + 8 <= bytes.length) {
        const length =
            ((bytes[offset] ?? 0) << 24) |
            ((bytes[offset + 1] ?? 0) << 16) |
            ((bytes[offset + 2] ?? 0) << 8) |
            (bytes[offset + 3] ?? 0);
        const type = String.fromCharCode(
            bytes[offset + 4] ?? 0,
            bytes[offset + 5] ?? 0,
            bytes[offset + 6] ?? 0,
            bytes[offset + 7] ?? 0,
        );
        const start = offset + 8;
        if (length < 0 || start + length + 4 > bytes.length) return;
        if (type === "eXIf") parseTiff(bytes.subarray(start, start + length), fields);
        if (type === "tEXt") {
            const separator = bytes.indexOf(0, start);
            if (separator > start && separator < start + length) {
                const key = decodeText(bytes, start, separator);
                const value = decodeText(bytes, separator + 1, start + length);
                if (key.length > 0 && value.length > 0) fields[key] = value;
            }
        }
        offset = start + length + 4;
    }
}

function parseJpeg(bytes: Uint8Array, fields: Record<string, ParsedFieldValue>): void {
    let offset = 2;
    while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            offset++;
            continue;
        }
        while (bytes[offset] === 0xff) offset++;
        const marker = bytes[offset] ?? 0;
        offset++;
        if (marker === 0xd9 || marker === 0xda) return;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (offset + 2 > bytes.length) return;
        const length = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
        const start = offset + 2;
        if (length < 2 || start + length > bytes.length + 2) return;
        const end = Math.min(start + length - 2, bytes.length);
        const payload = bytes.subarray(start, end);
        if (marker === 0xe1 && matches(payload, 0, EXIF_MARKER))
            parseTiff(payload.subarray(6), fields);
        if (marker === 0xed && matches(payload, 0, PHOTOSHOP_MARKER)) parseIptc(payload, fields);
        offset = start + length - 2;
    }
}

export async function parseFileMetadata(file: Blob & { name?: string }): Promise<ParsedMetadata> {
    const fileName = file.name ?? "file";
    const bytes = new Uint8Array(await file.arrayBuffer());
    const fields: Record<string, ParsedFieldValue> = {};
    let format: ParsedFormat = "unknown";
    if (matches(bytes, 0, [0xff, 0xd8])) {
        format = "jpeg";
        parseJpeg(bytes, fields);
    } else if (matches(bytes, 0, PNG_SIGNATURE)) {
        format = "png";
        parsePng(bytes, fields);
    }
    return { fileName, format, fields, hasMetadata: Object.keys(fields).length > 0 };
}
