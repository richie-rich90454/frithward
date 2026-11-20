import { render } from "solid-js/web";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { RouterContext } from "@solidjs/router";
import "./styles.js";
import { LocaleProvider } from "./i18n/index.js";
import { ThemeProvider } from "./theme/ThemeProvider.js";
import { CaseProvider } from "./cases/CaseProvider.js";
import { App } from "./App.jsx";
import { CommandPalette } from "./palette/CommandPalette.js";
import { InstallPrompt, registerInstallPrompt } from "./pwa/install.js";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
const queryClient = new QueryClient();
registerInstallPrompt();

// App owns the real Router; bridge palette navigation to it via a popstate event.
const paletteRouter = {
    navigatorFactory: () => (path: string) => {
        window.history.pushState(null, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
    },
} as never;

render(
    () => (
        <QueryClientProvider client={queryClient}>
            <LocaleProvider>
                <ThemeProvider>
                    <CaseProvider>
                        <App />
                        <RouterContext.Provider value={paletteRouter}>
                            <CommandPalette />
                        </RouterContext.Provider>
                        <InstallPrompt />
                    </CaseProvider>
                </ThemeProvider>
            </LocaleProvider>
        </QueryClientProvider>
    ),
    root,
);
