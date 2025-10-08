import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import indexCss from "./index.css?inline";

// Expose a global that your component can call once its window is in the DOM
(window as any).__soofMount = (shadowRoot: ShadowRoot) => {
  // remove any old style/mount
  shadowRoot.querySelector("style[data-soof]")?.remove();
  shadowRoot.querySelector('[data-soof-overlay]')?.remove();

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
  styleEl.textContent = indexCss;
  shadowRoot.appendChild(styleEl);

  // Build overlay using Tailwind classes
  const overlay = document.createElement('div');
  overlay.setAttribute('data-soof-overlay', '');
  overlay.className = 'fixed inset-0 bg-black/50 flex justify-center items-start pt-[10vh] z-[999999]';

  // Utility: close overlay
  const closeOverlay = () => {
    const hostEl: any = (shadowRoot as any).host;
    if (hostEl && typeof hostEl.closeChatWindow === 'function') {
      hostEl.closeChatWindow();
    } else {
      overlay.remove();
    }
  };

  // Style the mount point directly
  existingMountPoint.className = 'w-full max-w-[640px] mx-4 animate-slide-in-chat';

  overlay.appendChild(existingMountPoint);
  
  // Close when clicking on the dimmed background (but not when clicking inside the chat)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  
  shadowRoot.appendChild(overlay);

  // mount React in the existing mount point
  createRoot(existingMountPoint).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};
