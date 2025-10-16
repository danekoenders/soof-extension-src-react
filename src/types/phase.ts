// Phase type definitions and placeholder message mappings

export type PhaseType = "thinking" | "validating" | "regenerating" | "function" | string;

export interface PhaseConfig {
  displayMessage: string;
}

// Map of phase names (like "search_shop_catalog") to their display configuration
// The key can be either a phase type or a specific function name
export const PHASE_MESSAGES: Record<string, PhaseConfig> = {
  // Core phases
  thinking: {
    displayMessage: "🤔 Denken",
  },

  // Tool phases
  search_shop_catalog: {
    displayMessage: "🔍 Zoeken naar producten",
  },
  create_cart: {
    displayMessage: "🛒 Winkelwagen aanmaken",
  },
  get_cart: {
    displayMessage: "🛒 Winkelwagen ophalen",
  },
  add_cart_lines: {
    displayMessage: "🛒 Aan winkelwagen toevoegen",
  },
  update_cart_lines: {
    displayMessage: "🛒 Winkelwagen bijwerken",
  },
  start_checkout: {
    displayMessage: "🛒 Afrekenen starten",
  },
  fetch_order_data: {
    displayMessage: "📦 Ordergegevens ophalen",
  },
  send_order_tracking_email: {
    displayMessage: "📧 E-mail versturen",
  },
};

/**
 * Get the display message for a phase
 * Falls back to "🤔 Thinking" if phase is not found
 */
export function getPhaseMessage(phase?: string): string {
  if (!phase) return "🤔 Thinking";
  
  const config = PHASE_MESSAGES[phase];
  if (config) {
    return config.displayMessage;
  }
  
  // Fallback: return generic message with the phase name formatted
  return "🤔 Thinking";
}
