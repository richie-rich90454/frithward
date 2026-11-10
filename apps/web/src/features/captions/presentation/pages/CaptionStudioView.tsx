import { For, Show, createSignal, onCleanup } from "solid-js";
import { Captions } from "lucide-solid";
import type { CaptionStudioViewModel } from "@frithward/media-core";
import { CaptionStudioController } from "../controllers/CaptionStudioController";

interface CaptionStudioViewProps {
    viewModel: CaptionStudioViewModel;
    error: string | null;
    onSelect: (segmentId: string) => void;
    onApplyEdit: (input: { segmentId: string; text: string }) => void;
}

export function CaptionStudioView(props: CaptionStudioViewProps) {
    const [draft, setDraft] = createSignal("");
    return (
        <section>
            <h1>
                <Captions class="fw-icon" />
                Caption studio
            </h1>
            <p>
                {props.viewModel.title} &middot; {props.viewModel.language}
            </p>
            <ul>
                <For each={props.viewModel.segments}>
                    {(segment) => (
                        <li>
                            <button
                                type="button"
                                aria-pressed={segment.id === props.viewModel.selectedSegmentId}
                                onClick={() => {
                                    props.onSelect(segment.id);
                                    setDraft(segment.text);
                                }}
                            >
                                {segment.text}
                            </button>
                        </li>
                    )}
                </For>
            </ul>
            <Show when={props.viewModel.selectedSegmentId} keyed>
                {(segmentId) => (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (draft().trim().length === 0) return;
                            props.onApplyEdit({ segmentId, text: draft() });
                        }}
                    >
                        <label>
                            Caption text
                            <input
                                value={draft()}
                                onInput={(event) => setDraft(event.currentTarget.value)}
                            />
                        </label>
                        <button type="submit">Save caption</button>
                    </form>
                )}
            </Show>
            <Show when={props.error}>
                <p role="alert">{props.error}</p>
            </Show>
        </section>
    );
}

export function CaptionStudioPage() {
    const controller = new CaptionStudioController();
    const [viewModel, setViewModel] = createSignal(controller.getViewModel());
    const [error, setError] = createSignal(controller.getError());
    onCleanup(
        controller.subscribe(() => {
            setViewModel(controller.getViewModel());
            setError(controller.getError());
        }),
    );
    return (
        <CaptionStudioView
            viewModel={viewModel()}
            error={error()}
            onSelect={(segmentId) => controller.select(segmentId)}
            onApplyEdit={(input) => void controller.applyEdit(input)}
        />
    );
}
