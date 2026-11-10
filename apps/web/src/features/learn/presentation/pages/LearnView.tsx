import { For } from "solid-js";
import { BookOpen, GraduationCap, ScanSearch, ShieldCheck } from "lucide-solid";

const LESSONS = [
    {
        icon: BookOpen,
        title: "Check the source",
        detail: "Confirm who created the media and where it came from before sharing.",
    },
    {
        icon: ScanSearch,
        title: "Look for pressure",
        detail: "Urgency, secrecy, and payment requests are common risk indicators.",
    },
    {
        icon: ShieldCheck,
        title: "Protect your details",
        detail: "Remove location and device metadata before posting media.",
    },
] as const;

export function LearnView() {
    return (
        <section>
            <h1>
                <GraduationCap class="fw-icon" />
                Learn
            </h1>
            <p>Short lessons and media literacy resources.</p>
            <ul class="lesson-list">
                <For each={LESSONS}>
                    {(lesson) => (
                        <li>
                            <lesson.icon class="fw-icon" />
                            <div>
                                <h2>{lesson.title}</h2>
                                <p>{lesson.detail}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}
