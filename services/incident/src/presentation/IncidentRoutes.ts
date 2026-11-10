import { Hono } from "hono";
import { z } from "zod";
import { AppError } from "@frithward/contracts";
import { IncidentService } from "../application/IncidentService.js";

const CreateIncidentRequest = z.object({
    title: z.string().min(1),
    severity: z.enum(["low", "medium", "high", "critical"]),
    details: z.string().min(1),
});

const UpdateStatusRequest = z.object({
    status: z.enum(["open", "investigating", "resolved"]),
});

export class IncidentRoutes extends Hono {
    public constructor(private readonly incidents: IncidentService) {
        super();
        this.get("/health", (context) => context.json({ status: "ok", service: "incident" }));
        this.post("/api/incident/reports", async (context) => {
            const parsed = CreateIncidentRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const incident = await this.incidents.create({
                title: parsed.data.title,
                severity: parsed.data.severity,
                details: parsed.data.details,
            });
            return context.json(incident, 201);
        });
        this.get("/api/incident/reports/:id", async (context) => {
            const incident = await this.incidents.find(context.req.param("id"));
            return context.json(incident, 200);
        });
        this.patch("/api/incident/reports/:id/status", async (context) => {
            const parsed = UpdateStatusRequest.safeParse(await context.req.json<unknown>());
            if (!parsed.success) {
                throw new AppError(
                    "VALIDATION_FAILED",
                    parsed.error.issues[0]?.message ?? "Validation failed.",
                );
            }
            const incident = await this.incidents.updateStatus(
                context.req.param("id"),
                parsed.data.status,
            );
            return context.json(incident, 200);
        });
    }
}
