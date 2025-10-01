// Claims validation data structure
export interface ClaimsValidation {
  isCompliant: boolean;
  violatedClaims: string[];
  allowedClaims: string[];
  suggestions: string[];
  complianceScore: number;
}

// Guardrail data structure
export interface GuardrailData {
  wasRegenerated: boolean;
  originalResponse?: string;
  regeneratedResponse?: string;
  claimsValidation?: ClaimsValidation;
  validationPhase?: 'thinking' | 'validating' | 'regenerating' | 'done';
}
