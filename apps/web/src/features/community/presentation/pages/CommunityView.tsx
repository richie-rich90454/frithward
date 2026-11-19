import { For } from "solid-js";
import {
    Accessibility,
    GraduationCap,
    Library,
    MessageSquare,
    Users,
} from "lucide-solid";

const TRACKS = [
    {
        title: "Technology",
        detail:
            "Help improve the local tools: report bugs, suggest clearer wording, test new browser features, or contribute code and translations to the open-source packages.",
    },
    {
        title: "Public safety",
        detail:
            "Share non-identifying patterns you have seen in scam messages so others know what to check. Do not forward the original messages or the personal details of anyone targeted.",
    },
    {
        title: "Accessibility",
        detail:
            "Review captions, plain-language summaries, and keyboard navigation. Tell us where instructions are hard to follow so we can rewrite them for more people.",
    },
    {
        title: "Research",
        detail:
            "Ask questions, propose study ideas, and help test whether an educational approach works. Keep participants voluntary, consented, and never identify them in public write-ups.",
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
    return (
        <section>
            <h1>
                <Users class="fw-icon" />
                Community
            </h1>
            <p>
                Frithward Commons is where people help each other use these tools well. You can take
                part without sharing anyone's private information.
            </p>

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
                and any identifying context, even if it was sent to you or found in a public profile.
                Share general patterns only, and check before you post.
            </p>
        </section>
    );
}
