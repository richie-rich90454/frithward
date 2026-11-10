import { InspectPrivacyUseCase } from "@frithward/privacy-core";
import type { PrivacyFinding } from "@frithward/privacy-core";

export interface ShareCheckOption {
    id: string;
    kind: string;
    label: string;
    detail: string;
    remediation: string;
    selected: boolean;
}

export class ShareCheckController {
    private readonly inspector = new InspectPrivacyUseCase();
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

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
