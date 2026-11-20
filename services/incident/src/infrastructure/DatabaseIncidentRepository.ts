import { AppError } from "@frithward/contracts";
import { Pool } from "pg";
import type { Incident, IncidentRepository } from "../ports/IncidentRepository.js";
import { InMemoryIncidentRepository } from "./InMemoryIncidentRepository.js";

interface IncidentRow {
    id: string;
    title: string;
    severity: Incident["severity"];
    details: string;
    status: Incident["status"];
    created_at: string | Date;
}

export function toIncident(row: IncidentRow): Incident {
    return {
        id: row.id,
        title: row.title,
        severity: row.severity,
        details: row.details,
        status: row.status,
        createdAt: new Date(row.created_at).toISOString(),
    };
}

/** DATABASE_URL-backed incident store; the instance owns its connection pool. */
export class DatabaseIncidentRepository implements IncidentRepository {
    public static fromConnectionString(connectionString: string): DatabaseIncidentRepository {
        if (connectionString.trim().length === 0)
            throw new AppError(
                "EXTERNAL_UNAVAILABLE",
                "DATABASE_URL is required for persistent incidents.",
            );
        return new DatabaseIncidentRepository(new Pool({ connectionString }));
    }

    public constructor(private readonly pool: Pool) {}

    public async close(): Promise<void> {
        await this.pool.end();
    }

    public async save(incident: Incident): Promise<void> {
        await this.pool.query(
            `insert into incident_reports (id, title, severity, details, status, created_at)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (id) do update set
               title = excluded.title, severity = excluded.severity,
               details = excluded.details, status = excluded.status`,
            [
                incident.id,
                incident.title,
                incident.severity,
                incident.details,
                incident.status,
                incident.createdAt,
            ],
        );
    }

    public async find(id: string): Promise<Incident | null> {
        const result = await this.pool.query<IncidentRow>(
            "select id, title, severity, details, status, created_at from incident_reports where id = $1 limit 1",
            [id],
        );
        const row = result.rows[0];
        return row ? toIncident(row) : null;
    }
}

/** Local-first default: in-memory without DATABASE_URL, persistent with it. */
export function createIncidentRepository(connectionString: string | undefined): {
    repository: IncidentRepository;
    close(): Promise<void>;
} {
    if (!connectionString || connectionString.trim().length === 0)
        return { repository: new InMemoryIncidentRepository(), close: async () => {} };
    const repository = DatabaseIncidentRepository.fromConnectionString(connectionString);
    return { repository, close: () => repository.close() };
}
