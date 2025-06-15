import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import indexCss from "./index.css?inline";
import componentsCss from "./components/styles.css?inline";

// Expose a global that your component can call once its window is in the DOM
(window as any).__soofMount = (shadowRoot: ShadowRoot) => {
  // remove any old style/mount
  shadowRoot.querySelector("style[data-soof]")?.remove();

  // Find existing mount point in the chat window (created by renderBase)
  const existingMountPoint = shadowRoot.getElementById("soof-chat-react-root");
  if (!existingMountPoint) {
    console.error(
      "Could not find soof-chat-react-root mount point in chat window"
    );
    return;
  }

  // Clear existing React content if any
  existingMountPoint.innerHTML = "";

  // inject CSS (both base styles and component styles)
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-soof", "");
  styleEl.textContent = indexCss + "\n" + componentsCss;
  shadowRoot.appendChild(styleEl);

  // mount React in the existing mount point
  createRoot(existingMountPoint).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};
