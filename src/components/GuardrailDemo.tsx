import { useState } from 'react';
import BotMessage from './messages/BotMessage';
import GuardrailStatus from './guardrails/GuardrailStatus';
import ClaimsValidationPanel from './guardrails/ClaimsValidationPanel';
import type { GuardrailData, ClaimsValidation } from '../types/guardrail';

// Demo component to test guardrail functionality
export default function GuardrailDemo() {
  const [phase, setPhase] = useState<'thinking' | 'validating' | 'regenerating' | 'done'>('thinking');
  const [showMessage, setShowMessage] = useState(false);

  // Sample claims validation data based on your provided example
  const sampleClaimsValidation: ClaimsValidation = {
    isCompliant: false,
    violatedClaims: [
      "Niet toegestaan: X, bij depressie",
      "Niet toegestaan: X, tegen depressie",
      "Niet toegestaan: X helpt bij een zenuwachtig gevoel",
      "Niet toegestaan: X helpt prestaties te verbeteren",
      "Niet toegestaan: X, zenuwpijn",
      "Niet toegestaan: X helpt tegen zwakke zenuwen",
      "Niet toegestaan: X geeft zwakke zenuwen een weldadige rust"
    ],
    allowedClaims: [
      "Toegestaan: X ondersteunt de vermindering van vermoeidheid en moeheid",
      "Toegestaan: X helpt om vermoeidheid en moeheid te verminderen",
      "Toegestaan: X heeft een gunstige invloed op de vermindering van vermoeidheid en moeheid",
      "Toegestaan: X is goed bij vermoeidheid en moeheid",
      "Toegestaan: X helpt bij vermoeidheid/moeheid",
      "Toegestaan: X, draagt bij aan een heldere geest",
      "Toegestaan: X, goed voor de gemoedstoestand",
      "Toegestaan: Vitamine C helpt bij het behoud van een goede weerstand tijdens en na fysieke inspanning"
    ],
    suggestions: [
      "Rewrite claims to comply with allowed health claims",
      "Avoid explicitly forbidden health claims",
      "Use more general language for health benefits"
    ],
    complianceScore: 0.72
  };

  const originalResponse = `## Vitamine C en Hoofdpijn

Vitamine C kan op verschillende manieren bijdragen aan de verlichting van hoofdpijn:

- **Antioxidante werking**: Vitamine C heeft antioxidante eigenschappen, die kunnen helpen bij het verminderen van ontstekingen in het lichaam, wat soms hoofdpijn kan verergeren.
- **Immuunfunctie**: Een goede immuunfunctie kan helpen bij het voorkomen van ziekten die hoofdpijn kunnen veroorzaken, zoals verkoudheid of infecties.
- **Vermindering van stress**: Sommige onderzoeken suggereren dat vitamine C kan helpen bij de regulering van cortisol (het stresshormoon), wat kan bijdragen aan het verminderen van spanningshoofdpijn.

### Belangrijk

Hoewel vitamine C kan bijdragen aan de algemene gezondheid en het welzijn, is het altijd aan te rader om een arts te raadplegen voor het behandelen van aanhoudende of ernstige hoofdpijn. 

Heb je specifieke vitamine C-producten nodig? 🥤`;

  const regeneratedResponse = `## Vitamine C en Hoofdpijn

Vitamine C wordt vaak besproken in het kader van algemene gezondheid en welzijn. Hier zijn enkele manieren waarop Vitamine C kan bijdragen aan je algehele gevoel van welzijn:

- **Antioxidante werking**: Vitamine C heeft antioxidante eigenschappen. Antioxidanten kunnen bijdragen aan het behoud van een gezond lichaam.
- **Immuunfunctie**: Vitamine C speelt een rol in het ondersteunen van het immuunsysteem, wat kan helpen om je algehele gezondheid te bevorderen.
- **Ondersteuning bij vermoeidheid**: Vitamine C kan bijdragen aan een vermindering van vermoeidheid en moeheid, wat je kan helpen je beter te voelen.

### Belangrijk

Hoewel vitamine C kan bijdragen aan je algemene gezondheid, is het altijd aan te raden om een arts te raadplegen voor het behandelen van aanhoudende of ernstige hoofdpijn.

Heb je specifieke vitamine C-producten nodig? 🥤`;

  const guardrailData: GuardrailData = {
    wasRegenerated: phase === 'done',
    originalResponse: phase === 'validating' || phase === 'regenerating' || phase === 'done' ? originalResponse : undefined,
    regeneratedResponse: phase === 'done' ? regeneratedResponse : undefined,
    claimsValidation: phase === 'done' ? sampleClaimsValidation : undefined,
    validationPhase: phase !== 'thinking' ? phase : undefined,
  };

  const simulateFlow = () => {
    setShowMessage(true);
    setPhase('thinking');
    
    setTimeout(() => {
      setPhase('validating');
      console.log('Phase: validating');
    }, 1000);
    
    setTimeout(() => {
      setPhase('regenerating');
      console.log('Phase: regenerating');
    }, 3000);
    
    setTimeout(() => {
      setPhase('done');
      console.log('Phase: done');
    }, 5000);
  };

  const resetDemo = () => {
    setShowMessage(false);
    setPhase('thinking');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Guardrail UI Demo</h1>
        <div className="flex gap-4 mb-4">
          <button
            onClick={simulateFlow}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Simulate Guardrail Flow
          </button>
          <button
            onClick={resetDemo}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Reset Demo
          </button>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          Current Phase: <span className="font-semibold">{phase}</span>
        </div>
      </div>

      {/* Demo of individual components */}
      <div className="space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-3">GuardrailStatus Component</h2>
          <div className="space-y-3">
            <GuardrailStatus phase="thinking" />
            <GuardrailStatus phase="validating" />
            <GuardrailStatus phase="regenerating" />
            <GuardrailStatus phase="done" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">ClaimsValidationPanel Component</h2>
          <div className="max-w-lg">
            <ClaimsValidationPanel 
              claimsValidation={sampleClaimsValidation}
              wasRegenerated={true}
            />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Complete BotMessage with Guardrail Flow</h2>
          {showMessage && (
            <BotMessage
              text={phase === 'regenerating' || phase === 'done' ? regeneratedResponse : originalResponse}
              loading={false}
              guardrailData={guardrailData}
            />
          )}
        </div>
      </div>
    </div>
  );
}
