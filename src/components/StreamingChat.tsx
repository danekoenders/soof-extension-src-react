import { useEffect, useRef } from "react";
import { normalizeProduct } from "../utils/productTransforms";
import type { ProductMeta } from "../types/product";

type SimpleMessage = {
  id?: string;
  type: "human" | "ai" | "tool";
  content?: string;
  name?: string;
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
                case "assistant_output_start": {
                  // ensure placeholder shows something subtle
                  updatePlaceholder("");
                  break;
                }
                case "mcp_call_started": {
                  const toolName = event.toolName || event.name || "tool";
                  updatePlaceholder(`🔧 ${toolName}…`);
                  break;
                }
                case "mcp_call_completed": {
                  // forward as tool message with output/error payload
                  const toolMsg: SimpleMessage = {
                    type: "tool",
                    name: event.toolName,
                    content: JSON.stringify({
                      serverLabel: event.serverLabel,
                      output: event.output,
                      error: event.error,
                    }),
                  };
                  messagesRef.current = [...messagesRef.current, toolMsg];
                  onMessages(messagesRef.current);
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
                case "item": {
                  // Forward tool item outputs to UI
                  const toolMsg: SimpleMessage = {
                    type: "tool",
                    name: event.name,
                    content:
                      typeof event.item === "string"
                        ? event.item
                        : JSON.stringify(event.item),
                  };
                  messagesRef.current = [...messagesRef.current, toolMsg];
                  onMessages(messagesRef.current);
                  break;
                }
                case "assistant_output_end": {
                  // mark last ai message as done
                  const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const last = current[current.length - 1];
                  if (last && last.type === "ai") last._stream_done = true;
                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "done": {
                  // finalize last ai message
                  let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const last = current[current.length - 1];
                  if (last && last.type === "ai") last._stream_done = true;

                  // If frontendData.products is provided, push product card messages
                  try {
                    const products = Array.isArray(event.frontendData?.products)
                      ? event.frontendData.products
                      : [];
                    if (products.length > 0) {
                      const productMessages = products
                        .map((p: any) => normalizeProduct(p))
                        .filter(Boolean)
                        .map((pm: ProductMeta) => ({
                          type: "ai",
                          content: "",
                          _stream_done: true,
                          _productMeta: pm,
                        } as any));
                      current = [...current, ...productMessages];
                    }
                  } catch (_) {
                    // ignore malformed frontendData
                  }

                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "agent_switch":
                case "tool_step":
                case "assistant_output_start_internal":
                case "assistant_output_token":
                case "error": {
                  // Optionally surface an error as an assistant message
                  if (event.msg) {
                    const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                    const errMsg: SimpleMessage = { type: "ai", content: String(event.msg), _stream_done: true };
                    messagesRef.current = [...current, errMsg];
                    onMessages(messagesRef.current);
                  }
                  break;
                }
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
