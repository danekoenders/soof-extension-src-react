import { useState, useRef, useEffect, useCallback } from "react";
import ProductCard from "./tools/ProductCard";
import type { ProductMeta } from "../types/product";

export interface ProductItem {
  id: string;
  productMeta: ProductMeta;
}

export interface SourceGroup {
  groupId: string;
  products: ProductItem[];
}

interface SourcesProps {
  messages: SourceGroup[];
  onNavigate?: (messageId: string) => void;
}

export default function Sources({ messages, onNavigate }: SourcesProps) {
  // Don't render if no sources - check BEFORE any hooks
  if (!messages || messages.length === 0) {
    return null;
  }

  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
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

  const currentGroup = messages[currentGroupIndex];
  const hasPreviousGroup = currentGroupIndex > 0;
  const hasNextGroup = currentGroupIndex < messages.length - 1;
  const hasMultipleGroups = messages.length > 1;
  const hasMultipleProducts = currentGroup.products.length > 1;

  const handlePreviousGroup = () => {
    if (hasPreviousGroup) {
      const newIndex = currentGroupIndex - 1;
      setCurrentGroupIndex(newIndex);
      const firstProduct = messages[newIndex].products[0];
      onNavigate?.(firstProduct.id);
    }
  };

  const handleNextGroup = () => {
    if (hasNextGroup) {
      const newIndex = currentGroupIndex + 1;
      setCurrentGroupIndex(newIndex);
      const firstProduct = messages[newIndex].products[0];
      onNavigate?.(firstProduct.id);
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
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
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
        el.style.cursor = 'grab';
        el.style.userSelect = '';
      }
    };

    // Prevent clicks on children if dragged
    const onClick = (e: MouseEvent) => {
      if (dragDistanceRef.current > 5) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUpOrLeave);
    el.addEventListener('mouseleave', onMouseUpOrLeave);
    el.addEventListener('click', onClick, true); // Use capture phase

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUpOrLeave);
      el.removeEventListener('mouseleave', onMouseUpOrLeave);
      el.removeEventListener('click', onClick, true);
    };
  }, []);

  // Calculate scrollbar thumb width and position
  const { scrollLeft, scrollWidth, clientWidth } = scrollState;
  const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10); // percent
  const thumbLeft = (scrollLeft / scrollWidth) * 100;
  const showScrollbar = hasMultipleProducts && scrollWidth > clientWidth;

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2">
        {/* Previous group button - only show if multiple groups */}
        {hasMultipleGroups && (
          <button
            onClick={handlePreviousGroup}
            disabled={!hasPreviousGroup}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              hasPreviousGroup
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            aria-label="Previous message"
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
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Product display area */}
        <div className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-1">
            {/* Counter showing group position */}
            {hasMultipleGroups && (
              <div className="text-xs text-gray-500 px-1">
                Message {currentGroupIndex + 1} of {messages.length}
                {hasMultipleProducts && ` · ${currentGroup.products.length} products`}
              </div>
            )}

            {/* Horizontal scrollable products container */}
            <div className="relative w-full min-w-0 box-border">
              <div
                ref={scrollRef}
                className="flex flex-row flex-nowrap overflow-x-auto gap-3 pb-0 w-full min-w-0 box-border scrollbar-none cursor-grab"
                style={{ overflowX: "auto" }}
              >
                {currentGroup.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex-none w-[85%] min-w-[280px]"
                    onClick={() => onNavigate?.(product.id)}
                  >
                    <ProductCard product={product.productMeta} />
                  </div>
                ))}
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

        {/* Next group button - only show if multiple groups */}
        {hasMultipleGroups && (
          <button
            onClick={handleNextGroup}
            disabled={!hasNextGroup}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              hasNextGroup
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            aria-label="Next message"
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
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

