import { useEffect, useRef } from "react";
import type { Message as LangGraphMessage } from "@langchain/langgraph-sdk";
import { Client } from "@langchain/langgraph-sdk";

interface StreamingChatProps {
  apiUrl: string;
  assistantId: string;
  sessionToken: string;
  myShopifyDomain: string;
  threadId: string | null;
  setThreadId: (id: string | null) => void;
  onMessages: (msgs: LangGraphMessage[]) => void;
  onSendFn: (fn: (text: string) => void) => void;
  initialMessages?: LangGraphMessage[];
}

export default function StreamingChat({
  apiUrl,
  assistantId,
  sessionToken,
  myShopifyDomain,
  threadId,
  onMessages,
  onSendFn,
  initialMessages = [],
}: StreamingChatProps) {
  /* -------------------------------------------------------------------- */
  /*                           Local state/refs                           */
  /* -------------------------------------------------------------------- */

  const clientRef = useRef<Client | null>(null);
  const messagesRef = useRef<LangGraphMessage[]>([]);

  // Initialise messagesRef once with any pre-fetched transcript coming from parent
  useEffect(() => {
    if (messagesRef.current.length === 0 && initialMessages.length > 0) {
      messagesRef.current = [...initialMessages];
    }
  }, [initialMessages]);

  // create client instance once
  useEffect(() => {
    clientRef.current = new Client({
      apiUrl,
      // Provide default headers for every request (auth + shop domain)
      defaultHeaders: {
        Authorization: `Session ${sessionToken}`,
        "X-Shopify-Domain": myShopifyDomain,
      },
    } as any);
  }, [apiUrl, sessionToken, myShopifyDomain]);

  // expose send function to parent
  useEffect(() => {
    const sendMessage = async (text: string) => {
      if (!text.trim() || !clientRef.current) return;

      // 1. Immediately add the user's message locally so UI updates right away
      const generatedId = `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const localUserMsg = {
        id: generatedId,
        type: "human",
        content: text,
      } as unknown as LangGraphMessage;

      // Create a temporary assistant loading placeholder that we will update
      const placeholderId = `placeholder-${generatedId}`;
      const loadingPlaceholder = {
        id: placeholderId,
        type: "ai",
        content: "Thinking",
        _isPlaceholder: true, // custom flag so App.tsx can treat this as a loading message
      } as any as LangGraphMessage;

      messagesRef.current = [...messagesRef.current, localUserMsg, loadingPlaceholder];
      onMessages(messagesRef.current);

      try {
        // Ensure we have a thread
        let currentThreadId = threadId;
        if (!currentThreadId) {
          console.error("No thread id found.");
        }

        // Stream the run
        const streamResponse = clientRef.current.runs.stream(
          currentThreadId as string,
          assistantId,
          {
            input: {
              messages: [
                {
                  id: generatedId,
                  type: "human",
                  content: text,
                },
              ],
            },
            streamMode: ["messages", "updates"],
            config: { configurable: { myShopifyDomain } },
          } as any
        );

        for await (const chunk of streamResponse as any) {
          const { event, data } = chunk as { event: string; data: any };

          let newMessages: LangGraphMessage[] | undefined;

          if (event === "updates" && data) {
            // Determine what kind of update we received to change placeholder text
            const nodeKeys = Object.keys(data || {});
            if (nodeKeys.length > 0) {
              const nodeKey = nodeKeys[0];
              let loadingText = "Thinking";

              if (nodeKey === "agent") {
                loadingText = "Thinking";
              } else if (nodeKey === "tools") {
                const firstToolMsg = Array.isArray(data[nodeKey]?.messages)
                  ? data[nodeKey].messages[0]
                  : undefined;
                if (firstToolMsg && firstToolMsg.name === "product_info") {
                  loadingText = "Searching products";
                } else if (firstToolMsg && firstToolMsg.name === "handoff") {
                  loadingText = "Forwarding to support";
                } else {
                  loadingText = "Working";
                }
              } else if (nodeKey === "compliance") {
                loadingText = "Checking";
              }

              // Update the placeholder message content
              const current = [...messagesRef.current];
              const idx = current.findIndex((msg: any) => msg._isPlaceholder);
              if (idx !== -1) {
                current[idx] = {
                  ...(current[idx] as any),
                  content: loadingText,
                } as LangGraphMessage;
                messagesRef.current = current;
                onMessages(current);
              }

              // Attempt to extract messages array from the update node (if present)
              const maybe = data[nodeKey];
              if (maybe && Array.isArray(maybe.messages)) {
                newMessages = maybe.messages as LangGraphMessage[];
              }
            }
          } else if (event.startsWith("messages/partial")) {
            const partialMsgs = data as LangGraphMessage[];

            // Determine if we have meaningful content yet
            const hasContent = partialMsgs.some((pm) => {
              if (typeof pm.content === "string") {
                return pm.content.trim().length > 0;
              }
              return false;
            });

            if (hasContent) {
              // Remove loading placeholder once real content starts streaming
              messagesRef.current = messagesRef.current.filter(
                (m: any) => !m._isPlaceholder
              );
            }

            // data is an array of partial messages
            newMessages = partialMsgs.map((m) => ({ ...m, _stream_done: false }));
          } else if (
            event === "messages" ||
            event.startsWith("messages/complete")
          ) {
            // Final/full messages array
            newMessages = (data as LangGraphMessage[]).map((m) => ({
              ...m,
              _stream_done: true,
            }));
          }

          if (newMessages && newMessages.length) {
            // Merge, keeping the latest occurrence of each message id OR same role+content combo
            const getKey = (m: LangGraphMessage) =>
              m.id ?? `${m.type}-${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`;

            const current = [...messagesRef.current];
            for (const nm of newMessages) {
              const key = getKey(nm);
              const idx = current.findIndex((msg) => getKey(msg) === key);
              if (idx !== -1) {
                current[idx] = nm; // replace at same position, preserving order
              } else {
                current.push(nm); // append new
              }
            }
            const merged = current;
            messagesRef.current = merged;
            onMessages(merged);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        /* stream finished */
      }
    };

    // provide function to parent
    onSendFn(sendMessage);
  }, [assistantId, threadId, onSendFn, onMessages, myShopifyDomain]);

  return null; // side-effect only
}
