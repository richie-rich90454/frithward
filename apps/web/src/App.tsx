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

const NAVIGATION = [
    { path: "/", label: "Home", icon: Home },
    { path: "/make", label: "Make", icon: Clapperboard },
    { path: "/protect", label: "Protect", icon: ShieldCheck },
    { path: "/check", label: "Check", icon: ShieldAlert },
    { path: "/verify", label: "Verify", icon: BadgeCheck },
    { path: "/respond", label: "Respond", icon: LifeBuoy },
    { path: "/learn", label: "Learn", icon: GraduationCap },
    { path: "/community", label: "Community", icon: Users },
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
    return <HomeView />;
}

function Shell() {
    const location = useLocation();
    return (
        <div class="app-shell">
            <header>
                <div>
                    <p>
                        <strong>Frithward</strong>
                    </p>
                    <p>Keep people safe. Keep media honest.</p>
                </div>
                <nav aria-label="Primary">
                    <For each={NAVIGATION}>
                        {(item) => (
                            <A
                                href={item.path}
                                end={item.path === "/"}
                                activeClass="is-active"
                            >
                                <item.icon class="fw-icon" />
                                {item.label}
                            </A>
                        )}
                    </For>
                </nav>
            </header>
            <main>
                <Show when={location.pathname} keyed={false}>
                    {pageFor(location.pathname)}
                </Show>
            </main>
        </div>
    );
}

export function App() {
    return (
        <Router>
            <Route path="/*" component={Shell} />
        </Router>
    );
}
