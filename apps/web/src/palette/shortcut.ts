export interface ShortcutEvent {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
}

/** True for Ctrl+K (Windows/Linux) and Cmd+K (macOS). */
export function isCommandShortcut(event: ShortcutEvent): boolean {
    return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
}
