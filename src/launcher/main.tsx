import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Launcher } from "./Launcher";
import "./launcher.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <Launcher />
  </StrictMode>,
);
