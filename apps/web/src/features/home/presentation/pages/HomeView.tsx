import { A, useNavigate } from "@solidjs/router";
import { For } from "solid-js";
import type { Case } from "@frithward/contracts";
import { useI18n } from "../../../../i18n/index.js";
import { useCases } from "../../../../cases/CaseProvider.js";
import { RecentCases } from "../../../../cases/RecentCases.js";
import {
    BadgeCheck,
    Captions,
    Clapperboard,
    HeartHandshake,
    Home,
    Lock,
    ScanSearch,
} from "lucide-solid";
import "../home.css";

const TASKS = [
    {
        href: "/check",
        titleKey: "home.task.checkMessage",
        descKey: "home.check.desc",
        icon: ScanSearch,
    },
    {
        href: "/protect",
        titleKey: "home.task.checkFile",
        descKey: "home.protect.desc",
        icon: Lock,
    },
    {
        href: "/respond",
        titleKey: "home.task.trackIncident",
        descKey: "home.respond.desc",
        icon: HeartHandshake,
    },
] as const;

const SHORTCUTS = [
    {
        href: "/tools/captions",
        labelKey: "home.captions.title",
        descKey: "home.captions.desc",
        icon: Captions,
    },
    {
        href: "/make",
        labelKey: "home.edit.title",
        descKey: "home.edit.desc",
        icon: Clapperboard,
    },
    {
        href: "/check",
        labelKey: "home.check.title",
        descKey: "home.check.desc",
        icon: ScanSearch,
    },
    {
        href: "/protect",
        labelKey: "home.protect.title",
        descKey: "home.protect.desc",
        icon: Lock,
    },
    {
        href: "/verify",
        labelKey: "home.verify.title",
        descKey: "home.verify.desc",
        icon: BadgeCheck,
    },
    {
        href: "/respond",
        labelKey: "home.respond.title",
        descKey: "home.respond.desc",
        icon: HeartHandshake,
    },
] as const;

function routeForCase(kind: Case["kind"]): string {
    switch (kind) {
        case "message":
        case "url":
        case "qr":
            return "/check";
        case "file":
            return "/protect";
        case "provenance":
            return "/verify";
        case "evidence":
            return "/respond";
    }
}

export function HomeView() {
    const { t } = useI18n();
    const { recent } = useCases();
    const navigate = useNavigate();
    return (
        <section>
            <h1>
                <Home class="fw-icon" />
                {t("home.title")}
            </h1>
            <p>{t("home.intro")}</p>
            <div class="home-start">
                <h2>{t("home.startHere")}</h2>
                <ul class="home-start__grid">
                    <For each={TASKS}>
                        {(task) => (
                            <li class="home-start__card">
                                <A href={task.href}>
                                    <task.icon class="fw-icon" />
                                    <span>
                                        <strong>{t(task.titleKey)}</strong>
                                        <span class="home-start__desc">{t(task.descKey)}</span>
                                    </span>
                                </A>
                            </li>
                        )}
                    </For>
                </ul>
            </div>
            <div class="home-recent">
                <h2>{t("cases.recent")}</h2>
                <RecentCases
                    cases={recent()}
                    onOpen={(record) => navigate(routeForCase(record.kind))}
                />
            </div>
            <ul class="shortcut-list">
                <For each={SHORTCUTS}>
                    {(shortcut) => (
                        <li>
                            <A href={shortcut.href}>
                                <shortcut.icon class="fw-icon" />
                                <span>
                                    <strong>{t(shortcut.labelKey)}</strong>
                                    {t(shortcut.descKey)}
                                </span>
                            </A>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}
