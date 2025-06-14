import { useCallback, useEffect, useRef } from "react";
import type { Message } from "../App";

interface Props {
  apiUrl: string;
  assistantId: string;
  sessionToken: string;
  myShopifyDomain: string;
  threadId: string | null;
  setThreadId: (id: string | null) => void; // kept for future use, not used here
  onMessages: (delta: Message[]) => void;
  onSendFn: (fn: (text: string) => void) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic payload type from server
type SSEHandler = (event: string | null, payload: unknown) => void;

function streamSSE(res: Response, onEvent: SSEHandler): Promise<void> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const pump = (): Promise<void> =>
    reader.read().then(({ value, done }): Promise<void> => {
      if (done) return Promise.resolve();
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop()!; // incomplete chunk stays in buffer

      for (const rawEvent of events) {
        const lines = rawEvent.trim().split("\n");
        let eventType: string | null = null;
        let dataStr = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataStr += line.slice(5).trim();
          }
        }
        if (!dataStr) continue;
        try {
          const payload = JSON.parse(dataStr);
          if (typeof eventType === "string" && !eventType.endsWith("/complete")) {
            continue; // ignore partial & metadata events
          }
          onEvent(eventType, payload);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Failed to parse SSE payload", err, dataStr);
        }
      }

      return pump();
    });

  return pump();
}

/* -------------------------------------------------------------------------- */
/*                              StreamingChat                                 */
/* -------------------------------------------------------------------------- */

export default function StreamingChat({
  apiUrl,
  assistantId,
  sessionToken,
  myShopifyDomain,
  threadId,
  onMessages,
  onSendFn,
}: Props) {
  const running = useRef(false);

  /* ----------------------------- send function ---------------------------- */
  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || running.current || !threadId) return;
      running.current = true;

      const body = {
        assistant_id: assistantId,
        input: { messages: [{ type: "human", content: text }] },
        stream_mode: ["messages"],
        config: {
          configurable: {
            session_token: sessionToken,
            myShopifyDomain,
          },
        },
      };

      const url = `${apiUrl}/threads/${threadId}/runs/stream`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Session ${sessionToken}`,
          "X-Shopify-Domain": myShopifyDomain,
        },
        body: JSON.stringify(body),
      });

      try {
        await streamSSE(resp, (_eventType, payload) => {
          // We only care about payloads that are (or contain) an array of messages
          const messagesArr = Array.isArray(payload)
            ? (payload as any)
            : (payload as any)?.messages;

          if (!messagesArr || messagesArr.length === 0) return;

          const latest = messagesArr.at(-1);
          if (!latest || !latest.content) return;

          const role =
            (latest.type === "human" || latest.type === "user"
              ? "user"
              : "assistant") as "user" | "assistant";

          const deltaMsg: Message = {
            role,
            type: "normal" as const,
            content: String(latest.content),
          };
          // eslint-disable-next-line no-console
          console.log("Streaming delta", deltaMsg);
          onMessages([
            deltaMsg,
          ]);
        });
      } catch (err) {
        console.error("Streaming error", err);
      } finally {
        running.current = false;
      }
    },
    [apiUrl, assistantId, sessionToken, myShopifyDomain, threadId, onMessages]
  );

  /* expose send fn to parent */
  useEffect(() => {
    onSendFn(send);
  }, [send, onSendFn]);

  return null; // no UI
}
