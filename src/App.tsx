import { useEffect, useState, useCallback, useRef } from "react";
import { Client as LangGraphClient } from "@langchain/langgraph-sdk";
import type { Message as LangGraphMessage } from "@langchain/langgraph-sdk";

import Header from "./components/Header";
import Messages from "./components/Messages";
import Input from "./components/Input";
import { useChatSession } from "./hooks/useChatSession";
import StreamingChat from "./components/StreamingChat";
import "./App.css";
import { useCache } from "./hooks/useCache";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface ServeData {
  chatbot: {
    name: string;
    customName: string;
  };
  shop: {
    name: string;
    myShopifyDomain: string;
  };
}

// Minimal message type for Messages component
export interface Message {
  id?: string;
  role: "user" | "assistant";
  type: "normal" | "product";
  content?: string;
  productMeta?: any;
}

/* -------------------------------------------------------------------------- */
/*                               Helper Values                                */
/* -------------------------------------------------------------------------- */

const SOOF_PROXY_URI = "soof-proxy--dev";
const LOCAL_LANGUAGE = "en";
const PLACEHOLDER_THEME = {
  primaryBackground: "#000000",
  secondaryBackground: "#ffffff",
  background: "#ffffff",
  primaryAccent: "#000000",
  tertiaryAccent: "#000000",
  secondaryText: "#ffffff",
  primaryText: "#000000",
  secondaryBorder: "#cccccc",
  disabledBackground: "#eeeeee",
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function App() {
  /* ------------------------------- 1. State ------------------------------- */

  const [serveData, setServeData] = useState<ServeData | null>(null);
  const [isServeLoading, setIsServeLoading] = useState(true);

  const { chatSession, setChatSession } = useChatSession();
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(
    chatSession.threadId ?? null
  );
  const [messages, setMessages] = useState<LangGraphMessage[]>([]);
  const [sendFn, setSendFn] = useState<(text: string) => void>(() => () => {});

  const { cache, setCache, isLoaded: isCacheLoaded } = useCache();

  // stable callbacks to prevent unnecessary re-renders
  const handleRegisterSendFn = useCallback((fn: (text: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handleMessages = useCallback((msgs: LangGraphMessage[]) => {
    setMessages(msgs);
  }, []);

  // Sync threadId when chatSession loaded from localStorage
  useEffect(() => {
    if (chatSession.threadId && threadId === null) {
      setThreadId(chatSession.threadId);
    }
  }, [chatSession.threadId]);

  /* --------------------------- 2. Fetch serveData ------------------------- */
  useEffect(() => {
    if (!isCacheLoaded) return;
    // If cache exists and has chatbot and shop, use it
    if (cache.data.chatbot && cache.data.shop) {
      setServeData({
        chatbot: cache.data.chatbot,
        shop: cache.data.shop,
      });
      setIsServeLoading(false);
      return;
    }
    // Otherwise, fetch and cache
    (async () => {
      try {
        const res = await fetch(`/apps/${SOOF_PROXY_URI}/chatbot/serve`);
        if (!res.ok) throw new Error("Failed to fetch serve data");
        const data: ServeData = await res.json();
        setServeData(data);
        setCache({ chatbot: data.chatbot, shop: data.shop });
      } catch (err) {
        console.error(err);
      } finally {
        setIsServeLoading(false);
      }
    })();
  }, [isCacheLoaded]);

  /* --------------------------- 3. Fetch chat token ------------------------ */
  useEffect(() => {
    if (!serveData) return; // wait for serveData
    if (chatSession.active) return; // already have session

    setIsSessionLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/apps/${SOOF_PROXY_URI}/chat/session/chatToken`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ localLanguage: LOCAL_LANGUAGE }),
          }
        );
        if (!res.ok) throw new Error("Failed to create chat session");
        const data = await res.json();

        setChatSession({
          active: true,
          sessionToken: data.token,
          expiresAt: data.expiresAt,
          assistantId: data.assistant,
          threadId: data.thread,
          langGraphUrl: data.langGraphUrl,
          transcript: [],
        });
        setThreadId(data.thread);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSessionLoading(false);
      }
    })();
  }, [serveData]);

  /* -------------------------- 4. LangGraph Stream ------------------------- */
  const hasValidSession =
    chatSession.active &&
    chatSession.langGraphUrl &&
    chatSession.assistantId &&
    chatSession.sessionToken;

  const canStream = hasValidSession && threadId !== null;

  const mappedMessages: Message[] = messages.flatMap((m) => {
    const id = (m as any).id as string | undefined;
    // human/user
    if (m.type === "human") {
      return [
        { id, role: "user", type: "normal", content: m.content as string },
      ];
    }

    // AI normal assistant message
    if (m.type === "ai") {
      return [
        {
          id,
          role: "assistant",
          type: "normal",
          content: m.content as string,
        },
      ];
    }

    // tool call final message with content json
    if (m.type === "tool" && m.content) {
      try {
        const parsed = JSON.parse(m.content as string);
        // check if metadata contains product info
        if (parsed?.metadata?.title) {
          return [
            {
              id,
              role: "assistant",
              type: "product",
              productMeta: parsed.metadata as any,
            } as any,
          ];
        }
      } catch (_) {
        // ignore parse error
      }
      // fallback
      return [
        {
          id,
          role: "assistant",
          type: "normal",
          content:
            typeof m.content === "string"
              ? m.content
              : JSON.stringify(m.content),
        },
      ];
    }

    return [];
  });

  /* ------------------------ 4b. Load transcript ------------------------ */
  const fetchedInitialRef = useRef(false);
  useEffect(() => {
    if (fetchedInitialRef.current) return;
    if (!hasValidSession || !threadId) return;
    if (messages.length > 0) return; // already have msgs

    const client = new LangGraphClient({
      apiUrl: chatSession.langGraphUrl!,
      defaultHeaders: {
        Authorization: `Session ${chatSession.sessionToken}`,
        "X-Shopify-Domain": serveData?.shop.myShopifyDomain ?? "",
      },
    } as any);

    (async () => {
      try {
        const thread = await client.threads.get(threadId);
        const initialMsgs = (thread as any)?.values?.messages as LangGraphMessage[] | undefined;
        if (initialMsgs && initialMsgs.length) {
          setMessages(initialMsgs);
        }
      } catch (err) {
        console.error("Failed to load existing transcript", err);
      } finally {
        fetchedInitialRef.current = true;
      }
    })();
  }, [
    hasValidSession,
    threadId,
    chatSession.sessionToken,
    chatSession.langGraphUrl,
    serveData,
  ]);

  /* ------------------------------ 5. Handlers ----------------------------- */
  const handleSend = (text: string) => {
    if (
      !hasValidSession ||
      isSessionLoading ||
      sendFn === undefined ||
      sendFn.toString() === (() => {}).toString()
    )
      return;
    sendFn(text);
  };

  /* ------------------------------- 6. Render ------------------------------ */

  // Apply theme variables to the document when serveData is available
  useEffect(() => {
    if (!serveData) return;
    const theme = (serveData.chatbot as any).theme ?? {};
    Object.entries(theme).forEach(([key, value]) => {
      if (typeof value === "string") {
        // css custom property names should be kebab-case
        const cssVarName = `--${key}`.replace(/([A-Z])/g, "-$1").toLowerCase();
        document.documentElement.style.setProperty(cssVarName, value);
      }
    });
  }, [serveData]);

  if (isServeLoading || !serveData) {
    return (
      <div className="chat-loading">
        <div className="loader">Loading configuration…</div>
      </div>
    );
  }

  return (
    <div className="chatbot">
      <Header
        shopName={serveData.shop.name}
        chatbotName={serveData.chatbot.customName}
        theme={PLACEHOLDER_THEME}
        onRestartChat={() => window.location.reload()}
      />

      <Messages messages={mappedMessages} />

      <div style={{ padding: "8px" }}>
        {/* thread loading indicator will be inside StreamingChat triggering messages; not exposed here */}
        {/* Connecting indicator while fetching session */}
        {isSessionLoading && <span>Connecting…</span>}

        <Input
          onSend={handleSend}
          disabled={
            !canStream ||
            isSessionLoading ||
            sendFn === undefined ||
            sendFn.toString() === (() => {}).toString()
          }
          theme={PLACEHOLDER_THEME}
          isMobile={false}
        />

        {canStream && (
          <StreamingChat
            apiUrl={chatSession.langGraphUrl!}
            assistantId={chatSession.assistantId!}
            sessionToken={chatSession.sessionToken!}
            myShopifyDomain={serveData.shop.myShopifyDomain}
            threadId={threadId}
            setThreadId={setThreadId}
            onMessages={handleMessages}
            onSendFn={handleRegisterSendFn}
          />
        )}
      </div>
    </div>
  );
}
