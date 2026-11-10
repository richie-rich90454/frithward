import {
    MetadataInspectionUseCase,
    PiiRedactionPolicy,
    SanitizedExportUseCase,
    type MetadataFinding,
    type MetadataInspectionResult,
    type MetadataPayload,
    type RedactionRegion,
    type SanitizedOutputDescriptor,
} from "@frithward/privacy-core";

export * from "@frithward/privacy-core";

export class PrivacyCheckTool {
    private readonly inspector = new MetadataInspectionUseCase();
    private readonly exporter = new SanitizedExportUseCase();
    private readonly policy = new PiiRedactionPolicy();

    public inspect(payload: MetadataPayload): MetadataInspectionResult {
        return this.inspector.execute(payload);
    }

    public export(
        payload: MetadataPayload,
        regions?: readonly RedactionRegion[],
    ): SanitizedOutputDescriptor {
        const inspection = this.inspector.execute(payload);
        return this.exporter.execute({
            payload,
            findings: inspection.findings,
            ...(regions === undefined ? {} : { regions }),
        });
    }

    public requiresRedaction(findings: readonly MetadataFinding[]): boolean {
        return this.policy.requiresRedaction(findings);
    }
}
