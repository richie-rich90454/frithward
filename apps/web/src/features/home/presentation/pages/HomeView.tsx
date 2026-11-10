import { A } from "@solidjs/router";
import { For } from "solid-js";
import {
    BadgeCheck,
    Captions,
    Clapperboard,
    HeartHandshake,
    Home,
    Lock,
    ScanSearch,
} from "lucide-solid";

const SHORTCUTS = [
    {
        href: "/tools/captions",
        label: "Generate captions",
        description: "Create and edit captions for audio and video.",
        icon: Captions,
    },
    {
        href: "/make",
        label: "Edit media",
        description: "Trim, retime, and adjust captions and subtitles.",
        icon: Clapperboard,
    },
    {
        href: "/check",
        label: "Check suspicious content",
        description: "Look for common text risk indicators in a message.",
        icon: ScanSearch,
    },
    {
        href: "/protect",
        label: "Protect personal information",
        description: "Check metadata before sharing media.",
        icon: Lock,
    },
    {
        href: "/verify",
        label: "Inspect authenticity",
        description: "Check signature and provenance records.",
        icon: BadgeCheck,
    },
    {
        href: "/respond",
        label: "Get help with a scam",
        description: "Record a message and build an evidence timeline.",
        icon: HeartHandshake,
    },
] as const;

export function HomeView() {
    return (
        <section>
            <h1>
                <Home class="fw-icon" />
                Home
            </h1>
            <p>
                Generates captions, edits media, checks suspicious content, and protects personal
                information locally.
            </p>
            <ul class="shortcut-list">
                <For each={SHORTCUTS}>
                    {(shortcut) => (
                        <li>
                            <A href={shortcut.href}>
                                <shortcut.icon class="fw-icon" />
                                <span>
                                    <strong>{shortcut.label}</strong>
                                    {shortcut.description}
                                </span>
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}
