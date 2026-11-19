import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import type { GarageObjectStorage } from "./GarageObjectStorage.js";

const KeyParams = z.object({
    key: z
        .string()
        .min(1)
        .max(512)
        .regex(/^[A-Za-z0-9._\-/]+$/, "Invalid object key.")
        .refine((key) => !key.includes(".."), "Invalid object key."),
});

export class StorageRoutes extends Hono {
    public constructor(private readonly storage: GarageObjectStorage | null) {
        super();

        this.post("/api/storage/:key", async (context) => {
            const parsed = KeyParams.safeParse(context.req.param());
            if (!parsed.success)
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Invalid object key.",
                );
            const storage = this.requireStorage();
            const body = new Uint8Array(await context.req.arrayBuffer());
            const contentType = context.req.header("content-type");
            await storage.putObject(parsed.data.key, body, contentType);
            return context.json({ key: parsed.data.key, bytes: body.byteLength }, 201);
        });

        this.get("/api/storage/:key", async (context) => {
            const parsed = KeyParams.safeParse(context.req.param());
            if (!parsed.success)
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Invalid object key.",
                );
            const storage = this.requireStorage();
            const bytes = await storage.getObject(parsed.data.key);
            if (!bytes)
                throw new AppError("NOT_FOUND", `Object ${parsed.data.key} not found.`);
            return new Response(new Blob([new Uint8Array(bytes)]), {
                status: 200,
                headers: {
                    "content-type": context.req.header("content-type") ?? "application/octet-stream",
                },
            });
        });
    }

    private requireStorage(): GarageObjectStorage {
        if (!this.storage)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "Garage object storage is not configured.",
            );
        return this.storage;
    }
}
