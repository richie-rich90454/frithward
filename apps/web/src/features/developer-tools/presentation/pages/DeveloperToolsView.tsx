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
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/documents">Document workshop</A>
                        </h2>
                        <p>Generate and read DOCX, PDF, XLSX, and PPTX files locally.</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/diagrams">Diagram workshop</A>
                        </h2>
                        <p>Render Mermaid diagrams with accessible text.</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/charts">Charts</A>
                        </h2>
                        <p>Plot real data with honest scales and labeled axes.</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/runtime">Browser runtime</A>
                        </h2>
                        <p>Check OPFS, WebCodecs, and WebGPU support and run local operations.</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/models">Model manager</A>
                        </h2>
                        <p>Inspect installed models, licenses, stages, and limitations.</p>
                    </div>
                </li>
            </ul>
        </section>
    );
}
