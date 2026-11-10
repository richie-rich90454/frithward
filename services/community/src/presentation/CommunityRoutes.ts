import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import { SubmitReportUseCase } from "../application/SubmitReportUseCase.js";
import type { ReportRepository } from "../ports/ReportRepository.js";

const FindingSchema = z.object({
    id: z.string().min(1),
    kind: z.string().min(1),
    detail: z.string(),
    remediation: z.string(),
});

const SubmitReportRequest = z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    findings: z.array(FindingSchema),
});

export class CommunityRoutes extends Hono {
    public constructor(
        private readonly submitReport: SubmitReportUseCase,
        private readonly repository: ReportRepository,
    ) {
        super();
        this.get("/health", (context) => context.json({ status: "ok", service: "community" }));
        this.post("/api/community/reports", async (context) => {
            const parsed = SubmitReportRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const result = await this.submitReport.execute({
                title: parsed.data.title,
                body: parsed.data.body,
                findings: parsed.data.findings,
            });
            return context.json(result, 201);
        });
        this.get("/api/community/reports", async (context) => {
            return context.json({ reports: await this.repository.list() }, 200);
        });
    }
}
