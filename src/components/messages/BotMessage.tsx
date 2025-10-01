import { useState, useEffect, useMemo } from "react";
import ProductCard from "../tools/ProductCard";
import type { ProductMeta } from "../../types/product";
import OptionsList from "./OptionsList";
import { marked } from "marked";
import DOMPurify from "dompurify";
import GuardrailStatus from "../guardrails/GuardrailStatus";
import ClaimsValidationPanel from "../guardrails/ClaimsValidationPanel";
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
  productMeta,
  optionsLayout = "default",
  guardrailData,
}: BotMessageProps) {
  const [showOptions, setShowOptions] = useState(true);
  const [displayText, setDisplayText] = useState(text);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleOptionClick = (value: string) => {
    onOptionClick?.(value);
    setShowOptions(false);
  };

  // Handle smooth transition when guardrail regeneration occurs
  useEffect(() => {
    // If we're in regenerating phase and content has changed significantly, trigger transition
    if (guardrailData?.validationPhase === "regenerating" && 
        guardrailData.originalResponse && 
        text !== guardrailData.originalResponse && 
        text !== displayText &&
        text.length > 10) { // Only transition when we have substantial new content
      
      setIsTransitioning(true);
      
      // Fade out current text, then fade in new text
      setTimeout(() => {
        setDisplayText(text);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Normal content updates - this happens on EVERY delta during streaming
      setDisplayText(text);
    }
  }, [text, guardrailData, displayText]);

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
            <h4 className="text-lg font-medium m-0">Order #{order.orderNumber}</h4>
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
        {/* Show guardrail status during validation/regenerating, hide when done */}
        {guardrailData?.validationPhase && guardrailData.validationPhase !== 'done' && (
          <GuardrailStatus 
            phase={guardrailData.validationPhase} 
          />
        )}

        {/* Render formatted markdown content (both during streaming and after) */}
        {formattedHtml && (
          <div className={`px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border max-w-[90%] text-black guardrail-transition ${
            isError ? 'border-red-400 bg-red-50' : 'border-gray-200'
          } ${isTransitioning ? 'guardrail-fade-out' : 'guardrail-fade-in'}`}>
            {formatText(formattedHtml)}
            
            {/* Show typing indicator while streaming */}
            {loading && (
              <div className="flex items-center mt-1">
                <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-200"></span>
                <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-400"></span>
                <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-600"></span>
              </div>
            )}
          </div>
        )}

        {/* Show loading placeholder only when there's no content yet */}
        {!formattedHtml && loading && (
          <div className={`px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border max-w-[90%] text-black flex flex-row items-center justify-center ${
            isError ? 'border-red-400 bg-red-50' : 'border-gray-200'
          }`}>
            {text && text.trim() && (
              <p className="mr-2">
                {text}
              </p>
            )}
            <div className="flex items-center -mb-1.5">
              <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-200"></span>
              <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-400"></span>
              <span className="inline-block w-1 h-1 mx-0.5 bg-blue-600 rounded-full animate-pulse delay-600"></span>
            </div>
          </div>
        )}

        {/* Show claims validation panel only after regeneration is completed */}
        {guardrailData?.wasRegenerated && guardrailData?.claimsValidation && (
          <div className="max-w-[90%] w-full">
            <ClaimsValidationPanel 
              claimsValidation={guardrailData.claimsValidation}
              wasRegenerated={guardrailData.wasRegenerated}
            />
          </div>
        )}

        {/* Render product card if meta is available */}
        {type === "product" && productMeta && (
          <ProductCard product={productMeta} />
        )}

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
