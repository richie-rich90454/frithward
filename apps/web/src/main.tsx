import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import "./styles.js";
import { LocaleProvider } from "./i18n/index.js";
import { ThemeProvider } from "./theme/ThemeProvider.js";
import { CaseProvider } from "./cases/CaseProvider.js";
import { App } from "./App.jsx";
import { applyRuntimeBase } from "./offline/base.js";
import { registerOfflineSupport } from "./offline/register.js";
import { InstallPrompt, registerInstallPrompt } from "./pwa/install.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

// The router reads the base while rendering. Establish the document base and
// service worker scope first so both use the same deployment path.
const runtimeBase = applyRuntimeBase();
registerOfflineSupport(runtimeBase);

const queryClient = new QueryClient();
registerInstallPrompt();

render(
    () => (
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>
                <ThemeProvider>
                    <CaseProvider>
                        <App />
                        <InstallPrompt />
                    </CaseProvider>
                </ThemeProvider>
            </LocaleProvider>
        </QueryClientProvider>
    ),
    root,
);
