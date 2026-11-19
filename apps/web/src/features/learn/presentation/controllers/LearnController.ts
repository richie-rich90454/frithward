import { en } from "../../../../locales/en.js";

export interface Lesson {
    id: string;
    title: string;
    paragraphs: readonly string[];
    scenario: string;
}

export interface QuizQuestion {
    id: string;
    prompt: string;
    options: readonly string[];
    correctIndex: number;
    explanation: string;
}

export interface LearnState {
    currentIndex: number;
    selectedIndex: number | null;
    answered: boolean;
    score: number;
    finished: boolean;
    feedback: string | null;
}

export type LearnDictionary = Readonly<Record<string, string>>;
export type LearnTranslator = (key: string) => string;

export function dictionaryTranslator(dictionary: LearnDictionary): LearnTranslator {
    return (key) => dictionary[key] ?? key;
}

const LESSON_IDS = ["sources", "pressure", "privacy", "synthetic"] as const;
const QUIZ_IDS = ["q-sources", "q-pressure", "q-privacy", "q-synthetic"] as const;
const CORRECT_INDEXES: Readonly<Record<(typeof QUIZ_IDS)[number], number>> = {
    "q-sources": 1,
    "q-pressure": 2,
    "q-privacy": 2,
    "q-synthetic": 1,
};

function buildLessons(translate: LearnTranslator): Lesson[] {
    return LESSON_IDS.map((id) => {
        const prefix = `learn.lesson.${id}.`;
        return {
            id,
            title: translate(`${prefix}title`),
            paragraphs: [translate(`${prefix}p1`), translate(`${prefix}p2`)],
            scenario: translate(`${prefix}scenario`),
        };
    });
}

function buildQuiz(translate: LearnTranslator): QuizQuestion[] {
    return QUIZ_IDS.map((id) => {
        const prefix = `learn.quiz.${id}.`;
        return {
            id,
            prompt: translate(`${prefix}prompt`),
            options: [
                translate(`${prefix}option.0`),
                translate(`${prefix}option.1`),
                translate(`${prefix}option.2`),
            ],
            correctIndex: CORRECT_INDEXES[id] ?? 0,
            explanation: translate(`${prefix}explanation`),
        };
    });
}

const english = dictionaryTranslator(en);
export const LESSONS: readonly Lesson[] = buildLessons(english);
export const QUIZ: readonly QuizQuestion[] = buildQuiz(english);

export class LearnController {
    private readonly listeners = new Set<() => void>();
    private readonly translate: LearnTranslator;
    private state: LearnState = this.initialState();

    public constructor(translate: LearnTranslator = english) {
        this.translate = translate;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getLessons(): readonly Lesson[] {
        return buildLessons(this.translate);
    }

    public getQuestions(): readonly QuizQuestion[] {
        return buildQuiz(this.translate);
    }

    public getState(): LearnState {
        return this.state;
    }

    public currentQuestion(): QuizQuestion | null {
        return this.getQuestions()[this.state.currentIndex] ?? null;
    }

    public selectQuestion(index: number): void {
        const questions = this.getQuestions();
        if (index < 0 || index >= questions.length) return;
        if (index === this.state.currentIndex && this.state.answered) return;
        const answered = index < this.state.currentIndex;
        this.state = {
            ...this.initialState(),
            currentIndex: index,
            score: this.state.score,
            answered,
            feedback: answered ? this.translate("learn.quiz.answered") : null,
        };
        this.notify();
    }

    public answer(optionIndex: number): void {
        const question = this.currentQuestion();
        if (!question || this.state.answered || this.state.finished) return;
        const correct = optionIndex === question.correctIndex;
        const prefix = correct ? "learn.quiz.correct" : "learn.quiz.incorrect";
        this.state = {
            ...this.state,
            selectedIndex: optionIndex,
            answered: true,
            score: this.state.score + (correct ? 1 : 0),
            feedback: `${this.translate(prefix)} ${question.explanation}`,
        };
        this.notify();
    }

    public next(): void {
        if (!this.state.answered) return;
        const lastIndex = this.getQuestions().length - 1;
        if (this.state.currentIndex >= lastIndex) {
            this.state = { ...this.state, finished: true };
        } else {
            this.state = {
                ...this.state,
                currentIndex: this.state.currentIndex + 1,
                selectedIndex: null,
                answered: false,
                feedback: null,
            };
        }
        this.notify();
    }

    public reset(): void {
        this.state = this.initialState();
        this.notify();
    }

    private initialState(): LearnState {
        return {
            currentIndex: 0,
            selectedIndex: null,
            answered: false,
            score: 0,
            finished: false,
            feedback: null,
        };
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
