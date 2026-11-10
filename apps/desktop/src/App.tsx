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

const PAGES: Readonly<Record<string, { title: string; description: string }>> = {
    "/": {
        title: "Home",
        description:
            "Generates captions, edits media, checks suspicious content, and protects personal information locally.",
    },
    "/make": {
        title: "Make",
        description: "Caption studio, audio, video, image, and document workshops.",
    },
    "/protect": { title: "Protect", description: "Privacy inspection and share check." },
    "/check": { title: "Check", description: "Scam check and media analysis." },
    "/verify": { title: "Verify", description: "Provenance verification." },
    "/respond": { title: "Respond", description: "Evidence timeline and incident reports." },
    "/learn": { title: "Learn", description: "Short lessons and media literacy resources." },
    "/community": {
        title: "Community",
        description: "Frithward Commons resources and partnerships.",
    },
    "/tools": {
        title: "Developer tools",
        description: "Local-first packages and interfaces for building with Frithward.",
    },
    "/tools/captions": {
        title: "Caption studio",
        description: "Generate and edit captions in the browser.",
    },
};

function pageFor(pathname: string): JSX.Element {
    const page = PAGES[pathname] ?? PAGES["/"];
    return (
        <section>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
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
                    <p>Local processing is the default. Hosted processing is optional and explicit.</p>
                </div>
                <nav aria-label="Primary">
                    <For each={NAVIGATION}>
                        {(item) => (
                            <A
                                href={item.path}
                                end={item.path === "/"}
                                activeClass="is-active"
                            >
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
