import { Show, createEffect, createSignal, onCleanup } from "solid-js";
import { ChartDataController } from "../application/ChartDataController";
import type { ChartViewState } from "../application/ChartDataController";
import { EChartAdapter } from "../application/EChartAdapter";

interface ChartsViewProps {
    state: ChartViewState;
    text: string;
    xAxisLabel: string;
    yAxisLabel: string;
    onTextChange: (value: string) => void;
    onXAxisLabelChange: (value: string) => void;
    onYAxisLabelChange: (value: string) => void;
    onApply: () => void;
    onClear: () => void;
}

export function ChartsView(props: ChartsViewProps) {
    const adapter = new EChartAdapter();
    let container!: HTMLDivElement;
    let chart: ReturnType<EChartAdapter["render"]> | null = null;

    createEffect(() => {
        const dataset = props.state.dataset;
        chart?.dispose();
        chart = null;
        if (dataset !== null) {
            chart = adapter.render(container, dataset);
        }
    });
    onCleanup(() => {
        chart?.dispose();
    });

    return (
        <section>
            <h1>Charts</h1>
            <label>
                Data (one "label,value" line per row)
                <textarea
                    rows={6}
                    value={props.text}
                    onInput={(event) => props.onTextChange(event.currentTarget.value)}
                />
            </label>
            <label>
                X axis label
                <input
                    value={props.xAxisLabel}
                    onInput={(event) => props.onXAxisLabelChange(event.currentTarget.value)}
                />
            </label>
            <label>
                Y axis label
                <input
                    value={props.yAxisLabel}
                    onInput={(event) => props.onYAxisLabelChange(event.currentTarget.value)}
                />
            </label>
            <button type="button" onClick={props.onApply}>
                Render chart
            </button>
            <button type="button" onClick={props.onClear}>
                Clear
            </button>
            <Show when={props.state.error}>
                <p role="alert">{props.state.error}</p>
            </Show>
            <Show
                when={props.state.dataset}
                fallback={<p role="status">No chart to display. Add real data above.</p>}
            >
                <div ref={container} style={{ width: "100%", height: "360px" }} />
            </Show>
        </section>
    );
}

export function ChartsPage() {
    const controller = new ChartDataController();
    const [state, setState] = createSignal(controller.getState());
    const [text, setText] = createSignal("");
    const [xAxisLabel, setXAxisLabel] = createSignal("Category");
    const [yAxisLabel, setYAxisLabel] = createSignal("Value");
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    return (
        <ChartsView
            state={state()}
            text={text()}
            xAxisLabel={xAxisLabel()}
            yAxisLabel={yAxisLabel()}
            onTextChange={setText}
            onXAxisLabelChange={setXAxisLabel}
            onYAxisLabelChange={setYAxisLabel}
            onApply={() => controller.setFromText(text(), xAxisLabel(), yAxisLabel())}
            onClear={() => {
                setText("");
                controller.clear();
            }}
        />
    );
}
