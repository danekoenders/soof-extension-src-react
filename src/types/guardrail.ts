// Claims validation data structure
export interface ClaimsValidation {
  isCompliant: boolean;
  violatedClaims: string[];
  allowedClaims: string[];
  suggestions: string[];
  complianceScore: number;
}

// Claims data from backend (simpler structure)
export interface Claims {
  allowedClaims: string[];
  violatedClaims: string[];
}

// Guardrails structure from backend
export interface Guardrails {
  name: string;
  wasRegenerated: boolean;
  claims?: Claims;
  violations?: string[]; // For custom-text guardrail
}

// Guardrail data structure
export interface GuardrailData {
  guardrailEnabled?: boolean; // Whether a guardrail was active (false = no check performed)
  guardrailName?: string; // Name of the guardrail: "vitamins-supplements", "custom-text", etc.
  wasRegenerated: boolean;
  claims?: Claims; // For vitamins-supplements guardrail
  violations?: string[]; // For custom-text guardrail
  validationPhase?: 'thinking' | 'validating' | 'regenerating' | 'done';
}
