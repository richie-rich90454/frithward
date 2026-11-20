import { render } from "solid-js/web";
import "./styles.js";
import "./app.css";
import { initTheme } from "./theme.jsx";
import { ProofApp } from "./App.jsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");
initTheme();
render(() => <ProofApp />, root);
