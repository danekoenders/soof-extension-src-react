import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Client as LangGraphClient } from "@langchain/langgraph-sdk";
import type { Message as LangGraphMessage } from "@langchain/langgraph-sdk";

import Header from "./components/Header";
import Messages from "./components/messages/Messages";
import Input from "./components/Input";
import { useChatSession } from "./hooks/useChatSession";
import StreamingChat from "./components/StreamingChat";
import { useCache } from "./hooks/useCache";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface ServeData {
  chatbot: {
    name: string;
    customName: string;
    theme: any;
  };
  shop: {
    name: string;
    myShopifyDomain: string;
  };
}

// Minimal message type for Messages component
export interface Message {
  id?: string;
  role: "user" | "assistant" | "assistant-loading";
  type: "normal" | "product";
  content?: string;
  productMeta?: any;
  options?: { label: string; value: string }[];
  isWelcome?: boolean;
  loading?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                               Helper Values                                */
/* -------------------------------------------------------------------------- */

const SOOF_PROXY_URI = "soof-proxy--dev";
const LOCAL_LANGUAGE = "en";

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function App() {
  /* ------------------------------- 1. State ------------------------------- */

  const [serveData, setServeData] = useState<ServeData | null>(null);
  const [isServeLoading, setIsServeLoading] = useState(true);

  const { chatSession, setChatSession, clearChatSession } = useChatSession();
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

  const mappedMessages: Message[] = useMemo(() => {
    const processed: LangGraphMessage[] = [];
    let pendingProductMeta: any = null;

    for (const msg of messages) {
      if (msg.type === "tool" && typeof msg.content === "string") {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed?.metadata?.title) {
            pendingProductMeta = parsed.metadata;
            continue; // skip tool message itself
          }
        } catch (e) {
          /* ignore parse errors */
        }
      }

      if (msg.type === "ai") {
        if (pendingProductMeta) {
          (msg as any)._productMeta = pendingProductMeta;
          pendingProductMeta = null;
        }
      }

      processed.push(msg);
    }

    // Fallback: if product meta at end with no AI message, create lone AI entry
    if (pendingProductMeta) {
      processed.push({
        type: "ai",
        content: "",
        _productMeta: pendingProductMeta,
      } as any);
    }

    return processed.flatMap((m): Message[] => {
      const id = (m as any).id as string | undefined;

      // Detect our custom loading placeholder messages injected by StreamingChat
      if ((m as any)._isPlaceholder) {
        return [
          {
            id,
            role: "assistant-loading",
            type: "normal",
            content: (m.content ?? "") as string,
            loading: true,
          },
        ];
      }

      if (m.type === "human") {
        return [
          { id, role: "user", type: "normal", content: m.content as string },
        ];
      }

      if (m.type === "ai") {
        const productMeta = (m as any)._productMeta;
        const content = ((m.content ?? "") as string);
        if (!productMeta && !content.trim()) {
          return [];
        }
        const done = (m as any)._stream_done !== false; // default to true if undefined
        return [
          {
            id,
            role: "assistant",
            type: productMeta ? "product" : "normal",
            content: content,
            productMeta: productMeta,
            loading: !done,
          },
        ];
      }

      if (m.type === "tool" && m.content) {
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
  }, [messages]);

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

  /* -------------------------- Derived flags --------------------------- */
  const chatStarted = useMemo(() => {
    return messages.some((m) => m.type === "human");
  }, [messages]);

  /* ---------------------- Welcome + Disclaimer ------------------------ */
  const WELCOME_MESSAGE: Message = {
    role: "assistant",
    type: "normal",
    content:
      "Hey! 👋 Ik ben Soof, de virtuele assistent🤖 van deze webwinkel. Ik kan de meeste van je vragen beantwoorden. Stel gerust een vraag of kies een van de suggesties hieronder!",
    options: [
      { label: "Bezorgstatus opvragen..", value: "Waar is mijn bestelling?" },
      { label: "Product zoeken..", value: "Ik zoek een product" },
      { label: "Medewerker spreken..", value: "Ik wil een medewerker spreken" },
      { label: "Retourneren..", value: "Ik wil een retourneren" },
    ],
    isWelcome: true,
  } as any;

  /* -------------------- Inject welcome/disclaimer -------------------- */
  const displayMessages: Message[] = useMemo(() => {
    const base = [...mappedMessages];
    if (!chatStarted) {
      base.unshift(WELCOME_MESSAGE);
    }
    return base;
  }, [mappedMessages, chatStarted, serveData]);

  /* -------------------------- New chat handler -------------------------- */
  const handleNewChat = async () => {
    // Clear session data and localStorage
    clearChatSession();

    // Reset local state
    setThreadId(null);
    setMessages([]);
    setSendFn(() => () => {});

    // Fetch a new chat session
    setIsSessionLoading(true);
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

      // Save new session
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
  };

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
        theme={serveData.chatbot.theme}
        onRestartChat={handleNewChat}
      />

      <Messages messages={displayMessages} onOptionSelect={handleSend} />

      {/* Disclaimer shown only when chat not started */}
      {!chatStarted && (
        <div className="chat-disclaimer">
          <p>
            Alle gegevens die je hier achterlaat kunnen uitsluitend worden ingezien door de klantenservice van {serveData.shop.name} en door Soof AI, om de werking van de chatbot te verbeteren.
          </p>
          <p>Meer informatie vind je in de <a href="https://soof.ai/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></p>
          <p>Soof AI kan fouten maken. Controleer belangrijke informatie.</p>
        </div>
      )}

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
          theme={serveData.chatbot.theme}
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
            initialMessages={messages}
          />
        )}
      </div>
    </div>
  );
}
