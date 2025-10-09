import { useState, useEffect, useMemo, useRef } from "react";
import type { ProductMeta } from "../../types/product";
import OptionsList from "./OptionsList";
import { marked } from "marked";
import DOMPurify from "dompurify";
import ClaimsCheckBadge from "../guardrails/ClaimsCheckBadge";
import type { GuardrailData } from "../../types/guardrail";

// Configure marked for better streaming behavior
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
  silent: true, // Don't throw on parse errors (important for incomplete markdown)
});

interface Option {
  label: string;
  value?: string;
  function?: {
    name: string;
    params?: Record<string, any>;
  };
}

interface BotMessageProps {
  text: string;
  loading?: boolean;
  options?: Option[];
  onOptionClick?: (value: string) => void;
  isError?: boolean;
  type?: "normal" | "orderTracking" | "product";
  order?: {
    orderNumber: string;
    financialStatus: string;
    orderStatusUrl: string;
  };
  productMeta?: ProductMeta;
  optionsLayout?: "default" | "horizontal-scroll" | "vertical";
  guardrailData?: GuardrailData;
}

export default function BotMessage({
  text,
  loading = false,
  options,
  onOptionClick,
  isError = false,
  type = "normal",
  order,
  // productMeta is no longer rendered here - shown in Sources component instead
  optionsLayout = "default",
  guardrailData,
}: BotMessageProps) {
  const [showOptions, setShowOptions] = useState(true);
  const [displayText, setDisplayText] = useState(text);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [fixedDimensions, setFixedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  
  const messageRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (value: string) => {
    onOptionClick?.(value);
    setShowOptions(false);
  };

  // Handle smooth transition when guardrail regeneration occurs
  useEffect(() => {
    const wasRegenerating = isRegenerating;
    const nowRegenerating = guardrailData?.validationPhase === "regenerating";

    // Detect when regeneration starts
    if (!wasRegenerating && nowRegenerating) {
      // Store the original text
      setOriginalText(displayText);
      
      // Capture current dimensions before regeneration
      if (messageRef.current) {
        const rect = messageRef.current.getBoundingClientRect();
        setFixedDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
      setIsRegenerating(true);
    }

    // Detect when regeneration completes
    if (wasRegenerating && !nowRegenerating) {
      // Smoothly transition out of regeneration mode
      setTimeout(() => {
        setIsRegenerating(false);
        setFixedDimensions(null);
        setOriginalText(null);
      }, 100);
    }

    // Always update display text - the CSS will handle the animation
    setDisplayText(text);
  }, [text, guardrailData, isRegenerating]);

  // Parse and sanitize markdown in real-time (memoized for performance)
  // This runs on EVERY displayText change, which means every streaming delta
  const formattedHtml = useMemo(() => {
    if (!displayText || !displayText.trim()) return null;

    try {
      // marked.parse handles incomplete markdown gracefully (e.g., **bold tex -> renders as literal until closing **)
      const html = marked.parse(displayText);
      return DOMPurify.sanitize(html as string);
    } catch (error) {
      // Fallback to plain text if parsing fails
      console.error("Markdown parsing error:", error);
      return DOMPurify.sanitize(displayText);
    }
  }, [displayText]);

  // Parse original text for the background layer during regeneration
  const originalFormattedHtml = useMemo(() => {
    if (!originalText || !originalText.trim()) return null;

    try {
      const html = marked.parse(originalText);
      return DOMPurify.sanitize(html as string);
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return DOMPurify.sanitize(originalText);
    }
  }, [originalText]);

  const formatText = (html: string | null) => {
    if (!html) return null;

    return (
      <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:underline prose-ul:list-disc prose-li:marker:text-gray-400 prose-img:rounded-md prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  };

  // Render order tracking card
  if (type === "orderTracking" && order) {
    return (
      <div className="flex flex-col items-start w-full gap-1.5">
        <div className="px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border border-gray-200 bg-blue-50 max-w-[90%] text-black flex items-center justify-between">
          <div>
            <h4 className="text-lg font-medium m-0">
              Order #{order.orderNumber}
            </h4>
            <p className="text-base m-0">Status: {order.financialStatus}</p>
          </div>
          <a
            href={order.orderStatusUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xl ml-4"
          >
            👁️
          </a>
        </div>
        <OptionsList
          options={options || []}
          onOptionClick={onOptionClick}
          showOptions={true}
          optionsLayout={optionsLayout}
        />
      </div>
    );
  }

  // Render standard message bubble, potentially with a product card inside
  return (
    <div className="flex flex-col items-start w-full gap-1.5">
      <div className="flex flex-col gap-2.5 max-w-[calc(100%+14px)]">
        {/* Render formatted markdown content (both during streaming and after) */}
        {formattedHtml && (
          <div
            ref={messageRef}
            className={`flex flex-col w-fit rounded-[1px_20px_20px_20px] max-w-[90%] text-black relative ${
              isRegenerating ? "overflow-hidden" : ""
            } ${
              isError ? "border-red-400 bg-red-50" : "border-gray-200"
            } ${isRegenerating ? "regenerating-text" : ""} ${guardrailData ? "justify-between" : ""}`}
            style={
              fixedDimensions
                ? {
                    width: `${fixedDimensions.width}px`,
                    height: `${fixedDimensions.height}px`,
                    minHeight: `${fixedDimensions.height}px`,
                  }
                : undefined
            }
          >
            {/* Show original text as background layer during regeneration */}
            {isRegenerating && originalFormattedHtml && (
              <div className="absolute inset-0 pointer-events-none original-text-layer">
                {formatText(originalFormattedHtml)}
              </div>
            )}
            
            {/* Content wrapper - grows to push badge down */}
            <div className="flex-1 flex flex-col">
              {/* New text layer (replaces original during regeneration) */}
              <div className={isRegenerating ? "relative z-10 bg-white/95 new-text-layer" : ""}>
                {formatText(formattedHtml)}
              </div>
            </div>

            {/* Show claims check badge based on validation phase - stays at bottom */}
            {guardrailData && (
              <div className={`pb-2 relative z-10 ${isRegenerating ? "bg-white/95" : ""}`}>
                <ClaimsCheckBadge
                  wasRegenerated={guardrailData.wasRegenerated || false}
                  allowedClaims={guardrailData.claims?.allowedClaims}
                  violatedClaims={guardrailData.claims?.violatedClaims}
                  isLoading={
                    guardrailData.validationPhase === "validating" ||
                    guardrailData.validationPhase === "regenerating"
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Product cards are now rendered in the Sources component above the input */}

        {/* Render options if they exist - only show when not loading */}
        {!loading && (
          <OptionsList
            options={options || []}
            onOptionClick={handleOptionClick}
            showOptions={showOptions}
            optionsLayout={optionsLayout}
          />
        )}
      </div>
    </div>
  );
}
