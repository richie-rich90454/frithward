import { For } from "solid-js";
import type { CaptionStudioViewModel } from "@frithward/media-core";

interface CaptionStudioViewProps {
    viewModel: CaptionStudioViewModel;
    onSelect: (segmentId: string) => void;
}

export function CaptionStudioView(props: CaptionStudioViewProps) {
    return (
        <div>
            <h1>{props.viewModel.title}</h1>
            <For each={props.viewModel.segments}>
                {(segment) => (
                    <button
                        type="button"
                        aria-pressed={segment.id === props.viewModel.selectedSegmentId}
                        onClick={() => props.onSelect(segment.id)}
                    >
                        {segment.text}
                    </button>
                )}
            </For>
        </div>
    );
}
