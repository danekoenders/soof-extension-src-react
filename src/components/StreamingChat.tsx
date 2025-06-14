import { useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message as LangGraphMessage } from "@langchain/langgraph-sdk";

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
  setThreadId,
  onMessages,
  onSendFn,
}: StreamingChatProps) {
  const thread = useStream<{ messages: LangGraphMessage[] }>({
    apiUrl,
    assistantId,
    messagesKey: "messages",
    threadId,
    onThreadId: setThreadId,
    defaultHeaders: {
      Authorization: `Session ${sessionToken}`,
      "X-Shopify-Domain": myShopifyDomain,
    },
  });

  // bubble messages up
  useEffect(() => {
    onMessages(thread.messages);
  }, [thread.messages, onMessages]);

  // provide send function to parent
  useEffect(() => {
    const sendMessage = (text: string) => {
      if (!text.trim() || thread.isLoading) return;
      thread.submit(
        {
          messages: [
            {
              type: "human",
              content: text,
            },
          ],
        },
        { config: { configurable: { myShopifyDomain: myShopifyDomain } } }
      );
    };
    onSendFn(sendMessage);
  }, [thread, onSendFn, myShopifyDomain]);

  return null; // side-effect only
}
