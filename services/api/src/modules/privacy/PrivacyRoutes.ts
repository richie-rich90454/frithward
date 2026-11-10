import { Hono } from "hono";
import { InspectPrivacyUseCase, RedactPrivacyUseCase } from "@frithward/privacy-core";
import { PrivacyInspectRequest, PrivacyRedactRequest } from "../../presentation/http/schemas.js";
import { parseJson } from "../../middleware/validate.js";

export class PrivacyRoutes extends Hono {
    public constructor(
        private readonly inspect: InspectPrivacyUseCase = new InspectPrivacyUseCase(),
        private readonly redact: RedactPrivacyUseCase = new RedactPrivacyUseCase(),
    ) {
        super();
        this.post("/api/privacy/inspect", async (context) => {
            const body = await parseJson(context, PrivacyInspectRequest);
            this.inspect.execute({ findings: body.findings });
            return context.json({ findings: body.findings, safe: true }, 200);
        });
        this.post("/api/privacy/redact", async (context) => {
            const body = await parseJson(context, PrivacyRedactRequest);
            const result = this.redact.execute({ findings: body.findings });
            return context.json(result, 200);
        });
    }
}
