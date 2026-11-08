import { Hono } from "hono";
import { AnalyzeMessageUseCase } from "@frithward/security-core";

export class ScamAnalysisRoutes extends Hono {
    public constructor(private readonly useCase: AnalyzeMessageUseCase) {
        super();
        this.post("/message", async (context) => {
            const body = (await context.req.json()) as { text?: string };
            if (typeof body.text !== "string") {
                return context.json({ code: "VALIDATION_FAILED", message: "Message text required." }, 400);
            }
            const result = this.useCase.execute(body.text);
            return context.json({
                indicators: result.indicators,
                summary: result.summary,
                nextSteps: result.nextSteps,
                limitations: result.limitations,
                createdAt: new Date().toISOString()
            });
        });
    }
}
