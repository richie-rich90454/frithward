import { For, Show, createSignal, onCleanup } from "solid-js";
import { GraduationCap } from "lucide-solid";
import { useI18n } from "../../../../i18n/index.js";
import { Quiz } from "../components/Quiz";
import { LearnController } from "../controllers/LearnController";

export function LearnView() {
    const { t } = useI18n();
    const controller = new LearnController(t);
    const [state, setState] = createSignal(controller.getState());
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    const lessons = controller.getLessons();
    const questions = controller.getQuestions();
    const completedCount = () => {
        state();
        return lessons.filter((lesson) => controller.getProgress()[lesson.id]?.completed).length;
    };
    const hasIncomplete = () => {
        state();
        return controller.getNextIncompleteLessonIndex() >= 0;
    };

    return (
        <section>
            <h1>
                <GraduationCap class="fw-icon" />
                {t("learn.title")}
            </h1>
            <p>{t("learn.intro")}</p>

            <p role="status">
                Progress: {completedCount()} / {lessons.length} lessons complete
            </p>
            <Show when={hasIncomplete()}>
                <button type="button" onClick={() => controller.continueLearning()}>
                    Continue learning
                </button>
            </Show>
            <button type="button" onClick={() => controller.resetProgress()}>
                Reset progress
            </button>

            <For each={lessons}>
                {(lesson) => (
                    <article>
                        <h2>{lesson.title}</h2>
                        <For each={lesson.paragraphs}>{(paragraph) => <p>{paragraph}</p>}</For>
                        <p>
                            <strong>{lesson.scenario}</strong>
                        </p>
                    </article>
                )}
            </For>

            <Quiz
                questions={questions}
                question={questions[state().currentIndex] ?? null}
                state={state()}
                onSelect={(index) => controller.selectQuestion(index)}
                onAnswer={(index) => controller.answer(index)}
                onNext={() => controller.next()}
                onReset={() => controller.reset()}
            />
        </section>
    );
}
