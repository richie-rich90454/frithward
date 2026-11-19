import { A } from "@solidjs/router";
import { For } from "solid-js";
import { useI18n } from "../../../../i18n/index.js";
import {
    BadgeCheck,
    Captions,
    Clapperboard,
    HeartHandshake,
    Home,
    Lock,
    ScanSearch,
} from "lucide-solid";

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

export function HomeView() {
    const { t } = useI18n();
    return (
        <section>
            <h1>
                <Home class="fw-icon" />
                {t("home.title")}
            </h1>
            <p>{t("home.intro")}</p>
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
