import { A, Route, Router, useLocation } from "@solidjs/router";
import { For, Show, type JSX } from "solid-js";
import {
    BadgeCheck,
    Clapperboard,
    GraduationCap,
    Home,
    LifeBuoy,
    ShieldAlert,
    ShieldCheck,
    Users,
    Wrench,
} from "lucide-solid";
import "./app.css";
import { HomeView } from "./features/home/presentation/pages/HomeView";
import { MediaWorkshopPage } from "./features/media/presentation/pages/MediaWorkshopView";
import { ShareCheckPage } from "./features/protect/presentation/pages/ShareCheckView";
import { ScamCheckPage } from "./features/check/presentation/pages/ScamCheckView";
import { ProvenanceCheckPage } from "./features/verify/presentation/pages/ProvenanceCheckView";
import { IncidentTimelinePage } from "./features/respond/presentation/pages/IncidentTimelineView";
import { LearnView } from "./features/learn/presentation/pages/LearnView";
import { CommunityView } from "./features/community/presentation/pages/CommunityView";
import { DeveloperToolsView } from "./features/developer-tools/presentation/pages/DeveloperToolsView";
import { CaptionStudioPage } from "./features/captions/presentation/pages/CaptionStudioView";
import { DocumentWorkshopPage } from "./features/documents/presentation/DocumentWorkshopView";
import { DiagramPage } from "./features/diagrams/presentation/DiagramView";
import { ChartsPage } from "./features/charts/presentation/ChartsView";
import { RuntimePage } from "./features/runtime/presentation/pages/RuntimeView";
import { ModelManagerPage } from "./features/models/presentation/pages/ModelManagerView";
import { LanguageSwitcher, useI18n } from "./i18n/index.js";
import { ThemeToggle } from "./theme/ThemeProvider.js";
import { CommandPalette } from "./palette/CommandPalette.js";
import { getRouterBase } from "./offline/base.js";

const ROUTER_BASE = getRouterBase();

const NAVIGATION = [
    { path: "/", labelKey: "nav.home", icon: Home },
    { path: "/make", labelKey: "nav.make", icon: Clapperboard },
    { path: "/protect", labelKey: "nav.protect", icon: ShieldCheck },
    { path: "/check", labelKey: "nav.check", icon: ShieldAlert },
    { path: "/verify", labelKey: "nav.verify", icon: BadgeCheck },
    { path: "/respond", labelKey: "nav.respond", icon: LifeBuoy },
    { path: "/learn", labelKey: "nav.learn", icon: GraduationCap },
    { path: "/community", labelKey: "nav.community", icon: Users },
    { path: "/tools", labelKey: "nav.tools", icon: Wrench },
] as const;

function pageFor(pathname: string): JSX.Element {
    if (pathname === "/") return <HomeView />;
    if (pathname === "/make") return <MediaWorkshopPage />;
    if (pathname === "/protect") return <ShareCheckPage />;
    if (pathname === "/check") return <ScamCheckPage />;
    if (pathname === "/verify") return <ProvenanceCheckPage />;
    if (pathname === "/respond") return <IncidentTimelinePage />;
    if (pathname === "/learn") return <LearnView />;
    if (pathname === "/community") return <CommunityView />;
    if (pathname === "/tools") return <DeveloperToolsView />;
    if (pathname === "/tools/captions") return <CaptionStudioPage />;
    if (pathname === "/tools/documents") return <DocumentWorkshopPage />;
    if (pathname === "/tools/diagrams") return <DiagramPage />;
    if (pathname === "/tools/charts") return <ChartsPage />;
    if (pathname === "/tools/runtime") return <RuntimePage />;
    if (pathname === "/tools/models") return <ModelManagerPage />;
    return <HomeView />;
}

function Shell() {
    const location = useLocation();
    const { t } = useI18n();
    const routePath = () => {
        const pathname = location.pathname;
        if (ROUTER_BASE && pathname.toLowerCase().startsWith(ROUTER_BASE.toLowerCase())) {
            return pathname.slice(ROUTER_BASE.length) || "/";
        }
        return pathname;
    };
    return (
        <div class="app-shell">
            <header>
                <div>
                    <p>
                        <strong>{t("wordmark")}</strong>
                    </p>
                    <p>{t("tagline")}</p>
                </div>
                <LanguageSwitcher />
                <ThemeToggle />
                <nav aria-label={t("nav.primary")}>
                    <For each={NAVIGATION}>
                        {(item) => (
                            <A href={item.path} end={item.path === "/"} activeClass="is-active">
                                <item.icon class="fw-icon" />
                                {t(item.labelKey)}
                            </A>
                        )}
                    </For>
                </nav>
            </header>
            <main>
                <Show when={routePath()} keyed={false}>
                    {pageFor(routePath())}
                </Show>
            </main>
            <CommandPalette />
        </div>
    );
}

export function App() {
    return (
        <Router base={ROUTER_BASE}>
            <Route path="/*" component={Shell} />
        </Router>
    );
}
