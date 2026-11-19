import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import type { ChartDataset } from "../domain/ChartDataPolicy";

const GRAYSCALE = ["#4b5563", "#9ca3af", "#d1d5db"] as const;
const ACCENT = "#1d4ed8";

export class EChartAdapter {
    public buildOption(dataset: ChartDataset): EChartsOption {
        return {
            color: [...GRAYSCALE, ACCENT],
            xAxis: {
                type: "category",
                name: dataset.xAxisLabel,
                data: [...dataset.categories],
            },
            yAxis: {
                type: "value",
                name: dataset.yAxisLabel,
                min: dataset.yAxisMin ?? 0,
            },
            series: dataset.series.map((series, index) => ({
                name: series.name,
                type: "bar",
                data: [...series.values],
                itemStyle: {
                    color:
                        index === 0 ? ACCENT : (GRAYSCALE[index % GRAYSCALE.length] ?? "#6b7280"),
                },
            })),
        };
    }

    public render(element: HTMLElement, dataset: ChartDataset): ECharts {
        const chart = echarts.init(element);
        chart.setOption(this.buildOption(dataset));
        return chart;
    }
}
