import { useState, useEffect, useMemo, useRef } from "react";
import type { ProductMeta } from "../../types/product";
import OptionsList from "./OptionsList";
import { marked } from "marked";
import DOMPurify from "dompurify";
import ClaimsCheckBadge from "../guardrails/ClaimsCheckBadge";
import type { GuardrailData } from "../../types/guardrail";
import type { OptionsData } from "../../types/options";
import { OPTIONS_TEMPLATES, applyParameters } from "../../types/options";

type BlockChange = {
  blockIndex: number;
  newBlock: string;
};

// Configure marked for better streaming behavior
marked.setOptions({
  breaks: true, // Convert \n to <br>
  gfm: true, // GitHub Flavored Markdown
  silent: true, // Don't throw on parse errors (important for incomplete markdown)
});

interface BotMessageProps {
  text: string;
  loading?: boolean;
  optionsData?: OptionsData;
  renderImmediately?: boolean;
  onOptionClick?: (value: string, requiredTool?: string) => void;
  isError?: boolean;
  type?: "normal" | "orderTracking" | "product";
  order?: {
    orderNumber: string;
    financialStatus: string;
    orderStatusUrl: string;
  };
  productMeta?: ProductMeta;
  guardrailData?: GuardrailData;
  blockChanges?: BlockChange[];
  originalContent?: string;
}

export default function BotMessage({
  text,
  loading = false,
  optionsData,
  renderImmediately = false,
  onOptionClick,
  isError = false,
  type = "normal",
  order,
  // productMeta is no longer rendered here - shown in Sources component instead
  guardrailData,
  blockChanges,
  originalContent,
}: BotMessageProps) {
  const [showOptions, setShowOptions] = useState(true);
  const [displayText, setDisplayText] = useState(text);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [fixedDimensions, setFixedDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const messageRef = useRef<HTMLDivElement>(null);

  const handleOptionClick = (value: string, requiredTool?: string) => {
    // Only send message if value is not empty
    if (value && value.trim()) {
      onOptionClick?.(value, requiredTool);
    }
    // Always hide options after clicking
    setShowOptions(false);
  };

  // Helper to apply parameters to text
  const applyParams = (text?: string) => {
    return text ? applyParameters(text, optionsData?.parameters) : undefined;
  };

  // Get the options configuration (template or custom)
  const optionsConfig = useMemo(() => {
    if (!optionsData) return null;

    if (optionsData.type === "template" && optionsData.template) {
      const template = OPTIONS_TEMPLATES[optionsData.template];
      if (!template) {
        console.warn(`Template "${optionsData.template}" not found`);
        return null;
      }
      return template;
    } else if (optionsData.type === "custom" && optionsData.custom) {
      return optionsData.custom;
    }

    return null;
  }, [optionsData]);

  // Handle smooth transition when guardrail regeneration occurs
  useEffect(() => {
    const wasRegenerating = isRegenerating;
    const nowRegenerating = guardrailData?.validationPhase === "regenerating";

    // Detect when regeneration starts
    if (!wasRegenerating && nowRegenerating) {
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
      }, 100);
    }

    // Always update display text - the CSS will handle the animation
    setDisplayText(text);
  }, [text, guardrailData, isRegenerating]);

  // Apply block changes and track which blocks changed for animation
  const regeneratedData = useMemo<{
    blocks: string[];
    changedIndices: Set<number>;
  } | null>(() => {
    if (!originalContent || !blockChanges || blockChanges.length === 0) {
      return null;
    }

    // Split by double newlines (paragraphs/blocks)
    const originalBlocks = originalContent
      .split(/\n\n+/)
      .filter((b) => b.trim());

    // Create a map of changes for quick lookup
    const changesMap = new Map(
      blockChanges.map((c) => [c.blockIndex, c.newBlock])
    );

    // Find the max block index we need to handle
    const maxIndex = Math.max(
      originalBlocks.length - 1,
      ...blockChanges.map((c) => c.blockIndex)
    );

    const changedIndices = new Set<number>();
    const resultBlocks: string[] = [];

    // Build the result array, handling both replacements and additions
    for (let i = 0; i <= maxIndex; i++) {
      if (changesMap.has(i)) {
        resultBlocks.push(changesMap.get(i)!);
        changedIndices.add(i);
      } else if (i < originalBlocks.length) {
        // Keep original block
        resultBlocks.push(originalBlocks[i]);
      }
      // If index > original length and no change, skip (backend might have removed it)
    }

    return { blocks: resultBlocks, changedIndices };
  }, [originalContent, blockChanges]);

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

  // Parse each block as markdown and track which ones changed
  const regeneratedHtmlBlocks = useMemo<Array<{
    html: string;
    isChanged: boolean;
  }> | null>(() => {
    if (!regeneratedData) return null;

    return regeneratedData.blocks.map((block, index) => {
      try {
        const html = marked.parse(block);
        return {
          html: DOMPurify.sanitize(html as string),
          isChanged: regeneratedData.changedIndices.has(index),
        };
      } catch (error) {
        console.error("Markdown parsing error:", error);
        return {
          html: DOMPurify.sanitize(block),
          isChanged: regeneratedData.changedIndices.has(index),
        };
      }
    });
  }, [regeneratedData]);

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
        {/* Render options if they exist */}
        {optionsConfig && (
          <OptionsList
            optionItems={optionsConfig.options || []}
            onOptionClick={handleOptionClick}
            showOptions={showOptions}
            optionsLayout={optionsConfig.optionsLayout || "default"}
            parameters={optionsData?.parameters}
          />
        )}
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
              isError ? "border border-red-400 bg-red-50" : ""
            } ${guardrailData ? "justify-between" : ""}`}
            style={
              fixedDimensions && isRegenerating
                ? {
                    width: `${fixedDimensions.width}px`,
                    height: `${fixedDimensions.height}px`,
                    minHeight: `${fixedDimensions.height}px`,
                  }
                : undefined
            }
          >
            {/* Content wrapper - grows to push badge down */}
            <div className="flex-1 flex flex-col">
              {/* Show regenerated blocks if available, otherwise show normal text */}
              {regeneratedHtmlBlocks ? (
                <div className="px-2 prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-a:text-blue-600 hover:prose-a:underline prose-ul:list-disc prose-li:marker:text-gray-400 prose-img:rounded-md prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
                  {regeneratedHtmlBlocks.map((block, index) => (
                    <div
                      key={index}
                      className={block.isChanged ? "animate-paragraph-glow" : ""}
                      dangerouslySetInnerHTML={{ __html: block.html }}
                    />
                  ))}
                </div>
              ) : (
                /* Normal rendering when not regenerating */
                <div className="px-2">{formatText(formattedHtml)}</div>
              )}
              
              {/* Render label and description for optionsData */}
              {optionsConfig && optionsConfig.label && (
                <div className="px-2 flex flex-col gap-2 mb-4">
                  {optionsConfig.label && (
                    <h3 className="text-sm font-semibold text-gray-900 m-0">
                      {applyParams(optionsConfig.label)}
                    </h3>
                  )}
                  {optionsConfig.description && (
                    <p className="text-sm text-gray-700 m-0">
                      {applyParams(optionsConfig.description)}
                    </p>
                  )}
                </div>
              )}

              {/* Render options if they exist - show when not loading OR when renderImmediately flag is true */}
              {(!loading || renderImmediately) && optionsConfig && (
                <div className="px-2 pb-2">
                  <OptionsList
                    optionItems={optionsConfig.options || []}
                    onOptionClick={handleOptionClick}
                    showOptions={showOptions}
                    optionsLayout={optionsConfig.optionsLayout || "default"}
                    parameters={optionsData?.parameters}
                  />
                </div>
              )}
            </div>

            {/* Show claims check badge for all validation phases */}
            {guardrailData && (
              <div className="px-2 pb-2 relative z-10">
                <ClaimsCheckBadge
                  wasRegenerated={guardrailData.wasRegenerated || false}
                  allowedClaims={guardrailData.claims?.allowedClaims}
                  validationPhase={guardrailData.validationPhase }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
