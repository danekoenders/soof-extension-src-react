import { useEffect, useRef } from "react";

type SimpleMessage = {
  id?: string;
  type: "human" | "ai" | "tool";
  content?: string;
  _isPlaceholder?: boolean;
  _stream_done?: boolean;
};

interface StreamingChatProps {
  apiBase: string; // e.g., origin for proxy or full backend origin
  jwt: string;
  localLanguage: string;
  threadToken: string | null;
  setThreadToken: (token: string | null) => void;
  onMessages: (msgs: SimpleMessage[]) => void;
  onSendFn: (fn: (text: string) => void) => void;
  initialMessages?: SimpleMessage[];
}

export default function StreamingChat({
  apiBase,
  jwt,
  localLanguage,
  threadToken,
  setThreadToken,
  onMessages,
  onSendFn,
  initialMessages = [],
}: StreamingChatProps) {
  const messagesRef = useRef<SimpleMessage[]>([]);
  const cfgRef = useRef({ apiBase, jwt, localLanguage, threadToken });

  // keep latest config in a ref so sendMessage always uses fresh values
  useEffect(() => {
    cfgRef.current = { apiBase, jwt, localLanguage, threadToken };
  }, [apiBase, jwt, localLanguage, threadToken]);

  useEffect(() => {
    if (messagesRef.current.length === 0 && initialMessages.length > 0) {
      messagesRef.current = [...initialMessages];
    }
  }, [initialMessages]);

  useEffect(() => {
    const sendMessage = async (text: string) => {
      if (!text.trim()) return;

      const generatedId = `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const localUserMsg: SimpleMessage = {
        id: generatedId,
        type: "human",
        content: text,
      };

      const loadingPlaceholder: SimpleMessage = {
        id: `placeholder-${generatedId}`,
        type: "ai",
        content: "Thinking",
        _isPlaceholder: true,
      };

      messagesRef.current = [...messagesRef.current, localUserMsg, loadingPlaceholder];
      onMessages(messagesRef.current);

      try {
        const { apiBase: base, jwt: token, localLanguage: lang, threadToken: tt } = cfgRef.current;
        const response = await fetch(`${base}/api/agent/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            jwt: token,
            localLanguage: lang,
            threadToken: tt ?? undefined,
          }),
        });

        if (!response.body) throw new Error("Response body not streamable");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const updatePlaceholder = (content: string) => {
          const current = [...messagesRef.current];
          const idx = current.findIndex((m) => m._isPlaceholder);
          if (idx !== -1) {
            current[idx] = { ...current[idx], content } as SimpleMessage;
            messagesRef.current = current;
            onMessages(current);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newline;
          while ((newline = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);

            if (!line) continue;
            try {
              const event = JSON.parse(line);
              switch (event.type) {
                case "phase": {
                  updatePlaceholder(event.msg || "Working…");
                  break;
                }
                case "delta": {
          const current = messagesRef.current.filter((m) => !m._isPlaceholder);
          const last = current[current.length - 1];
          if (!last || last.type !== "ai" || last._stream_done) {
            const aiMsg: SimpleMessage = { type: "ai", content: event.delta || "", _stream_done: false };
            messagesRef.current = [...current, aiMsg];
          } else {
            last.content = (last.content || "") + (event.delta || "");
            messagesRef.current = [...current.slice(0, -1), last];
          }
          onMessages(messagesRef.current);
                  break;
                }
                case "session_state": {
                  if (event.threadToken) {
                    setThreadToken(event.threadToken);
                  }
                  break;
                }
                case "done": {
                  // finalize last ai message and, if provided, normalize to your message structure shape (type: message)
                  const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const last = current[current.length - 1];
                  if (last && last.type === "ai") last._stream_done = true;
                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "item":
                case "agent_switch":
                default:
                  break;
              }
            } catch (err) {
              // skip invalid JSON lines
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    onSendFn(sendMessage);
    // register only once on mount to avoid re-register loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
