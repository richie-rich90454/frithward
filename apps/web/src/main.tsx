import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "./styles.js";
import { LocaleProvider } from "./i18n/index.js";
import { App } from "./App.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
const queryClient = new QueryClient();
render(
    () => (
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>
                <App />
            </LocaleProvider>
        </QueryClientProvider>
    ),
    root,
);
