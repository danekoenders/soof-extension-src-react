import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import type { FormEvent, ChangeEvent } from "react";

interface InputProps {
  onSend: (text: string) => void;
  disableSend?: boolean; // Disable sending messages
  primaryColor?: string;
  secondaryColor?: string;
  isMobile: boolean;
}

export interface InputRef {
  focus: () => void;
}

const Input = forwardRef<InputRef, InputProps>(
  (
    {
      onSend,
      disableSend = false,
      isMobile,
      primaryColor,
    },
    ref
  ) => {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 500;
  const limitReached = text.length > maxChars;

  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
  }));

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

  // Auto-focus on mount and when text is cleared (after sending)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [text === "", isMobile]);

  // Also focus when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    // Allow any character count, just track it
    setText(newText);
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();

    if (text.trim() && !disableSend) {
      onSend(text);
      setText("");
    }
  };

  const computedPrimaryColor = primaryColor?.trim() || "#2563eb";
  const canSend = !!text.trim() && !disableSend && !limitReached;

  return (
    <>
      <form
        onSubmit={handleSend}
        className={`flex items-center gap-1.5 p-2 rounded-xl transition-all ${
          limitReached ? "border border-red-400" : "border border-gray-300"
        } ${isMobile ? "max-h-[8rem]" : "max-h-[7.5rem]"}`}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          onChange={handleInputChange}
          value={text}
          placeholder="Waar ben je naar op zoek?"
          name="chat-input"
          style={{ resize: 'none' }}
          className={`w-full shadow-sm resize-none overflow-y-auto scrollbar-subtle ${
            isMobile ? "text-base max-h-[6rem]" : "text-[1em] max-h-[5.5rem]"
          } focus:outline-none focus:border-blue-600 disabled:bg-gray-100 leading-[1.375]`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={`flex items-center justify-center self-end p-2 border-none rounded-md cursor-pointer transition-colors disabled:cursor-not-allowed ${
            canSend ? "text-white" : "bg-gray-100 text-gray-400"
          }`}
          style={
            canSend
              ? {
                  backgroundColor: computedPrimaryColor,
                }
              : undefined
          }
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
      {limitReached && (
        <div className="px-2 pt-1 text-xs text-red-600">
          {text.length}/{maxChars} - Je bericht is te lang. Kort je bericht in.
        </div>
      )}
    </>
  );
  }
);

Input.displayName = "Input";

export default Input;

