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
import { useI18n } from "../../../../i18n/index.js";

export function DeveloperToolsView() {
    const { t } = useI18n();
    return (
        <section>
            <h1>
                <Wrench class="fw-icon" />
                {t("tools.title")}
            </h1>
            <p>{t("tools.intro")}</p>
            <Root>
                <Trigger class="fw-button fw-button-secondary">
                    <Info class="fw-icon" /> {t("tools.about")}
                </Trigger>
                <Portal>
                    <Overlay class="fw-dialog-overlay" />
                    <Content class="fw-dialog">
                        <Title>{t("tools.about")}</Title>
                        <Description>{t("tools.dialogDescription")}</Description>
                        <p>{t("tools.aboutP1")}</p>
                        <p>{t("tools.aboutP2")}</p>
                        <p>{t("tools.aboutP3")}</p>
                        <CloseButton class="fw-button fw-button-secondary">
                            {t("tools.close")}
                        </CloseButton>
                    </Content>
                </Portal>
            </Root>
            <ul class="resource-list">
                <li>
                    <Captions class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/captions">{t("tools.captionStudio")}</A>
                        </h2>
                        <p>{t("tools.captionStudioDesc")}</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/tree/main/packages">
                                {t("tools.corePackages")}
                            </a>
                        </h2>
                        <p>{t("tools.corePackagesDesc")}</p>
                    </div>
                </li>
                <li>
                    <Info class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/docs/compatibility.md">
                                {t("tools.compatibility")}
                            </a>
                        </h2>
                        <p>{t("tools.compatibilityDesc")}</p>
                    </div>
                </li>
                <li>
                    <Info class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/docs/deployment.md">
                                {t("tools.selfHosting")}
                            </a>
                        </h2>
                        <p>{t("tools.selfHostingDesc")}</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/packages/sdk/examples/typed.ts">
                                {t("tools.tsSdk")}
                            </a>
                        </h2>
                        <p>{t("tools.tsSdkDesc")}</p>
                    </div>
                </li>
                <li>
                    <Terminal class="fw-icon" />
                    <div>
                        <h2>
                            <a href="https://github.com/richie-rich90454/frithward/blob/main/packages/sdk-python/examples/typed_example.py">
                                {t("tools.pythonSdk")}
                            </a>
                        </h2>
                        <p>{t("tools.pythonSdkDesc")}</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/documents">{t("tools.documentWorkshop")}</A>
                        </h2>
                        <p>{t("tools.documentWorkshopDesc")}</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/diagrams">{t("tools.diagramWorkshop")}</A>
                        </h2>
                        <p>{t("tools.diagramWorkshopDesc")}</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/charts">{t("tools.charts")}</A>
                        </h2>
                        <p>{t("tools.chartsDesc")}</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/runtime">{t("tools.browserRuntime")}</A>
                        </h2>
                        <p>{t("tools.browserRuntimeDesc")}</p>
                    </div>
                </li>
                <li>
                    <Wrench class="fw-icon" />
                    <div>
                        <h2>
                            <A href="/tools/models">{t("tools.modelManager")}</A>
                        </h2>
                        <p>{t("tools.modelManagerDesc")}</p>
                    </div>
                </li>
            </ul>
        </section>
    );
}
