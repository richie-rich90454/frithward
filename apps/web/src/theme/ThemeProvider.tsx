import {
    createContext,
    createEffect,
    createMemo,
    createSignal,
    onCleanup,
    onMount,
    useContext,
    type Accessor,
    type ParentProps,
} from "solid-js";
import { Monitor, Moon, Sun } from "lucide-solid";
import { useI18n } from "../i18n/index.js";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "frithward.theme";
const PREFERENCES: readonly ThemePreference[] = ["system", "light", "dark"];
const NEXT: Record<ThemePreference, ThemePreference> = {
    system: "light",
    light: "dark",
    dark: "system",
};

export interface ThemeContextValue {
    preference: Accessor<ThemePreference>;
    setPreference: (value: ThemePreference) => void;
    resolved: Accessor<ResolvedTheme>;
}

export const ThemeContext = createContext<ThemeContextValue>();

function storedPreference(): ThemePreference {
    if (typeof localStorage === "undefined") return "system";
    const value = localStorage.getItem(STORAGE_KEY);
    return PREFERENCES.find((item) => item === value) ?? "system";
}

export function ThemeProvider(props: ParentProps) {
    const [preference, setStored] = createSignal<ThemePreference>(storedPreference());
    const [prefersDark, setPrefersDark] = createSignal(false);

    onMount(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const update = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
        setPrefersDark(media.matches);
        media.addEventListener("change", update);
        onCleanup(() => media.removeEventListener("change", update));
    });

    const resolved = createMemo<ResolvedTheme>(() => {
        const current = preference();
        return current === "system" ? (prefersDark() ? "dark" : "light") : current;
    });

    createEffect(() => {
        const root = document.documentElement;
        if (resolved() === "dark") root.dataset.theme = "dark";
        else delete root.dataset.theme;
    });

    const setPreference = (value: ThemePreference) => {
        setStored(value);
        if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, value);
    };

    return (
        <ThemeContext.Provider value={{ preference, setPreference, resolved }}>
            {props.children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
    return context;
}

export function ThemeToggle() {
    const { preference, setPreference } = useTheme();
    const { t } = useI18n();

    const label = (key: string, fallback: string): string => {
        const value = t(key);
        return typeof value === "string" && value !== "" && value !== key ? value : fallback;
    };
    const text = () => {
        switch (preference()) {
            case "light":
                return label("theme.light", "Light");
            case "dark":
                return label("theme.dark", "Dark");
            default:
                return label("theme.system", "System");
        }
    };
    const icon = () => {
        switch (preference()) {
            case "light":
                return <Sun class="fw-icon" />;
            case "dark":
                return <Moon class="fw-icon" />;
            default:
                return <Monitor class="fw-icon" />;
        }
    };

    return (
        <button
            type="button"
            class="theme-toggle fw-button fw-button-secondary"
            data-testid="theme-toggle"
            data-theme-value={preference()}
            aria-label={`${label("settings.theme", "Theme")}: ${text()}`}
            title={label("settings.theme", "Theme")}
            onClick={() => setPreference(NEXT[preference()])}
        >
            {icon()}
            <span>{text()}</span>
        </button>
    );
}
