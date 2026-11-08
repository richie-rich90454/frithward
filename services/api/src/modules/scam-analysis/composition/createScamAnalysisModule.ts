import { AnalyzeMessageUseCase } from "@frithward/security-core";
import { ScamAnalysisRoutes } from "../presentation/http/ScamAnalysisRoutes.js";

export function createScamModule(): { routes: ScamAnalysisRoutes } {
    const useCase = new AnalyzeMessageUseCase();
    return { routes: new ScamAnalysisRoutes(useCase) };
}
