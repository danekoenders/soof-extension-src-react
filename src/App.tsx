import { useEffect, useState, useCallback, useMemo, useRef } from "react";

import Header from "./components/Header";
import Messages, { type MessagesRef } from "./components/messages/Messages";
import Input, { type InputRef } from "./components/Input";
import Sources, { type SourceGroup } from "./components/Sources";
import { useChatSession } from "./hooks/useChatSession";
import StreamingChat from "./components/StreamingChat";
import { normalizeProduct } from "./utils/productTransforms";
import type { GuardrailData } from "./types/guardrail";
import type { ProductMeta } from "./types/product";
import type { OptionsData } from "./types/options";
import { getPhaseMessage } from "./types/phase";
import type { SoofConfig } from "./main";
import { useMobileDetection } from "./hooks/useMobileDetection";
import { useHost } from "./hooks/useHost";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

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
  optionsData?: OptionsData;
  loading?: boolean;
  guardrailData?: GuardrailData;
  phase?: string;
  phaseMessage?: string;
  blockChanges?: BlockChange[];
  originalContent?: string;
  renderImmediately?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */

interface AppProps {
  config: SoofConfig;
}

// Shop settings type
interface ShopSettings {
  agentName?: string;
  welcomeMessage?: Message;
}

export default function App({ config }: AppProps) {
  /* ------------------------------- 1. State ------------------------------- */

  const { chatSession, setSessionToken, setThreadToken } = useChatSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const isMobile = useMobileDetection();
  const isMobileWidget = config.type === 'widget' && isMobile;
  const hostOrigin = useHost();
  const BACKEND_BASE = `${hostOrigin}/apps/laintern-proxy`;
  // const BACKEND_BASE = "http://localhost:3000";
  const [sendFn, setSendFn] = useState<
    (text: string, requiredTool?: string) => void
  >(() => () => {});
  const [isWaitingForSessionState, setIsWaitingForSessionState] =
    useState(false);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [persistedSources, setPersistedSources] = useState<SourceGroup[]>([]);
  const resolvedPrimaryColor = config.primaryColor?.trim();
  // Message queue for messages sent before session is ready
  const [queuedMessages, setQueuedMessages] = useState<Array<{ text: string; requiredTool?: string }>>([]);
  // Track if we're processing queued messages to prevent welcome message flash
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Ref for Messages component to enable scrolling to specific messages
  const messagesRef = useRef<MessagesRef>(null);
  const inputRef = useRef<InputRef>(null);
  const hydratedThreadRef = useRef<string | null>(null);
  const appRootRef = useRef<HTMLDivElement | null>(null);
  const shopFetchedRef = useRef(false);

  // stable callbacks to prevent unnecessary re-renders
  const handleRegisterSendFn = useCallback(
    (fn: (text: string, requiredTool?: string) => void) => {
      setSendFn(() => fn);
    },
    []
  );

  const handleMessages = useCallback((msgs: any[]) => {
    setMessages(msgs);
  }, []);

  const handleWaitingForSessionState = useCallback((isWaiting: boolean) => {
    setIsWaitingForSessionState(isWaiting);
  }, []);

  // Process queued messages once session and thread (if applicable) are ready
  useEffect(() => {
    // Don't process if thread is still loading (wait for it to complete first)
    const threadLoading = chatSession.threadToken && isLoadingThread;
    if (!threadLoading && 
        !isWaitingForSessionState &&
        queuedMessages.length > 0 && 
        sendFn && 
        sendFn.toString() !== (() => {}).toString()) {
      // Mark that we're processing the queue (prevents welcome message flash)
      setIsProcessingQueue(true);
      
      // Process all queued messages (sendFn will add them to messages normally)
      const messagesToProcess = [...queuedMessages];
      
      // Small delay to ensure thread messages are fully loaded and StreamingChat is synced
      setTimeout(() => {
        messagesToProcess.forEach(({ text, requiredTool }) => {
          sendFn(text, requiredTool);
        });
        
        // Clear queue after sending (messages are now in the normal messages array)
        setQueuedMessages([]);
        
        // Wait a bit longer before clearing the processing flag to ensure messages are rendered
        setTimeout(() => {
          setIsProcessingQueue(false);
        }, 200);
      }, 100);
    }
  }, [isLoadingThread, chatSession.threadToken, queuedMessages, sendFn, isWaitingForSessionState]);

  // Combine normal messages with queued messages for rendering
  const combinedMessages = useMemo(() => {
    const combined: any[] = [...messages];
    
    // Add queued messages with initializing phase indicator
    if (queuedMessages.length > 0) {
      // Add each queued message as a user message first
      queuedMessages.forEach(({ text }, index) => {
        combined.push({
          id: `queued-user-${Date.now()}-${index}`,
          type: "human",
          content: text,
          _isQueued: true, // Mark so we can identify it
        });
      });
      
      // Add initializing phase indicator after user messages (if we don't already have one)
      const hasInitPhase = combined.some(msg => 
        msg.type === "phase" && (msg as any)._phase === "initializing"
      );
      
      if (!hasInitPhase) {
        combined.push({
          id: `queued-init-${Date.now()}`,
          type: "phase",
          _phase: "initializing",
          _phaseMessage: "💬 Chat aanmaken",
          _isPlaceholder: true,
          _isQueuedPhase: true, // Mark so we can remove it when queue is processed
        });
      }
    }
    
    return combined;
  }, [messages, queuedMessages]);

  const mappedMessages: Message[] = useMemo(() => {
    const processed: any[] = [];
    let pendingProductMeta: any = null;

    // Use combinedMessages instead of messages for rendering
    for (const msg of combinedMessages as any[]) {
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
            phaseMessage:
              (m as any)._phaseMessage || getPhaseMessage((m as any)._phase),
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
        const optionsData = (m as any)._optionsData;
        const renderImmediately = (m as any)._renderImmediately;
        const content = (m.content ?? "") as string;
        const isError = (m as any)._isError;
        const guardrailData = (m as any)._guardrailData;

        // Filter out product and checkout messages (they're shown in Sources component)
        if (productMeta || checkoutData) {
          return [];
        }

        // Filter out empty messages UNLESS they have optionsData
        if (!content.trim() && !optionsData) {
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
            guardrailData: guardrailData,
            optionsData: optionsData,
            renderImmediately: renderImmediately,
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
  }, [combinedMessages]);

  // Fetch shop settings when no thread token (new user)
  useEffect(() => {
    // Wait for session to be initialized from storage before deciding
    if (!chatSession.isInitialized) return;
    // Skip if we have a thread token (shop settings will come from thread endpoint)
    if (chatSession.threadToken) return;
    // Skip if already fetched or currently fetching
    if (shopFetchedRef.current) return;
    
    // Mark as fetched immediately to prevent double calls (React StrictMode)
    shopFetchedRef.current = true;

    (async () => {
      setIsLoadingShop(true);
      try {
        const res = await fetch(`${BACKEND_BASE}/api/shop`);
        if (!res.ok) {
          setIsLoadingShop(false);
          return;
        }
        const data = await res.json();
        
        // Extract shop settings
        if (data?.settings) {
          setShopSettings({
            agentName: data.settings.agentName,
            welcomeMessage: data.settings.welcomeMessage,
          });
        }
      } catch (err) {
        console.error("Failed to fetch shop settings:", err);
        // Reset ref on error so it can retry
        shopFetchedRef.current = false;
      } finally {
        setIsLoadingShop(false);
      }
    })();
  }, [chatSession.isInitialized, chatSession.threadToken]);

  // Hydrate transcript from backend when we have a threadToken
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
      setIsLoadingShop(true);
      try {
        const res = await fetch(
          `${BACKEND_BASE}/api/agent/thread?threadToken=${encodeURIComponent(
            token
          )}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.history) ? data.history : [];
        
        // Extract shop settings from thread response
        if (data?.shop?.settings) {
          setShopSettings({
            agentName: data.shop.settings.agentName,
            welcomeMessage: data.shop.settings.welcomeMessage,
          });
          shopFetchedRef.current = true;
        }
        setIsLoadingShop(false);

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
                      // Extract renderImmediately flag (generic per entry, defaults to false)
                      const renderImmediately =
                        entry.renderImmediately ?? false;

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
                            _renderImmediately: renderImmediately,
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
                            _renderImmediately: renderImmediately,
                          });
                        }
                      }
                      // Handle options type - attach to text message
                      else if (entryType === "options") {
                        const optionsData = entry.data;

                        if (optionsData && out.length > 0) {
                          // Attach options to the first text message in this turn
                          const textMessage = out[0];
                          textMessage._optionsData = optionsData;
                          if (renderImmediately) {
                            textMessage._renderImmediately = true;
                          }
                        } else if (optionsData) {
                          // No text message, create standalone (edge case)
                          out.push({
                            id: `${groupId}`,
                            type: "ai",
                            content: "",
                            _stream_done: true,
                            _optionsData: optionsData,
                            _productGroupId: groupId,
                            _productGroupType: entryType,
                            _isFrontendData: true,
                            _renderImmediately: renderImmediately,
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
  const handleSend = useCallback((text: string, requiredTool?: string) => {
    if (!text.trim()) return;
    
    // Queue the message if chat transport isn't ready yet (shown via combinedMessages)
    // Covers waiting for session_state or thread hydration before sending.
    const shouldQueue = isWaitingForSessionState ||
                        (chatSession.threadToken && isLoadingThread) ||
                        !sendFn || 
                        sendFn.toString() === (() => {}).toString();
    
    if (shouldQueue) {
      // Add to queue (will be rendered via combinedMessages)
      setQueuedMessages(prev => [...prev, { text, requiredTool }]);
      setIsSourcesCollapsed(true);
      return;
    }
    
    // Session and thread (if applicable) are ready, send immediately
    setIsSourcesCollapsed(true);
    sendFn(text, requiredTool);
  }, [isWaitingForSessionState, isLoadingThread, chatSession.threadToken, sendFn]);

  // Expose directMessage function globally for external calls (e.g., from liquid file)
  useEffect(() => {
    // Process any queued messages from before React mounted
    const queue = (window as any).__lainternAgentMessageQueue;
    if (queue && Array.isArray(queue) && queue.length > 0) {
      const queuedMessages = [...queue];
      queue.length = 0; // Clear queue
      
      // Process queued messages
      queuedMessages.forEach(msg => {
        handleSend(msg);
      });
    }
    
    // Replace placeholder with real function
    (window as any).__directMessageToAgent = (message: string) => {
      handleSend(message);
    };
    
    // Also expose the setter function for compatibility
    (window as any).__setDirectMessageHandler = (handler: (message: string) => void) => {
      (window as any).__directMessageToAgent = handler;
    };

    // Cleanup on unmount
    return () => {
      if ((window as any).__directMessageToAgent) {
        delete (window as any).__directMessageToAgent;
      }
      if ((window as any).__setDirectMessageHandler) {
        delete (window as any).__setDirectMessageHandler;
      }
    };
  }, [handleSend]);

  /* ------------------------------- 6. Render ------------------------------ */

  const agentName = shopSettings?.agentName || "Agent";

  /* -------------------------- Derived flags --------------------------- */
  const chatStarted = useMemo(() => {
    // Check combinedMessages to include both normal and queued messages
    // Also check if we're processing the queue to prevent welcome message flash during transition
    return combinedMessages.some((m) => m.type === "human") || isProcessingQueue;
  }, [combinedMessages, isProcessingQueue]);

  /* ---------------------- Welcome + Disclaimer ------------------------ */
  // Use shop settings welcome message (no fallback)
  const welcomeMessage: Message | null = shopSettings?.welcomeMessage || null;
  
  // Check if welcome message should be shown (must exist and have non-empty content)
  const shouldShowWelcomeMessage = welcomeMessage && welcomeMessage.content?.trim() !== "";

  /* -------------------- Inject welcome/disclaimer -------------------- */
  const displayMessages: Message[] = useMemo(() => {
    const base = [...mappedMessages];
    // Only show welcome message if chat hasn't started AND we're not loading thread/shop data AND welcome message has content
    if (!chatStarted && !isLoadingThread && !isLoadingShop && shouldShowWelcomeMessage && welcomeMessage) {
      base.unshift(welcomeMessage);
    }
    return base;
  }, [mappedMessages, chatStarted, isLoadingThread, isLoadingShop, shouldShowWelcomeMessage, welcomeMessage]);

  /* -------------------- Extract source messages grouped by productGroupId -------------------- */
  const sourceMessages = useMemo((): SourceGroup[] => {
    // Extract directly from raw messages array (not displayMessages which filters out products/checkout)
    const messagesWithFrontendData = messages.filter(
      (msg: any) =>
        (msg._productMeta || msg._checkoutData) && msg.id && msg._productGroupId
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
    return Object.entries(grouped).map(([groupId, group]: [string, any]) => {
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
  const displaySources =
    sourceMessages.length > 0 ? sourceMessages : persistedSources;

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
        (msg: any) =>
          msg.id === messageId && msg._productMeta && !msg._checkoutData
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
    // Note: Don't reset sendFn - StreamingChat keeps the same function reference
    setIsLoadingThread(false);
    // Focus on input for new chat
    inputRef.current?.focus();
  };

  /* -------------------------- Close chat handler (mobile widget) -------------------------- */
  const handleCloseChat = useCallback(() => {
    // Close the chat window via the host element (widget or search)
    // Since we're inside a shadow DOM, we access via the root node of our React component
    try {
      // Access the mount point through the app root element's root node
      if (appRootRef.current) {
        const rootNode = appRootRef.current.getRootNode();
        if (rootNode instanceof ShadowRoot) {
          // Method 1: Try to find mount point in shadow root and use its close function
          const mountPoint = rootNode.getElementById('laintern-agent-react-root');
          if (mountPoint && typeof (mountPoint as any).__closeChat === 'function') {
            (mountPoint as any).__closeChat();
            return;
          }
          
          // Method 2: Access host element directly via shadow root
          if (rootNode.host) {
            const hostEl = rootNode.host as any;
            if (hostEl && typeof hostEl.closeChatWindow === 'function') {
              hostEl.closeChatWindow();
              return;
            }
          }
        }
      }
      
      // Method 3: Fallback - query custom elements from main document
      // This should work since custom elements are in the main DOM
      if (typeof document !== 'undefined') {
        const shadowHost = document.querySelector('soof-chat') || 
                          document.querySelector('laintern-agent-widget') ||
                          document.querySelector('[data-laintern-agent-type="widget"]') ||
                          document.querySelector('[data-laintern-agent-type="search"]');
        if (shadowHost && typeof (shadowHost as any).closeChatWindow === 'function') {
          (shadowHost as any).closeChatWindow();
          return;
        }
      }
      
      console.warn('Could not find chat host element to close');
    } catch (error) {
      console.error('Error closing chat:', error);
    }
  }, []);

  return (
    <div
      ref={appRootRef}
      className={`${
        isMobileWidget ? "" : config.type === "widget" ? "rounded-2xl" : ""
      } border-solid font-roboto bg-white ${isMobileWidget ? "" : "shadow-lg"} flex flex-col text-[16px] leading-[20px] w-full h-full overflow-hidden overscroll-contain`}
    >
      <Header
        shopName="Klantenservice"
        agentName={agentName}
        primaryColor={resolvedPrimaryColor}
        secondaryColor={config.secondaryColor}
        onRestartChat={handleNewChat}
        onCloseChat={isMobileWidget ? handleCloseChat : undefined}
        showCloseButton={isMobileWidget}
      />

      <Messages
        ref={messagesRef}
        messages={displayMessages}
        onOptionSelect={handleSend}
        isLoadingThread={isLoadingThread || isLoadingShop}
      />

      {/* Disclaimer shown only when chat not started and not loading thread/shop and welcome message is shown */}
      {!chatStarted && !isLoadingThread && !isLoadingShop && shouldShowWelcomeMessage && (
        <div className="w-[80%] self-center px-4 py-4 text-center text-xs text-gray-500 flex flex-col gap-2">
          <p className="leading-4 m-0">
            Laintern kan fouten maken. Controleer belangrijke informatie.
          </p>
          <p className="leading-4 m-0">
            Lees alles over hoe we je gegevens verwerken in onze{" "}
            <a
              href="https://laintern.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600"
              style={{ color: resolvedPrimaryColor }}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      )}

      <div className="p-4 pt-0 bg-white relative">
        {/* Sources component - displays frontendData components in a carousel */}
        <Sources
          messages={displaySources}
          onNavigate={handleSourceNavigate}
          isCollapsed={isSourcesCollapsed}
          onToggleCollapse={setIsSourcesCollapsed}
        />

        <Input
          ref={inputRef}
          onSend={handleSend}
          disableSend={
            isWaitingForSessionState ||
            sendFn === undefined ||
            sendFn.toString() === (() => {}).toString()
          }
          primaryColor={resolvedPrimaryColor}
          secondaryColor={config.secondaryColor}
          isMobile={false}
        />

        <StreamingChat
          apiBase={BACKEND_BASE}
          sessionToken={chatSession.sessionToken}
          localLanguage={config.language || "en"}
          threadToken={chatSession.threadToken}
          setThreadToken={setThreadToken}
          setSessionToken={setSessionToken}
          onMessages={handleMessages}
          onSendFn={handleRegisterSendFn}
          onWaitingForSessionState={handleWaitingForSessionState}
          initialMessages={messages as any}
        />

        {/* Footer */}
        <div className="px-1 pt-1 text-[11px] text-gray-400 flex items-center justify-between">
          <span>
            Powered by{" "}
            <a
              href="https://laintern.com"
              target="_blank"
              rel="noopener noreferrer"
              style={resolvedPrimaryColor ? { color: resolvedPrimaryColor } : undefined}
            >
              Laintern
            </a>
          </span>
          <span>protected by reCAPTCHA</span>
        </div>
      </div>
    </div>
  );
}
