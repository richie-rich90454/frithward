import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import { DispatchAnalysisUseCase } from "../application/DispatchAnalysisUseCase.js";

const AnalyzeRequest = z.object({
    text: z.string().min(1).max(20000),
});

export class OrchestratorRoutes extends Hono {
    public constructor(private readonly dispatch: DispatchAnalysisUseCase) {
        super();
        this.get("/health", (context) => context.json({ status: "ok", service: "orchestrator" }));
        this.post("/api/orchestrator/analyze", async (context) => {
            const parsed = AnalyzeRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const result = await this.dispatch.execute({ text: parsed.data.text });
            return context.json(result, 200);
        });
    }
}
