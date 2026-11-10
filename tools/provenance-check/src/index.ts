import {
    C2paInspectionUseCase,
    InMemoryProvenanceRecordRepository,
    VerifyProvenanceUseCase,
    type C2paInspectionResult,
    type ProvenanceRecord,
} from "@frithward/provenance-core";

export * from "@frithward/provenance-core";

export class ProvenanceCheckTool {
    private readonly repository = new InMemoryProvenanceRecordRepository();
    private readonly inspector = new C2paInspectionUseCase(this.repository);
    private readonly verifier = new VerifyProvenanceUseCase();

    public async inspect(input: { manifest: unknown; id?: string }): Promise<C2paInspectionResult> {
        return this.inspector.execute(input);
    }

    public async load(id: string): Promise<ProvenanceRecord | null> {
        return this.repository.load(id);
    }

    public async list(): Promise<readonly ProvenanceRecord[]> {
        return this.repository.list();
    }

    public describe(record: ProvenanceRecord): string {
        return this.verifier.describe(record);
    }
}
