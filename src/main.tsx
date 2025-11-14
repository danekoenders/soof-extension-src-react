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
      // Apply safe area insets for iOS Safari (notch, home indicator, rounded corners, browser UI)
      // Use CSS custom properties for safe areas
      overlay.style.setProperty('padding-top', 'max(env(safe-area-inset-top, 0), 0px)');
      overlay.style.setProperty('padding-bottom', 'max(env(safe-area-inset-bottom, 0), 0px)');
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
      
      // Store initial viewport height (when keyboard is not visible)
      let initialViewportHeight: number = window.innerHeight;
      if (window.visualViewport) {
        initialViewportHeight = window.visualViewport.height;
      }
      
      // Track if input is focused (keyboard is visible)
      let isInputFocused = false;
      const checkInputFocus = () => {
        // Check if any input in the overlay is focused
        const activeElement = shadowRoot.activeElement || document.activeElement;
        const isInput = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        );
        isInputFocused = !!(isInput && overlay.contains(activeElement as Node));
      };
      
      // Use Visual Viewport API for Safari (most accurate for browser UI)
      // This accounts for the browser UI (address bar, search bar) dynamically
      // The overlay should fill the visible viewport, starting from the top of the screen
      const updateOverlayDimensions = () => {
        // Check if input is currently focused
        checkInputFocus();
        
        // Get the actual visible viewport height (excludes browser UI)
        // Use Visual Viewport API if available (best for Safari iOS)
        let currentViewportHeight: number;
        
        if (window.visualViewport) {
          // Visual Viewport API gives the actual visible area (excludes browser UI)
          // This is the height of the area the user can actually see
          currentViewportHeight = window.visualViewport.height;
          
          // Update initial height if keyboard is not visible and viewport is larger
          // (browser UI might have hidden)
          if (!isInputFocused && currentViewportHeight > initialViewportHeight) {
            initialViewportHeight = currentViewportHeight;
          }
        } else {
          // Fallback: use window.innerHeight (excludes browser UI on most browsers)
          currentViewportHeight = window.innerHeight;
          if (!isInputFocused && currentViewportHeight > initialViewportHeight) {
            initialViewportHeight = currentViewportHeight;
          }
        }
        
        // When keyboard is visible, maintain the initial height to prevent jumping
        // When keyboard is hidden, use the current viewport height
        const targetHeight = isInputFocused ? initialViewportHeight : currentViewportHeight;
        
        // Ensure we have a valid height
        const visibleHeight = targetHeight > 0 ? targetHeight : window.innerHeight || document.documentElement.clientHeight;
        
        // Set overlay to fill viewport exactly
        // When keyboard is visible, maintain full height to prevent jumping
        overlay.style.setProperty('height', `${visibleHeight}px`, 'important');
        overlay.style.setProperty('max-height', `${visibleHeight}px`, 'important');
        overlay.style.setProperty('min-height', `${visibleHeight}px`, 'important');
        
        // Always position at top: 0 (start from top of screen)
        // Don't adjust position when keyboard appears - maintain stable position
        overlay.style.setProperty('top', '0', 'important');
        overlay.style.setProperty('left', '0', 'important');
        overlay.style.setProperty('right', '0', 'important');
        overlay.style.setProperty('bottom', 'auto', 'important');
        
        // When keyboard is visible, prevent overlay from shrinking
        // The content inside can scroll, but overlay maintains full height
        if (isInputFocused) {
          overlay.style.setProperty('position', 'fixed', 'important');
          overlay.style.setProperty('transform', 'none', 'important');
        }
      };
      
      // Initial setup
      updateOverlayDimensions();
      
      // Track input focus changes to detect keyboard
      shadowRoot.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
          // Input focused - keyboard will appear
          // Delay update to allow keyboard animation
          setTimeout(() => {
            updateOverlayDimensions();
          }, 100);
        }
      }, true);
      
      shadowRoot.addEventListener('focusout', (e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true') {
          // Input blurred - keyboard will hide
          // Delay update to allow keyboard animation
          setTimeout(() => {
            updateOverlayDimensions();
          }, 300);
        }
      }, true);
      
      // Update on resize/orientation change for Safari (address bar can show/hide)
      const handleViewportChange = () => {
        // Use requestAnimationFrame to ensure viewport has updated
        requestAnimationFrame(updateOverlayDimensions);
      };
      
      // Listen for viewport changes
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('orientationchange', () => {
        // Reset initial height on orientation change
        initialViewportHeight = window.innerHeight;
        if (window.visualViewport) {
          initialViewportHeight = window.visualViewport.height;
        }
        // Longer delay for orientation change to ensure viewport has updated
        setTimeout(() => {
          requestAnimationFrame(updateOverlayDimensions);
        }, 150);
      });
      
      // Use Visual Viewport API for Safari (most accurate for browser UI changes)
      // This fires when the browser UI shows/hides (address bar, etc.)
      if (window.visualViewport) {
        const handleVisualViewportChange = () => {
          // Only update if input is not focused (keyboard is not visible)
          // When keyboard is visible, we maintain the initial height
          if (!isInputFocused) {
            requestAnimationFrame(updateOverlayDimensions);
          }
        };
        
        window.visualViewport.addEventListener('resize', handleVisualViewportChange);
        // Note: We don't adjust position on scroll - we want overlay fixed to top
      }
      
      // Prevent body scroll when overlay is open (Safari issue)
      // Note: The overlay's overflow: hidden should prevent scrolling,
      // but we also prevent touchmove on non-scrollable areas
      overlay.addEventListener('touchmove', (e) => {
        // Allow scrolling within scrollable containers inside the overlay
        const target = e.target as HTMLElement;
        const scrollable = target.closest('[data-scrollable]') || 
                          target.closest('.overflow-auto') ||
                          target.closest('.overflow-y-auto') ||
                          target.closest('[style*="overflow"]');
        // Only prevent default if not scrolling within a scrollable container
        if (!scrollable || scrollable === overlay) {
          // Check if we're at the scroll boundaries
          const element = scrollable || overlay;
          if (element.scrollTop === 0 && e.touches[0].clientY > (e.touches[0].clientY - 10)) {
            e.preventDefault();
          } else if (element.scrollHeight <= element.clientHeight) {
            e.preventDefault();
          }
        }
      }, { passive: false });
      
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
