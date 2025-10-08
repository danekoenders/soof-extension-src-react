import { useEffect, useState } from "react";

interface PhaseIndicatorProps {
  phase: string;
  message?: string;
}

export default function PhaseIndicator({
  phase,
  message,
}: PhaseIndicatorProps) {
  const [dots, setDots] = useState(".");

  // Animate dots for loading effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Get icon and label based on phase
  const getPhaseDisplay = () => {
    switch (phase) {
      case "thinking":
        return {
          icon: "🤔",
          label: "Thinking",
          color: "bg-blue-50 border-blue-200",
          dotColor: "bg-blue-500",
        };
      case "function":
        let toolLabel = message || "Calling function";
        return {
          icon: "🔍",
          label: toolLabel,
          color: "bg-purple-50 border-purple-200",
          dotColor: "bg-purple-500",
        };
      case "validating":
        return {
          icon: "✓",
          label: "Validating response",
          color: "bg-green-50 border-green-200",
          dotColor: "bg-green-500",
        };
      case "regenerating":
        return {
          icon: "🔄",
          label: "Regenerating response",
          color: "bg-amber-50 border-amber-200",
          dotColor: "bg-amber-500",
        };
      default:
        return {
          icon: "⏳",
          label: message || "Working",
          color: "bg-gray-50 border-gray-200",
          dotColor: "bg-gray-500",
        };
    }
  };

  const display = getPhaseDisplay();

  return (
    <div className="flex items-start w-full animate-slide-in-from-top">
      <div
        className={`px-4 py-2.5 rounded-[1px_20px_20px_20px] border ${display.color} flex items-center gap-2.5 max-w-[90%]`}
      >
        {/* Icon */}
        <span className="text-xl leading-none animate-pulse-gentle">
          {display.icon}
        </span>

        {/* Text label */}
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700">
            {display.label}
          </span>
          {/* Animated dots */}
          <span className="text-sm font-medium text-gray-500 w-4 inline-block">
            {dots}
          </span>
        </div>

        {/* Pulsing dots indicator */}
        <div className="flex items-center gap-1 ml-1">
          <span
            className={`inline-block w-1.5 h-1.5 ${display.dotColor} rounded-full animate-pulse`}
            style={{ animationDelay: "0ms" }}
          ></span>
          <span
            className={`inline-block w-1.5 h-1.5 ${display.dotColor} rounded-full animate-pulse`}
            style={{ animationDelay: "150ms" }}
          ></span>
          <span
            className={`inline-block w-1.5 h-1.5 ${display.dotColor} rounded-full animate-pulse`}
            style={{ animationDelay: "300ms" }}
          ></span>
        </div>
      </div>
    </div>
  );
}
