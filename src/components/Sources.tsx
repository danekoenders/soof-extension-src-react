import { useState, useRef, useEffect, useCallback } from "react";
import ProductCard from "./tools/ProductCard";
import CheckoutCard from "./tools/CheckoutCard";
import type { ProductMeta } from "../types/product";

export interface ProductItem {
  id: string;
  productMeta: ProductMeta;
}

export interface CheckoutData {
  checkout_url: string;
  total_quantity: number;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

export interface SourceGroup {
  groupId: string;
  products?: ProductItem[];
  checkout?: CheckoutData;
  type?: string; // e.g. "products", "orders", "cart", "checkout"
}

// Frontend-defined labels for each type
const TYPE_LABELS: Record<string, string> = {
  products: "Producten",
  checkout: "Afrekenen",
  // Future types can be added here
};

interface SourcesProps {
  messages: SourceGroup[];
  onNavigate?: (messageId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export default function Sources({ messages, onNavigate, isCollapsed: externalIsCollapsed, onToggleCollapse }: SourcesProps) {
  // Don't render if no sources - check BEFORE any hooks
  if (!messages || messages.length === 0) {
    return null;
  }

  // Start at the last group (most recent)
  const [currentGroupIndex, setCurrentGroupIndex] = useState(() =>
    Math.max(0, messages.length - 1)
  );
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);
  
  // Use external collapsed state if provided, otherwise use internal
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  const setIsCollapsed = onToggleCollapse || setInternalIsCollapsed;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    scrollLeft: 0,
    scrollWidth: 1,
    clientWidth: 1,
  });
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragDistanceRef = useRef(0);
  const previousMessageCountRef = useRef(messages.length);
  const hasInitiallyScrolledRef = useRef(false);

  // Auto-navigate to the latest group when new messages are added or on initial load
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;

    // If messages were added (not removed), navigate to the last group
    if (currentCount > previousCount) {
      const newIndex = currentCount - 1;
      setCurrentGroupIndex(newIndex);
      // Scroll to the first product in the new group
      const lastGroup = messages[newIndex];
      if (lastGroup?.products?.[0]?.id) {
        onNavigate?.(lastGroup.products[0].id);
      }
    }
    // If current index is out of bounds, reset to last valid index
    else if (currentGroupIndex >= currentCount) {
      setCurrentGroupIndex(Math.max(0, currentCount - 1));
    }

    previousMessageCountRef.current = currentCount;
  }, [messages, currentGroupIndex, onNavigate]);

  // On initial mount, scroll to the current (last) group's first product
  useEffect(() => {
    if (
      !hasInitiallyScrolledRef.current &&
      messages[currentGroupIndex]?.products?.[0]?.id
    ) {
      hasInitiallyScrolledRef.current = true;
      // Small delay to ensure the Messages component has rendered
      setTimeout(() => {
        const initialGroup = messages[currentGroupIndex];
        if (initialGroup?.products?.[0]?.id) {
          onNavigate?.(initialGroup.products[0].id);
        }
      }, 100);
    }
  }, [messages, currentGroupIndex, onNavigate]);

  const currentGroup = messages[currentGroupIndex];
  const hasPreviousGroup = currentGroupIndex > 0;
  const hasNextGroup = currentGroupIndex < messages.length - 1;
  const hasMultipleGroups = messages.length > 1;
  const totalItems = (currentGroup.products?.length || 0) + (currentGroup.checkout ? 1 : 0);
  const hasMultipleItems = totalItems > 1;

  const handlePreviousGroup = () => {
    if (hasPreviousGroup) {
      const newIndex = currentGroupIndex - 1;
      setCurrentGroupIndex(newIndex);
      const firstProduct = messages[newIndex].products?.[0];
      if (firstProduct) {
        onNavigate?.(firstProduct.id);
      }
    }
  };

  const handleNextGroup = () => {
    if (hasNextGroup) {
      const newIndex = currentGroupIndex + 1;
      setCurrentGroupIndex(newIndex);
      const firstProduct = messages[newIndex].products?.[0];
      if (firstProduct) {
        onNavigate?.(firstProduct.id);
      }
    }
  };

  // Scroll tracking for scrollbar indicator
  const updateScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollState({
      scrollLeft: el.scrollLeft,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [updateScroll, currentGroupIndex]);

  // Drag to scroll functionality
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      startXRef.current = e.pageX - el.offsetLeft;
      scrollLeftRef.current = el.scrollLeft;
      dragDistanceRef.current = 0;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startXRef.current) * 2;
      el.scrollLeft = scrollLeftRef.current - walk;
      dragDistanceRef.current += Math.abs(walk);
    };

    const onMouseUpOrLeave = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        el.style.cursor = "grab";
        el.style.userSelect = "";
      }
    };

    // Prevent clicks on children if dragged
    const onClick = (e: MouseEvent) => {
      if (dragDistanceRef.current > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mousemove", onMouseMove);
    el.addEventListener("mouseup", onMouseUpOrLeave);
    el.addEventListener("mouseleave", onMouseUpOrLeave);
    el.addEventListener("click", onClick, true); // Use capture phase

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mousemove", onMouseMove);
      el.removeEventListener("mouseup", onMouseUpOrLeave);
      el.removeEventListener("mouseleave", onMouseUpOrLeave);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  // Calculate scrollbar thumb width and position
  const { scrollLeft, scrollWidth, clientWidth } = scrollState;
  const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10); // percent
  const thumbLeft = (scrollLeft / scrollWidth) * 100;
  const showScrollbar = hasMultipleItems && scrollWidth > clientWidth;

  return (
    <div className="mx-4 pb-2 animate-slide-in-up">
      {/* Collapsible header with navigation */}
      <div className="pt-2 border-t border-gray-200 ">
        <div className="flex items-center justify-between w-full">
          {/* Left side: Navigation and message indicator */}
          <div className="flex items-center gap-2">
            {hasMultipleGroups && (
              <>
                <button
                  onClick={handlePreviousGroup}
                  disabled={!hasPreviousGroup}
                  className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-all ${
                    hasPreviousGroup
                      ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                  aria-label="Previous products"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {currentGroupIndex + 1}/{messages.length}
                </span>
                <button
                  onClick={handleNextGroup}
                  disabled={!hasNextGroup}
                  className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-all ${
                    hasNextGroup
                      ? "text-gray-700 hover:bg-gray-100 cursor-pointer"
                      : "text-gray-300 cursor-not-allowed"
                  }`}
                  aria-label="Next products"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Label display - derived from type or default "Bronnen" */}
            <span className="text-xs text-gray-500 ml-2">
              {currentGroup.type ? TYPE_LABELS[currentGroup.type] || "Bronnen" : "Bronnen"}
            </span>
          </div>

          {/* Right side: Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center justify-end text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label={isCollapsed ? "Expand products" : "Collapse products"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${
                isCollapsed ? "" : "rotate-90"
              }`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
        }`}
      >
        {/* Content display area - horizontal scrollable carousel */}
        <div className="pt-2 flex-1 overflow-hidden">
          <div className="flex flex-col gap-1">
            {/* Horizontal scrollable container for products and checkout */}
            <div className="relative w-full min-w-0 box-border">
              <div
                ref={scrollRef}
                className={`flex flex-row gap-3 pb-0 w-full min-w-0 box-border ${
                  (currentGroup.products?.length || 0) + (currentGroup.checkout ? 1 : 0) <= 3
                    ? "justify-start"
                    : "flex-nowrap overflow-x-auto scrollbar-none cursor-grab"
                }`}
                style={
                  (currentGroup.products?.length || 0) + (currentGroup.checkout ? 1 : 0) > 3
                    ? { overflowX: "auto" }
                    : undefined
                }
              >
                {/* Render products */}
                {currentGroup.products?.map((product) => {
                  // Dynamic width based on total items (products + checkout)
                  let widthClass = "";
                  const totalCount = (currentGroup.products?.length || 0) + (currentGroup.checkout ? 1 : 0);

                  if (totalCount === 1) {
                    widthClass = "w-full max-w-[400px]";
                  } else if (totalCount === 2) {
                    widthClass = "w-[calc(50%-6px)]";
                  } else {
                    // For 3+ items, use ~45% width to show a peek of the next card
                    widthClass = "flex-none w-[45%] min-w-[240px]";
                  }

                  return (
                    <div
                      key={product.id}
                      className={widthClass}
                      onClick={() => onNavigate?.(product.id)}
                    >
                      <ProductCard product={product.productMeta} />
                    </div>
                  );
                })}
                
                {/* Render checkout card in the carousel */}
                {currentGroup.checkout && (
                  <div
                    key={`checkout-${currentGroup.groupId}`}
                    className={(() => {
                      const totalCount = (currentGroup.products?.length || 0) + 1;
                      if (totalCount === 1) {
                        return "w-full max-w-[400px]";
                      } else if (totalCount === 2) {
                        return "w-[calc(50%-6px)]";
                      } else {
                        // For 3+ items, use ~45% width to show a peek of the next card
                        return "flex-none w-[45%] min-w-[240px]";
                      }
                    })()}
                  >
                    <CheckoutCard checkout={currentGroup.checkout} />
                  </div>
                )}
              </div>

              {/* Scrollbar indicator */}
              {showScrollbar && (
                <div className="w-full h-1.5 bg-gray-200 rounded-sm mt-2 mb-0 relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gray-400 rounded-sm transition-all duration-100"
                    style={{
                      width: `${thumbWidth}%`,
                      left: `${thumbLeft}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
