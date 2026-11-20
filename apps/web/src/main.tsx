import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "./styles.js";
import { LocaleProvider } from "./i18n/index.js";
import { ThemeProvider } from "./theme/ThemeProvider.js";
import { CaseProvider } from "./cases/CaseProvider.js";
import { App } from "./App.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
const queryClient = new QueryClient();
render(
    () => (
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>
                <ThemeProvider>
                    <CaseProvider>
                        <App />
                    </CaseProvider>
                </ThemeProvider>
            </LocaleProvider>
        </QueryClientProvider>
    ),
    root,
);
