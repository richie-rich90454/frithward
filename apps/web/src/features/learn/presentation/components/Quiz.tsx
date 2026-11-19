import { For, Show } from "solid-js";
import type { LearnState, QuizQuestion } from "../controllers/LearnController";

interface QuizProps {
    questions: readonly QuizQuestion[];
    question: QuizQuestion | null;
    state: LearnState;
    onSelect: (index: number) => void;
    onAnswer: (index: number) => void;
    onNext: () => void;
    onReset: () => void;
}

export function Quiz(props: QuizProps) {
    return (
        <section>
            <h2>Knowledge check</h2>
            <p>
                Score: {props.state.score} / {props.questions.length}
            </p>
            <nav aria-label="Quiz questions">
                <For each={props.questions}>
                    {(_item, index) => (
                        <button
                            type="button"
                            aria-current={index() === props.state.currentIndex}
                            onClick={() => props.onSelect(index())}
                        >
                            {index() + 1}
                        </button>
                    )}
                </For>
            </nav>

            <Show when={props.question} keyed>
                {(question) => (
                    <div>
                        <p>
                            <strong>{question.prompt}</strong>
                        </p>
                        <For each={question.options}>
                            {(option, index) => (
                                <button
                                    type="button"
                                    disabled={props.state.answered}
                                    onClick={() => props.onAnswer(index())}
                                >
                                    {option}
                                </button>
                            )}
                        </For>
                    </div>
                )}
            </Show>

            <Show when={props.state.feedback}>
                <p role="status">{props.state.feedback}</p>
            </Show>
            <Show when={props.state.answered && !props.state.finished}>
                <button type="button" onClick={() => props.onNext()}>
                    Next question
                </button>
            </Show>
            <Show when={props.state.finished}>
                <div>
                    <p role="status">
                        You scored {props.state.score} out of {props.questions.length}. Review any
                        lesson above if an answer surprised you.
                    </p>
                    <button type="button" onClick={() => props.onReset()}>
                        Start over
                    </button>
                </div>
            </Show>
        </section>
    );
}
