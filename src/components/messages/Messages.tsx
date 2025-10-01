import { useEffect, useRef } from "react";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";
import { SkeletonMessages } from "./SkeletonMessage";
import type { ProductMeta } from "../../types/product";
import type { GuardrailData } from "../../types/guardrail";

interface Option {
  label: string;
  value?: string;
  function?: {
    name: string;
    params?: Record<string, any>;
  };
}

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'assistant-loading' | 'assistant-error';
  type: 'normal' | 'orderTracking' | 'product';
  content?: string;
  loading?: boolean;
  order?: {
    orderNumber: string;
    financialStatus: string;
    orderStatusUrl: string;
  };
  productMeta?: ProductMeta;
  options?: Option[];
  onOptionClick?: (value: string) => void;
  isWelcome?: boolean;
  guardrailData?: GuardrailData;
}

interface MessagesProps {
  messages: Message[];
  onOptionSelect: (value: string) => void;
  isLoadingThread?: boolean;
}

export default function Messages({ messages, onOptionSelect, isLoadingThread = false }: MessagesProps) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  const renderMessage = (message: Message, index: number) => {
    if (message.role === "user") {
      return (
        <UserMessage key={message.id ?? index} text={message.content || ""} />
      );
    } else if (
      message.role === "assistant" ||
      message.role === "assistant-error" ||
      message.role === "assistant-loading"
    ) {
      return (
        <BotMessage
          key={message.id ?? index}
          text={message.content || ""}
          loading={message.role === "assistant-loading" || !!message.loading}
          options={message.options}
          onOptionClick={message.onOptionClick || onOptionSelect}
          isError={message.role === "assistant-error"}
          type={message.type}
          order={message.order}
          productMeta={message.productMeta}
          optionsLayout={message.isWelcome ? "horizontal-scroll" : undefined}
          guardrailData={message.guardrailData}
        />
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col flex-grow gap-2.5 overflow-y-auto px-4 py-3.5">
      {isLoadingThread ? (
        <SkeletonMessages />
      ) : (
        messages.map((message, index) => renderMessage(message, index))
      )}
      <div id="el" ref={el} className="h-2.5" />
    </div>
  );
}