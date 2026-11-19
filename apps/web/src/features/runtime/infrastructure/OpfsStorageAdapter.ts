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

export class OpfsStorageAdapter implements AssetStoragePort {
    private async root(): Promise<FileSystemDirectoryHandle> {
        const storage = navigator.storage;
        if (!storage || typeof storage.getDirectory !== "function") {
            throw new Error("OPFS is not available in this browser.");
        }
        try {
            return await storage.getDirectory();
        } catch (cause) {
            throw new Error(`Unable to open OPFS: ${errorMessage(cause)}`);
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
            throw new Error(`Unable to write asset: ${errorMessage(cause)}`);
        }
    }

    public async read(name: string): Promise<ArrayBuffer | null> {
        const root = await this.root();
        let handle: FileSystemFileHandle;
        try {
            handle = await root.getFileHandle(name);
        } catch (cause) {
            if (isNotFound(cause)) return null;
            throw new Error(`Unable to read asset: ${errorMessage(cause)}`);
        }
        try {
            const file = await handle.getFile();
            return await file.arrayBuffer();
        } catch (cause) {
            throw new Error(`Unable to read asset: ${errorMessage(cause)}`);
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
            throw new Error(`Unable to delete asset: ${errorMessage(cause)}`);
        }
    }
}
