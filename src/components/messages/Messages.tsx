import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";
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
  role: 'user' | 'assistant' | 'assistant-error' | 'phase';
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
  scrollToBottom: () => void;
}

const Messages = forwardRef<MessagesRef, MessagesProps>(({ messages, onOptionSelect, isLoadingThread = false }, ref) => {
  const el = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  useEffect(() => {
    el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  // Expose scrollToMessage and scrollToBottom methods to parent
  useImperativeHandle(ref, () => ({
    scrollToMessage: (messageId: string) => {
      const messageEl = messageRefs.current.get(messageId);
      if (messageEl) {
        // Highlight the message
        setHighlightedMessageId(messageId);
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 1000);
        
        // Get the scroll container (parent element)
        const scrollContainer = messageEl.parentElement;
        if (scrollContainer) {
          const elementTop = messageEl.offsetTop;
          // Calculate offset based on viewport height (container is 73vh)
          // Use ~20% of viewport height for offset to account for header and spacing
          const offset = window.innerHeight * 0.22;
          scrollContainer.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        } else {
          messageEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }
    },
    scrollToBottom: () => {
      el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
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
        message.role === "assistant-error"
      ) {
        return (
          <BotMessage
            text={message.content || ""}
            loading={!!message.loading}
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

    const isHighlighted = message.id === highlightedMessageId;
    
    return (
      <div
        key={messageId}
        ref={(el) => {
          if (el && message.id) {
            messageRefs.current.set(message.id, el);
          }
        }}
        className={`transition-all duration-200 ${
          isHighlighted ? 'bg-blue-50/50 -mx-4 px-4 rounded-lg' : ''
        }`}
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
      <div id="el" ref={el} className="h-16" />
    </div>
  );
});

Messages.displayName = "Messages";

export default Messages;