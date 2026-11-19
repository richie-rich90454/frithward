import type { AssetStoragePort, StoredAsset } from "../ports/AssetStoragePort";

function validateName(name: string): void {
    if (name.trim() === "") throw new Error("Asset name must not be empty.");
    if (name.includes("/") || name.includes("\\"))
        throw new Error("Asset name must not contain path separators.");
}

export class StoreAssetUseCase {
    public constructor(private readonly storage: AssetStoragePort) {}

    public async store(name: string, data: ArrayBuffer): Promise<StoredAsset> {
        validateName(name);
        await this.storage.write(name, data);
        return { name, size: data.byteLength };
    }

    public async read(name: string): Promise<ArrayBuffer | null> {
        validateName(name);
        return this.storage.read(name);
    }

    public list(): Promise<readonly StoredAsset[]> {
        return this.storage.list();
    }

    public async delete(name: string): Promise<void> {
        validateName(name);
        await this.storage.delete(name);
    }
}
