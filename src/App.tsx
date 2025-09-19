import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import Header from "./components/Header";
import Messages from "./components/messages/Messages";
import Input from "./components/Input";
import { useChatSession } from "./hooks/useChatSession";
import StreamingChat from "./components/StreamingChat";
import { useCache } from "./hooks/useCache";
// import { useHost } from "./hooks/useHost";

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

const LOCAL_LANGUAGE = "en";

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

export default function App() {
  /* ------------------------------- 1. State ------------------------------- */

  const [serveData, setServeData] = useState<ServeData | null>(null);
  const [isServeLoading, setIsServeLoading] = useState(true);

  const { chatSession, setJwt, setThreadToken } = useChatSession();
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  // const hostOrigin = useHost();
  // const BACKEND_BASE = `${hostOrigin}/apps/soof`;
  const BACKEND_BASE = "https://soof-s--development.gadget.app";
  const [sendFn, setSendFn] = useState<(text: string) => void>(() => () => {});

  const { cache, setCache, isLoaded: isCacheLoaded } = useCache();

  // stable callbacks to prevent unnecessary re-renders
  const handleRegisterSendFn = useCallback((fn: (text: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handleMessages = useCallback((msgs: any[]) => {
    setMessages(msgs);
  }, []);

  // no-op: threadToken managed in hook

  /* --------------------------- 2. Fetch serveData ------------------------- */
  useEffect(() => {
    if (!isCacheLoaded) return;
    if (cache.data.chatbot && cache.data.shop) {
      setServeData({ chatbot: cache.data.chatbot, shop: cache.data.shop });
      setIsServeLoading(false);
      return;
    }
    (async () => {
      try {
        // If you have a serve endpoint, call it. Placeholder keeps previous flow until backend ready.
        const data: ServeData = {
          chatbot: { name: "Soof", customName: "Soof", theme: {} },
          shop: { name: "Shop", myShopifyDomain: window.location.hostname },
        } as any;
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
    if (!serveData) return;
    if (chatSession.active) return;
    setIsSessionLoading(true);
    (async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/api/agent/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localLanguage: LOCAL_LANGUAGE }),
        });
        const data = await res.json();
        if (!res.ok || !data?.jwt) throw new Error(data?.error || "Failed to start session");
        // JWT exp is 1h. Store with TTL of 59m to be safe.
        setJwt(data.jwt, 59 * 60 * 1000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSessionLoading(false);
      }
    })();
  }, [serveData, chatSession.active, setJwt]);

  const hasValidSession = chatSession.active && !!chatSession.jwt;
  const canStream = hasValidSession; // threadToken optional on first message

  const mappedMessages: Message[] = useMemo(() => {
    const processed: any[] = [];
    let pendingProductMeta: any = null;

    for (const msg of messages as any[]) {
      if (msg.type === "tool") {
        if ((msg as any).name === "product_info") {
          if (typeof msg.content === "string") {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed?.metadata) {
                pendingProductMeta = parsed.metadata;
              }
            } catch (e) {
              console.error("Failed to parse product info", e);
            }
          }
          continue;
        }

        // For all other tools we simply do not push the message into the UI.
        continue;
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

  // Hydrate transcript from backend when we have a threadToken
  const hydratedThreadRef = useRef<string | null>(null);
  useEffect(() => {
    const token = chatSession.threadToken;
    if (!token) return;
    if (hydratedThreadRef.current === token) return;

    (async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/api/agent/thread?threadToken=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.history) ? data.history : [];

        const extractText = (content: any): string => {
          if (!content) return "";
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content
              .map((c) => (typeof c === "string" ? c : (c?.text ?? "")))
              .filter(Boolean)
              .join(" ");
          }
          if (typeof content === "object" && content.text) return content.text as string;
          return "";
        };

        const normalized = history
          .map((item: any) => {
            const role = item?.role;
            const type = item?.type;
            if (role === "user") {
              const content = extractText(item?.content);
              return { type: "human", content };
            }
            if (role === "assistant") {
              let content: string = extractText(item?.content);
              if (!content) content = item?.text || item?.output || "";
              return { type: "ai", content, _stream_done: true };
            }
            // fallback: if it's a message-like without role
            if (type === "message") {
              const content = extractText(item?.content);
              return { type: "ai", content, _stream_done: true };
            }
            return null;
          })
          .filter(Boolean);

        if (normalized.length > 0) {
          setMessages((prev) => (prev.length === 0 ? (normalized as any[]) : prev));
        }
        hydratedThreadRef.current = token;
      } catch (err) {
        // ignore
      }
    })();
  }, [chatSession.threadToken]);

  /* ------------------------------ 5. Handlers ----------------------------- */
  const handleSend = (text: string) => {
    if (!hasValidSession || isSessionLoading) return;
    if (!sendFn || sendFn.toString() === (() => {}).toString()) return;
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
  const handleNewChat = () => {
    // Drop only the thread so next send creates a new one
    setThreadToken(null);
    hydratedThreadRef.current = null;
    // Reset UI state
    setMessages([]);
    setSendFn(() => () => {});
  };

  if (isServeLoading || !serveData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading configuration…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="font-roboto bg-white shadow-lg flex flex-col text-base leading-5 w-full max-w-sm h-3/5 min-h-96 max-h-[80vh] rounded-2xl overflow-hidden overscroll-contain">
      <Header
        shopName={serveData.shop.name}
        chatbotName={serveData.chatbot.customName}
        theme={serveData.chatbot.theme}
        onRestartChat={handleNewChat}
      />

      <Messages messages={displayMessages} onOptionSelect={handleSend} />

      {/* Disclaimer shown only when chat not started */}
      {!chatStarted && (
        <div className="px-4 py-1.5 text-center text-xs text-gray-600 flex flex-col gap-1.5">
          <p className="leading-6 m-0">
            Alle gegevens die je hier achterlaat kunnen uitsluitend worden ingezien door de klantenservice van {serveData.shop.name} en door Soof AI, om de werking van de chatbot te verbeteren.
          </p>
          <p className="leading-6 m-0">Meer informatie vind je in de <a href="https://soof.ai/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600">Privacy Policy</a></p>
          <p className="leading-6 m-0">Soof AI kan fouten maken. Controleer belangrijke informatie.</p>
        </div>
      )}

      <div className="p-2">
        {/* Connecting indicator while fetching session */}
        {isSessionLoading && <span className="text-sm text-gray-500">Connecting…</span>}

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
            apiBase={BACKEND_BASE}
            jwt={chatSession.jwt!}
            localLanguage={LOCAL_LANGUAGE}
            threadToken={chatSession.threadToken}
            setThreadToken={(t) => setThreadToken(t)}
            onMessages={handleMessages}
            onSendFn={handleRegisterSendFn}
            initialMessages={messages as any}
          />
        )}
      </div>
    </div>
  );
}
