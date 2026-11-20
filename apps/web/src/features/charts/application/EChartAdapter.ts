import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import { readToken } from "../../../theme/tokens.js";
import type { ChartDataset } from "../domain/ChartDataPolicy";

export class EChartAdapter {
    public buildOption(dataset: ChartDataset): EChartsOption {
        const accent = readToken("--fw-color-accent", "#a3481b");
        const text = readToken("--fw-color-text", "#000000");
        const textSecondary = readToken("--fw-color-text-secondary", "#4a4a4a");
        const border = readToken("--fw-color-border", "#bdbdbd");
        const borderStrong = readToken("--fw-color-border-strong", "#666666");
        const grayscale = [
            borderStrong,
            readToken("--fw-color-surface-secondary", "#e6e6e6"),
            border,
        ];

        const axis = {
            axisLabel: { color: textSecondary },
            nameTextStyle: { color: textSecondary },
            axisLine: { lineStyle: { color: border } },
            axisTick: { lineStyle: { color: border } },
            splitLine: { lineStyle: { color: border } },
        };

        return {
            backgroundColor: "transparent",
            color: [accent, ...grayscale],
            textStyle: { color: text },
            legend: { textStyle: { color: text } },
            xAxis: {
                type: "category",
                name: dataset.xAxisLabel,
                data: [...dataset.categories],
                ...axis,
            },
            yAxis: {
                type: "value",
                name: dataset.yAxisLabel,
                min: dataset.yAxisMin ?? 0,
                ...axis,
            },
            series: dataset.series.map((series, index) => ({
                name: series.name,
                type: "bar",
                data: [...series.values],
                itemStyle: {
                    color:
                        index === 0
                            ? accent
                            : (grayscale[(index - 1) % grayscale.length] ?? border),
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
