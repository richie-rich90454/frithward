export type JobState =
    | "created"
    | "validated"
    | "initialized"
    | "running"
    | "completed"
    | "cancelling"
    | "cancelled"
    | "failed";

const ALLOWED: Readonly<Record<JobState, readonly JobState[]>> = {
    created: ["validated"],
    validated: ["initialized"],
    initialized: ["running"],
    running: ["completed", "cancelling", "failed"],
    cancelling: ["cancelled", "failed"],
    completed: [],
    cancelled: [],
    failed: [],
};

export class ProcessingJob {
    private state: JobState = "created";
    private readonly transitions: string[] = [];

    public get currentState(): JobState {
        return this.state;
    }

    public get history(): readonly string[] {
        return [...this.transitions];
    }

    public transition(next: JobState): void {
        if (!ALLOWED[this.state].includes(next)) {
            throw new Error(`Illegal transition ${this.state} -> ${next}`);
        }
        this.state = next;
        this.transitions.push(next);
    }
}
