export function relativeTime(iso: string, now: number = Date.now()): string {
    const timestamp = new Date(iso).getTime();
    if (!Number.isFinite(timestamp)) return "unknown time";
    const elapsed = Math.max(0, now - timestamp);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} d ago`;
    return new Date(timestamp).toLocaleDateString();
}
