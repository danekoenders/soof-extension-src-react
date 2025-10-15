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

type BlockChange = {
  blockIndex: number;
  newBlock: string;
};

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
  blockChanges?: BlockChange[]; // Block-level diff for regeneration
  originalContent?: string; // Original content before regeneration
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const wasAtBottomRef = useRef(true); // Track if user was at bottom before update

  // Helper function to check if user is at the bottom of the scroll container
  const isAtBottom = () => {
    const container = scrollContainerRef.current;
    if (!container) return true; // Default to true if container not found
    
    const threshold = 50; // pixels from bottom to consider "at bottom"
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

  // Track scroll position to detect if user is at bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      wasAtBottomRef.current = isAtBottom();
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Only auto-scroll if user WAS at the bottom before messages changed
    if (wasAtBottomRef.current) {
      el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
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
        // Debug logging for guardrail data
        if (message.guardrailData && message.guardrailData.validationPhase === 'done') {
          console.log('📨 Messages.tsx passing guardrailData to BotMessage:', {
            hasGuardrailData: !!message.guardrailData,
            wasRegenerated: message.guardrailData.wasRegenerated,
            hasClaims: !!message.guardrailData.claims,
            allowedClaimsCount: message.guardrailData.claims?.allowedClaims?.length || 0,
            allowedClaims: message.guardrailData.claims?.allowedClaims,
          });
        }
        
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
            blockChanges={message.blockChanges}
            originalContent={message.originalContent}
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
    <div ref={scrollContainerRef} className="flex flex-col flex-grow overflow-y-auto px-4 pt-4 gap-2">
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