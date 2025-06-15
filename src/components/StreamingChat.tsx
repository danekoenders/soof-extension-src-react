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
}

export default function StreamingChat({
  apiUrl,
  assistantId,
  sessionToken,
  myShopifyDomain,
  threadId,
  onMessages,
  onSendFn,
}: StreamingChatProps) {
  /* -------------------------------------------------------------------- */
  /*                           Local state/refs                           */
  /* -------------------------------------------------------------------- */

  const clientRef = useRef<Client | null>(null);
  const messagesRef = useRef<LangGraphMessage[]>([]);

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

      messagesRef.current = [...messagesRef.current, localUserMsg];
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

          if (event.startsWith("messages")) {
            // data is an array of messages
            newMessages = data as LangGraphMessage[];
          } else if (event === "updates" && data) {
            // updates event; attempt to extract messages from first key
            const nodeKeys = Object.keys(data || {});
            if (nodeKeys.length > 0) {
              const maybe = data[nodeKeys[0]];
              if (maybe && Array.isArray(maybe.messages)) {
                newMessages = maybe.messages as LangGraphMessage[];
              }
            }
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
