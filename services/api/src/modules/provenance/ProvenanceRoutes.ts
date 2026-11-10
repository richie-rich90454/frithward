import { Hono } from "hono";
import { VerifyProvenanceUseCase } from "@frithward/provenance-core";
import { ProvenanceInspectRequest } from "../../presentation/http/schemas.js";
import { parseJson } from "../../middleware/validate.js";

export class ProvenanceRoutes extends Hono {
    public constructor(
        private readonly useCase: VerifyProvenanceUseCase = new VerifyProvenanceUseCase(),
    ) {
        super();
        this.post("/api/provenance/inspect", async (context) => {
            const record = await parseJson(context, ProvenanceInspectRequest);
            return context.json({ description: this.useCase.describe(record) }, 200);
        });
    }
}
