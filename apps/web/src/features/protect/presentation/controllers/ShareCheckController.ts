import {
    parseFileMetadata,
    sanitizeFile,
    type ParsedFormat,
    type SanitizedFile,
    type SanitizeOptions,
} from "@frithward/media-metadata";
import {
    InspectPrivacyUseCase,
    MetadataInspectionUseCase,
    RedactPrivacyUseCase,
    SanitizedExportUseCase,
    type MetadataFinding,
    type MetadataFindingKind,
    type MetadataPayload,
    type PrivacyFinding,
    type SanitizedOutputDescriptor,
} from "@frithward/privacy-core";

export interface ShareCheckOption {
    id: string;
    kind: string;
    label: string;
    detail: string;
    remediation: string;
    selected: boolean;
}

export interface MetadataIssueView {
    id: string;
    kind: MetadataFindingKind;
    label: string;
    value: string;
    where: string;
    why: string;
    how: string;
    severity: "low" | "medium" | "high";
}

export interface MetadataInspectionView {
    fileName: string;
    format: ParsedFormat;
    fieldCount: number;
    safeToShare: boolean;
    issues: readonly MetadataIssueView[];
    remediation: readonly string[];
    summary: string;
}

export interface ExportActionView {
    kind: string;
    description: string;
}

export interface SanitizedExportPlanView {
    summary: string;
    safeToShare: boolean;
    actions: readonly ExportActionView[];
}

export interface RedactionResultView {
    redactedCount: number;
    remaining: readonly { id: string; kind: string; detail: string }[];
    summary: string;
    note: string;
    artifact: SanitizedFile;
}

export interface FileSanitizer {
    sanitize(file: Blob, options?: SanitizeOptions): Promise<SanitizedFile>;
}

export interface ShareCheckControllerOptions {
    sanitizer?: FileSanitizer;
}

const KIND_LABELS: Record<MetadataFindingKind, string> = {
    "exif-gps": "GPS location",
    "exif-device": "Device details",
    "exif-timestamp": "Capture time",
    "pii-email": "Email address",
    "pii-phone": "Phone number",
    "pii-address": "Street address",
    "pii-name": "Personal name",
};

const LOCATION_HINTS: Record<MetadataFindingKind, RegExp> = {
    "exif-gps": /gps|location|latitude|longitude/i,
    "exif-device": /make|model|camera|lens/i,
    "exif-timestamp": /date|time/i,
    "pii-email": /email/i,
    "pii-phone": /phone|tel/i,
    "pii-address": /address|street/i,
    "pii-name": /name|artist|author|creator/i,
};

function locationFor(kind: MetadataFindingKind, fields: MetadataPayload["fields"]): string {
    const hint = LOCATION_HINTS[kind];
    const matches = Object.entries(fields)
        .filter(([key, value]) => hint.test(key) || hint.test(String(value ?? "")))
        .map(([key]) => key);
    return matches.length > 0 ? matches.join(", ") : "field values";
}

function valueFor(kind: MetadataFindingKind, fields: MetadataPayload["fields"]): string {
    const hint = LOCATION_HINTS[kind];
    const matches = Object.entries(fields).filter(
        ([key, value]) => value !== null && (hint.test(key) || hint.test(String(value))),
    );
    const coordinate = matches.find(
        ([key]) => /latitude|longitude|position|coordinates/i.test(key) && !/ref/i.test(key),
    );
    const chosen = coordinate ?? matches.find(([key]) => !/ref/i.test(key)) ?? matches[0];
    return chosen ? String(chosen[1]) : "—";
}

export class ShareCheckController {
    private readonly inspector = new InspectPrivacyUseCase();
    private readonly metadataInspector = new MetadataInspectionUseCase();
    private readonly exportPlanner = new SanitizedExportUseCase();
    private readonly redactor = new RedactPrivacyUseCase();
    private readonly sanitizer: FileSanitizer;
    private readonly listeners = new Set<() => void>();
    private options: ShareCheckOption[] = [
        {
            id: "exif-gps",
            kind: "exif-gps",
            label: "Location (GPS)",
            detail: "Precise location embedded in the file.",
            remediation: "Remove location metadata before sharing.",
            selected: false,
        },
        {
            id: "exif-device",
            kind: "exif-device",
            label: "Device details",
            detail: "Camera or phone model and settings.",
            remediation: "Strip device metadata if it is not needed.",
            selected: false,
        },
        {
            id: "timestamp",
            kind: "timestamp",
            label: "Capture time",
            detail: "When the media was created.",
            remediation: "Remove timestamps that reveal your routine.",
            selected: false,
        },
    ];
    private error: string | null = null;
    private passed: boolean | null = null;
    private currentPayload: MetadataPayload | null = null;
    private currentFindings: readonly MetadataFinding[] = [];
    private sourceFile: Blob | null = null;
    private metadataView: MetadataInspectionView | null = null;
    private exportPlan: SanitizedExportPlanView | null = null;
    private redaction: RedactionResultView | null = null;

    public constructor(options: ShareCheckControllerOptions = {}) {
        this.sanitizer = options.sanitizer ?? {
            sanitize: (file, sanitizeOptions) => sanitizeFile(file, sanitizeOptions),
        };
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getOptions(): readonly ShareCheckOption[] {
        return this.options;
    }

    public getError(): string | null {
        return this.error;
    }

    public getPassed(): boolean | null {
        return this.passed;
    }

    public getMetadataView(): MetadataInspectionView | null {
        return this.metadataView;
    }

    public getMetadataFindings(): readonly MetadataFinding[] {
        return this.currentFindings;
    }

    public getExportPlan(): SanitizedExportPlanView | null {
        return this.exportPlan;
    }

    public getRedaction(): RedactionResultView | null {
        return this.redaction;
    }

    public toggle(optionId: string): void {
        this.options = this.options.map((option) =>
            option.id === optionId ? { ...option, selected: !option.selected } : option,
        );
        this.error = null;
        this.passed = null;
        this.notify();
    }

    public check(): void {
        const findings: PrivacyFinding[] = this.options
            .filter((option) => option.selected)
            .map((option) => ({
                id: option.id,
                kind: option.kind,
                detail: option.detail,
                remediation: option.remediation,
            }));
        try {
            this.inspector.execute({ findings });
            this.error = null;
            this.passed = true;
        } catch (cause) {
            this.error = cause instanceof Error ? cause.message : "Privacy check failed.";
            this.passed = false;
        }
        this.notify();
    }

    public async inspectFile(file: Blob & { name?: string }): Promise<void> {
        try {
            const parsed = await parseFileMetadata(file);
            this.sourceFile = file;
            this.inspectMetadata(
                { fileName: parsed.fileName, fields: parsed.fields },
                parsed.format,
            );
        } catch (cause) {
            this.error =
                cause instanceof Error ? cause.message : "Could not read the selected file.";
            this.notify();
        }
    }

    public inspectMetadata(findings: MetadataPayload, format: ParsedFormat = "jpeg"): void {
        try {
            const result = this.metadataInspector.execute(findings);
            this.currentPayload = findings;
            this.currentFindings = result.findings;
            this.metadataView = {
                fileName: result.fileName,
                format,
                fieldCount: Object.keys(findings.fields).length,
                safeToShare: result.safeToShare,
                issues: result.findings.map((finding) => ({
                    id: finding.id,
                    kind: finding.kind,
                    label: KIND_LABELS[finding.kind],
                    value: valueFor(finding.kind, findings.fields),
                    where: locationFor(finding.kind, findings.fields),
                    why: finding.detail,
                    how: finding.remediation,
                    severity: finding.severity,
                })),
                remediation: [...result.remediation],
                summary: this.summaryFor(result.safeToShare, result.findings.length, format),
            };
            this.exportPlan = null;
            this.redaction = null;
            this.error = null;
        } catch (cause) {
            this.metadataView = null;
            this.redaction = null;
            this.currentFindings = [];
            this.error = cause instanceof Error ? cause.message : "Metadata inspection failed.";
        }
        this.notify();
    }

    private summaryFor(safeToShare: boolean, findingCount: number, format: ParsedFormat): string {
        if (format === "unknown")
            return "This file format was not inspected. No embedded metadata could be verified.";
        if (safeToShare)
            return findingCount === 0
                ? "No metadata tags were found in this file."
                : `No blocking metadata; ${findingCount} low-risk finding(s) detected.`;
        return `${findingCount} privacy issue(s) found in the file's metadata.`;
    }

    public planSanitizedExport(findings: readonly MetadataFinding[]): void {
        if (!this.currentPayload) {
            this.error = "Inspect metadata before planning an export.";
            this.notify();
            return;
        }
        try {
            const plan: SanitizedOutputDescriptor = this.exportPlanner.execute({
                payload: this.currentPayload,
                findings,
            });
            this.exportPlan = {
                summary: plan.summary,
                safeToShare: plan.safeToShare,
                actions: plan.actions.map((action) => ({
                    kind: action.kind,
                    description: action.description,
                })),
            };
            this.error = null;
        } catch (cause) {
            this.exportPlan = null;
            this.error =
                cause instanceof Error ? cause.message : "Could not plan a sanitized export.";
        }
        this.notify();
    }

    public async executeRedaction(): Promise<void> {
        if (!this.currentPayload) {
            this.error = "Inspect metadata before executing redaction.";
            this.notify();
            return;
        }
        if (!this.sourceFile) {
            this.error = "Select a file before executing redaction.";
            this.notify();
            return;
        }
        const findings = new Map<string, PrivacyFinding>();
        for (const finding of this.currentFindings) {
            findings.set(finding.id, finding);
        }
        for (const option of this.options.filter((entry) => entry.selected)) {
            findings.set(option.id, {
                id: option.id,
                kind: option.kind,
                detail: option.detail,
                remediation: option.remediation,
            });
        }
        try {
            const result = this.redactor.execute({ findings: [...findings.values()] });
            const artifact = await this.sanitizer.sanitize(this.sourceFile, { maxDimension: 4096 });
            this.redaction = {
                redactedCount: result.redactedCount,
                remaining: result.findings.map((finding) => ({
                    id: finding.id,
                    kind: finding.kind,
                    detail: finding.detail,
                })),
                summary: `${result.redactedCount} finding(s) addressed; download ${artifact.fileName} to share.`,
                note:
                    artifact.method === "re-encoded"
                        ? "The download is rebuilt from decoded pixels, so embedded metadata is not carried over. Verify the file before sharing."
                        : `${artifact.label} Verify the file before sharing.`,
                artifact,
            };
            this.error = null;
        } catch (cause) {
            this.redaction = null;
            this.error = cause instanceof Error ? cause.message : "Redaction failed.";
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
