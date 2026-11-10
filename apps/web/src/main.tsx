import { render } from "solid-js/web";
import "./styles.js";
import { App } from "./App.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
render(() => <App />, root);
