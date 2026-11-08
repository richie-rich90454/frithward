export class GarageObjectStorage {
    public constructor(private readonly endpoint: string) {
        if (endpoint.trim().length === 0) throw new Error("Storage endpoint required.");
    }

    public objectUrl(bucket: string, key: string): string {
        if (bucket.trim().length === 0) throw new Error("Bucket required.");
        if (key.trim().length === 0) throw new Error("Object key required.");
        const base = this.endpoint.replace(/\/$/, "");
        return `${base}/${bucket}/${key}`;
    }
}
