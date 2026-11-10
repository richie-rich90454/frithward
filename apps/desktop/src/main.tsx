import { Route, Router } from "@solidjs/router";
import { render } from "solid-js/web";
import { DesktopApp } from "./App.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
render(
    () => (
        <Router>
            <Route path="/*" component={DesktopApp} />
        </Router>
    ),
    root,
);
