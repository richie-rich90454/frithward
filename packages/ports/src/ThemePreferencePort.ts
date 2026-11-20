import type { ThemePreference } from "@frithward/contracts";

/** Persists the user's theme choice across sessions. */
export interface ThemePreferencePort {
    load(): Promise<ThemePreference | null>;
    save(preference: ThemePreference): Promise<void>;
}
