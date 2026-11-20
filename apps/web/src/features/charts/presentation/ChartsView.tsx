import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { ChartDataController } from "../application/ChartDataController";
import type { ChartViewState } from "../application/ChartDataController";
import { EChartAdapter } from "../application/EChartAdapter";
import { ChartDraftStore } from "../infrastructure/ChartDraftStore";
import { useThemeVersion } from "./useThemeVersion";
import { useI18n } from "../../../i18n/index.js";
import "./charts.css";

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
    draftSaved: boolean;
}

export function ChartsView(props: ChartsViewProps) {
    const { t } = useI18n();
    const adapter = new EChartAdapter();
    const themeVersion = useThemeVersion();
    const [container, setContainer] = createSignal<HTMLDivElement>();
    let chart: ReturnType<EChartAdapter["render"]> | null = null;

    createEffect(() => {
        themeVersion();
        const dataset = props.state.dataset;
        const element = container();
        chart?.dispose();
        chart = null;
        if (dataset !== null && element) {
            chart = adapter.render(element, dataset);
        }
    });
    onCleanup(() => {
        chart?.dispose();
    });

    return (
        <section class="charts-workshop">
            <h1>{t("charts.title")}</h1>
            <Show when={props.draftSaved}>
                <p class="charts-workshop__status" role="status" aria-live="polite">
                    {t("draft.saved")}
                </p>
            </Show>
            <label>
                {t("charts.dataLabel")}
                <textarea
                    rows={6}
                    value={props.text}
                    onInput={(event) => props.onTextChange(event.currentTarget.value)}
                />
            </label>
            <label>
                {t("charts.xAxis")}
                <input
                    value={props.xAxisLabel}
                    onInput={(event) => props.onXAxisLabelChange(event.currentTarget.value)}
                />
            </label>
            <label>
                {t("charts.yAxis")}
                <input
                    value={props.yAxisLabel}
                    onInput={(event) => props.onYAxisLabelChange(event.currentTarget.value)}
                />
            </label>
            <div class="charts-workshop__actions">
                <button type="button" onClick={props.onApply}>
                    {t("charts.render")}
                </button>
                <button type="button" onClick={props.onClear}>
                    {t("action.clear")}
                </button>
            </div>
            <Show when={props.state.error}>
                <p role="alert">{props.state.error}</p>
            </Show>
            <Show when={props.state.dataset} fallback={<p role="status">{t("charts.noChart")}</p>}>
                <div
                    class="chart-container"
                    data-chart
                    ref={setContainer}
                    style={{ width: "100%", height: "360px" }}
                />
            </Show>
        </section>
    );
}

export function ChartsPage() {
    const { t } = useI18n();
    const defaultX = () => t("charts.defaultX");
    const defaultY = () => t("charts.defaultY");
    const controller = new ChartDataController(t);
    const store = new ChartDraftStore();
    const [state, setState] = createSignal(controller.getState());
    const [text, setText] = createSignal("");
    const [xAxisLabel, setXAxisLabel] = createSignal(defaultX());
    const [yAxisLabel, setYAxisLabel] = createSignal(defaultY());
    const [draftSaved, setDraftSaved] = createSignal(false);
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    onMount(() => {
        const draft = store.load();
        if (draft === null) return;
        setText(draft.text);
        setXAxisLabel(draft.xAxisLabel);
        setYAxisLabel(draft.yAxisLabel);
        if (draft.text.trim() !== "") {
            controller.setFromText(draft.text, draft.xAxisLabel, draft.yAxisLabel);
        }
    });
    createEffect(() => {
        const draft = { text: text(), xAxisLabel: xAxisLabel(), yAxisLabel: yAxisLabel() };
        const empty =
            draft.text.trim() === "" &&
            draft.xAxisLabel === defaultX() &&
            draft.yAxisLabel === defaultY();
        if (empty) {
            store.clear();
            setDraftSaved(false);
            return;
        }
        store.saveSoon(draft);
        setDraftSaved(true);
    });
    onCleanup(() => store.flush());

    return (
        <ChartsView
            state={state()}
            text={text()}
            xAxisLabel={xAxisLabel()}
            yAxisLabel={yAxisLabel()}
            draftSaved={draftSaved()}
            onTextChange={setText}
            onXAxisLabelChange={setXAxisLabel}
            onYAxisLabelChange={setYAxisLabel}
            onApply={() => controller.setFromText(text(), xAxisLabel(), yAxisLabel())}
            onClear={() => {
                store.clear();
                setText("");
                setXAxisLabel(defaultX());
                setYAxisLabel(defaultY());
                setDraftSaved(false);
                controller.clear();
            }}
        />
    );
}
