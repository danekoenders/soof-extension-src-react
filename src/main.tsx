import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import indexCss from "./index.css?inline";
import { isMobileViewport } from "./utils/mobile";

// Configuration interface for chatbot settings
export interface SoofConfig {
  type: 'widget' | 'embedded';
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
    const isMobile = isMobileViewport();
    
    // Build overlay using Tailwind classes for widget
    const overlay = document.createElement('div');
    overlay.setAttribute('data-laintern-agent-overlay', '');
    
    // Mobile: fullscreen overlay with safe areas, Desktop: centered with backdrop
    if (isMobile) {
      overlay.className = 'fixed inset-0 bg-white z-[999999] flex flex-col';
      // Apply safe area insets for iOS Safari (notch, home indicator, rounded corners, browser UI)
      // Use CSS custom properties for safe areas
      overlay.style.setProperty('padding-top', 'max(env(safe-area-inset-top, 0), 0px)');
      overlay.style.setProperty('padding-left', 'max(env(safe-area-inset-left, 0), 0px)');
      overlay.style.setProperty('padding-right', 'max(env(safe-area-inset-right, 0), 0px)');
      // Use actual window dimensions for Safari (accounts for browser UI like address bar)
      // This ensures the overlay doesn't extend beyond the visible viewport
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.width = '100%';
      overlay.style.borderRadius = '0';
      overlay.style.margin = '0';
      overlay.style.overflow = 'hidden';
      
      let viewportRaf = 0;
      let layoutViewportHeight = window.innerHeight;
      const setViewportVars = () => {
        const visualViewport = window.visualViewport;
        const height = visualViewport?.height ?? window.innerHeight;
        const width = visualViewport?.width ?? window.innerWidth;
        const offsetTop = visualViewport?.offsetTop ?? 0;
        const keyboardVisible =
          visualViewport &&
          visualViewport.height + visualViewport.offsetTop <
            window.innerHeight - 20;

        if (!keyboardVisible) {
          layoutViewportHeight = window.innerHeight;
        }

        const keyboardHeight = Math.max(
          0,
          layoutViewportHeight - height - offsetTop
        );

        const translateY = offsetTop - keyboardHeight;

        overlay.style.setProperty("--vv-layout-height", `${layoutViewportHeight}px`);
        overlay.style.setProperty("--vvh", `${height}px`);
        overlay.style.setProperty("--vvw", `${width}px`);
        overlay.style.setProperty("--vv-offset-top", `${offsetTop}px`);
        overlay.style.setProperty("--vv-keyboard-height", `${keyboardHeight}px`);
        overlay.style.setProperty("--vv-translate-y", `${translateY}px`);
      };

      const scheduleViewportUpdate = () => {
        if (viewportRaf) {
          cancelAnimationFrame(viewportRaf);
        }
        viewportRaf = requestAnimationFrame(() => {
          setViewportVars();
        });
      };

      setViewportVars();

      window.addEventListener("resize", scheduleViewportUpdate);
      window.addEventListener("orientationchange", scheduleViewportUpdate);

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", scheduleViewportUpdate);
        window.visualViewport.addEventListener("scroll", scheduleViewportUpdate);
      }
      
      const html = document.documentElement;
      const body = document.body;
      const originalHtmlOverflow = html.style.overflow;
      const originalBodyOverflow = body.style.overflow;
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";

      const restoreScrollLock = () => {
        html.style.overflow = originalHtmlOverflow;
        body.style.overflow = originalBodyOverflow;
      };

      (overlay as any).__restoreScrollLock = restoreScrollLock;

      const getScrollableContainer = (target: HTMLElement | null) => {
        if (!target) return null;
        return (
          target.closest("[data-scrollable]") ||
          target.closest(".overflow-auto") ||
          target.closest(".overflow-y-auto") ||
          target.closest('[style*="overflow"]')
        ) as HTMLElement | null;
      };

      let lastTouchY = 0;
      overlay.addEventListener(
        "touchstart",
        (event) => {
          lastTouchY = event.touches[0].clientY;
        },
        { passive: true }
      );

      overlay.addEventListener(
        "touchmove",
        (event) => {
          const target = event.target as HTMLElement;
          const scrollable = getScrollableContainer(target);
          const currentY = event.touches[0].clientY;
          const deltaY = currentY - lastTouchY;
          lastTouchY = currentY;

          if (!scrollable || scrollable === overlay) {
            event.preventDefault();
            return;
          }

          const atTop = scrollable.scrollTop <= 0;
          const atBottom =
            scrollable.scrollHeight - scrollable.scrollTop <=
            scrollable.clientHeight + 1;

          if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
            event.preventDefault();
          }
        },
        { passive: false }
      );

      overlay.addEventListener(
        "wheel",
        (event) => {
          const target = event.target as HTMLElement;
          const scrollable = getScrollableContainer(target);
          if (!scrollable || scrollable === overlay) {
            event.preventDefault();
            return;
          }

          const atTop = scrollable.scrollTop <= 0;
          const atBottom =
            scrollable.scrollHeight - scrollable.scrollTop <=
            scrollable.clientHeight + 1;

          if ((atTop && event.deltaY < 0) || (atBottom && event.deltaY > 0)) {
            event.preventDefault();
          }
        },
        { passive: false }
      );
      
    } else {
      overlay.className = 'fixed inset-0 bg-black/50 flex justify-center items-center z-[999999]';
    }

    // Utility: close overlay - store reference to host element
    (overlay as any).__hostElement = hostEl;
    const closeOverlay = () => {
      if ((overlay as any).__restoreScrollLock) {
        (overlay as any).__restoreScrollLock();
      }
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
      // Ensure mount point fills available height (accounts for safe areas and browser UI)
      existingMountPoint.style.height = '100%';
      existingMountPoint.style.overflow = 'hidden';
      existingMountPoint.style.display = 'flex';
      existingMountPoint.style.flexDirection = 'column';
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
    if ((overlay as any).__restoreScrollLock) {
      (existingMountPoint as any).__restoreScrollLock = (overlay as any).__restoreScrollLock;
    }
    
    // Handle window resize to update mobile state
    const handleResize = () => {
      const nowMobile = isMobileViewport();
      existingMountPoint.setAttribute('data-is-mobile', nowMobile.toString());
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
