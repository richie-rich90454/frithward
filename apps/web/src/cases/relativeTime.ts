type RelativeKey = "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo" | "unknownTime";

interface RelativeDescriptor {
    key: RelativeKey;
    n?: number;
    date?: string;
}

function describe(iso: string, now: number): RelativeDescriptor {
    const timestamp = new Date(iso).getTime();
    if (!Number.isFinite(timestamp)) return { key: "unknownTime" };
    const elapsed = Math.max(0, now - timestamp);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return { key: "justNow" };
    if (minutes < 60) return { key: "minutesAgo", n: minutes };
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return { key: "hoursAgo", n: hours };
    const days = Math.floor(hours / 24);
    if (days < 7) return { key: "daysAgo", n: days };
    return { key: "daysAgo", date: new Date(timestamp).toLocaleDateString() };
}

const ENGLISH: Record<RelativeKey, string> = {
    justNow: "just now",
    minutesAgo: "{n} min ago",
    hoursAgo: "{n} h ago",
    daysAgo: "{n} d ago",
    unknownTime: "unknown time",
};

export function relativeTime(iso: string, now: number = Date.now()): string {
    const d = describe(iso, now);
    if (d.date) return d.date;
    return ENGLISH[d.key].replace("{n}", String(d.n));
}

export function relativeTimeLocalized(
    iso: string,
    t: (key: string) => string,
    now: number = Date.now(),
): string {
    const d = describe(iso, now);
    if (d.date) return d.date;
    return t(`cases.${d.key}`).replace("{n}", String(d.n));
}
