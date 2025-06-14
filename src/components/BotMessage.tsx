import { useState } from "react";

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
  backgroundColor?: string;
  options?: Option[];
  onOptionClick?: (value: string) => void;
  isError?: boolean;
}

export default function BotMessage({ 
  text, 
  loading = false, 
  options, 
  onOptionClick,
  isError = false
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

  return (
    <div className={`message-wrapper ${isError ? 'assistant-error' : 'assistant'}`}>
      <div className="image-container">
        <div className="bot-icon">🤖</div>
      </div>
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
          <div className="message">
            {formatText(text)}
          </div>
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
  );
}
