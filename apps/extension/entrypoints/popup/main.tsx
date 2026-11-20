import { Show, createSignal, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { PopupController } from "./PopupController";
import type { PageInfo } from "./PopupController";
import { initTheme, ThemeToggle } from "./theme.jsx";
import "./popup.css";

interface PopupViewProps {
    info: PageInfo | null;
    busy: boolean;
    onCheck: () => void;
}

function PopupView(props: PopupViewProps) {
    return (
        <main class="popup">
            <div class="popup__header">
                <h1>Frithward</h1>
                <ThemeToggle />
            </div>
            <p>Keep people safe. Keep media honest.</p>
            <button type="button" onClick={() => props.onCheck()} disabled={props.busy}>
                {props.busy ? "Checking…" : "Check this page"}
            </button>
            <Show when={props.info} keyed>
                {(info) => (
                    <Show when={info.error === null} fallback={<p role="alert">{info.error}</p>}>
                        <h2>Page details</h2>
                        <p>
                            URL: <code>{info.url || "not available"}</code>
                        </p>
                        <p>Page text read locally: {info.textLength} characters.</p>
                    </Show>
                )}
            </Show>
            <p>
                This extension reads the page URL and text in your browser. It does not run an
                analysis yet and does not upload anything.
            </p>
        </main>
    );
}

export function Popup() {
    const controller = new PopupController();
    const [info, setInfo] = createSignal(controller.getInfo());
    const [busy, setBusy] = createSignal(controller.isBusy());
    onCleanup(
        controller.subscribe(() => {
            setInfo(controller.getInfo());
            setBusy(controller.isBusy());
        }),
    );
    return <PopupView info={info()} busy={busy()} onCheck={() => void controller.checkPage()} />;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
initTheme();
render(() => <Popup />, root);
