import { A, Route } from "@solidjs/router";
import { For } from "solid-js";
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

function Section(props: { title: string; description: string }) {
    return (
        <section>
            <h1>{props.title}</h1>
            <p>{props.description}</p>
        </section>
    );
}

export function DesktopApp() {
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
            <main>
                <Route
                    path="/"
                    component={() => (
                        <Section
                            title="Home"
                            description="Generates captions, edits media, checks suspicious content, and protects personal information locally."
                        />
                    )}
                />
                <Route
                    path="/make"
                    component={() => (
                        <Section
                            title="Make"
                            description="Caption studio, audio, video, image, and document workshops."
                        />
                    )}
                />
                <Route
                    path="/protect"
                    component={() => (
                        <Section
                            title="Protect"
                            description="Privacy inspection and share check."
                        />
                    )}
                />
                <Route
                    path="/check"
                    component={() => (
                        <Section title="Check" description="Scam check and media analysis." />
                    )}
                />
                <Route
                    path="/verify"
                    component={() => (
                        <Section title="Verify" description="Provenance verification." />
                    )}
                />
                <Route
                    path="/respond"
                    component={() => (
                        <Section
                            title="Respond"
                            description="Evidence timeline and incident reports."
                        />
                    )}
                />
                <Route
                    path="/learn"
                    component={() => (
                        <Section
                            title="Learn"
                            description="Short lessons and media literacy resources."
                        />
                    )}
                />
                <Route
                    path="/community"
                    component={() => (
                        <Section
                            title="Community"
                            description="Frithward Commons resources and partnerships."
                        />
                    )}
                />
                <Route
                    path="/tools"
                    component={() => (
                        <Section
                            title="Developer tools"
                            description="Local-first packages and interfaces for building with Frithward."
                        />
                    )}
                />
                <Route
                    path="/tools/captions"
                    component={() => (
                        <Section
                            title="Caption studio"
                            description="Generate and edit captions in the browser."
                        />
                    )}
                />
            </main>
        </div>
    );
}
