import { A } from "@solidjs/router";
import {
    CloseButton,
    Content,
    Description,
    Overlay,
    Portal,
    Root,
    Title,
    Trigger,
} from "@kobalte/core/dialog";
import { Captions, Info, Terminal, Wrench } from "lucide-solid";

export function DeveloperToolsView() {
    return (
        <section>
            <h1>
                <Wrench class="fw-icon" />
                Developer tools
            </h1>
            <p>Local-first packages and interfaces for building with Frithward.</p>
            <Root>
                <Trigger class="button-secondary">
                    <Info class="fw-icon" /> About Frithward
                </Trigger>
                <Portal>
                    <Overlay class="dialog-overlay" />
                    <Content class="dialog-content">
                        <Title>About Frithward</Title>
                        <Description>Keep people safe. Keep media honest.</Description>
                        <p>
                            Frithward is an open-source toolkit for inspecting media, checking
                            provenance, and spotting scams. Processing runs on your device by
                            default: no account and no upload.
                        </p>
                        <p>
                            Results are evidence for a person to review, never a verdict. Every
                            claim shows its limitations, and unmeasured data is labelled as such.
                            The code is Apache-2.0 and the interface is available in eight
                            languages.
                        </p>
                        <p>
                            Cryptographic C2PA signature verification needs the native{" "}
                            <code>@contentauth/c2pa-node</code> SDK; without it, signature status is
                            reported as unverified rather than valid.
                        </p>
                        <CloseButton class="button-secondary">Close</CloseButton>
                    </Content>
                </Portal>
            </Root>
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
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/tree/main/packages">
                                Core packages
                            </a>
                        </h2>
                        <p>Media, security, privacy, and provenance logic runs locally.</p>
                    </div>
                </li>
                <li>
                    <Info class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/docs/compatibility.md">
                                Compatibility
                            </a>
                        </h2>
                        <p>Browser API minimums and local runtime requirements.</p>
                    </div>
                </li>
                <li>
                    <Info class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/docs/deployment.md">
                                Self-hosting and deployment
                            </a>
                        </h2>
                        <p>How to run Frithward on your own infrastructure.</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/packages/sdk/examples/typed.ts">
                                TypeScript SDK example
                            </a>
                        </h2>
                        <p>Typed client usage in TypeScript.</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/packages/sdk-python/examples/typed_example.py">
                                Python SDK example
                            </a>
                        </h2>
                        <p>Typed client usage in Python.</p>
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
