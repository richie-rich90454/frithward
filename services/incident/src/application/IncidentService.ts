import { randomUUID } from "node:crypto";
import { AppError } from "@frithward/contracts";
import type { Incident, IncidentRepository, IncidentStatus } from "../ports/IncidentRepository.js";

export class IncidentService {
    public constructor(private readonly repository: IncidentRepository) {}

    public async create(input: {
        title: string;
        severity: Incident["severity"];
        details: string;
    }): Promise<Incident> {
        const incident: Incident = {
            id: randomUUID(),
            title: input.title,
            severity: input.severity,
            details: input.details,
            status: "open",
            createdAt: new Date().toISOString(),
        };
        await this.repository.save(incident);
        return incident;
    }

    public async find(id: string): Promise<Incident> {
        const incident = await this.repository.find(id);
        if (!incident) throw new AppError("NOT_FOUND", `Incident ${id} not found.`);
        return incident;
    }

    public async updateStatus(id: string, status: IncidentStatus): Promise<Incident> {
        const incident = await this.find(id);
        const updated: Incident = { ...incident, status };
        await this.repository.save(updated);
        return updated;
    }
}
