import { useState } from "react";
import ProductCard from "../tools/ProductCard";
import type { ProductMeta } from "../../types/product";
import OptionsList from "./OptionsList";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
    const html = DOMPurify.sanitize(marked.parse(text ?? "") as string);
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
        {loading ? (
          <div className={`px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border max-w-[90%] text-black flex flex-row items-center justify-center ${
            isError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-blue-50'
          }`}>
            {/* Descriptive loading text */}
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
        ) : (
          <>
            {/* Render text content only if it exists and is not just whitespace */}
            {text && text.trim() && (
              <div className={`px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border max-w-[90%] text-black ${
                isError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-blue-50'
              }`}>
                {formatText(text)}
              </div>
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
