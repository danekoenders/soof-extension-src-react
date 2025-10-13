import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import Header from "./components/Header";
import Messages, { type MessagesRef } from "./components/messages/Messages";
import Input from "./components/Input";
import Sources, { type SourceGroup } from "./components/Sources";
import { useChatSession } from "./hooks/useChatSession";
import StreamingChat from "./components/StreamingChat";
import { useCache } from "./hooks/useCache";
import { normalizeProduct } from "./utils/productTransforms";
import type { GuardrailData } from "./types/guardrail";
import type { ProductMeta } from "./types/product";
// import { useHost } from "./hooks/useHost";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

interface ServeData {
  settings: {
    agentName: string;
    theme: any;
    functions: any;
    primaryColor?: string;
    secondaryColor?: string;
  };
  name: string;
  myShopifyDomain: string;
}

type BlockChange = {
  blockIndex: number;
  newBlock: string;
};

// Minimal message type for Messages component
export interface Message {
  id?: string;
  role: "user" | "assistant" | "assistant-error" | "phase";
  type: "normal" | "product";
  content?: string;
  productMeta?: any;
  productGroupId?: string;
  options?: { label: string; value: string }[];
  isWelcome?: boolean;
  loading?: boolean;
  guardrailData?: GuardrailData;
  phase?: string;
  phaseMessage?: string;
  blockChanges?: BlockChange[];
  originalContent?: string;
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
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  // const hostOrigin = useHost();
  // const BACKEND_BASE = `${hostOrigin}/apps/soof`;
  // const BACKEND_BASE = "https://soof-s--development.gadget.app";
  const BACKEND_BASE = "http://localhost:3000";
  // const BACKEND_BASE = "https://laintern-agent.fly.dev";
  const [sendFn, setSendFn] = useState<(text: string) => void>(() => () => {});
  const [isWaitingForSessionState, setIsWaitingForSessionState] = useState(false);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [persistedSources, setPersistedSources] = useState<SourceGroup[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const { cache, setCache, isLoaded: isCacheLoaded } = useCache();

  // Ref for Messages component to enable scrolling to specific messages
  const messagesRef = useRef<MessagesRef>(null);

  // stable callbacks to prevent unnecessary re-renders
  const handleRegisterSendFn = useCallback((fn: (text: string) => void) => {
    setSendFn(() => fn);
  }, []);

  const handleMessages = useCallback((msgs: any[]) => {
    setMessages(msgs);
    
    // Check if we're currently validating by looking at the last AI message's guardrail state
    const lastAIMessage = msgs.filter((m: any) => m.type === "ai" && !m._isFrontendData).pop();
    
    console.log('🔍 handleMessages - checking validation state:', {
      totalMessages: msgs.length,
      hasLastAIMessage: !!lastAIMessage,
      hasGuardrailData: !!lastAIMessage?._guardrailData,
      validationPhase: lastAIMessage?._guardrailData?.validationPhase,
    });
    
    if (lastAIMessage?._guardrailData) {
      const phase = lastAIMessage._guardrailData.validationPhase;
      const shouldValidate = phase === "validating" || phase === "regenerating";
      console.log('  → Setting isValidating to:', shouldValidate, '(phase:', phase, ')');
      setIsValidating(shouldValidate);
    } else {
      console.log('  → No guardrail data, setting isValidating to false');
      setIsValidating(false);
    }
  }, []);

  const handleWaitingForSessionState = useCallback((isWaiting: boolean) => {
    setIsWaitingForSessionState(isWaiting);
  }, []);

  // no-op: threadToken managed in hook

  /* --------------------------- 2. Fetch serveData ------------------------- */
  useEffect(() => {
    if (!isCacheLoaded) return;
    if (cache.data.serveData) {
      setServeData(cache.data.serveData);
      setIsServeLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${BACKEND_BASE}/api/agent/serve`);
        if (!res.ok) throw new Error("Failed to fetch serve data");
        const data: ServeData = await res.json();
        setServeData(data);
        setCache({ serveData: data });
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
        if (!res.ok || !data?.jwt)
          throw new Error(data?.error || "Failed to start session");
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

      // Handle phase indicators (thinking, function calls, etc.)
      // All placeholders are now phase indicators
      if (
        m.type === "phase" ||
        (m as any)._phase ||
        (m as any)._isPlaceholder
      ) {
        return [
          {
            id,
            role: "phase",
            type: "normal",
            phase: (m as any)._phase || "thinking",
            phaseMessage: (m as any)._phaseMessage || "Working…",
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
        const checkoutData = (m as any)._checkoutData;
        const content = (m.content ?? "") as string;
        const isError = (m as any)._isError;

        // Filter out product and checkout messages (they're shown in Sources component)
        if (productMeta || checkoutData) {
          return [];
        }

        // Filter out empty messages
        if (!content.trim()) {
          return [];
        }

        const done = (m as any)._stream_done !== false; // default to true if undefined
        return [
          {
            id,
            role: isError ? "assistant-error" : "assistant",
            type: "normal",
            content: content,
            loading: !done,
            guardrailData: (m as any)._guardrailData,
            blockChanges: (m as any)._blockChanges,
            originalContent: (m as any)._originalContent,
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

    // Only fetch if messages are empty (page refresh/returning user)
    // Skip fetch if we're already in the middle of a conversation
    if (messages.length > 0) {
      hydratedThreadRef.current = token; // Mark as "hydrated" to prevent future fetches
      return;
    }

    (async () => {
      setIsLoadingThread(true);
      try {
        const res = await fetch(
          `${BACKEND_BASE}/api/agent/thread?threadToken=${encodeURIComponent(
            token
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.history) ? data.history : [];

        const extractText = (content: any): string => {
          if (!content) return "";
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content
              .map((c) => (typeof c === "string" ? c : c?.text ?? ""))
              .filter(Boolean)
              .join(" ");
          }
          if (typeof content === "object" && content.text)
            return content.text as string;
          return "";
        };

        const normalized = history
          .flatMap((item: any, historyIndex: number) => {
            const role = item?.role;
            const type = item?.type;

            if (role === "user") {
              const content = extractText(item?.content);
              return [
                {
                  id: `hydrated-user-${historyIndex}-${Date.now()}`,
                  type: "human",
                  content,
                },
              ];
            }

            // Handle assistant messages, including embedded frontend data
            if (role === "assistant" || type === "message") {
              const out: any[] = [];

              // Extract plain text for assistant bubble
              let content: string = extractText(item?.content);
              if (!content) content = item?.text || item?.output || "";
              if (content && content.trim()) {
                out.push({
                  id: `hydrated-text-${historyIndex}-${Date.now()}`,
                  type: "ai",
                  content,
                  _stream_done: true,
                });
              }

              // Extract guardrails metadata and attach to the text message
              try {
                const blocks = Array.isArray(item?.content) ? item.content : [];
                const guardrailsBlock = blocks.find(
                  (b: any) => b?.type === "guardrails_metadata"
                );

                if (guardrailsBlock && out.length > 0) {
                  // Attach guardrails data to the first AI text message
                  const textMessage = out[0];
                  textMessage._guardrailData = {
                    wasRegenerated: guardrailsBlock.wasRegenerated || false,
                    claims: guardrailsBlock.claims
                      ? {
                          allowedClaims:
                            guardrailsBlock.claims.allowedClaims || [],
                          violatedClaims:
                            guardrailsBlock.claims.violatedClaims || [],
                        }
                      : undefined,
                    validationPhase: "done", // Hydrated data is always done
                  };
                }
              } catch (_) {
                // ignore malformed guardrails data
              }

              // Extract stored frontend data blocks and append frontend data messages
              try {
                const blocks = Array.isArray(item?.content) ? item.content : [];
                const frontendBlocks = blocks.filter(
                  (b: any) => b?.type === "frontend_data" && b?.data
                );

                for (const block of frontendBlocks) {
                  // Process entries in new format: { entries: [{ type, label, data }] }
                  if (
                    block.data?.entries &&
                    Array.isArray(block.data.entries)
                  ) {
                    for (const entry of block.data.entries) {
                      if (!entry.type || !entry.data) continue;

                      // Skip if products type but data is not a valid array
                      if (
                        entry.type === "products" &&
                        (!Array.isArray(entry.data) || entry.data.length === 0)
                      )
                        continue;

                      const entryType = entry.type;
                      const groupId = `hydrated-${entryType}-${historyIndex}-${Date.now()}`;

                      // Handle products type
                      if (entryType === "products") {
                        const productMessages = entry.data
                          .map((p: any) => normalizeProduct(p))
                          .filter(
                            (pm: ProductMeta | null): pm is ProductMeta =>
                              pm !== null
                          )
                          .map((pm: ProductMeta, idx: number) => ({
                            id: `${groupId}-${idx}`,
                            type: "ai",
                            content: "",
                            _stream_done: true,
                            _productMeta: pm,
                            _productGroupId: groupId,
                            _productGroupType: entryType,
                            _validationComplete: true, // Hydrated data is already validated
                          }));
                        out.push(...productMessages);
                      }
                      // Handle checkout type
                      else if (entryType === "checkout") {
                        // Checkout data is a single object, not an array
                        const checkoutData = entry.data;
                        if (checkoutData) {
                          out.push({
                            id: `${groupId}`,
                            type: "ai",
                            content: "",
                            _stream_done: true,
                            _checkoutData: checkoutData,
                            _productGroupId: groupId,
                            _productGroupType: entryType,
                            _validationComplete: true,
                          });
                        }
                      }
                      // Future: handle other types like "orders", "cart", "customer"
                      // else if (entryType === "orders") { ... }
                    }
                  }
                  // Fallback: Old format { products: [...] } for backward compatibility
                  else if (
                    Array.isArray(block.data?.products) &&
                    block.data.products.length > 0
                  ) {
                    const groupId = `hydrated-products-${historyIndex}-${Date.now()}`;
                    const productMessages = block.data.products
                      .map((p: any) => normalizeProduct(p))
                      .filter(
                        (pm: ProductMeta | null): pm is ProductMeta =>
                          pm !== null
                      )
                      .map((pm: ProductMeta, idx: number) => ({
                        id: `${groupId}-${idx}`,
                        type: "ai",
                        content: "",
                        _stream_done: true,
                        _productMeta: pm,
                        _productGroupId: groupId,
                        _productGroupType: "products",
                        _validationComplete: true,
                      }));
                    out.push(...productMessages);
                  }
                }
              } catch (_) {
                // ignore malformed frontend data
              }

              // If neither text nor frontend data produced output, still return an empty ai to be safe
              if (out.length === 0) {
                out.push({
                  id: `hydrated-empty-${historyIndex}-${Date.now()}`,
                  type: "ai",
                  content: "",
                  _stream_done: true,
                });
              }
              return out;
            }

            return [];
          })
          .filter(Boolean);

        if (normalized.length > 0) {
          setMessages(normalized as any[]);
        }
        hydratedThreadRef.current = token;
      } catch (err) {
        // ignore
      } finally {
        setIsLoadingThread(false);
      }
    })();
  }, [chatSession.threadToken]);

  /* ------------------------------ 5. Handlers ----------------------------- */
  const handleSend = (text: string) => {
    if (!hasValidSession || isSessionLoading) return;
    if (!sendFn || sendFn.toString() === (() => {}).toString()) return;
    // Collapse sources when sending a new message
    setIsSourcesCollapsed(true);
    sendFn(text);
  };

  /* ------------------------------- 6. Render ------------------------------ */

  // Apply theme variables to the document when serveData is available
  useEffect(() => {
    if (!serveData) return;
    const theme = serveData.settings?.theme ?? {};
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
    // Only show welcome message if chat hasn't started AND we're not loading thread data
    if (!chatStarted && !isLoadingThread) {
      base.unshift(WELCOME_MESSAGE);
    }
    return base;
  }, [mappedMessages, chatStarted, isLoadingThread, serveData]);

  /* -------------------- Extract source messages grouped by productGroupId -------------------- */
  const sourceMessages = useMemo((): SourceGroup[] => {
    // Extract directly from raw messages array (not displayMessages which filters out products/checkout)
    const messagesWithFrontendData = messages.filter(
      (msg: any) =>
        (msg._productMeta || msg._checkoutData) &&
        msg.id &&
        msg._productGroupId
    );

    // Group by productGroupId first
    const grouped = messagesWithFrontendData.reduce((acc: any, msg: any) => {
      const groupId = msg._productGroupId;
      if (!acc[groupId]) {
        acc[groupId] = {
          products: [],
          checkout: undefined,
          type: undefined,
        };
      }
      
      // Handle product messages
      if (msg._productMeta) {
        acc[groupId].products.push({
          id: msg.id,
          productMeta: msg._productMeta,
        });
      }
      
      // Handle checkout messages
      if (msg._checkoutData) {
        acc[groupId].checkout = msg._checkoutData;
      }
      
      // Extract type
      if (msg._productGroupType) {
        acc[groupId].type = msg._productGroupType;
      }
      return acc;
    }, {} as Record<string, { products: Array<{ id: string; productMeta: any }>; checkout?: any; type?: string }>);

    // Return all groups (no validation check needed)
    return Object.entries(grouped)
      .map(([groupId, group]: [string, any]) => {
        const result: SourceGroup = {
          groupId,
          type: group.type,
        };
        
        // Add products if they exist
        if (group.products.length > 0) {
          result.products = group.products;
        }
        
        // Add checkout if it exists
        if (group.checkout) {
          result.checkout = group.checkout;
        }
        
        return result;
      });
  }, [messages]);

  /* -------------------- Persist and manage sources -------------------- */
  // Keep sources even when new messages don't have frontendData
  useEffect(() => {
    if (sourceMessages.length > 0) {
      setPersistedSources(sourceMessages);
    }
  }, [sourceMessages]);

  // Use persisted sources to keep them visible even when new messages don't have sources
  const displaySources = sourceMessages.length > 0 ? sourceMessages : persistedSources;

  /* -------------------- Auto-scroll when sources expand -------------------- */
  const prevSourcesLengthRef = useRef(0);
  useEffect(() => {
    const currentLength = sourceMessages.length;
    const prevLength = prevSourcesLengthRef.current;

    // If sources have been added (including first time), expand and scroll to bottom
    if (currentLength > prevLength) {
      // Expand sources when new data arrives
      setIsSourcesCollapsed(false);
      
      // Wait for Sources component's expand animation to complete (300ms) + buffer
      setTimeout(() => {
        messagesRef.current?.scrollToBottom();
      }, 500);
    }

    prevSourcesLengthRef.current = currentLength;
  }, [sourceMessages]);

  /* -------------------- Handle source navigation -------------------- */
  const handleSourceNavigate = useCallback(
    (messageId: string) => {
      // Find the product message in the raw messages array (not checkout)
      const productMessage = messages.find(
        (msg: any) => msg.id === messageId && msg._productMeta && !msg._checkoutData
      );

      if (productMessage?._productGroupId) {
        // Find the index of this product in the raw messages array
        const productIndex = messages.findIndex(
          (msg: any) => msg.id === messageId
        );

        if (productIndex > 0) {
          // Look backwards for the AI text message
          for (let i = productIndex - 1; i >= 0; i--) {
            const prevMsg = messages[i] as any;
            // Find the first AI text message (not a product message)
            if (
              prevMsg.type === "ai" &&
              prevMsg.content &&
              prevMsg.content.trim() &&
              !prevMsg._productMeta &&
              prevMsg.id
            ) {
              messagesRef.current?.scrollToMessage(prevMsg.id);
              return;
            }
            // Stop if we hit a user message (means we've gone too far)
            if (prevMsg.type === "human") {
              break;
            }
          }
        }
      }
    },
    [messages, messagesRef]
  );

  /* -------------------------- New chat handler -------------------------- */
  const handleNewChat = () => {
    // Drop only the thread so next send creates a new one
    setThreadToken(null);
    hydratedThreadRef.current = null;
    // Reset UI state
    setMessages([]);
    setIsWaitingForSessionState(false);
    setPersistedSources([]);
    setIsSourcesCollapsed(false);
    setIsValidating(false);
    // Note: Don't reset sendFn - StreamingChat keeps the same function reference
    setIsLoadingThread(false);
  };

  if (isServeLoading || !serveData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spinner rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="border-solid font-roboto bg-white shadow-lg flex flex-col text-base leading-5 w-full h-[73vh] rounded-2xl overflow-hidden overscroll-contain">
      <Header
        shopName={serveData.name}
        chatbotName={serveData.settings.agentName}
        theme={serveData.settings.theme}
        onRestartChat={handleNewChat}
      />

      <Messages
        ref={messagesRef}
        messages={displayMessages}
        onOptionSelect={handleSend}
        isLoadingThread={isLoadingThread}
      />


      {/* Disclaimer shown only when chat not started and not loading thread */}
      {!chatStarted && !isLoadingThread && (
        <div className="px-4 py-1.5 text-center text-xs text-gray-600 flex flex-col gap-1.5">
          <p className="leading-6 m-0">
            Alle gegevens die je hier achterlaat kunnen uitsluitend worden
            ingezien door de klantenservice van {serveData.name} en door Soof
            AI, om de werking van de chatbot te verbeteren.
          </p>
          <p className="leading-6 m-0">
            Meer informatie vind je in de{" "}
            <a
              href="https://soof.ai/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600"
            >
              Privacy Policy
            </a>
          </p>
          <p className="leading-6 m-0">
            Soof AI kan fouten maken. Controleer belangrijke informatie.
          </p>
        </div>
      )}

      <div className="p-4 pt-0 bg-white relative">
        {/* Validation indicator - overlays above Sources */}
        {isValidating && (
          <div className="absolute -top-[25px] left-0 right-0 z-20 py-0.5 mx-8 border border-b-0 border-green-100 rounded-t-lg bg-green-50/80 backdrop-blur-sm animate-fade-in flex justify-center pointer-events-none">
            <div 
              className="inline-flex items-center gap-2 text-xs text-green-700 cursor-help group relative pointer-events-auto"
              title="We controleren of alle gezondheidsclaims voldoen aan de NVWA-richtlijnen"
            >
              <div className="relative w-3 h-3">
                <div className="absolute inset-0 rounded-full border-2 border-green-300 border-t-green-600 animate-spin"></div>
              </div>
              <span>Bericht checken...</span>
              
              {/* Tooltip */}
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                <div className="font-medium mb-1">Wat checken we?</div>
                <div className="text-gray-300">
                  We controleren of alle gezondheidsclaims in het bericht voldoen aan de officiële NVWA-richtlijnen voor voedingssupplementen.
                </div>
                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Sources component - displays frontendData components in a carousel */}
        <Sources 
          messages={displaySources} 
          onNavigate={handleSourceNavigate}
          isCollapsed={isSourcesCollapsed}
          onToggleCollapse={setIsSourcesCollapsed}
        />

        <Input
          onSend={handleSend}
          disableSend={
            !canStream ||
            isSessionLoading ||
            isWaitingForSessionState ||
            sendFn === undefined ||
            sendFn.toString() === (() => {}).toString()
          }
          theme={serveData.settings.theme}
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
            onWaitingForSessionState={handleWaitingForSessionState}
            initialMessages={messages as any}
          />
        )}

        {/* Footer */}
        <div className="px-1 pt-1 text-[11px] text-gray-400 flex items-center justify-between">
          <span>Powered by Laintern</span>
          <span>protected by reCAPTCHA</span>
        </div>
      </div>
    </div>
  );
}
