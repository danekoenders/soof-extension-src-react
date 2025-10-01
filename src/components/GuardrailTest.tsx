import { useState, useEffect } from 'react';
import BotMessage from './messages/BotMessage';
import type { GuardrailData, ClaimsValidation } from '../types/guardrail';

// Simple test component to verify guardrail functionality
export default function GuardrailTest() {
  const [currentText, setCurrentText] = useState('');
  const [guardrailData, setGuardrailData] = useState<GuardrailData | undefined>();
  const [step, setStep] = useState(0);

  const originalResponse = "## Vitamine C en Hoofdpijn\n\nVitamine C kan helpen bij het verminderen van hoofdpijn door ontstekingen te verminderen.";
  const regeneratedResponse = "## Vitamine C en Hoofdpijn\n\nVitamine C wordt besproken in het kader van algemene gezondheid en welzijn.";

  const sampleClaimsValidation: ClaimsValidation = {
    isCompliant: false,
    violatedClaims: ["Niet toegestaan: X helpt bij hoofdpijn"],
    allowedClaims: ["Toegestaan: X ondersteunt algemene gezondheid"],
    suggestions: ["Use more general language"],
    complianceScore: 0.72
  };

  const runTest = () => {
    setStep(0);
    
    // Step 1: Show original response
    setTimeout(() => {
      setCurrentText(originalResponse);
      setGuardrailData(undefined);
      setStep(1);
    }, 100);

    // Step 2: Start validation
    setTimeout(() => {
      setGuardrailData({
        wasRegenerated: false,
        originalResponse,
        validationPhase: 'validating'
      });
      setStep(2);
    }, 2000);

    // Step 3: Start regeneration
    setTimeout(() => {
      setGuardrailData({
        wasRegenerated: false,
        originalResponse,
        validationPhase: 'regenerating'
      });
      setStep(3);
    }, 4000);

    // Step 4: Show regenerated content
    setTimeout(() => {
      setCurrentText(regeneratedResponse);
      setGuardrailData({
        wasRegenerated: true,
        originalResponse,
        regeneratedResponse,
        validationPhase: 'regenerating'
      });
      setStep(4);
    }, 5000);

    // Step 5: Complete with validation data
    setTimeout(() => {
      setGuardrailData({
        wasRegenerated: true,
        originalResponse,
        regeneratedResponse,
        claimsValidation: sampleClaimsValidation,
        validationPhase: 'done'
      });
      setStep(5);
    }, 7000);
  };

  const reset = () => {
    setCurrentText('');
    setGuardrailData(undefined);
    setStep(0);
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Guardrail Test</h1>
        
        <div className="mb-6 flex gap-4">
          <button
            onClick={runTest}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Run Guardrail Test
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Reset
          </button>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Current Step: {step} - {
            step === 0 ? 'Ready' :
            step === 1 ? 'Original Response' :
            step === 2 ? 'Validating' :
            step === 3 ? 'Regenerating' :
            step === 4 ? 'New Content' :
            'Complete with Validation'
          }
        </div>

        <div className="bg-white rounded-lg p-4">
          {currentText && (
            <BotMessage
              text={currentText}
              loading={false}
              guardrailData={guardrailData}
            />
          )}
        </div>

        {/* Debug info */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium">Debug Info</summary>
          <pre className="text-xs bg-gray-100 p-4 rounded mt-2 overflow-auto">
            {JSON.stringify({ currentText: currentText.substring(0, 50) + '...', guardrailData }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
