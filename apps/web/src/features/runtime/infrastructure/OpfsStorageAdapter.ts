import { CodedError, ERROR_CODES } from "@frithward/contracts";
import type { AssetStoragePort, StoredAsset } from "../ports/AssetStoragePort";

function errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : "Unknown error.";
}

function isNotFound(cause: unknown): boolean {
    return (
        typeof cause === "object" &&
        cause !== null &&
        (cause as { name?: string }).name === "NotFoundError"
    );
}

function fail(
    code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
    message: string,
    cause: unknown,
): CodedError {
    return new CodedError(code, `${message}: ${errorMessage(cause)}`, {
        detail: errorMessage(cause),
    });
}

export class OpfsStorageAdapter implements AssetStoragePort {
    private async root(): Promise<FileSystemDirectoryHandle> {
        const storage = navigator.storage;
        if (!storage || typeof storage.getDirectory !== "function") {
            throw new CodedError(
                ERROR_CODES.OPFS_UNAVAILABLE,
                "OPFS is not available in this browser.",
            );
        }
        try {
            return await storage.getDirectory();
        } catch (cause) {
            throw fail(ERROR_CODES.OPFS_OPEN_FAILED, "Unable to open OPFS", cause);
        }
    }

    public async write(name: string, data: ArrayBuffer): Promise<void> {
        try {
            const root = await this.root();
            const handle = await root.getFileHandle(name, { create: true });
            const writable = await handle.createWritable();
            await writable.write(data);
            await writable.close();
        } catch (cause) {
            throw fail(ERROR_CODES.OPFS_WRITE_FAILED, "Unable to write asset", cause);
        }
    }

    public async read(name: string): Promise<ArrayBuffer | null> {
        const root = await this.root();
        let handle: FileSystemFileHandle;
        try {
            handle = await root.getFileHandle(name);
        } catch (cause) {
            if (isNotFound(cause)) return null;
            throw fail(ERROR_CODES.OPFS_READ_FAILED, "Unable to read asset", cause);
        }
        try {
            const file = await handle.getFile();
            return await file.arrayBuffer();
        } catch (cause) {
            throw fail(ERROR_CODES.OPFS_READ_FAILED, "Unable to read asset", cause);
        }
    }

    public async list(): Promise<readonly StoredAsset[]> {
        const root = await this.root();
        const assets: StoredAsset[] = [];
        for await (const handle of root.values()) {
            if (handle.kind !== "file") continue;
            const file = await handle.getFile();
            assets.push({ name: handle.name, size: file.size });
        }
        return assets;
    }

    public async delete(name: string): Promise<void> {
        try {
            const root = await this.root();
            await root.removeEntry(name);
        } catch (cause) {
            if (isNotFound(cause)) return;
            throw fail(ERROR_CODES.OPFS_DELETE_FAILED, "Unable to delete asset", cause);
        }
    }
}
