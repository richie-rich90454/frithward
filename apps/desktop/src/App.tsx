import { A, useLocation } from "@solidjs/router";
import { For, type JSX } from "solid-js";
import {
    BadgeCheck,
    Clapperboard,
    GraduationCap,
    Home,
    LifeBuoy,
    ShieldAlert,
    ShieldCheck,
    Users,
} from "lucide-solid";
import { LanguageSwitcher, useI18n } from "./i18n/index.jsx";
import { ThemeToggle } from "./theme.jsx";

const NAVIGATION = [
    { path: "/", key: "nav.home", icon: Home },
    { path: "/make", key: "nav.make", icon: Clapperboard },
    { path: "/protect", key: "nav.protect", icon: ShieldCheck },
    { path: "/check", key: "nav.check", icon: ShieldAlert },
    { path: "/verify", key: "nav.verify", icon: BadgeCheck },
    { path: "/respond", key: "nav.respond", icon: LifeBuoy },
    { path: "/learn", key: "nav.learn", icon: GraduationCap },
    { path: "/community", key: "nav.community", icon: Users },
] as const;

interface PageContent {
    title: string;
    what: string;
    local: string;
    limitations: readonly string[];
}

const PAGES: Readonly<Record<string, PageContent>> = {
    "/": {
        title: "page.home.title",
        what: "page.home.what",
        local: "page.home.local",
        limitations: ["page.home.limitation.1", "page.home.limitation.2"],
    },
    "/make": {
        title: "page.make.title",
        what: "page.make.what",
        local: "page.make.local",
        limitations: ["page.make.limitation.1", "page.make.limitation.2"],
    },
    "/protect": {
        title: "page.protect.title",
        what: "page.protect.what",
        local: "page.protect.local",
        limitations: ["page.protect.limitation.1", "page.protect.limitation.2"],
    },
    "/check": {
        title: "page.check.title",
        what: "page.check.what",
        local: "page.check.local",
        limitations: ["page.check.limitation.1", "page.check.limitation.2"],
    },
    "/verify": {
        title: "page.verify.title",
        what: "page.verify.what",
        local: "page.verify.local",
        limitations: ["page.verify.limitation.1", "page.verify.limitation.2"],
    },
    "/respond": {
        title: "page.respond.title",
        what: "page.respond.what",
        local: "page.respond.local",
        limitations: ["page.respond.limitation.1", "page.respond.limitation.2"],
    },
    "/learn": {
        title: "page.learn.title",
        what: "page.learn.what",
        local: "page.learn.local",
        limitations: ["page.learn.limitation.1", "page.learn.limitation.2"],
    },
    "/community": {
        title: "page.community.title",
        what: "page.community.what",
        local: "page.community.local",
        limitations: ["page.community.limitation.1", "page.community.limitation.2"],
    },
    "/tools": {
        title: "page.tools.title",
        what: "page.tools.what",
        local: "page.tools.local",
        limitations: ["page.tools.limitation.1", "page.tools.limitation.2"],
    },
    "/tools/captions": {
        title: "page.captions.title",
        what: "page.captions.what",
        local: "page.captions.local",
        limitations: ["page.captions.limitation.1", "page.captions.limitation.2"],
    },
};

function pageFor(pathname: string, t: (key: string) => string): JSX.Element {
    const page = PAGES[pathname] ?? PAGES["/"];
    if (!page) return <section />;
    return (
        <section>
            <h1>{t(page.title)}</h1>
            <h2>{t("section.what")}</h2>
            <p>{t(page.what)}</p>
            <h2>{t("section.processing")}</h2>
            <p>{t(page.local)}</p>
            <h2>{t("section.limitations")}</h2>
            <ul>
                <For each={page.limitations}>{(limit) => <li>{t(limit)}</li>}</For>
            </ul>
        </section>
    );
}

export function DesktopApp() {
    const location = useLocation();
    const { t } = useI18n();
    return (
        <div class="fw-shell">
            <header>
                <div>
                    <p>
                        <strong>{t("wordmark")}</strong>
                    </p>
                    <p>{t("tagline")}</p>
                </div>
                <nav aria-label={t("nav.primary")}>
                    <For each={NAVIGATION}>
                        {(item) => (
                            <A href={item.path} end={item.path === "/"} activeClass="is-active">
                                <item.icon class="fw-icon" />
                                {t(item.key)}
                            </A>
                        )}
                    </For>
                </nav>
                <LanguageSwitcher />
                <ThemeToggle />
            </header>
            <main>{pageFor(location.pathname, t)}</main>
        </div>
    );
}
