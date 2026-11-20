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
    Wrench,
} from "lucide-solid";
import { HomeView } from "../../web/src/features/home/presentation/pages/HomeView.js";
import { MediaWorkshopPage } from "../../web/src/features/media/presentation/pages/MediaWorkshopView.js";
import { ShareCheckPage } from "../../web/src/features/protect/presentation/pages/ShareCheckView.js";
import { ScamCheckPage } from "../../web/src/features/check/presentation/pages/ScamCheckView.js";
import { ProvenanceCheckPage } from "../../web/src/features/verify/presentation/pages/ProvenanceCheckView.js";
import { IncidentTimelinePage } from "../../web/src/features/respond/presentation/pages/IncidentTimelineView.js";
import { LearnView } from "../../web/src/features/learn/presentation/pages/LearnView.js";
import { CommunityView } from "../../web/src/features/community/presentation/pages/CommunityView.js";
import { DeveloperToolsView } from "../../web/src/features/developer-tools/presentation/pages/DeveloperToolsView.js";
import { CaptionStudioPage } from "../../web/src/features/captions/presentation/pages/CaptionStudioView.js";
import { DocumentWorkshopPage } from "../../web/src/features/documents/presentation/DocumentWorkshopView.js";
import { DiagramPage } from "../../web/src/features/diagrams/presentation/DiagramView.js";
import { ChartsPage } from "../../web/src/features/charts/presentation/ChartsView.js";
import { RuntimePage } from "../../web/src/features/runtime/presentation/pages/RuntimeView.js";
import { ModelManagerPage } from "../../web/src/features/models/presentation/pages/ModelManagerView.js";
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
    { path: "/tools", key: "page.tools.title", icon: Wrench },
] as const;

function pageFor(pathname: string): JSX.Element {
    switch (pathname) {
        case "/":
            return <HomeView />;
        case "/make":
            return <MediaWorkshopPage />;
        case "/protect":
            return <ShareCheckPage />;
        case "/check":
            return <ScamCheckPage />;
        case "/verify":
            return <ProvenanceCheckPage />;
        case "/respond":
            return <IncidentTimelinePage />;
        case "/learn":
            return <LearnView />;
        case "/community":
            return <CommunityView />;
        case "/tools":
            return <DeveloperToolsView />;
        case "/tools/captions":
            return <CaptionStudioPage />;
        case "/tools/documents":
            return <DocumentWorkshopPage />;
        case "/tools/diagrams":
            return <DiagramPage />;
        case "/tools/charts":
            return <ChartsPage />;
        case "/tools/runtime":
            return <RuntimePage />;
        case "/tools/models":
            return <ModelManagerPage />;
        default:
            return <HomeView />;
    }
}

export function DesktopApp() {
    const location = useLocation();
    const { t } = useI18n();
    return (
        <div class="fw-shell app-shell">
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
            <main>{pageFor(location.pathname)}</main>
        </div>
    );
}
