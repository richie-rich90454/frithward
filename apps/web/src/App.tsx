import { For, Show, createSignal } from "solid-js";
import "./app.css";

const NAVIGATION = [
    { id: "home", label: "Home" },
    { id: "make", label: "Make" },
    { id: "protect", label: "Protect" },
    { id: "check", label: "Check" },
    { id: "verify", label: "Verify" },
    { id: "respond", label: "Respond" },
    { id: "learn", label: "Learn" },
    { id: "community", label: "Community" },
] as const;

export function App() {
    const [section, setSection] = createSignal<string>("home");
    return (
        <div class="app-shell">
            <header>
                <p>
                    <strong>Frithward</strong>
                </p>
                <p>Keep people safe. Keep media honest.</p>
            </header>
            <nav aria-label="Primary">
                <For each={NAVIGATION}>
                    {(item) => (
                        <button
                            type="button"
                            aria-current={section() === item.id ? "page" : undefined}
                            onClick={() => setSection(item.id)}
                        >
                            {item.label}
                        </button>
                    )}
                </For>
            </nav>
            <main>
                <Show when={section() === "home"}>
                    <section>
                        <h1>Home</h1>
                        <p>
                            Generates captions, edits media, checks suspicious content, and protects
                            personal information locally.
                        </p>
                    </section>
                </Show>
                <Show when={section() === "make"}>
                    <section>
                        <h1>Make</h1>
                        <p>Caption studio, audio, video, image, and document workshops.</p>
                    </section>
                </Show>
                <Show when={section() === "protect"}>
                    <section>
                        <h1>Protect</h1>
                        <p>Privacy inspection and share check.</p>
                    </section>
                </Show>
                <Show when={section() === "check"}>
                    <section>
                        <h1>Check</h1>
                        <p>Scam check and media analysis.</p>
                    </section>
                </Show>
                <Show when={section() === "verify"}>
                    <section>
                        <h1>Verify</h1>
                        <p>Provenance verification.</p>
                    </section>
                </Show>
                <Show when={section() === "respond"}>
                    <section>
                        <h1>Respond</h1>
                        <p>Evidence timeline and incident reports.</p>
                    </section>
                </Show>
                <Show when={section() === "learn"}>
                    <section>
                        <h1>Learn</h1>
                        <p>Short lessons and media literacy resources.</p>
                    </section>
                </Show>
                <Show when={section() === "community"}>
                    <section>
                        <h1>Community</h1>
                        <p>Frithward Commons resources and partnerships.</p>
                    </section>
                </Show>
            </main>
        </div>
    );
}
