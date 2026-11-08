export type ExecutionLocation = "browser" | "native" | "hosted";

export interface ExecutionRouter {
    choose(capability: string): ExecutionLocation;
}

export class LocalFirstExecutionRouter implements ExecutionRouter {
    public choose(capability: string): ExecutionLocation {
        if (capability.length === 0) throw new Error("Capability required.");
        return "browser";
    }
}
