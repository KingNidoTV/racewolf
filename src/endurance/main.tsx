import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { EnduranceApp } from "./ui/EnduranceApp";
import "./endurance.css";

document.body.classList.add("endurance-standalone");

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <EnduranceApp />
    </ErrorBoundary>
  </StrictMode>,
);
