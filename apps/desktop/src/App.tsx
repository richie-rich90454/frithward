import { A, useLocation } from "@solidjs/router";
import { For, type JSX } from "solid-js";
import {
    BadgeCheck,
    Clapperboard,
    GraduationCap,
    Home,
    LifeBuoy,
    ShieldAlert,
    ShieldCheck,
    Users,
} from "lucide-solid";

const NAVIGATION = [
    { path: "/", label: "Home", icon: Home },
    { path: "/make", label: "Make", icon: Clapperboard },
    { path: "/protect", label: "Protect", icon: ShieldCheck },
    { path: "/check", label: "Check", icon: ShieldAlert },
    { path: "/verify", label: "Verify", icon: BadgeCheck },
    { path: "/respond", label: "Respond", icon: LifeBuoy },
    { path: "/learn", label: "Learn", icon: GraduationCap },
    { path: "/community", label: "Community", icon: Users },
] as const;

interface PageContent {
    title: string;
    what: string;
    local: string;
    limitations: readonly string[];
}

const PAGES: Readonly<Record<string, PageContent>> = {
    "/": {
        title: "Home",
        what: "Frithward brings captioning, media editing, provenance checks, and incident tools into one place.",
        local: "Every tool here is designed to run on this device by default. Hosted processing, where it exists, is optional and explicit.",
        limitations: [
            "This desktop build is a local interface, not a cloud service.",
            "Detection and verification results are clues, not proof.",
        ],
    },
    "/make": {
        title: "Make",
        what: "Caption studio, audio, video, image, and document workshops prepare media before you share it.",
        local: "Files stay on this device unless you choose to upload them.",
        limitations: [
            "Generated captions and edits need a human review pass.",
            "Not every codec or file format is supported.",
        ],
    },
    "/protect": {
        title: "Protect",
        what: "Privacy inspection and share checks show what metadata and details a file or message would expose.",
        local: "Inspection happens locally; nothing is sent anywhere.",
        limitations: [
            "Removing metadata is not a guarantee of anonymity.",
            "A share check cannot see everything a recipient might infer.",
        ],
    },
    "/check": {
        title: "Check",
        what: "Scam check and media analysis surface patterns in a message or file that are worth a second look.",
        local: "Analysis runs on this device; no message or media is uploaded.",
        limitations: [
            "Results can be wrong in both directions.",
            "A clean result is not proof that content is safe.",
        ],
    },
    "/verify": {
        title: "Verify",
        what: "Provenance verification summarises the claims inside a C2PA manifest and shows what is missing.",
        local: "Manifests are parsed in the app; no external service is contacted.",
        limitations: [
            "Signature and hash claims are not cryptographically re-verified here.",
            "Timestamps come from the manifest and are not independently trusted.",
        ],
    },
    "/respond": {
        title: "Respond",
        what: "An evidence timeline and incident reports help you record what happened and what you did next.",
        local: "Your records stay in this local workspace.",
        limitations: [
            "This tool does not report incidents to any authority for you.",
            "Keep your own copies of anything you may need later.",
        ],
    },
    "/learn": {
        title: "Learn",
        what: "Short lessons cover source checking, pressure tactics, personal information, and synthetic media.",
        local: "The lessons are built into the app and need no connection.",
        limitations: [
            "Lessons are general guidance, not legal or safety advice.",
            "Examples are fictional and are not statistics.",
        ],
    },
    "/community": {
        title: "Community",
        what: "Frithward Commons lists ways to contribute and the kinds of organisations people partner with.",
        local: "The directory is informational; taking part is up to you.",
        limitations: [
            "Never publish a victim's private information.",
            "Partnership categories are not endorsements.",
        ],
    },
    "/tools": {
        title: "Developer tools",
        what: "Local-first packages and interfaces for building with Frithward in your own projects.",
        local: "Packages run in your own environment.",
        limitations: [
            "APIs may change while the project is early.",
            "Experimental components are not production guarantees.",
        ],
    },
    "/tools/captions": {
        title: "Caption studio",
        what: "Caption studio generates and edits captions for media files before export.",
        local: "Transcription and editing happen on this device.",
        limitations: [
            "Auto-generated captions contain mistakes; review them.",
            "Language support depends on the models available locally.",
        ],
    },
};

function pageFor(pathname: string): JSX.Element {
    const page = PAGES[pathname] ?? PAGES["/"];
    if (!page) return <section />;
    return (
        <section>
            <h1>{page.title}</h1>
            <h2>What this tool does</h2>
            <p>{page.what}</p>
            <h2>Processing</h2>
            <p>{page.local}</p>
            <h2>Limitations</h2>
            <ul>
                <For each={page.limitations}>{(limit) => <li>{limit}</li>}</For>
            </ul>
        </section>
    );
}

export function DesktopApp() {
    const location = useLocation();
    return (
        <div>
            <header>
                <div>
                    <p>
                        <strong>Frithward</strong>
                    </p>
                    <p>
                        Local processing is the default. Hosted processing is optional and explicit.
                    </p>
                </div>
                <nav aria-label="Primary">
                    <For each={NAVIGATION}>
                        {(item) => (
                            <A href={item.path} end={item.path === "/"} activeClass="is-active">
                                <item.icon class="fw-icon" />
                                {item.label}
                            </A>
                        )}
                    </For>
                </nav>
            </header>
            <main>{pageFor(location.pathname)}</main>
        </div>
    );
}
