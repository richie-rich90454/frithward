/** Reads a design-system token from the document so third-party widgets follow the active theme. */
export function readToken(name: string, fallback: string): string {
    if (typeof document === "undefined" || typeof getComputedStyle === "undefined") {
        return fallback;
    }
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value === "" ? fallback : value;
}
