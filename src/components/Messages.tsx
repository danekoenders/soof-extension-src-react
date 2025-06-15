import { useEffect, useRef } from "react";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";
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
}

interface MessagesProps {
  messages: Message[];
}

export default function Messages({ messages }: MessagesProps) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    el.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages]);

  const renderMessage = (message: Message, index: number) => {
    if (message.type === 'orderTracking' && message.order) {
      return (
        <div key={message.id ?? index}>
          <div className="message-wrapper assistant">
            <div className="message">
              <p>I found your order details:</p>
            </div>
          </div>
          <div className="message-wrapper order-tracking assistant">
            <div className="message">
              <div>
                <h4>Order #{message.order.orderNumber}</h4>
                <p>Status: {message.order.financialStatus}</p>
              </div>
              <a href={message.order.orderStatusUrl} target="_blank" rel="noopener noreferrer">
                👁️
              </a>
            </div>
            {message.options && message.options.length > 0 && (
              <div className="options">
                {message.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    onClick={() => message.onOptionClick?.(option.value || '')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (message.type === 'product' && message.productMeta) {
      return (
        <div key={message.id ?? index} className="message-container-bot">
          <div className="bot-message-wrapper">
            <ProductCard product={message.productMeta} />
          </div>
        </div>
      );
    }

    // Normal messages
    if (message.role === 'user') {
      return <UserMessage key={message.id ?? index} text={message.content || ''} />;
    } else if (message.role === 'assistant' || message.role === 'assistant-error') {
      return (
        <BotMessage
          key={message.id ?? index}
          text={message.content || ''}
          loading={message.loading}
          options={message.options}
          onOptionClick={message.onOptionClick}
          isError={message.role === 'assistant-error'}
        />
      );
    } else if (message.role === 'assistant-loading') {
      return (
        <BotMessage
          key={message.id ?? index}
          text=""
          loading={true}
          options={[]}
        />
      );
    }

    return null;
  };

  return (
    <div className="messages">
      {messages.map((message, index) => renderMessage(message, index))}
      <div id="el" ref={el} style={{ height: 10 }} />
    </div>
  );
}