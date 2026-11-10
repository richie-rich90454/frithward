import { ScamAnalysisRoutes } from "../presentation/http/ScamAnalysisRoutes.js";
import type { JobQueue } from "../../../jobs/queue.js";
import type { JobStatusStore } from "../../../jobs/jobStore.js";

export function createScamModule(
    queue: JobQueue,
    store: JobStatusStore,
): { routes: ScamAnalysisRoutes } {
    return { routes: new ScamAnalysisRoutes(queue, store) };
}
