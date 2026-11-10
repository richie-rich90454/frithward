import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import { AnalyzeTextUseCase } from "../application/AnalyzeTextUseCase.js";

const AnalyzeRequest = z.object({
    text: z.string().min(1).max(20000),
});

export class InferenceWorkerRoutes extends Hono {
    public constructor(private readonly analyzeText: AnalyzeTextUseCase) {
        super();
        this.get("/health", (context) =>
            context.json({ status: "ok", service: "inference-worker" }),
        );
        this.post("/api/inference/analyze", async (context) => {
            const parsed = AnalyzeRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const result = this.analyzeText.execute(parsed.data.text);
            return context.json({ ...result, createdAt: new Date().toISOString() }, 200);
        });
    }
}
