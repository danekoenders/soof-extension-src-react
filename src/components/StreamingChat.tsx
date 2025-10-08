import { useEffect, useRef } from "react";
import { normalizeProduct } from "../utils/productTransforms";
import type { ProductMeta } from "../types/product";
import type { GuardrailData, ClaimsValidation } from "../types/guardrail";

type LocalGuardrailState = GuardrailData & {
  hasClearedForRegen?: boolean;
};

type SimpleMessage = {
  id?: string;
  type: "human" | "ai" | "tool" | "phase";
  content?: string;
  name?: string;
  _isPlaceholder?: boolean;
  _stream_done?: boolean;
  _guardrailData?: GuardrailData;
  _productMeta?: ProductMeta; // Added for product messages
  _productGroupId?: string; // Added for product messages
  _isFrontendData?: boolean; // Flag for any message generated from frontendData
  _phase?: string; // Phase type: "thinking", "function", etc.
  _phaseMessage?: string; // Optional custom message for the phase
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
  const guardrailStateRef = useRef<LocalGuardrailState | null>(null);

  // keep latest config in a ref so sendMessage always uses fresh values
  useEffect(() => {
    cfgRef.current = { apiBase, jwt, localLanguage, threadToken };
  }, [apiBase, jwt, localLanguage, threadToken]);

  useEffect(() => {
    if (messagesRef.current.length === 0 && initialMessages.length > 0) {
      messagesRef.current = [...initialMessages];
    }
    // Clear messages when initialMessages is explicitly emptied (new chat)
    if (initialMessages.length === 0 && messagesRef.current.length > 0) {
      messagesRef.current = [];
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
        type: "phase",
        _phase: "thinking",
        _phaseMessage: "Thinking",
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

        const updatePlaceholder = (phase: string, message: string) => {
          const current = [...messagesRef.current];
          const idx = current.findIndex((m) => m._isPlaceholder);
          
          if (idx !== -1) {
            // Update existing placeholder
            current[idx] = { 
              ...current[idx], 
              type: "phase",
              _phase: phase,
              _phaseMessage: message 
            } as SimpleMessage;
          } else {
            // Create new placeholder if none exists
            const newPlaceholder: SimpleMessage = {
              id: `placeholder-${Date.now()}`,
              type: "phase",
              _phase: phase,
              _phaseMessage: message,
              _isPlaceholder: true,
            };
            current.push(newPlaceholder);
          }
          
          messagesRef.current = current;
          onMessages(current);
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
                  console.log('🎯 Phase event:', event.phase, 'current guardrailState:', guardrailStateRef.current);
                  
                  // Handle guardrail phases
                  if (event.phase === "validating") {
                    // Store the original response when validation starts
                    const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                    const last = current[current.length - 1];
                    
                    if (last && last.type === "ai" && last.content) {
                      guardrailStateRef.current = {
                        wasRegenerated: false,
                        validationPhase: event.phase,
                        originalResponse: last.content,
                      };
                      
                      last._guardrailData = { ...guardrailStateRef.current };
                      messagesRef.current = [...current.slice(0, -1), last];
                      onMessages(messagesRef.current);
                    }
                  } else if (event.phase === "regenerating") {
                    // Update phase to regenerating
                    console.log('✨ Setting regenerating phase');
                    let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                    
                    // IMMEDIATELY remove old frontendData messages when regeneration starts
                    const frontendDataCount = current.filter(m => m._isFrontendData).length;
                    if (frontendDataCount > 0) {
                      console.log(`  → Removing ${frontendDataCount} old frontendData messages immediately`);
                      current = current.filter(m => !m._isFrontendData);
                    }
                    
                    // Get the last AI message AFTER filtering out frontendData
                    const last = current[current.length - 1];
                    
                    if (guardrailStateRef.current) {
                      guardrailStateRef.current.validationPhase = event.phase;
                      guardrailStateRef.current.hasClearedForRegen = false;
                      
                      // Update the current AI message with regenerating status
                      if (last && last.type === "ai") {
                        last._guardrailData = { ...guardrailStateRef.current };
                        messagesRef.current = [...current.slice(0, -1), last];
                        onMessages(messagesRef.current);
                      }
                    } else {
                      // If no guardrail state exists yet, create one
                      // Store original response if available, otherwise empty string
                      const originalResponse = (last && last.type === "ai" && last.content) ? last.content : "";
                      
                      guardrailStateRef.current = {
                        wasRegenerated: true,
                        validationPhase: event.phase,
                        originalResponse,
                        hasClearedForRegen: false, // CRITICAL: Set to false so first delta will clear content
                      };
                      console.log('  → Created new guardrail state:', guardrailStateRef.current);
                      
                      if (last && last.type === "ai") {
                        last._guardrailData = { ...guardrailStateRef.current };
                        messagesRef.current = [...current.slice(0, -1), last];
                        onMessages(messagesRef.current);
                      }
                    }
                  } else if (event.phase === "thinking") {
                    // DON'T reset guardrail state if we're in the middle of regeneration
                    if (!guardrailStateRef.current || guardrailStateRef.current.validationPhase !== "regenerating") {
                      console.log('🧠 Thinking phase - resetting guardrail state');
                      guardrailStateRef.current = null;
                    } else {
                      console.log('🧠 Thinking phase - but keeping guardrail state for regeneration');
                    }
                  }
                  updatePlaceholder(event.phase, event.msg || "Working…");
                  break;
                }
                case "assistant_output_start": {
                  // Remove ALL phase indicators/placeholders when assistant starts outputting
                  const withoutPlaceholders = messagesRef.current.filter((m) => !m._isPlaceholder);
                  
                  // If we're regenerating, mark that we should clear content on next delta
                  console.log('🎬 assistant_output_start, guardrailState:', guardrailStateRef.current);
                  if (guardrailStateRef.current?.validationPhase === "regenerating") {
                    console.log('  → Setting hasClearedForRegen = false');
                    guardrailStateRef.current.hasClearedForRegen = false;
                  }
                  
                  messagesRef.current = withoutPlaceholders;
                  onMessages(withoutPlaceholders);
                  break;
                }
                case "delta": {
                  const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const last = current[current.length - 1];
                  
                  // Check if we're in regenerating phase and this is the first delta
                  const isRegenerating = guardrailStateRef.current?.validationPhase === "regenerating";
                  const shouldStartFresh = isRegenerating && last && last.type === "ai" && !guardrailStateRef.current?.hasClearedForRegen;
                  
                  console.log('🔄 Delta received:', {
                    delta: event.delta?.substring(0, 20) + '...',
                    isRegenerating,
                    shouldStartFresh,
                    hasClearedForRegen: guardrailStateRef.current?.hasClearedForRegen,
                    lastExists: !!last,
                    lastType: last?.type,
                    lastDone: last?._stream_done,
                    currentContent: last?.content?.substring(0, 30) + '...'
                  });
                  
                  // During regeneration, ALWAYS reuse the last message, never create a new one
                  if (!last || last.type !== "ai" || (last._stream_done && !isRegenerating)) {
                    // Create new AI message ONLY if not regenerating
                    console.log('  → Creating NEW AI message');
                    const aiMsg: SimpleMessage = { 
                      type: "ai", 
                      content: event.delta || "", 
                      _stream_done: false,
                      _guardrailData: guardrailStateRef.current ? { ...guardrailStateRef.current } : undefined
                    };
                    messagesRef.current = [...current, aiMsg];
                  } else if (shouldStartFresh) {
                    // START FRESH: Replace old content entirely
                    console.log('✨ Starting fresh with regenerated content');
                    last.content = event.delta || "";
                    last._stream_done = false;
                    last._guardrailData = { ...guardrailStateRef.current! };
                    guardrailStateRef.current!.hasClearedForRegen = true;
                    messagesRef.current = [...current.slice(0, -1), last];
                  } else {
                    // Append to existing content
                    last.content = (last.content || "") + (event.delta || "");
                    last._stream_done = false;
                    // Preserve or update guardrail data
                    if (guardrailStateRef.current) {
                      last._guardrailData = { ...guardrailStateRef.current };
                    }
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

                  // if we are regenerating, keep the same AI message (do nothing extra)
                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "done": {
                  // finalize last ai message
                  let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const last = current[current.length - 1];
                  const wasRegenerated = event.claimsValidation?.wasRegenerated;
                  
                  console.log('✅ Done event:', {
                    wasRegenerated,
                    currentMessageCount: current.length,
                    lastMessage: last?.content?.substring(0, 50)
                  });
                  
                  if (last && last.type === "ai") {
                    last._stream_done = true;
                    
                    // Handle claims validation data if present
                    if (event.claimsValidation) {
                      const claimsValidation: ClaimsValidation = {
                        isCompliant: event.claimsValidation.isCompliant || false,
                        violatedClaims: event.claimsValidation.violatedClaims || [],
                        allowedClaims: event.claimsValidation.allowedClaims || [],
                        suggestions: event.claimsValidation.suggestions || [],
                        complianceScore: event.claimsValidation.complianceScore || 0,
                      };
                      
                      const guardrailData: GuardrailData = {
                        wasRegenerated: event.claimsValidation.wasRegenerated || false,
                        originalResponse: event.claimsValidation.originalResponse,
                        regeneratedResponse: event.claimsValidation.regeneratedResponse,
                        claimsValidation,
                        validationPhase: 'done',
                      };
                      
                      last._guardrailData = guardrailData;
                      guardrailStateRef.current = null; // Reset state
                    }
                  }

                  // If response was regenerated, remove ALL frontendData messages from the original response
                  if (wasRegenerated) {
                    console.log('🗑️ Removing old frontendData messages - count before:', current.length);
                    console.log('  → Current messages:', current.map((m, i) => ({ 
                      index: i, 
                      type: m.type, 
                      isFrontendData: !!m._isFrontendData,
                      hasProductMeta: !!m._productMeta,
                      contentPreview: m.content?.substring(0, 30)
                    })));
                    
                    // Remove ALL frontendData messages (any message marked with _isFrontendData)
                    const frontendDataCount = current.filter(m => m._isFrontendData).length;
                    current = current.filter(m => !m._isFrontendData);
                    console.log(`  → Removed ${frontendDataCount} frontendData messages, now ${current.length} messages`);
                  }

                  // Add new frontendData messages from the (potentially regenerated) response
                  try {
                    const products = Array.isArray(event.frontendData?.products)
                      ? event.frontendData.products
                      : [];
                    if (products.length > 0) {
                      console.log('  → Adding', products.length, 'new product messages');
                      const groupId = `product-group-${Date.now()}`;
                      const productMessages = products
                        .map((p: any) => normalizeProduct(p))
                        .filter(Boolean)
                        .map((pm: ProductMeta, idx: number) => ({
                          id: `${groupId}-${idx}`,
                          type: "ai",
                          content: "",
                          _stream_done: true,
                          _productMeta: pm,
                          _productGroupId: groupId,
                          _isFrontendData: true, // Mark as frontendData message
                        } as any));
                      current = [...current, ...productMessages];
                      console.log('  → Final message count:', current.length);
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
