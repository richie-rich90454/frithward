import { ScamAnalysisRoutes } from "../presentation/http/ScamAnalysisRoutes.js";
import { recordAnalysis } from "../../../telemetry/metrics.js";
import type { JobQueue } from "../../../jobs/queue.js";
import type { JobStatusStore } from "../../../jobs/jobStore.js";

export function createScamModule(
    queue: JobQueue | null,
    store: JobStatusStore,
): { routes: ScamAnalysisRoutes } {
    return { routes: new ScamAnalysisRoutes(queue, store, undefined, recordAnalysis) };
}
