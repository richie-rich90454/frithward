import { createSignal, Show } from "solid-js";

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "frithward.install.dismissed";

let deferred: InstallPromptEvent | null = null;
const [canInstall, setCanInstall] = createSignal(false);

function isDismissed(): boolean {
    try {
        return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
        return false;
    }
}

function markDismissed(): void {
    try {
        localStorage.setItem(DISMISS_KEY, "1");
    } catch {
        // Storage may be blocked; the dismissal still applies for this session.
    }
}

/** Captures the browser install prompt. Safe to call once at app startup. */
export function registerInstallPrompt(): () => void {
    if (typeof window === "undefined") return () => {};

    const onBeforeInstall = (event: Event) => {
        event.preventDefault();
        deferred = event as InstallPromptEvent;
        setCanInstall(true);
    };
    const onInstalled = () => {
        deferred = null;
        setCanInstall(false);
        markDismissed();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
    };
}

export { canInstall };

/** Returns true when the user accepted the install prompt. */
export async function promptInstall(): Promise<boolean> {
    const event = deferred;
    if (!event) return false;
    deferred = null;
    setCanInstall(false);
    try {
        await event.prompt();
        const choice = await event.userChoice;
        return choice.outcome === "accepted";
    } catch {
        return false;
    }
}

export function InstallPrompt() {
    const [hidden, setHidden] = createSignal(isDismissed());
    const dismiss = () => {
        markDismissed();
        setHidden(true);
    };

    return (
        <Show when={canInstall() && !hidden()}>
            <div
                role="region"
                aria-label="Install Frithward"
                style={{
                    position: "fixed",
                    bottom: "16px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    "align-items": "center",
                    gap: "12px",
                    "max-width": "calc(100vw - 32px)",
                    padding: "12px 16px",
                    border: "1px solid var(--fw-border-strong)",
                    "border-radius": "var(--fw-radius)",
                    background: "var(--fw-canvas)",
                    color: "var(--fw-text)",
                    "box-shadow": "0 4px 16px var(--fw-color-overlay)",
                    "z-index": "50",
                }}
            >
                <span>Install Frithward for offline access.</span>
                <button
                    type="button"
                    onClick={() => void promptInstall()}
                    style={{
                        "min-height": "44px",
                        "min-width": "44px",
                        padding: "0 16px",
                        border: "1px solid var(--fw-accent)",
                        "border-radius": "var(--fw-radius)",
                        background: "var(--fw-accent)",
                        color: "var(--fw-color-accent-contrast)",
                        font: "inherit",
                        cursor: "pointer",
                    }}
                >
                    Install
                </button>
                <button
                    type="button"
                    aria-label="Dismiss install prompt"
                    onClick={dismiss}
                    style={{
                        "min-height": "44px",
                        "min-width": "44px",
                        border: "1px solid var(--fw-border-strong)",
                        "border-radius": "var(--fw-radius)",
                        background: "transparent",
                        color: "var(--fw-text)",
                        font: "inherit",
                        cursor: "pointer",
                    }}
                >
                    ×
                </button>
            </div>
        </Show>
    );
}
