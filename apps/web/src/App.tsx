import { A, Route } from "@solidjs/router";
import { For } from "solid-js";
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

export function App() {
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
                <Route path="/" component={HomeView} />
                <Route path="/make" component={MediaWorkshopPage} />
                <Route path="/protect" component={ShareCheckPage} />
                <Route path="/check" component={ScamCheckPage} />
                <Route path="/verify" component={ProvenanceCheckPage} />
                <Route path="/respond" component={IncidentTimelinePage} />
                <Route path="/learn" component={LearnView} />
                <Route path="/community" component={CommunityView} />
                <Route path="/tools" component={DeveloperToolsView} />
                <Route path="/tools/captions" component={CaptionStudioPage} />
            </main>
        </div>
    );
}
