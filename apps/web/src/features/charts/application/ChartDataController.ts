import { ChartDataPolicy } from "../domain/ChartDataPolicy";
import type { ChartDataset } from "../domain/ChartDataPolicy";
import { english, type Translator } from "../../../i18n/translate.js";
import { translatedError } from "../../../i18n/errors.js";

export interface ChartViewState {
    dataset: ChartDataset | null;
    error: string | null;
}

export class ChartDataController {
    private readonly policy = new ChartDataPolicy();
    private readonly translate: Translator;
    private readonly listeners = new Set<() => void>();
    private state: ChartViewState = { dataset: null, error: null };

    public constructor(translate: Translator = english) {
        this.translate = translate;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getState(): ChartViewState {
        return this.state;
    }

    public clear(): void {
        this.state = { dataset: null, error: null };
        this.notify();
    }

    public setFromText(text: string, xAxisLabel: string, yAxisLabel: string): void {
        const categories: string[] = [];
        const values: number[] = [];
        for (const line of text.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed === "") continue;
            const separator = trimmed.indexOf(",");
            if (separator < 0) continue;
            const label = trimmed.slice(0, separator).trim();
            const value = Number(trimmed.slice(separator + 1).trim());
            if (label === "" || !Number.isFinite(value)) continue;
            categories.push(label);
            values.push(value);
        }
        if (categories.length === 0) {
            this.state = {
                dataset: null,
                error: this.translate("charts.error.noData"),
            };
            this.notify();
            return;
        }
        const dataset: ChartDataset = {
            categories,
            series: [{ name: this.translate("charts.seriesName"), values }],
            xAxisLabel,
            yAxisLabel,
            yAxisMin: 0,
        };
        try {
            this.policy.validate(dataset);
            this.state = { dataset, error: null };
        } catch (cause) {
            this.state = {
                dataset: null,
                error: translatedError(cause, this.translate, "charts.error.invalid"),
            };
        }
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
