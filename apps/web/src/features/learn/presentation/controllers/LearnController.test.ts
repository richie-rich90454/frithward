import { describe, expect, it } from "vitest";
import { en } from "../../../../locales/en.js";
import { LearnController, LESSONS, QUIZ, dictionaryTranslator } from "./LearnController";

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
        const controller = new LearnController((key) => (key === "learn.lesson.sources.title" ? "Quellen" : translate(key)));
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
