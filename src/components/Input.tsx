import { useState, useRef, useEffect } from "react";
import type { FormEvent, ChangeEvent } from "react";

interface InputProps {
  onSend: (text: string) => void;
  disableInput?: boolean; // Disable typing in the input field
  disableSend?: boolean; // Disable sending messages
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

export default function Input({
  onSend,
  disableInput = false,
  disableSend = false,
  theme,
  isMobile,
}: InputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = isMobile ? 96 : 88; // 6rem = 96px, 5.5rem = 88px
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text, isMobile]);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();

    if (text.trim() && !disableSend) {
      onSend(text);
      setText("");
    }
  };

  return (
    <>
      <form
        onSubmit={handleSend}
        className={`flex items-center gap-1.5 p-2 border border-gray-300 rounded-xl transition-all ${
          isMobile ? "max-h-[8rem]" : "max-h-[7.5rem]"
        }`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          onChange={handleInputChange}
          value={text}
          disabled={disableInput}
          placeholder="Waar ben je naar op zoek?"
          name="chat-input"
          style={{ resize: 'none' }}
          className={`w-full shadow-sm resize-none overflow-y-auto scrollbar-subtle ${
            isMobile ? "text-base max-h-[6rem]" : "text-[1em] max-h-[5.5rem]"
          } bg-white text-black focus:outline-none focus:border-blue-600 disabled:bg-gray-100 leading-[1.375]`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={disableSend || !text.trim()}
          className={`flex items-center justify-center self-end p-2 border-none rounded-md cursor-pointer transition-colors disabled:cursor-not-allowed ${
            disableSend ? "bg-gray-100" : "bg-blue-600 text-white"
          }`}
        >
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 500 500"
            className="fill-current rotate-270"
          >
            <g>
              <g>
                <polygon points="0,497.25 535.5,267.75 0,38.25 0,216.75 382.5,267.75 0,318.75" />
              </g>
            </g>
          </svg>
        </button>
      </form>
    </>
  );
}
