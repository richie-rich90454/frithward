import { CodedError, ERROR_CODES } from "@frithward/contracts";

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
            throw new CodedError(ERROR_CODES.CHART_NO_DATA, "No data to chart.");
        }
        if (dataset.xAxisLabel.trim() === "" || dataset.yAxisLabel.trim() === "") {
            throw new CodedError(ERROR_CODES.CHART_AXIS_LABELS_REQUIRED, "Both axes need labels.");
        }
        if (dataset.yAxisMin !== undefined && dataset.yAxisMin > 0) {
            throw new CodedError(
                ERROR_CODES.CHART_Y_AXIS_MIN_INVALID,
                "The value axis must start at zero or below for an honest scale.",
            );
        }
        for (const series of dataset.series) {
            if (series.name.trim() === "") {
                throw new CodedError(
                    ERROR_CODES.CHART_SERIES_NAME_REQUIRED,
                    "Every series needs a name.",
                );
            }
            if (series.values.length !== dataset.categories.length) {
                throw new CodedError(
                    ERROR_CODES.CHART_SERIES_LENGTH_MISMATCH,
                    "Every series must have one value per category.",
                );
            }
            if (series.values.some((value) => !Number.isFinite(value))) {
                throw new CodedError(
                    ERROR_CODES.CHART_SERIES_VALUES_NON_FINITE,
                    "Series values must be finite numbers.",
                );
            }
        }
    }
}
