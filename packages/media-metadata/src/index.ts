export interface MetadataRecord {
    kind: string;
    entries: Readonly<Record<string, string>>;
}

export class MetadataInspector {
    public inspect(record: MetadataRecord): readonly string[] {
        const findings: string[] = [];
        for (const [key, value] of Object.entries(record.entries)) {
            if (key.toLowerCase().includes("gps") || key.toLowerCase().includes("location")) {
                findings.push(`Location metadata present: ${key}=${value}`);
            }
        }
        return findings;
    }
}
