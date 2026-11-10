export type IncidentStatus = "open" | "investigating" | "resolved";

export interface Incident {
    id: string;
    title: string;
    severity: "low" | "medium" | "high" | "critical";
    details: string;
    status: IncidentStatus;
    createdAt: string;
}

export interface IncidentRepository {
    save(incident: Incident): Promise<void>;
    find(id: string): Promise<Incident | null>;
}
