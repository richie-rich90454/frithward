export { MetadataInspector, parseFileMetadata } from "./exif.js";
export type { ParsedFieldValue, ParsedFormat, ParsedMetadata } from "./exif.js";
export { sanitizeFile } from "./redaction.js";
export type { SanitizedFile, SanitizeOptions } from "./redaction.js";

export interface MetadataRecord {
    kind: string;
    entries: Readonly<Record<string, string>>;
}
