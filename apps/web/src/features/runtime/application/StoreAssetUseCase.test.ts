import { describe, expect, it } from "vitest";
import type { AssetStoragePort, StoredAsset } from "../ports/AssetStoragePort";
import { StoreAssetUseCase } from "./StoreAssetUseCase";

class InMemoryAssetStorage implements AssetStoragePort {
    public readonly files = new Map<string, ArrayBuffer>();

    public async write(name: string, data: ArrayBuffer): Promise<void> {
        this.files.set(name, data);
    }

    public async read(name: string): Promise<ArrayBuffer | null> {
        return this.files.get(name) ?? null;
    }

    public async list(): Promise<readonly StoredAsset[]> {
        return [...this.files.entries()].map(([name, data]) => ({ name, size: data.byteLength }));
    }

    public async delete(name: string): Promise<void> {
        this.files.delete(name);
    }
}

const bytes = (length: number): ArrayBuffer => new ArrayBuffer(length);

describe("StoreAssetUseCase", () => {
    it("stores, lists, reads, and deletes assets through the storage port", async () => {
        const storage = new InMemoryAssetStorage();
        const useCase = new StoreAssetUseCase(storage);

        const asset = await useCase.store("clip.bin", bytes(12));
        expect(asset).toEqual({ name: "clip.bin", size: 12 });
        expect(await useCase.list()).toEqual([{ name: "clip.bin", size: 12 }]);
        expect((await useCase.read("clip.bin"))?.byteLength).toBe(12);

        await useCase.delete("clip.bin");
        expect(await useCase.read("clip.bin")).toBeNull();
        expect(await useCase.list()).toEqual([]);
    });

    it("returns null for a missing asset", async () => {
        const useCase = new StoreAssetUseCase(new InMemoryAssetStorage());
        expect(await useCase.read("missing.bin")).toBeNull();
    });

    it("rejects empty names and path separators", async () => {
        const useCase = new StoreAssetUseCase(new InMemoryAssetStorage());
        await expect(useCase.store("   ", bytes(1))).rejects.toThrow("must not be empty");
        await expect(useCase.store("a/b", bytes(1))).rejects.toThrow("path separators");
        await expect(useCase.read("..\\x")).rejects.toThrow("path separators");
    });

    it("propagates storage failures", async () => {
        const failing: AssetStoragePort = {
            write: async () => {
                throw new Error("Storage full.");
            },
            read: async () => null,
            list: async () => [],
            delete: async () => {},
        };
        const useCase = new StoreAssetUseCase(failing);
        await expect(useCase.store("x", bytes(1))).rejects.toThrow("Storage full.");
    });
});
