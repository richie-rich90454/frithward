import { For, Show, createSignal, onCleanup } from "solid-js";
import { Accessibility, GraduationCap, Library, MessageSquare, Users } from "lucide-solid";
import { REVIEWED_PATTERNS } from "../../../check/domain/ReviewedPatterns.js";
import { CommunityPatternsController } from "../controllers/CommunityPatternsController";
import "../community.css";

const TRACKS = [
    {
        title: "Technology",
        detail: "Help improve the local tools: report bugs, suggest clearer wording, test new browser features, or contribute code and translations to the open-source packages.",
    },
    {
        title: "Public safety",
        detail: "Share non-identifying patterns you have seen in scam messages so others know what to check. Do not forward the original messages or the personal details of anyone targeted.",
    },
    {
        title: "Accessibility",
        detail: "Review captions, plain-language summaries, and keyboard navigation. Tell us where instructions are hard to follow so we can rewrite them for more people.",
    },
    {
        title: "Research",
        detail: "Ask questions, propose study ideas, and help test whether an educational approach works. Keep participants voluntary, consented, and never identify them in public write-ups.",
    },
] as const;

const PARTNERSHIPS = [
    {
        icon: GraduationCap,
        title: "Schools",
        detail: "Classroom materials and short sessions on checking sources and recognising pressure tactics.",
    },
    {
        icon: Library,
        title: "Libraries",
        detail: "Public workshops on privacy settings, safe sharing, and reading media critically.",
    },
    {
        icon: Accessibility,
        title: "Senior centres",
        detail: "In-person, plain-language walkthroughs of common messages and how to verify them.",
    },
    {
        icon: Users,
        title: "Universities",
        detail: "Collaboration on research, evaluation, and open tools with clear consent and ethics review.",
    },
    {
        icon: MessageSquare,
        title: "Consumer protection groups",
        detail: "Sharing general trend information and referral paths without exposing case details.",
    },
] as const;

export function CommunityView() {
    const controller = new CommunityPatternsController();
    const [state, setState] = createSignal(controller.getState());
    onCleanup(
        controller.subscribe(() => {
            setState(controller.getState());
        }),
    );
    const [title, setTitle] = createSignal("");
    const [description, setDescription] = createSignal("");
    const [sourceUrl, setSourceUrl] = createSignal("");

    const submit = (event: SubmitEvent) => {
        event.preventDefault();
        const added = controller.add({
            title: title(),
            description: description(),
            sourceUrl: sourceUrl(),
        });
        if (added) {
            setTitle("");
            setDescription("");
            setSourceUrl("");
        }
    };

    return (
        <section class="community-view">
            <h1>
                <Users class="fw-icon" />
                Community
            </h1>
            <p>
                Frithward Commons is where people help each other use these tools well. You can take
                part without sharing anyone's private information.
            </p>

            <h2>Reviewed patterns</h2>
            <p>
                These are the transparent, rule-based signals used by Scam Check. A match is a
                prompt to check with the sender through a known channel, not proof of fraud.
            </p>
            <ul class="resource-list">
                <For each={REVIEWED_PATTERNS}>
                    {(pattern) => (
                        <li>
                            <div>
                                <h3>{pattern.label}</h3>
                                <p>{pattern.rationale}</p>
                                <p class="community-view__source">
                                    Source: Scam Check reviewed catalog
                                </p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <h2>Community patterns</h2>
            <p role="note">
                Community submitted, not independently verified. Nothing here is uploaded or shared;
                entries stay in this browser only. Do not include anyone's private information.
            </p>

            <form class="community-view__form" onSubmit={submit}>
                <label>
                    Title
                    <input
                        type="text"
                        value={title()}
                        maxlength={120}
                        onInput={(event) => setTitle(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Description
                    <textarea
                        value={description()}
                        maxlength={600}
                        onInput={(event) => setDescription(event.currentTarget.value)}
                    />
                </label>
                <label>
                    Source URL (optional)
                    <input
                        type="text"
                        value={sourceUrl()}
                        maxlength={500}
                        onInput={(event) => setSourceUrl(event.currentTarget.value)}
                    />
                </label>
                <button type="submit">Add pattern</button>
            </form>

            <Show when={state().error}>
                <p role="alert" class="community-view__error">
                    {state().error}
                </p>
            </Show>

            <Show
                when={state().patterns.length > 0}
                fallback={<p class="community-view__empty">No community patterns saved yet.</p>}
            >
                <ul class="resource-list">
                    <For each={state().patterns}>
                        {(pattern) => (
                            <li>
                                <div>
                                    <h3>{pattern.title}</h3>
                                    <p>{pattern.description}</p>
                                    <Show when={pattern.sourceUrl}>
                                        <p class="community-view__source">
                                            <a
                                                href={pattern.sourceUrl ?? ""}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {pattern.sourceUrl}
                                            </a>
                                        </p>
                                    </Show>
                                    <p class="community-view__source">
                                        Community submitted, not independently verified
                                    </p>
                                </div>
                                <button type="button" onClick={() => controller.remove(pattern.id)}>
                                    Delete
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>

            <h2>Contribution tracks</h2>
            <ul class="resource-list">
                <For each={TRACKS}>
                    {(track) => (
                        <li>
                            <div>
                                <h3>{track.title}</h3>
                                <p>{track.detail}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <h2>Partnership categories</h2>
            <ul class="resource-list">
                <For each={PARTNERSHIPS}>
                    {(partner) => (
                        <li>
                            <partner.icon class="fw-icon" />
                            <div>
                                <h3>{partner.title}</h3>
                                <p>{partner.detail}</p>
                            </div>
                        </li>
                    )}
                </For>
            </ul>

            <p role="note">
                <strong>Privacy rule:</strong> contributors must never publish a victim's private
                information. That includes names, addresses, phone numbers, account details, images,
                and any identifying context, even if it was sent to you or found in a public
                profile. Share general patterns only, and check before you post.
            </p>
        </section>
    );
}
