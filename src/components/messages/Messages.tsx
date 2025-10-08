import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";
import PhaseIndicator from "./PhaseIndicator";
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
  role: 'user' | 'assistant' | 'assistant-loading' | 'assistant-error' | 'phase';
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
  phase?: string; // Phase type for phase indicators
  phaseMessage?: string; // Message for phase indicators
}

interface MessagesProps {
  messages: Message[];
  onOptionSelect: (value: string) => void;
  isLoadingThread?: boolean;
}

export interface MessagesRef {
  scrollToMessage: (messageId: string) => void;
}

const Messages = forwardRef<MessagesRef, MessagesProps>(({ messages, onOptionSelect, isLoadingThread = false }, ref) => {
  const el = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  // Expose scrollToMessage method to parent
  useImperativeHandle(ref, () => ({
    scrollToMessage: (messageId: string) => {
      const messageEl = messageRefs.current.get(messageId);
      if (messageEl) {
        messageEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
  }));

  const renderMessage = (message: Message, index: number) => {
    const messageId = message.id ?? String(index);
    
    const messageContent = (() => {
      if (message.role === "user") {
        return <UserMessage text={message.content || ""} />;
      } else if (message.role === "phase") {
        return (
          <PhaseIndicator 
            phase={message.phase || "thinking"} 
            message={message.phaseMessage}
          />
        );
      } else if (
        message.role === "assistant" ||
        message.role === "assistant-error" ||
        message.role === "assistant-loading"
      ) {
        return (
          <BotMessage
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
    })();

    if (!messageContent) return null;

    return (
      <div
        key={messageId}
        ref={(el) => {
          if (el && message.id) {
            messageRefs.current.set(message.id, el);
          }
        }}
      >
        {messageContent}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-grow overflow-y-auto px-4 pt-4 gap-2">
      {isLoadingThread ? (
        <SkeletonMessages />
      ) : (
        messages.map((message, index) => renderMessage(message, index))
      )}
      <div id="el" ref={el} className="h-2.5" />
    </div>
  );
});

Messages.displayName = "Messages";

export default Messages;