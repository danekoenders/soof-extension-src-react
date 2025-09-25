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

  // Build overlay and modal container using Tailwind classes
  const overlay = document.createElement('div');
  overlay.setAttribute('data-soof-overlay', '');
  overlay.className = 'fixed inset-0 bg-black/50 flex justify-center items-start pt-[10vh] z-[999999]';

  const modal = document.createElement('div');
  modal.className = 'w-full max-w-[640px] mx-4';

  // Utility: close overlay
  const closeOverlay = () => {
    const hostEl: any = (shadowRoot as any).host;
    if (hostEl && typeof hostEl.closeChatWindow === 'function') {
      hostEl.closeChatWindow();
    } else {
      overlay.remove();
    }
  };

  // Ensure mount point fills modal
  (existingMountPoint as HTMLElement).style.width = '100%';
  (existingMountPoint as HTMLElement).style.height = '100%';

  // Hide original container if present to avoid duplicate layout
  const orig = shadowRoot.querySelector('.soof-chat-window') as HTMLElement | null;
  if (orig) orig.style.display = 'none';

  modal.appendChild(existingMountPoint);
  overlay.appendChild(modal);
  
  // Close when clicking on the dimmed background (but not when clicking inside the modal)
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
