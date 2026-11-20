import { ModelManager, type InstalledModel } from "@frithward/model-manager";
import { ModelRegistry, type ModelEntry } from "@frithward/model-registry";
import { english, type Translator } from "../../../../i18n/translate.js";

export interface InstalledModelView {
    id: string;
    sizeBytes: number;
    installedAt: string;
    stage: InstalledModel["stage"];
    license: string | null;
    intendedUse: string | null;
    limitations: string | null;
}

export interface ModelManagerViewModel {
    installed: readonly InstalledModelView[];
    registryCards: readonly ModelEntry[];
    totalSizeBytes: number;
}

export interface RegisterCardInput {
    id: string;
    stage: ModelEntry["stage"];
    license: string;
    intendedUse: string;
    limitations: string;
}

export interface InstallModelInput {
    id: string;
    sizeBytes: number;
    installedAt: string;
    stage: InstalledModel["stage"];
}

/** Headless controller over the real model manager and registry. Starts with no models. */
export class ModelManagerController {
    private readonly listeners = new Set<() => void>();
    private error: string | null = null;
    private viewModel: ModelManagerViewModel;
    private readonly translate: Translator;

    public constructor(
        private readonly manager: ModelManager = new ModelManager(),
        private readonly registry: ModelRegistry = new ModelRegistry(),
        translate: Translator = english,
    ) {
        this.translate = translate;
        this.viewModel = this.buildViewModel();
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getViewModel(): ModelManagerViewModel {
        return this.viewModel;
    }

    public getError(): string | null {
        return this.error;
    }

    public markInstalled(input: InstallModelInput): void {
        this.run(() => this.manager.markInstalled(input));
    }

    public registerCard(input: RegisterCardInput): void {
        this.run(() => {
            const id = input.id.trim();
            if (id === "") throw new Error(this.translate("models.error.idRequired"));
            this.registry.register({
                id,
                stage: input.stage,
                license: input.license.trim(),
                intendedUse: input.intendedUse.trim(),
                limitations: input.limitations.trim(),
            });
        });
    }

    private run(action: () => void): void {
        try {
            action();
            this.error = null;
            this.viewModel = this.buildViewModel();
        } catch (cause) {
            this.error =
                cause instanceof Error ? cause.message : this.translate("models.error.operation");
        }
        for (const listener of this.listeners) listener();
    }

    private buildViewModel(): ModelManagerViewModel {
        const installed = this.manager.listInstalled().map((model) => {
            const card = this.registry.get(model.id);
            return {
                id: model.id,
                sizeBytes: model.sizeBytes,
                installedAt: model.installedAt,
                stage: model.stage,
                license: card?.license ?? null,
                intendedUse: card?.intendedUse ?? null,
                limitations: card?.limitations ?? null,
            };
        });
        return {
            installed,
            registryCards: this.registry.listAll(),
            totalSizeBytes: this.manager.totalSizeBytes(),
        };
    }
}
