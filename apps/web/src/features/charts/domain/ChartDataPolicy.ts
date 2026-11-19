export interface ChartSeries {
    name: string;
    values: readonly number[];
}

export interface ChartDataset {
    categories: readonly string[];
    series: readonly ChartSeries[];
    xAxisLabel: string;
    yAxisLabel: string;
    yAxisMin?: number;
}

export class ChartDataPolicy {
    public validate(dataset: ChartDataset): void {
        if (dataset.categories.length === 0 || dataset.series.length === 0) {
            throw new Error("No data to chart.");
        }
        if (dataset.xAxisLabel.trim() === "" || dataset.yAxisLabel.trim() === "") {
            throw new Error("Both axes need labels.");
        }
        if (dataset.yAxisMin !== undefined && dataset.yAxisMin > 0) {
            throw new Error("The value axis must start at zero or below for an honest scale.");
        }
        for (const series of dataset.series) {
            if (series.name.trim() === "") {
                throw new Error("Every series needs a name.");
            }
            if (series.values.length !== dataset.categories.length) {
                throw new Error("Every series must have one value per category.");
            }
            if (series.values.some((value) => !Number.isFinite(value))) {
                throw new Error("Series values must be finite numbers.");
            }
        }
    }
}
