import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import "./styles.js";
import "./app.css";
import { initTheme } from "./theme.jsx";
import { DesktopApp } from "./App.jsx";
import { LocaleProvider } from "./i18n/index.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
initTheme();
render(
    () => (
        <LocaleProvider>
            <Router>
                <Route path="/*" component={DesktopApp} />
            </Router>
        </LocaleProvider>
    ),
    root,
);
