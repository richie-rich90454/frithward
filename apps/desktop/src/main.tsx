import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import "./styles.js";
import "./app.css";
import "../../web/src/app.css";
import { initTheme } from "./theme.jsx";
import { DesktopApp } from "./App.jsx";
import { LocaleProvider } from "./i18n/index.jsx";
import { LocaleProvider as WebLocaleProvider } from "../../web/src/i18n/index.js";
import { CaseProvider } from "../../web/src/cases/CaseProvider.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
initTheme();
render(
    () => (
        <LocaleProvider>
            <WebLocaleProvider>
                <CaseProvider>
                    <Router>
                        <Route path="/*" component={DesktopApp} />
                    </Router>
                </CaseProvider>
            </WebLocaleProvider>
        </LocaleProvider>
    ),
    root,
);
