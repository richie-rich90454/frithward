export type ExecutionLocation = "browser" | "native" | "hosted";

export class ExecutionRouter {
    public constructor(
        private readonly capabilityOverrides: Map<string, ExecutionLocation> = new Map(),
    ) {}

    public choose(capability: string): ExecutionLocation {
        if (capability.trim().length === 0) throw new Error("Capability required.");
        const override = this.capabilityOverrides.get(capability);
        if (override) return override;
        return "browser";
    }

    public override(capability: string, location: ExecutionLocation): void {
        if (capability.trim().length === 0) throw new Error("Capability required.");
        this.capabilityOverrides.set(capability, location);
    }
}
