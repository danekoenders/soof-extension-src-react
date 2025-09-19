import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";

interface InputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  theme: {
    primaryBackground: string;
    secondaryBackground: string;
    background: string;
    primaryAccent: string;
    secondaryText: string;
    primaryText: string;
    secondaryBorder: string;
    disabledBackground: string;
  };
  isMobile: boolean;
}

export default function Input({ onSend, disabled, theme, isMobile }: InputProps) {
  const [text, setText] = useState("");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();

    if (text.trim() && !disabled) {
      onSend(text);
      setText("");
    }
  };

  return (
    <div>
      <form onSubmit={handleSend} className="flex gap-1.5 p-1">
        <input
          type="text"
          onChange={handleInputChange}
          value={text}
          disabled={disabled}
          placeholder="Waar ben je naar op zoek?"
          className="flex-grow px-2.5 py-1.5 border border-gray-300 rounded-xl shadow-sm text-base bg-white text-black focus:outline-none focus:border-blue-600 disabled:bg-gray-100"
          style={{
            color: theme.primaryText,
            backgroundColor: theme.background,
            border: `1px solid ${theme.background}`,
            fontSize: isMobile ? '16px' : '1em',
          }}
        />
        <button 
          type="submit" 
          disabled={disabled || !text.trim()}
          className="w-14 h-14 px-1.5 py-3 border-none rounded-2xl cursor-pointer transition-colors disabled:cursor-not-allowed"
          style={{
            backgroundColor: disabled ? theme.disabledBackground : theme.primaryBackground,
            color: theme.secondaryText,
          }}
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 500 500"
            className="fill-current"
          >
            <g>
              <g>
                <polygon points="0,497.25 535.5,267.75 0,38.25 0,216.75 382.5,267.75 0,318.75" />
              </g>
            </g>
          </svg>
        </button>
      </form>
    </div>
  );
}
