import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../../../../locales/en.js";
import {
    LEARN_PROGRESS_KEY,
    LearnController,
    LESSONS,
    QUIZ,
    dictionaryTranslator,
} from "./LearnController";

const translate = dictionaryTranslator(en);

describe("LearnController", () => {
    it("offers four lessons with paragraphs and a fictional scenario", () => {
        const controller = new LearnController(translate);
        const lessons = controller.getLessons();
        expect(lessons).toEqual(LESSONS);
        expect(lessons.length).toBe(4);
        for (const lesson of lessons) {
            expect(lesson.title.length).toBeGreaterThan(0);
            expect(lesson.paragraphs.length).toBeGreaterThanOrEqual(2);
            expect(lesson.scenario.toLowerCase()).toContain("fictional scenario");
        }
    });

    it("uses the injected dictionary instead of hardcoded strings", () => {
        const controller = new LearnController((key) =>
            key === "learn.lesson.sources.title" ? "Quellen" : translate(key),
        );
        expect(controller.getLessons()[0]?.title).toBe("Quellen");
    });

    it("scores a correct answer and shows the explanation", () => {
        const controller = new LearnController(translate);
        const first = QUIZ[0];
        if (!first) throw new Error("Quiz is empty.");
        controller.answer(first.correctIndex);
        const state = controller.getState();
        expect(state.score).toBe(1);
        expect(state.answered).toBe(true);
        expect(state.feedback).toContain("Correct");
        expect(state.feedback).toContain(first.explanation);
    });

    it("does not score an incorrect answer but still explains it", () => {
        const controller = new LearnController(translate);
        const first = QUIZ[0];
        if (!first) throw new Error("Quiz is empty.");
        controller.answer((first.correctIndex + 1) % first.options.length);
        expect(controller.getState().score).toBe(0);
        expect(controller.getState().feedback).toContain("Not quite");
    });

    it("advances through questions and finishes once", () => {
        const controller = new LearnController(translate);
        for (let index = 0; index < QUIZ.length; index += 1) {
            const question = controller.currentQuestion();
            if (!question) throw new Error("Quiz is empty.");
            controller.answer(question.correctIndex);
            controller.next();
        }
        expect(controller.getState().finished).toBe(true);
        expect(controller.getState().score).toBe(QUIZ.length);
    });

    it("ignores repeat answers and resets cleanly", () => {
        const controller = new LearnController(translate);
        const question = QUIZ[0];
        if (!question) throw new Error("Quiz is empty.");
        controller.answer(question.correctIndex);
        controller.answer(question.correctIndex);
        expect(controller.getState().score).toBe(1);
        controller.reset();
        expect(controller.getState()).toMatchObject({
            currentIndex: 0,
            selectedIndex: null,
            answered: false,
            score: 0,
            finished: false,
            feedback: null,
        });
    });
});

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
        removeItem: (key: string) => {
            values.delete(key);
        },
    };
}

describe("LearnController progress persistence", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("saves per-lesson completion and score, then reloads them", () => {
        const storage = memoryStorage();
        const controller = new LearnController(translate, { storage });
        const first = QUIZ[0];
        if (!first) throw new Error("Quiz is empty.");
        controller.answer(first.correctIndex);
        expect(controller.getProgress()["sources"]).toEqual({ completed: true, score: 1 });
        expect(storage.getItem(LEARN_PROGRESS_KEY)).toContain('"sources"');

        const reloaded = new LearnController(translate, { storage });
        expect(reloaded.getProgress()["sources"]).toEqual({ completed: true, score: 1 });
        expect(reloaded.getNextIncompleteLessonIndex()).toBe(1);
    });

    it("resumes the next incomplete lesson", () => {
        const storage = memoryStorage();
        const controller = new LearnController(translate, { storage });
        controller.answer(QUIZ[0]?.correctIndex ?? 0);
        controller.continueLearning();
        expect(controller.getState().currentIndex).toBe(1);
        for (let index = 1; index < QUIZ.length; index += 1) {
            controller.answer(QUIZ[index]?.correctIndex ?? 0);
            controller.next();
        }
        expect(controller.getNextIncompleteLessonIndex()).toBe(-1);
    });

    it("clears progress and stored data on reset", () => {
        const storage = memoryStorage();
        const controller = new LearnController(translate, { storage });
        controller.answer(QUIZ[0]?.correctIndex ?? 0);
        controller.resetProgress();
        expect(controller.getProgress()).toEqual({});
        expect(storage.getItem(LEARN_PROGRESS_KEY)).toBeNull();
        expect(controller.getState().currentIndex).toBe(0);
        expect(controller.getNextIncompleteLessonIndex()).toBe(0);
    });

    it("ignores malformed and out-of-range stored progress", () => {
        const storage = memoryStorage();
        storage.setItem(LEARN_PROGRESS_KEY, "not json");
        expect(new LearnController(translate, { storage }).getProgress()).toEqual({});

        storage.setItem(
            LEARN_PROGRESS_KEY,
            JSON.stringify({
                sources: { completed: true, score: 99 },
                pressure: { completed: "yes", score: 1 },
                unknown: { completed: true, score: 1 },
                privacy: { completed: false, score: -1 },
            }),
        );
        const progress = new LearnController(translate, { storage }).getProgress();
        expect(progress).toEqual({
            sources: { completed: true, score: 0 },
            privacy: { completed: false, score: 0 },
        });
    });

    it("does not throw when storage is unavailable", () => {
        const blocked = {
            getItem: () => {
                throw new Error("blocked");
            },
            setItem: () => {
                throw new Error("blocked");
            },
            removeItem: () => {
                throw new Error("blocked");
            },
        };
        vi.stubGlobal("localStorage", blocked);
        const controller = new LearnController(translate);
        expect(controller.getProgress()).toEqual({});
        expect(() => controller.answer(QUIZ[0]?.correctIndex ?? 0)).not.toThrow();
        expect(() => controller.resetProgress()).not.toThrow();
    });
});
