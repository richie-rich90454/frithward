import type { Incident, IncidentRepository } from "../ports/IncidentRepository.js";

export class InMemoryIncidentRepository implements IncidentRepository {
    private readonly incidents = new Map<string, Incident>();

    public async save(incident: Incident): Promise<void> {
        this.incidents.set(incident.id, incident);
    }

    public async find(id: string): Promise<Incident | null> {
        return this.incidents.get(id) ?? null;
    }
}
