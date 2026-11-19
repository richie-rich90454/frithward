import { For, Show } from "solid-js";
import { useI18n } from "../../../../i18n/index.js";
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
    const { t } = useI18n();
    const result = () =>
        t("learn.quiz.result")
            .replace("{score}", String(props.state.score))
            .replace("{total}", String(props.questions.length));
    return (
        <section>
            <h2>{t("learn.quiz.title")}</h2>
            <p>
                {t("learn.quiz.score")} {props.state.score} / {props.questions.length}
            </p>
            <nav aria-label={t("learn.quiz.title")}>
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
                    {t("learn.quiz.next")}
                </button>
            </Show>
            <Show when={props.state.finished}>
                <div>
                    <p role="status">
                        {result()} {t("learn.quiz.review")}
                    </p>
                    <button type="button" onClick={() => props.onReset()}>
                        {t("learn.quiz.restart")}
                    </button>
                </div>
            </Show>
        </section>
    );
}
