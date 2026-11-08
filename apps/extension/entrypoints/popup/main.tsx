import { render } from "solid-js/web";

function Popup() {
    return (
        <main>
            <h1>Frithward</h1>
            <p>Keep people safe. Keep media honest.</p>
        </main>
    );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
render(() => <Popup />, root);
