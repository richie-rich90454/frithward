import { For, Show, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useI18n } from "../../../i18n/index.js";
import {
    addToWatchlist,
    loadWatchlist,
    removeFromWatchlist,
    saveWatchlist,
    type WatchEntry,
} from "../infrastructure/WatchlistStore.js";
import "./watchlist.css";

export function Watchlist() {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [entries, setEntries] = createSignal<WatchEntry[]>(loadWatchlist());
    const [label, setLabel] = createSignal("");
    const [kind, setKind] = createSignal<WatchEntry["kind"]>("domain");
    const [message, setMessage] = createSignal("");

    const displayDate = (value: string | undefined) => {
        if (!value) return t("watchlist.unchecked");
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    };

    const add = (event: SubmitEvent) => {
        event.preventDefault();
        const value = label().trim();
        if (!value) {
            setMessage(t("watchlist.invalid"));
            return;
        }
        const entry: WatchEntry = {
            id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            label: value,
            kind: kind(),
            createdAt: new Date().toISOString(),
        };
        setEntries(addToWatchlist(entry));
        setLabel("");
        setMessage(t("watchlist.added"));
    };

    const recheck = (entry: WatchEntry) => {
        const next = entries().map((item) =>
            item.id === entry.id ? { ...item, lastCheckedAt: new Date().toISOString() } : item,
        );
        setEntries(next);
        saveWatchlist(next);
        navigate(`/check#text=${encodeURIComponent(entry.label)}`);
    };

    const remove = (id: string) => {
        setEntries(removeFromWatchlist(id));
    };

    return (
        <section class="fw-watchlist">
            <h2>{t("watchlist.title")}</h2>
            <form onSubmit={add}>
                <label>
                    {t("watchlist.label")}
                    <input
                        value={label()}
                        onInput={(event) => setLabel(event.currentTarget.value)}
                    />
                </label>
                <label>
                    {t("watchlist.kind")}
                    <select
                        value={kind()}
                        onChange={(event) =>
                            setKind(event.currentTarget.value as WatchEntry["kind"])
                        }
                    >
                        <option value="domain">{t("watchlist.domain")}</option>
                        <option value="sender">{t("watchlist.sender")}</option>
                    </select>
                </label>
                <button type="submit">{t("watchlist.add")}</button>
            </form>
            <Show when={message()}>
                <p role="status">{message()}</p>
            </Show>
            <Show when={entries().length > 0} fallback={<p>{t("watchlist.empty")}</p>}>
                <ul role="list">
                    <For each={entries()}>
                        {(entry) => (
                            <li>
                                <strong>{entry.label}</strong>{" "}
                                <span>
                                    {t(
                                        entry.kind === "domain"
                                            ? "watchlist.domain"
                                            : "watchlist.sender",
                                    )}
                                </span>
                                <p>
                                    {t("watchlist.lastChecked")} {displayDate(entry.lastCheckedAt)}
                                </p>
                                <p role="note">{t("watchlist.nudge")}</p>
                                <div class="fw-watchlist-actions">
                                    <button
                                        type="button"
                                        aria-label={`${t("watchlist.recheck")}: ${entry.label}`}
                                        onClick={() => recheck(entry)}
                                    >
                                        {t("watchlist.recheck")}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`${t("watchlist.delete")}: ${entry.label}`}
                                        onClick={() => remove(entry.id)}
                                    >
                                        {t("watchlist.delete")}
                                    </button>
                                </div>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </section>
    );
}
