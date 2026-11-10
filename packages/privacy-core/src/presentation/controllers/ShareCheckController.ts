import { MetadataInspectionUseCase } from "../../application/MetadataInspectionUseCase.js";
import { SanitizedExportUseCase } from "../../application/SanitizedExportUseCase.js";
import type { SanitizedOutputDescriptor } from "../../application/SanitizedExportUseCase.js";
import type { MetadataPayload } from "../../domain/MetadataFinding.js";
import { PiiRedactionPolicy } from "../../domain/PiiRedactionPolicy.js";
import type { RedactionRegion } from "../../domain/RedactionRegion.js";
import { ShareCheckViewModel } from "../view-models/ShareCheckViewModel.js";

export class ShareCheckController {
    private readonly inspector: MetadataInspectionUseCase;
    private readonly exporter: SanitizedExportUseCase;
    private readonly policy: PiiRedactionPolicy;
    private error: string | null;

    public constructor(input?: {
        inspector?: MetadataInspectionUseCase;
        exporter?: SanitizedExportUseCase;
        policy?: PiiRedactionPolicy;
    }) {
        this.policy = input?.policy ?? new PiiRedactionPolicy();
        this.inspector = input?.inspector ?? new MetadataInspectionUseCase();
        this.exporter = input?.exporter ?? new SanitizedExportUseCase(this.policy);
        this.error = null;
    }

    public inspect(payload: MetadataPayload): ShareCheckViewModel {
        try {
            const result = this.inspector.execute(payload);
            const view = ShareCheckViewModel.fromResult(
                result,
                this.policy.requiresRedaction(result.findings),
            );
            this.error = null;
            return view;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Inspection failed.";
            throw cause;
        }
    }

    public export(
        payload: MetadataPayload,
        regions?: readonly RedactionRegion[],
    ): SanitizedOutputDescriptor {
        try {
            const result = this.inspector.execute(payload);
            const descriptor = this.exporter.execute({
                payload,
                findings: result.findings,
                ...(regions === undefined ? {} : { regions }),
            });
            this.error = null;
            return descriptor;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Export failed.";
            throw cause;
        }
    }

    public getError(): string | null {
        return this.error;
    }
}
