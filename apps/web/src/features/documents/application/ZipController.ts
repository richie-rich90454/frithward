import { CodedError, ERROR_CODES } from "@frithward/contracts";
import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter } from "@zip.js/zip.js";
import type { NamedBytes } from "../domain/DocumentModel";

export class ZipController {
    public async zip(entries: readonly NamedBytes[]): Promise<Uint8Array> {
        if (entries.length === 0) {
            throw new CodedError(ERROR_CODES.BUNDLE_EMPTY, "There is nothing to bundle.");
        }
        const writer = new Uint8ArrayWriter();
        const archive = new ZipWriter(writer);
        for (const entry of entries) {
            if (entry.name.trim() === "") {
                throw new CodedError(
                    ERROR_CODES.BUNDLE_ENTRY_NAME_REQUIRED,
                    "Every bundle entry needs a name.",
                );
            }
            await archive.add(entry.name, new Uint8ArrayReader(entry.data));
        }
        return archive.close();
    }

    public async unzip(data: Uint8Array): Promise<readonly NamedBytes[]> {
        if (data.byteLength === 0) {
            throw new CodedError(ERROR_CODES.ARCHIVE_EMPTY, "The archive is empty.");
        }
        const archive = new ZipReader(new Uint8ArrayReader(data));
        try {
            const entries = await archive.getEntries();
            const result: NamedBytes[] = [];
            for (const entry of entries) {
                if (entry.directory) continue;
                result.push({
                    name: entry.filename,
                    data: await entry.getData(new Uint8ArrayWriter()),
                });
            }
            return result;
        } finally {
            await archive.close();
        }
    }
}
