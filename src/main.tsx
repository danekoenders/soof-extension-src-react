import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import indexCss from "./index.css?inline";

// Configuration interface for chatbot settings
export interface SoofConfig {
  type: 'widget' | 'embedded';
  agentName: string;
  language?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showWelcomeMessage?: boolean;
  height?: string;
  width?: string;
}

// Expose a global that your component can call once its window is in the DOM
(window as any).__lainternAgentMount = (shadowRoot: ShadowRoot, config: SoofConfig) => {

  // Find existing mount point in the chat window (created by renderBase)
  const existingMountPoint = shadowRoot.getElementById("laintern-agent-react-root");
  if (!existingMountPoint) {
    console.error(
      "Could not find laintern-agent-react-root mount point in chat window"
    );
    return;
  }

  // Clear existing React content if any
  existingMountPoint.innerHTML = "";

  // inject CSS (both base styles and component styles)
  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-laintern-agent", "");
  styleEl.textContent = indexCss;
  shadowRoot.appendChild(styleEl);

  // Different rendering for widget vs embedded
  if (config.type === 'widget') {
    // Build overlay using Tailwind classes for widget
    const overlay = document.createElement('div');
    overlay.setAttribute('data-laintern-agent-overlay', '');
    overlay.className = 'fixed inset-0 bg-black/50 flex justify-center items-center z-[999999]';

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
    existingMountPoint.className = 'w-full h-[73vh] max-w-[640px] animate-slide-in-chat rounded-2xl';

    overlay.appendChild(existingMountPoint);
    
    // Close when clicking on the dimmed background (but not when clicking inside the chat)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });
    
    shadowRoot.appendChild(overlay);
  } else if (config.type === 'embedded') {
    // Embedded: no overlay, mount directly
    existingMountPoint.className = 'w-full h-full max-w-[640px]';
    // Mount point is already in shadow DOM from renderBase()
  } else {
    console.error('Invalid configuration type');
    return;
  }

  // Initialize __directMessageToAgent as a placeholder that will queue messages
  // until the React app mounts and replaces it
  const messageQueue: string[] = [];
  (window as any).__lainternAgentMessageQueue = messageQueue;
  
  (window as any).__directMessageToAgent = (message: string) => {
    messageQueue.push(message);
  };

  // mount React in the existing mount point
  createRoot(existingMountPoint).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>
  );
};
