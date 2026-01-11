import { useCallback, useMemo } from "react";

/**
 * Hook to access Shopify analytics API from inside Shadow DOM.
 * 
 * The Shopify object is available on the window object and is accessible
 * from Shadow DOM since Shadow DOM doesn't isolate JavaScript scope.
 * 
 * @returns Object with publish function to emit custom events
 */
export function useShopifyAnalytics() {
  // Get Shopify object from window (available in Shopify storefront)
  const shopify = useMemo(() => {
    if (typeof window === "undefined") return null;
    
    // Access Shopify from the main window context
    // Since Shadow DOM doesn't isolate JavaScript, window.Shopify should be available
    const shopifyObj = (window as any).Shopify;
    
    if (!shopifyObj) {
      console.warn(
        "Shopify object not found on window. Analytics events will not be published."
      );
      return null;
    }
    
    if (!shopifyObj.analytics || typeof shopifyObj.analytics.publish !== "function") {
      console.warn(
        "Shopify.analytics.publish not available. Analytics events will not be published."
      );
      return null;
    }
    
    return shopifyObj;
  }, []);

  /**
   * Publish a custom event to Shopify analytics
   * 
   * @param eventName - Event name (should follow format: 'namespace:event_name')
   * @param eventData - Event payload data
   */
  const publish = useCallback(
    (eventName: string, eventData: any) => {
      if (!shopify) {
        // Silently fail if Shopify is not available (development or non-Shopify environment)
        return;
      }

      try {
        shopify.analytics.publish(eventName, eventData);
      } catch (error) {
        console.error("Failed to publish Shopify analytics event:", error);
      }
    },
    [shopify]
  );

  return {
    publish,
    isAvailable: shopify !== null,
  };
}
