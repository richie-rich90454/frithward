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

export interface LessonProgress {
    completed: boolean;
    score: number;
}

export type LearnProgress = Record<string, LessonProgress>;

export interface LearnStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export interface LearnControllerOptions {
    storage?: LearnStorage | null;
}

export const LEARN_PROGRESS_KEY = "frithward.learn.progress";

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

function isLessonProgress(value: unknown): value is LessonProgress {
    if (typeof value !== "object" || value === null) return false;
    const entry = value as Record<string, unknown>;
    return typeof entry["completed"] === "boolean" && typeof entry["score"] === "number";
}

function readProgress(storage: LearnStorage | null): LearnProgress {
    if (!storage) return {};
    try {
        const raw = storage.getItem(LEARN_PROGRESS_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
        const result: LearnProgress = {};
        for (const id of LESSON_IDS) {
            const value = (parsed as Record<string, unknown>)[id];
            if (isLessonProgress(value)) {
                result[id] = {
                    completed: value.completed,
                    score: value.score >= 0 && value.score <= 1 ? value.score : 0,
                };
            }
        }
        return result;
    } catch {
        return {};
    }
}

function browserStorage(): LearnStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

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
    private readonly storage: LearnStorage | null;
    private state: LearnState = this.initialState();
    private progress: LearnProgress;

    public constructor(translate: LearnTranslator = english, options: LearnControllerOptions = {}) {
        this.translate = translate;
        this.storage = options.storage ?? browserStorage();
        this.progress = readProgress(this.storage);
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

    public getProgress(): LearnProgress {
        return { ...this.progress };
    }

    /** Index of the first lesson without a completed question, or -1 when all are done. */
    public getNextIncompleteLessonIndex(): number {
        return LESSON_IDS.findIndex((id) => !this.progress[id]?.completed);
    }

    public continueLearning(): void {
        const next = this.getNextIncompleteLessonIndex();
        if (next >= 0) this.selectQuestion(next);
    }

    public resetProgress(): void {
        this.progress = {};
        this.clearStoredProgress();
        this.reset();
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
        const lessonId = LESSON_IDS[this.state.currentIndex];
        if (lessonId) {
            this.progress = {
                ...this.progress,
                [lessonId]: { completed: true, score: correct ? 1 : 0 },
            };
            this.saveProgress();
        }
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

    private saveProgress(): void {
        if (!this.storage) return;
        try {
            this.storage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(this.progress));
        } catch {
            // Ignored: progress is a convenience, not a guarantee.
        }
    }

    private clearStoredProgress(): void {
        if (!this.storage) return;
        try {
            this.storage.removeItem(LEARN_PROGRESS_KEY);
        } catch {
            // Ignored: nothing to clear when storage is unavailable.
        }
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}
