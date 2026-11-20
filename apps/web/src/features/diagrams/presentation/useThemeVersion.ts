import { createSignal, onCleanup, onMount } from "solid-js";

/** Watches the theme attribute applied by ThemeProvider; returns a cleanup function. */
export function observeTheme(onChange: () => void): () => void {
    if (typeof MutationObserver === "undefined") return () => {};
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
}

/** A counter that changes whenever the resolved theme changes, for token-aware re-rendering. */
export function useThemeVersion(): () => number {
    const [version, setVersion] = createSignal(0);
    onMount(() => {
        onCleanup(
            observeTheme(() => {
                setVersion((value) => value + 1);
            }),
        );
    });
    return version;
}
