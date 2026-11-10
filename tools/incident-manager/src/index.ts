import type { ScamChannel } from "@frithward/contracts";
import {
    MetadataInspectionUseCase,
    SanitizedExportUseCase,
    ShareCheckController,
    type MetadataPayload,
    type RedactionRegion,
    type SanitizedOutputDescriptor,
    type ShareCheckViewModel,
} from "@frithward/privacy-core";
import {
    C2paInspectionUseCase,
    InMemoryProvenanceRecordRepository,
    type C2paInspectionResult,
    type ProvenanceRecord,
} from "@frithward/provenance-core";
import {
    OlderAdultGuidedFlowController,
    QrInspectionUseCase,
    ScamReportUseCase,
    UrlInspectionUseCase,
    type GuidedFlowStep,
    type QrInspectionResult,
    type ScamReport,
    type UrlInspectionResult,
} from "@frithward/security-core";

export interface IncidentEvidence {
    id: string;
    fileName: string;
    sha256: string;
    collectedAt: string;
    source: string;
}

export class IncidentManagerTool {
    private readonly evidence: IncidentEvidence[] = [];

    public addEvidence(item: IncidentEvidence): void {
        if (item.sha256.trim().length === 0) throw new Error("Evidence hash required.");
        this.evidence.push(item);
    }

    public listEvidence(): readonly IncidentEvidence[] {
        return [...this.evidence].sort((a, b) => a.collectedAt.localeCompare(b.collectedAt));
    }
}

export class IncidentManager {
    private readonly urlInspector = new UrlInspectionUseCase();
    private readonly qrInspector = new QrInspectionUseCase();
    private readonly reportUseCase = new ScamReportUseCase();
    private readonly metadataInspector = new MetadataInspectionUseCase();
    private readonly exportUseCase = new SanitizedExportUseCase();
    private readonly shareCheck = new ShareCheckController();
    private readonly provenanceRepository = new InMemoryProvenanceRecordRepository();
    private readonly provenanceInspector = new C2paInspectionUseCase(this.provenanceRepository);
    private readonly guidedFlow: OlderAdultGuidedFlowController;
    private readonly evidenceTool = new IncidentManagerTool();
    private readonly defaultChannel: ScamChannel;
    private readonly urlInspections: UrlInspectionResult[] = [];
    private readonly qrInspections: QrInspectionResult[] = [];
    private readonly metadataInspections: ShareCheckViewModel[] = [];
    private readonly provenanceInspections: C2paInspectionResult[] = [];
    private readonly reports: ScamReport[] = [];

    public constructor(options: { reportChannel?: ScamChannel } = {}) {
        this.defaultChannel = options.reportChannel ?? "message";
        this.guidedFlow = new OlderAdultGuidedFlowController({
            reportUseCase: this.reportUseCase,
        });
    }

    public inspectUrl(url: string): UrlInspectionResult {
        const result = this.urlInspector.execute(url);
        this.urlInspections.push(result);
        return result;
    }

    public inspectQr(payload: string): QrInspectionResult {
        const result = this.qrInspector.execute(payload);
        this.qrInspections.push(result);
        return result;
    }

    public inspectMetadata(payload: MetadataPayload): ShareCheckViewModel {
        const result = this.shareCheck.inspect(payload);
        this.metadataInspections.push(result);
        return result;
    }

    public exportMetadata(
        payload: MetadataPayload,
        regions?: readonly RedactionRegion[],
    ): SanitizedOutputDescriptor {
        const inspection = this.metadataInspector.execute(payload);
        return this.exportUseCase.execute({
            payload,
            findings: inspection.findings,
            ...(regions === undefined ? {} : { regions }),
        });
    }

    public async reportScam(input: {
        description: string;
        source: string;
        channel?: ScamChannel;
    }): Promise<ScamReport> {
        const report = await this.reportUseCase.execute({
            channel: input.channel ?? this.defaultChannel,
            description: input.description,
            source: input.source,
        });
        this.reports.push(report);
        return report;
    }

    public async inspectProvenance(input: {
        manifest: unknown;
        id?: string;
    }): Promise<C2paInspectionResult> {
        const result = await this.provenanceInspector.execute(input);
        this.provenanceInspections.push(result);
        return result;
    }

    public get guidedSteps(): readonly GuidedFlowStep[] {
        return this.guidedFlow.steps;
    }

    public completeGuidedStep(): void {
        this.guidedFlow.completeCurrentStep();
    }

    public nextGuidedStep(): void {
        this.guidedFlow.next();
    }

    public addEvidence(item: IncidentEvidence): void {
        this.evidenceTool.addEvidence(item);
    }

    public listEvidence(): readonly IncidentEvidence[] {
        return this.evidenceTool.listEvidence();
    }

    public listReports(): readonly ScamReport[] {
        return [...this.reports];
    }

    public listUrlInspections(): readonly UrlInspectionResult[] {
        return [...this.urlInspections];
    }

    public listQrInspections(): readonly QrInspectionResult[] {
        return [...this.qrInspections];
    }

    public listMetadataInspections(): readonly ShareCheckViewModel[] {
        return [...this.metadataInspections];
    }

    public listProvenanceInspections(): readonly C2paInspectionResult[] {
        return [...this.provenanceInspections];
    }

    public listProvenanceRecords(): Promise<readonly ProvenanceRecord[]> {
        return this.provenanceRepository.list();
    }
}
