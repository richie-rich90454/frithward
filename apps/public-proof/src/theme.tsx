import { createSignal, type JSX } from "solid-js";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "frithward.theme";
const NEXT: Record<ThemePreference, ThemePreference> = {
    system: "light",
    light: "dark",
    dark: "system",
};

const media = window.matchMedia("(prefers-color-scheme: dark)");

function readPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    } catch {
        return "system";
    }
}

const [preference, setPreference] = createSignal<ThemePreference>(readPreference());

function apply(pref: ThemePreference): void {
    const dark = pref === "dark" || (pref === "system" && media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function initTheme(): void {
    apply(preference());
    media.addEventListener("change", () => {
        if (preference() === "system") apply("system");
    });
}

export function ThemeToggle(): JSX.Element {
    return (
        <button
            type="button"
            class="fw-theme-toggle"
            data-testid="theme-toggle"
            data-theme-value={preference()}
            aria-label={`Theme: ${preference()}`}
            title={`Theme: ${preference()}`}
            onClick={() => {
                const next = NEXT[preference()];
                setPreference(next);
                apply(next);
                try {
                    localStorage.setItem(STORAGE_KEY, next);
                } catch {
                    // Storage can be blocked; the in-memory preference still applies.
                }
            }}
        >
            {preference()}
        </button>
    );
}
