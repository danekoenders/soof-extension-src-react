import React, { useRef, useEffect, useState, useCallback } from "react";

interface Option {
  label: string;
  value?: string;
  function?: {
    name: string;
    params?: Record<string, any>;
  };
}

interface OptionsListProps {
  options: Option[];
  onOptionClick?: (value: string) => void;
  showOptions?: boolean;
  optionsLayout?: "default" | "horizontal-scroll" | "vertical";
}

function SoofTwinkleIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M2.47804 0.724976L3.03876 2.56896L4.95609 3.10822L3.03876 3.64749L2.47804 5.49147L1.91733 3.64749L0 3.10822L1.91733 2.56896L2.47804 0.724976Z"
        fill="url(#paint0_linear_2102_247)"
      />
      <path
        d="M7.37144 1.89856L8.64503 6.0869L13 7.31177L8.64503 8.53664L7.37144 12.725L6.09785 8.53664L1.74292 7.31177L6.09785 6.0869L7.37144 1.89856Z"
        fill="url(#paint1_linear_2102_247)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_2102_247"
          x1="2.47804"
          y1="0.724976"
          x2="2.47804"
          y2="5.49147"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF9C2B" />
          <stop offset="1" stopColor="#FFD04F" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_2102_247"
          x1="7.37144"
          y1="1.89856"
          x2="7.37144"
          y2="12.725"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF9C2B" />
          <stop offset="1" stopColor="#FFD04F" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const OptionsList: React.FC<OptionsListProps> = ({
  options,
  onOptionClick,
  showOptions = true,
  optionsLayout = "default",
}) => {
  if (!showOptions || !options || options.length === 0) return null;

  // Custom scrollbar logic for horizontal-scroll
  if (optionsLayout === "horizontal-scroll") {
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
    }, [updateScroll]);

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

    // Calculate thumb width and position
    const { scrollLeft, scrollWidth, clientWidth } = scrollState;
    const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10); // percent
    const thumbLeft = (scrollLeft / scrollWidth) * 100;

    return (
      <div className="relative pb-3 w-full min-w-0 box-border overflow-x-hidden">
        <div
          className="flex flex-row flex-nowrap overflow-x-auto gap-2 pb-0 w-full min-w-0 box-border pr-3.5 scrollbar-none cursor-grab"
          ref={scrollRef}
          style={{ overflowX: "auto" }}
        >
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onOptionClick?.(option.value || "")}
              className="flex-none min-w-[120px] h-9 px-3 py-2 flex items-center rounded border-0 bg-gray-600 text-white text-xs cursor-pointer"
            >
              <SoofTwinkleIcon style={{ marginRight: 4, verticalAlign: "middle" }} />
              {option.label}
            </button>
          ))}
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-sm mt-1 mb-0.5 relative overflow-hidden max-w-[calc(100%-14px)]">
          <div
            className="absolute top-0 left-0 h-full bg-gray-400 rounded-sm transition-all duration-100"
            style={{
              width: `${thumbWidth}%`,
              left: `${thumbLeft}%`,
            }}
          />
        </div>
      </div>
    );
  }
  
  // Handle vertical layout
  if (optionsLayout === "vertical") {
    return (
      <div className="flex flex-col gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => onOptionClick?.(option.value || "")}
            className="w-full min-w-[120px] justify-start text-left h-9 px-3 py-2 text-base rounded border-0 bg-gray-600 text-white cursor-pointer"
          >
            <SoofTwinkleIcon style={{ marginRight: 4, verticalAlign: "middle" }} />
            {option.label}
          </button>
        ))}
      </div>
    );
  }
  
  // Default layout
  return (
    <div className="flex flex-row flex-wrap justify-start gap-1.5">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onOptionClick?.(option.value || "")}
          className="w-fit h-6 px-2.5 py-1.5 rounded border-0 bg-gray-600 text-white text-xs cursor-pointer"
        >
          <SoofTwinkleIcon style={{ marginRight: 4, verticalAlign: "middle" }} />
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default OptionsList; 