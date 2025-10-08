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
  claims: Claims;
}

// Guardrail data structure
export interface GuardrailData {
  wasRegenerated: boolean;
  claims?: Claims;
  validationPhase?: 'thinking' | 'validating' | 'regenerating' | 'done';
}
