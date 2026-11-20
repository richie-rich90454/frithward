import { AppError } from "@frithward/contracts";
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";

export interface GarageObjectStorageOptions {
    readonly bucket?: string;
    readonly client?: S3Client;
}

export class GarageObjectStorage {
    private readonly client: S3Client | null;
    private readonly bucket: string;

    public constructor(
        private readonly endpoint: string,
        options: GarageObjectStorageOptions = {},
    ) {
        if (endpoint.trim().length === 0) throw new Error("Storage endpoint required.");
        this.bucket = options.bucket ?? "media";
        this.client = options.client ?? null;
    }

    /** Returns null when Garage is not configured; the caller must report EXTERNAL_UNAVAILABLE. */
    public static fromEnv(): GarageObjectStorage | null {
        const endpoint = process.env.GARAGE_ENDPOINT;
        const bucket = process.env.GARAGE_BUCKET;
        const accessKeyId = process.env.GARAGE_ACCESS_KEY;
        const secretAccessKey = process.env.GARAGE_SECRET_KEY;
        if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
        const client = new S3Client({
            endpoint,
            region: process.env.GARAGE_REGION ?? "us-east-1",
            forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
        });
        return new GarageObjectStorage(endpoint, { bucket, client });
    }

    public objectUrl(bucket: string, key: string): string {
        if (bucket.trim().length === 0) throw new Error("Bucket required.");
        this.assertKey(key);
        const base = this.endpoint.replace(/\/$/, "");
        return `${base}/${bucket}/${key}`;
    }

    public async putObject(key: string, body: Uint8Array, contentType?: string): Promise<void> {
        const client = this.requireClient();
        this.assertKey(key);
        await client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentLength: body.byteLength,
                ...(contentType ? { ContentType: contentType } : {}),
            }),
        );
    }

    public async getObject(key: string): Promise<Uint8Array | null> {
        const client = this.requireClient();
        this.assertKey(key);
        try {
            const result = await client.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            );
            if (!result.Body || typeof result.Body.transformToByteArray !== "function")
                throw new AppError("EXTERNAL_UNAVAILABLE", "Garage returned an empty object body.");
            return await result.Body.transformToByteArray();
        } catch (cause) {
            if (cause instanceof Error && (cause.name === "NoSuchKey" || cause.name === "NotFound"))
                return null;
            throw cause;
        }
    }

    public async deleteObject(key: string): Promise<void> {
        const client = this.requireClient();
        this.assertKey(key);
        await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    }

    private requireClient(): S3Client {
        if (!this.client)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "Garage is not configured (GARAGE_ENDPOINT/BUCKET/KEYS).",
            );
        return this.client;
    }

    private assertKey(key: string): void {
        if (key.trim().length === 0)
            throw new AppError("VALIDATION_FAILED", "Object key required.");
    }
}
