import { A } from "@solidjs/router";
import { Captions, Terminal, Wrench } from "lucide-solid";

export function DeveloperToolsView() {
    return (
        <section>
            <h1>
                <Wrench class="fw-icon" />
                Developer tools
            </h1>
            <p>Local-first packages and interfaces for building with Frithward.</p>
            <ul class="resource-list">
                <li>
                    <Captions class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/captions">Caption studio</A>
                        </h2>
                        <p>Generate and edit captions in the browser.</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>Core packages</h2>
                        <p>Media, security, privacy, and provenance logic runs locally.</p>
                    </div>
                </li>
            </ul>
        </section>
    );
}
