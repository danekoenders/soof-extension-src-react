import { useEffect, useRef } from "react";
import { normalizeProduct } from "../utils/productTransforms";
import type { ProductMeta } from "../types/product";
import type { GuardrailData } from "../types/guardrail";
import type { OptionsData } from "../types/options";
import { getPhaseMessage } from "../types/phase";

type LocalGuardrailState = GuardrailData & {
  hasClearedForRegen?: boolean;
};

type BlockChange = {
  blockIndex: number;
  newBlock: string;
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
  _checkoutData?: any; // Added for checkout messages
  _optionsData?: OptionsData; // Added for options messages
  _productGroupId?: string; // Group ID for frontend data entries
  _productGroupType?: string; // Type of the group (e.g. "products", "orders", "cart", "checkout", "options")
  _isFrontendData?: boolean; // Flag for any message generated from frontendData
  _phase?: string; // Phase type: "thinking", "function", etc.
  _phaseMessage?: string; // Optional custom message for the phase
  _isError?: boolean; // Flag for error messages
  _blockChanges?: BlockChange[]; // Block-level diff for regeneration
  _originalContent?: string; // Original content before regeneration
  _renderImmediately?: boolean; // Flag to render immediately without waiting for validation (generic for all entry types)
};

interface StreamingChatProps {
  apiBase: string; // e.g., origin for proxy or full backend origin
  jwt: string;
  localLanguage: string;
  threadToken: string | null;
  setThreadToken: (token: string | null) => void;
  onMessages: (msgs: SimpleMessage[]) => void;
  onSendFn: (fn: (text: string, requiredTool?: string) => void) => void;
  initialMessages?: SimpleMessage[];
  onWaitingForSessionState?: (isWaiting: boolean) => void; // Callback to notify when waiting for session_state
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
  onWaitingForSessionState,
}: StreamingChatProps) {
  const messagesRef = useRef<SimpleMessage[]>([]);
  const cfgRef = useRef({ apiBase, jwt, localLanguage, threadToken });
  const guardrailStateRef = useRef<LocalGuardrailState | null>(null);
  const waitingForSessionStateRef = useRef<boolean>(false);
  const blockChangesRef = useRef<BlockChange[]>([]);
  const originalContentRef = useRef<string>("");

  // keep latest config in a ref so sendMessage always uses fresh values
  useEffect(() => {
    cfgRef.current = { apiBase, jwt, localLanguage, threadToken };
  }, [apiBase, jwt, localLanguage, threadToken]);

  useEffect(() => {
    // Initialize from initialMessages if empty
    if (messagesRef.current.length === 0 && initialMessages.length > 0) {
      messagesRef.current = [...initialMessages];
      onMessages(messagesRef.current);
    }
    // Sync when initialMessages updates with thread messages (after loading)
    // If messagesRef only has placeholder/queued messages, replace with thread messages
    else if (initialMessages.length > 0 && messagesRef.current.length > 0) {
      // Check if messagesRef only has placeholder/queued messages (no real thread messages)
      const hasOnlyPlaceholders = messagesRef.current.every(msg => 
        msg.id?.startsWith('queued-') || 
        msg.id?.startsWith('placeholder-') ||
        (msg as any)._isPlaceholder ||
        (msg as any)._isQueued
      );
      
      // If we only have placeholders but initialMessages has real thread history, sync it
      if (hasOnlyPlaceholders && initialMessages.some(m => 
        (m.type === "human" || m.type === "ai") && 
        !m.id?.startsWith('queued-') && 
        !m.id?.startsWith('placeholder-')
      )) {
        messagesRef.current = [...initialMessages];
        onMessages(messagesRef.current);
      }
    }
    // Clear messages when initialMessages is explicitly emptied (new chat)
    if (initialMessages.length === 0 && messagesRef.current.length > 0) {
      messagesRef.current = [];
      onMessages([]);
    }
  }, [initialMessages, onMessages]);

  useEffect(() => {
    const sendMessage = async (text: string, requiredTool?: string) => {
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
        _phaseMessage: getPhaseMessage("thinking"),
        _isPlaceholder: true,
      };

      messagesRef.current = [...messagesRef.current, localUserMsg, loadingPlaceholder];
      onMessages(messagesRef.current);

      try {
        const { apiBase: base, jwt: token, localLanguage: lang, threadToken } = cfgRef.current;
        
        // Always set waiting flag when sending a message - we need to wait for session_state
        waitingForSessionStateRef.current = true;
        onWaitingForSessionState?.(true);
        
        const body: any = {
          message: text,
          jwt: token,
          localLanguage: lang,
          threadToken: threadToken ?? undefined,
        };
        
        // Add requiredTool if provided
        if (requiredTool) {
          body.requiredTool = requiredTool;
        }
        
        const response = await fetch(`${base}/api/agent/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
                  console.log('🎯 Phase event:', event.phase, 'name:', event.name, 'current guardrailState:', guardrailStateRef.current);
                  
                  // Handle guardrail phases
                  if (event.phase === "validating") {
                    // Store the original response when validation starts
                    const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                    const last = current[current.length - 1];
                    
                    if (last && last.type === "ai" && last.content) {
                      guardrailStateRef.current = {
                        wasRegenerated: false,
                        validationPhase: event.phase,
                      };
                      
                      last._guardrailData = { ...guardrailStateRef.current };
                      messagesRef.current = [...current.slice(0, -1), last];
                      onMessages(messagesRef.current);
                    }
                  } else if (event.phase === "regenerating") {
                    // Update phase to regenerating
                    console.log('✨ Setting regenerating phase');
                    let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                    
                    // Note: We no longer remove frontendData messages during regeneration
                    // because they remain valid - only the AI text message is regenerated.
                    // If the backend sends new frontend_data, it will naturally replace the old one.
                    
                    // Get the last AI text message (not a frontend data message)
                    const nonFrontendDataMessages = current.filter(m => !m._isFrontendData);
                    const last = nonFrontendDataMessages[nonFrontendDataMessages.length - 1];
                    
                    // Store original content for block-level diffing
                    if (last && last.type === "ai" && last.content) {
                      originalContentRef.current = last.content;
                      blockChangesRef.current = [];
                    }
                    
                    if (guardrailStateRef.current) {
                      guardrailStateRef.current.validationPhase = event.phase;
                      guardrailStateRef.current.hasClearedForRegen = false;
                      
                      // Update the current AI message with regenerating status
                      if (last && last.type === "ai") {
                        last._guardrailData = { ...guardrailStateRef.current };
                        last._originalContent = originalContentRef.current;
                        // Find the index of last in the full current array and update it
                        const lastIndex = current.findIndex(m => m === last);
                        if (lastIndex !== -1) {
                          current[lastIndex] = last;
                        }
                        messagesRef.current = current;
                        onMessages(messagesRef.current);
                      }
                    } else {
                      guardrailStateRef.current = {
                        wasRegenerated: true,
                        validationPhase: event.phase,
                        hasClearedForRegen: false, // CRITICAL: Set to false so first delta will clear content
                      };
                      console.log('  → Created new guardrail state:', guardrailStateRef.current);
                      
                      if (last && last.type === "ai") {
                        last._guardrailData = { ...guardrailStateRef.current };
                        last._originalContent = originalContentRef.current;
                        // Find the index of last in the full current array and update it
                        const lastIndex = current.findIndex(m => m === last);
                        if (lastIndex !== -1) {
                          current[lastIndex] = last;
                        }
                        messagesRef.current = current;
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
                  // Use the phase name if available (for function calls like "search_shop_catalog")
                  // Otherwise fall back to event.phase (for core phases like "thinking", "validating", "regenerating")
                  const phaseName = event.name || event.phase;
                  const displayMessage = getPhaseMessage(phaseName);
                  updatePlaceholder(event.phase, displayMessage);
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
                    // Reset block changes for new regenerated content
                    blockChangesRef.current = [];
                  }
                  
                  messagesRef.current = withoutPlaceholders;
                  onMessages(withoutPlaceholders);
                  break;
                }
                case "block_change": {
                  // Handle block-level diff events - update immediately for smooth animation
                  const change: BlockChange = {
                    blockIndex: event.blockIndex,
                    newBlock: event.newBlock,
                  };
                  
                  blockChangesRef.current.push(change);
                  
                  // Update the last AI message immediately with the new block change
                  const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const nonFrontendDataMessages = current.filter(m => !m._isFrontendData);
                  const last = nonFrontendDataMessages[nonFrontendDataMessages.length - 1];
                  
                  if (last && last.type === "ai") {
                    last._blockChanges = [...blockChangesRef.current];
                    const lastIndex = current.findIndex(m => m === last);
                    if (lastIndex !== -1) {
                      current[lastIndex] = last;
                      messagesRef.current = current;
                      onMessages(messagesRef.current);
                    }
                  }
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
                  // Always clear waiting flag when session_state is received
                  // This ensures the thread has been updated on the backend
                  if (waitingForSessionStateRef.current) {
                    waitingForSessionStateRef.current = false;
                    onWaitingForSessionState?.(false);
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
                case "validation_complete": {
                  // Validation complete - finalize validation state
                  console.log('✅ Validation complete, regenerationNeeded:', event.regenerationNeeded);
                  
                  // Get the last AI TEXT message (not frontend data)
                  let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  const nonFrontendDataMessages = current.filter(m => !m._isFrontendData);
                  const last = nonFrontendDataMessages[nonFrontendDataMessages.length - 1];
                  
                  console.log('  → Last AI text message:', {
                    hasLast: !!last,
                    type: last?.type,
                    hasGuardrailData: !!last?._guardrailData,
                    currentPhase: last?._guardrailData?.validationPhase,
                    isFrontendData: last?._isFrontendData,
                    blockChangesCount: blockChangesRef.current.length,
                  });
                  
                  if (last && last.type === "ai") {
                    // Apply any final accumulated block changes
                    if (blockChangesRef.current.length > 0) {
                      last._blockChanges = [...blockChangesRef.current];
                    }
                    
                    // ALWAYS update validation phase to 'done' so the "Checken..." indicator disappears
                    // Even if guardrailData doesn't exist yet, create it
                    if (last._guardrailData) {
                      last._guardrailData = {
                        ...last._guardrailData,
                        validationPhase: 'done',
                      };
                    } else if (guardrailStateRef.current) {
                      // Create guardrailData from state if it doesn't exist yet
                      last._guardrailData = {
                        ...guardrailStateRef.current,
                        validationPhase: 'done',
                      };
                    }
                    
                    console.log('  → Updated to phase:', last._guardrailData?.validationPhase);
                  }
                  
                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "frontend_data": {
                  // Handle frontend data whenever it arrives
                  let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  
                  console.log('📦 Frontend data received:', {
                    hasEntries: !!event.data?.entries,
                    entriesCount: event.data?.entries?.length
                  });
                  
                  try {
                    // Process entries in new format: { entries: [{ type, label, data }] }
                    if (event.data?.entries && Array.isArray(event.data.entries)) {
                      for (const entry of event.data.entries) {
                        if (!entry.type || !entry.data) continue;
                        
                        // Skip if products type but data is not a valid array
                        if (
                          entry.type === "products" &&
                          (!Array.isArray(entry.data) || entry.data.length === 0)
                        ) continue;
                        
                        const entryType = entry.type;
                        const groupId = `${entryType}-group-${Date.now()}`;
                        // Extract renderImmediately flag (generic per entry, defaults to false)
                        const renderImmediately = entry.renderImmediately ?? false;
                        
                        console.log(`  → Processing entry type: ${entryType}, renderImmediately:`, renderImmediately);
                        
                        // Handle products type
                        if (entryType === "products") {
                          const productMessages = entry.data
                            .map((p: any) => normalizeProduct(p))
                            .filter((pm: ProductMeta | null): pm is ProductMeta => pm !== null)
                            .map((pm: ProductMeta, idx: number) => ({
                              id: `${groupId}-${idx}`,
                              type: "ai",
                              content: "",
                              _stream_done: true,
                              _productMeta: pm,
                              _productGroupId: groupId,
                              _productGroupType: entryType,
                              _isFrontendData: true,
                              _renderImmediately: renderImmediately,
                            } as any));
                          current = [...current, ...productMessages];
                        }
                        // Handle checkout type
                        else if (entryType === "checkout") {
                          const checkoutData = entry.data;
                          if (checkoutData) {
                            const checkoutMessage: SimpleMessage = {
                              id: groupId,
                              type: "ai",
                              content: "",
                              _stream_done: true,
                              _checkoutData: checkoutData,
                              _productGroupId: groupId,
                              _productGroupType: entryType,
                              _isFrontendData: true,
                              _renderImmediately: renderImmediately,
                            };
                            current = [...current, checkoutMessage];
                          }
                        }
                        // Handle options type - attach to last text AI message
                        else if (entryType === "options") {
                          const optionsData = entry.data as OptionsData;
                          
                          if (optionsData) {
                            // Find the last text AI message (not frontend_data) to attach options to
                            const lastTextAiMessage = [...current].reverse().find(
                              (m) => m.type === "ai" && !m._isFrontendData
                            );
                            
                            if (lastTextAiMessage) {
                              // Attach options to the existing text message
                              lastTextAiMessage._optionsData = optionsData;
                              if (renderImmediately) {
                                lastTextAiMessage._renderImmediately = true;
                              }
                              console.log('  → Attached options to existing text message (renderImmediately:', renderImmediately, ')');
                            } else {
                              // No text message found, create a standalone options message
                              const optionsMessage: SimpleMessage = {
                                id: groupId,
                                type: "ai",
                                content: "",
                                _stream_done: true,
                                _optionsData: optionsData,
                                _productGroupId: groupId,
                                _productGroupType: entryType,
                                _isFrontendData: true,
                                _renderImmediately: renderImmediately,
                              };
                              current = [...current, optionsMessage];
                              console.log('  → Created standalone options message (renderImmediately:', renderImmediately, ')');
                            }
                          }
                        }
                        // Future: handle other types like "orders", "cart", "customer"
                      }
                    }
                    
                    console.log('  → Final message count after frontend_data:', current.length);
                  } catch (error) {
                    console.error('Error processing frontend_data:', error);
                  }
                  
                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "done": {
                  // finalize last ai message
                  let current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  
                  // Find the last TEXT AI message (not frontend_data like products/checkout)
                  // Iterate backwards to find the first AI message without _isFrontendData flag
                  let lastTextAiMessage = null;
                  for (let i = current.length - 1; i >= 0; i--) {
                    const msg = current[i];
                    if (msg.type === "ai" && !(msg as any)._isFrontendData) {
                      lastTextAiMessage = msg;
                      break;
                    }
                  }
                  
                  // Extract guardrails data from new backend structure
                  const guardrails = event.guardrails;
                  
                  console.log('🏁 Done event - last text AI message:', {
                    found: !!lastTextAiMessage,
                    hasGuardrails: !!guardrails,
                    wasRegenerated: guardrails?.wasRegenerated,
                    hasClaims: !!guardrails?.claims,
                  });
                  
                  if (lastTextAiMessage) {
                    (lastTextAiMessage as any)._stream_done = true;
                    
                    // Add guardrail data if present
                    if (guardrails) {
                      const guardrailData: GuardrailData = {
                        wasRegenerated: guardrails.wasRegenerated,
                        claims: guardrails.claims,
                        validationPhase: 'done',
                      };
                      
                      (lastTextAiMessage as any)._guardrailData = guardrailData;
                    }
                    
                    guardrailStateRef.current = null; // Reset state
                  }

                  messagesRef.current = current;
                  onMessages(current);
                  break;
                }
                case "error": {
                  // Remove any phase indicators
                  const current = messagesRef.current.filter((m) => !m._isPlaceholder);
                  
                  // Display error message to user
                  const errorMessage = event.msg || event.error || "Er is een fout opgetreden. Probeer het opnieuw.";
                  const errMsg: SimpleMessage = { 
                    type: "ai", 
                    content: errorMessage,
                    _stream_done: true,
                    _isError: true
                  };
                  
                  messagesRef.current = [...current, errMsg];
                  onMessages(messagesRef.current);
                  console.error('Backend error:', event);
                  
                  // Clear waiting flag on error
                  if (waitingForSessionStateRef.current) {
                    waitingForSessionStateRef.current = false;
                    onWaitingForSessionState?.(false);
                  }
                  break;
                }
                case "agent_switch":
                case "tool_step":
                case "assistant_output_start_internal":
                case "assistant_output_token":
                  // Silently ignore these events
                  break;
                default:
                  break;
              }
            } catch (err) {
              // skip invalid JSON lines
              console.warn('Failed to parse stream event:', err);
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        
        // Remove placeholders and show error message
        const current = messagesRef.current.filter((m) => !m._isPlaceholder);
        const errMsg: SimpleMessage = { 
          type: "ai", 
          content: "Er is een fout opgetreden bij het verbinden met de server. Probeer het opnieuw.",
          _stream_done: true,
          _isError: true
        };
        messagesRef.current = [...current, errMsg];
        onMessages(messagesRef.current);
        
        // Clear waiting flag on error
        if (waitingForSessionStateRef.current) {
          waitingForSessionStateRef.current = false;
          onWaitingForSessionState?.(false);
        }
      }
    };

    onSendFn(sendMessage);
    // register only once on mount to avoid re-register loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
