import { useState } from "react";
import ProductCard from "../tools/ProductCard";
import type { ProductMeta } from "../tools/ProductCard";
import OptionsList from "./OptionsList";
import { simpleMarkdown } from "../../utils/simpleMarkdown";

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
}: BotMessageProps) {
  const [showOptions, setShowOptions] = useState(true);

  const handleOptionClick = (value: string) => {
    onOptionClick?.(value);
    setShowOptions(false);
  };

  const formatText = (text: string) => {
    const html = simpleMarkdown(text);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Render order tracking card
  if (type === "orderTracking" && order) {
    return (
      <div className={`message-wrapper assistant order-tracking`}>
        <div className="message">
          <div>
            <h4>Order #{order.orderNumber}</h4>
            <p>Status: {order.financialStatus}</p>
          </div>
          <a
            href={order.orderStatusUrl}
            target="_blank"
            rel="noopener noreferrer"
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
    <div
      className={`message-wrapper ${isError ? "assistant-error" : "assistant"}`}
    >
      <div className="bot-message-wrapper">
        {loading ? (
          <div className="message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        ) : (
          <>
            {/* Render text content only if it exists and is not just whitespace */}
            {text && text.trim() && (
              <div className="message">{formatText(text)}</div>
            )}

            {/* Render product card if meta is available */}
            {type === "product" && productMeta && (
              <ProductCard product={productMeta} />
            )}

            {/* Render options if they exist */}
            <OptionsList
              options={options || []}
              onOptionClick={handleOptionClick}
              showOptions={showOptions}
              optionsLayout={optionsLayout}
            />
          </>
        )}
      </div>
    </div>
  );
}
