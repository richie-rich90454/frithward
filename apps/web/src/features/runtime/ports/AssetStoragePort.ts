export interface StoredAsset {
    name: string;
    size: number;
}

export interface AssetStoragePort {
    write(name: string, data: ArrayBuffer): Promise<void>;
    read(name: string): Promise<ArrayBuffer | null>;
    list(): Promise<readonly StoredAsset[]>;
    delete(name: string): Promise<void>;
}
