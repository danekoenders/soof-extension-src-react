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

  // Get the host element for close functionality
  const hostEl: any = (shadowRoot as any).host;

  // For widget type, we need to remove any existing window container and create our overlay
  // The mount point might be inside a .soof-chat-window or .laintern-agent-window div
  if (config.type === 'widget') {
    // Find any existing window container (soof-chat-window or laintern-agent-window)
    const existingWindow = shadowRoot.querySelector('.soof-chat-window') || 
                           shadowRoot.querySelector('.laintern-agent-window');
    if (existingWindow) {
      // If the mount point is inside the window container, move it out first
      if (existingMountPoint.parentElement === existingWindow) {
        // Move mount point to shadow root before removing window
        shadowRoot.insertBefore(existingMountPoint, existingWindow);
      }
      // Remove the old window container (it has fixed positioning that conflicts with our overlay)
      existingWindow.remove();
    }
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
    // Detect mobile screen - check both width and user agent
    const checkMobile = () => {
      return window.innerWidth <= 768 || 
             /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    const isMobile = checkMobile();
    
    // Build overlay using Tailwind classes for widget
    const overlay = document.createElement('div');
    overlay.setAttribute('data-laintern-agent-overlay', '');
    
    // Mobile: fullscreen overlay with safe areas, Desktop: centered with backdrop
    if (isMobile) {
      overlay.className = 'fixed inset-0 bg-white z-[999999] flex flex-col';
      // Apply safe area insets for iOS Safari (notch, home indicator, rounded corners)
      // Use CSS custom properties for safe areas
      overlay.style.setProperty('padding-top', 'max(env(safe-area-inset-top, 0), 0px)');
      overlay.style.setProperty('padding-bottom', 'max(env(safe-area-inset-bottom, 0), 0px)');
      overlay.style.setProperty('padding-left', 'max(env(safe-area-inset-left, 0), 0px)');
      overlay.style.setProperty('padding-right', 'max(env(safe-area-inset-right, 0), 0px)');
      // Ensure full viewport coverage
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.maxWidth = '100vw';
      overlay.style.maxHeight = '100vh';
      overlay.style.borderRadius = '0';
      overlay.style.margin = '0';
    } else {
      overlay.className = 'fixed inset-0 bg-black/50 flex justify-center items-center z-[999999]';
    }

    // Utility: close overlay - store reference to host element
    (overlay as any).__hostElement = hostEl;
    const closeOverlay = () => {
      if (hostEl && typeof hostEl.closeChatWindow === 'function') {
        hostEl.closeChatWindow();
      } else {
        overlay.remove();
      }
    };

    // Style the mount point - mobile: fullscreen, desktop: centered modal
    if (isMobile) {
      existingMountPoint.className = 'w-full h-full flex flex-col';
      existingMountPoint.style.borderRadius = '0';
      existingMountPoint.style.maxWidth = '100%';
      existingMountPoint.style.maxHeight = '100%';
    } else {
      existingMountPoint.className = 'w-full h-[73vh] max-w-[640px] animate-slide-in-chat rounded-2xl';
    }

    overlay.appendChild(existingMountPoint);
    
    // Close when clicking on the dimmed background (desktop only)
    if (!isMobile) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeOverlay();
      });
    }
    
    shadowRoot.appendChild(overlay);
    
    // Pass mobile state and host element reference to App component via data attribute
    existingMountPoint.setAttribute('data-is-mobile', isMobile.toString());
    if (hostEl) {
      (existingMountPoint as any).__hostElement = hostEl;
    }
    
    // Handle window resize to update mobile state
    const handleResize = () => {
      const wasMobile = isMobile;
      const nowMobile = checkMobile();
      if (wasMobile !== nowMobile) {
        // Re-mount if mobile state changed significantly
        // For now, just update the data attribute
        existingMountPoint.setAttribute('data-is-mobile', nowMobile.toString());
      }
    };
    window.addEventListener('resize', handleResize);
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

  // Expose a function to close the chat that React can call
  // Store it on the mount point so React can access it
  if (hostEl && typeof hostEl.closeChatWindow === 'function') {
    (existingMountPoint as any).__closeChat = () => {
      hostEl.closeChatWindow();
    };
  }

  // mount React in the existing mount point
  createRoot(existingMountPoint).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>
  );
};
