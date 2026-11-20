import { For } from "solid-js";
import type { Case } from "@frithward/contracts";
import { useI18n } from "../i18n/index.js";
import { relativeTimeLocalized } from "./relativeTime.js";

export interface RecentCasesProps {
    cases: readonly Case[];
    onOpen: (caseRecord: Case) => void;
}

export function RecentCases(props: RecentCasesProps) {
    const { t } = useI18n();
    return (
        <section class="recent-cases" aria-label={t("cases.recent")}>
            {props.cases.length === 0 ? (
                <p class="recent-cases__empty">{t("cases.empty")}</p>
            ) : (
                <ul class="recent-cases__list">
                    <For each={props.cases}>
                        {(record) => (
                            <li class="recent-cases__item">
                                <button
                                    type="button"
                                    class="recent-cases__open"
                                    style={{ "min-height": "44px", "min-width": "44px" }}
                                    onClick={() => props.onOpen(record)}
                                >
                                    <span class="recent-cases__title">{record.title}</span>
                                    <span class="recent-cases__meta">
                                        {record.kind.charAt(0).toUpperCase() + record.kind.slice(1)}{" "}
                                        ·{" "}
                                        <time datetime={record.updatedAt}>
                                            {relativeTimeLocalized(record.updatedAt, t)}
                                        </time>
                                    </span>
                                </button>
                            </li>
                        )}
                    </For>
                </ul>
            )}
        </section>
    );
}
