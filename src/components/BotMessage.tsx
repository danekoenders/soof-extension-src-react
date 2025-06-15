import { useState } from "react";
import ProductCard from "./tools/ProductCard";
import type { ProductMeta } from "./tools/ProductCard";

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
  type?: 'normal' | 'orderTracking' | 'product';
  order?: {
    orderNumber: string;
    financialStatus: string;
    orderStatusUrl: string;
  };
  productMeta?: ProductMeta;
}

export default function BotMessage({ 
  text, 
  loading = false, 
  options, 
  onOptionClick,
  isError = false,
  type = 'normal',
  order,
  productMeta
}: BotMessageProps) {
  const [showOptions, setShowOptions] = useState(true);

  const handleOptionClick = (value: string) => {
    onOptionClick?.(value);
    setShowOptions(false);
  };

  const formatText = (text: string) => {
    // Simple text formatting without markdown dependency
    return text
      .split('\n')
      .map((line, index) => (
        <div key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </div>
      ));
  };

  // Render order tracking card
  if (type === 'orderTracking' && order) {
    return (
      <div className={`message-wrapper assistant order-tracking`}>
        <div className="message">
          <div>
            <h4>Order #{order.orderNumber}</h4>
            <p>Status: {order.financialStatus}</p>
          </div>
          <a href={order.orderStatusUrl} target="_blank" rel="noopener noreferrer">
            👁️
          </a>
        </div>
        {options && options.length > 0 && (
          <div className="options">
            {options.map((option, optionIndex) => (
              <button
                key={optionIndex}
                onClick={() => onOptionClick?.(option.value || '')}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render standard message bubble, potentially with a product card inside
  return (
    <div className={`message-wrapper ${isError ? 'assistant-error' : 'assistant'}`}>
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
            {text && text.trim() && <div className="message">{formatText(text)}</div>}
            
            {/* Render product card if meta is available */}
            {type === 'product' && productMeta && <ProductCard product={productMeta} />}

            {/* Render options if they exist */}
            {options && options.length > 0 && showOptions && (
              <div className="options">
                {options.map((option, index) => (
                  <button 
                    key={index} 
                    onClick={() => handleOptionClick(option.value || '')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
