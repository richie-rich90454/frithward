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

export const LESSONS: readonly Lesson[] = [
    {
        id: "sources",
        title: "Verifying sources",
        paragraphs: [
            "A picture or quote can travel far before anyone checks where it started. Before you share, look for the original post, the account that published it, and the date. A repost, a screenshot, or a cropped image removes context and makes a claim harder to trace.",
            "Check at least one source you did not reach through the same chain that brought you the claim. A linked article, an official statement, or a second independent account is more useful than ten copies of the same repost. If you cannot find an original source, say you are unsure instead of presenting the claim as fact.",
        ],
        scenario:
            "Fictional scenario: A neighbourhood group shares a dramatic photo of a flooded street with the message 'this happened here last night.' The photo has no date or location. You search and find it was posted in another country months earlier. You share that earlier post and ask for a local source before anyone reshare it.",
    },
    {
        id: "pressure",
        title: "Recognising urgency and pressure",
        paragraphs: [
            "Messages that push you to act right now are worth slowing down. Phrases like 'act in ten minutes', 'keep this secret', or 'everyone has already paid' are designed to stop you from checking. Real organisations rarely require an immediate, private payment in a single message.",
            "Pressure often comes with a story that isolates you: 'do not tell anyone' or 'your account will be deleted.' That isolation is a warning sign, not proof. Step away, open the organisation's own website or app, and contact them through a number or address you already trust.",
        ],
        scenario:
            "Fictional scenario: A text says your electricity will be cut off in fifteen minutes unless you pay through a link. The link asks for a card number and a one-time code. You ignore the link, open your utility provider's app, and see no notice of any unpaid bill.",
    },
    {
        id: "privacy",
        title: "Protecting personal information",
        paragraphs: [
            "Photos and videos can carry clues about where you are and what you own. A street sign, a school uniform, a ticket barcode, or a reflection in a window can identify a person or place even when the caption says nothing. A file can also contain metadata that a platform does not strip.",
            "Before posting, crop or blur identifying details and check what the file itself contains. Do not publish someone else's address, phone number, workplace, or family details, even if you found them in a public profile. If a message asks you to move a conversation to a private channel or hand over a code, treat that information as sensitive.",
        ],
        scenario:
            "Fictional scenario: You want to share a photo of a crowd at a local event. In the background, a name badge and a licence plate are readable. You crop both out and remove the original full-resolution image before uploading the edited copy.",
    },
    {
        id: "synthetic",
        title: "Understanding synthetic media limits",
        paragraphs: [
            "AI tools can make convincing images, voices, and videos, but detection is uncertain. A tool that says an image is 'fake' may be wrong, and a real photo may look strange because of lighting or compression. There is no single visual tell that is reliable every time.",
            "Treat a detection result as one clue, not a verdict. Look for corroboration: was the event reported by independent sources, does the original file exist, and does the content match known facts? When you cannot tell, the honest answer is that you cannot tell. Avoid accusing a specific person on the basis of a detector's output.",
        ],
        scenario:
            "Fictional scenario: A short video shows a public figure saying something shocking. A detector labels it 'likely synthetic', but you cannot verify the clip against any official record. You choose not to share it and note that the source is unknown rather than calling it a fake or declaring it real.",
    },
];

export const QUIZ: readonly QuizQuestion[] = [
    {
        id: "q-sources",
        prompt: "You see a dramatic photo in a group chat with no date or location. What is the most useful first step?",
        options: [
            "Share it so others can warn their friends",
            "Try to find the earliest post and check an independent source",
            "Assume it is false because it has no caption",
        ],
        correctIndex: 1,
        explanation:
            "Finding the earliest post and an independent source gives you context. Sharing first spreads unverified claims, and assuming it is false is just as unsupported.",
    },
    {
        id: "q-pressure",
        prompt: "A message says your account will close in ten minutes unless you pay through a link. What does that pressure most likely signal?",
        options: [
            "A genuine emergency that needs fast payment",
            "A routine reminder from your provider",
            "An attempt to stop you from checking the claim",
        ],
        correctIndex: 2,
        explanation:
            "Urgency plus a payment link is a common pressure tactic. Check with the provider through a channel you already trust.",
    },
    {
        id: "q-privacy",
        prompt: "Which detail is safest to leave visible when posting a photo of a public event?",
        options: ["A readable name badge", "A licence plate", "A plain background with no identifying text"],
        correctIndex: 2,
        explanation:
            "Identifying text and plates can expose people. Crop or blur them; a plain background carries far less information.",
    },
    {
        id: "q-synthetic",
        prompt: "A detector labels a video 'likely synthetic'. What is the honest conclusion?",
        options: [
            "It is definitely fake and you should accuse the source",
            "It is one clue; without corroboration you cannot be sure",
            "It must be real because detectors are often wrong",
        ],
        correctIndex: 1,
        explanation:
            "Detectors can be wrong in both directions. Without independent corroboration, the honest position is uncertainty.",
    },
];

export class LearnController {
    private readonly listeners = new Set<() => void>();
    private state: LearnState = this.initialState();

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    public getLessons(): readonly Lesson[] {
        return LESSONS;
    }

    public getQuestions(): readonly QuizQuestion[] {
        return QUIZ;
    }

    public getState(): LearnState {
        return this.state;
    }

    public currentQuestion(): QuizQuestion | null {
        return QUIZ[this.state.currentIndex] ?? null;
    }

    public selectQuestion(index: number): void {
        if (index < 0 || index >= QUIZ.length) return;
        if (index === this.state.currentIndex && this.state.answered) return;
        const answered = index < this.state.currentIndex;
        this.state = {
            ...this.initialState(),
            currentIndex: index,
            score: this.state.score,
            answered,
            feedback: answered ? "You already answered this question." : null,
        };
        this.notify();
    }

    public answer(optionIndex: number): void {
        const question = this.currentQuestion();
        if (!question || this.state.answered || this.state.finished) return;
        const correct = optionIndex === question.correctIndex;
        this.state = {
            ...this.state,
            selectedIndex: optionIndex,
            answered: true,
            score: this.state.score + (correct ? 1 : 0),
            feedback: `${correct ? "Correct. " : "Not quite. "}${question.explanation}`,
        };
        this.notify();
    }

    public next(): void {
        if (!this.state.answered) return;
        if (this.state.currentIndex + 1 >= QUIZ.length) {
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
