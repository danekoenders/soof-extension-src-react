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
      el.addEventListener("scroll", updateScroll);
      window.addEventListener("resize", updateScroll);
      return () => {
        el.removeEventListener("scroll", updateScroll);
        window.removeEventListener("resize", updateScroll);
      };
    }, [updateScroll]);

    // Calculate thumb width and position
    const { scrollLeft, scrollWidth, clientWidth } = scrollState;
    const thumbWidth = Math.max((clientWidth / scrollWidth) * 100, 10); // percent
    const thumbLeft = (scrollLeft / scrollWidth) * 100;

    return (
      <div className="options-horizontal-scroll-container">
        <div
          className={`options options-${optionsLayout}`}
          ref={scrollRef}
          style={{ overflowX: "auto" }}
        >
          {options.map((option, index) => (
            <button
              key={index}
              onClick={() => onOptionClick?.(option.value || "")}
            >
              <SoofTwinkleIcon style={{ marginRight: 4, verticalAlign: "middle" }} />
              {option.label}
            </button>
          ))}
        </div>
        <div className="custom-scrollbar-bar">
          <div
            className="custom-scrollbar-thumb"
            style={{
              width: `${thumbWidth}%`,
              left: `${thumbLeft}%`,
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div className={`options options-${optionsLayout}`}>
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onOptionClick?.(option.value || "")}
        >
          <SoofTwinkleIcon style={{ marginRight: 4, verticalAlign: "middle" }} />
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default OptionsList; 