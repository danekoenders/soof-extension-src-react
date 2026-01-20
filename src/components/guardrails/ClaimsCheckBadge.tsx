import { useState } from "react";

interface ClaimsCheckBadgeProps {
  guardrailEnabled?: boolean; // Whether a guardrail was active
  guardrailName?: string; // Name of the guardrail: "vitamins-supplements", "custom-text", etc.
  wasRegenerated: boolean;
  allowedClaims?: string[];
  validationPhase?: "thinking" | "validating" | "regenerating" | "done";
}

export default function ClaimsCheckBadge({
  guardrailEnabled,
  guardrailName,
  wasRegenerated,
  allowedClaims = [],
  validationPhase = "done",
}: ClaimsCheckBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't render anything if no guardrail is enabled
  if (guardrailEnabled === false) {
    return null;
  }

  // Determine the guardrail type for displaying appropriate text
  const isCustomTextGuardrail = guardrailName === "custom-text";

  // Get the appropriate display text based on guardrail type
  const getBadgeText = () => {
    if (isCustomTextGuardrail) {
      return "Gecheckt door winkelbeleid";
    }
    return "Gecheckt";
  };

  const getTooltipTitle = () => {
    if (isCustomTextGuardrail) {
      return "Winkelbeleid controle";
    }
    return "Antwoord validatie";
  };

  const getTooltipDescription = () => {
    if (isCustomTextGuardrail) {
      return "Dit bericht is gecontroleerd en voldoet aan het beleid van deze winkel.";
    }
    return "Dit bericht is gecontroleerd op gezondheidsclaims en voldoet aan de richtlijnen van de Nederlandse Voedsel- en Warenautoriteit.";
  };

  const getCheckingText = () => {
    if (isCustomTextGuardrail) {
      return "Bericht checken";
    }
    return "Bericht checken";
  };

  const getCheckingTooltipDescription = () => {
    if (isCustomTextGuardrail) {
      return "We controleren of het bericht voldoet aan het beleid van deze winkel.";
    }
    return "We controleren of alle gezondheidsclaims in het bericht voldoen aan de officiële NVWA-richtlijnen voor voedingssupplementen.";
  };

  // Show validating/regenerating/thinking indicator
  if (validationPhase === "validating" || validationPhase === "regenerating" || validationPhase === "thinking") {
    return (
      <div className="relative inline-block animate-fade-in">
        <div
          className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded cursor-help hover:bg-green-50/60 transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="relative w-2.5 h-2.5">
            <div className="absolute inset-0 rounded-full border-2 border-green-200 border-t-green-600 animate-spin"></div>
          </div>
          <span>{getCheckingText()}</span>
        </div>

        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-56 px-2.5 py-2 text-[11px] text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <p className="font-medium mb-0.5 text-xs">Wat checken we?</p>
            <p className="text-gray-600 leading-tight">
              {getCheckingTooltipDescription()}
            </p>
            <div className="absolute top-full left-3 -mt-1">
              <div
                className="border-[5px] border-transparent border-t-white"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For custom-text guardrail: show simple badge without expandable claims
  if (isCustomTextGuardrail) {
    return (
      <div className="relative inline-block animate-fade-in">
        <div
          className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded cursor-help hover:bg-green-50/60 transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{getBadgeText()}</span>
        </div>

        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-56 px-2.5 py-2 text-[11px] text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <p className="font-medium mb-0.5 text-xs">{getTooltipTitle()}</p>
            <p className="text-gray-600 leading-tight">
              {getTooltipDescription()}
            </p>
            <div className="absolute top-full left-3 -mt-1">
              <div
                className="border-[5px] border-transparent border-t-white"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not regenerated OR regenerated but no claims data - show tooltip only
  // This handles both simple checks and regenerated messages where claims weren't loaded
  if (!wasRegenerated || allowedClaims.length === 0) {
    return (
      <div className="relative inline-block animate-fade-in">
        <div
          className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded cursor-help hover:bg-green-50/60 transition-colors"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{getBadgeText()}</span>
        </div>

        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-56 px-2.5 py-2 text-[11px] text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <p className="font-medium mb-0.5 text-xs">{getTooltipTitle()}</p>
            <p className="text-gray-600 leading-tight">
              {getTooltipDescription()}
            </p>
            <div className="absolute top-full left-3 -mt-1">
              <div
                className="border-[5px] border-transparent border-t-white"
                style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.1))" }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Regenerated WITH claims data - show expandable list (vitamins-supplements guardrail)
  return (
    <div className="relative inline-block animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded cursor-help hover:bg-green-50/60 transition-colors border-0 m-0 appearance-none outline-none focus:outline-none"
      >
        <svg
          className="w-2.5 h-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>{getBadgeText()}</span>
        <svg
          className={`w-2.5 h-2.5 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="flex flex-col gap-2 p-2.5 bg-gray-50/50 rounded border border-gray-200/50">
          <p className="text-[11px] text-gray-600 leading-tight mb-1">
            Om u een zo goed mogelijk antwoord te geven, is dit bericht herschreven op basis van de volgende richtlijnen van de Nederlandse Voedsel- en Warenautoriteit:
          </p>

          {/* Allowed Claims */}
          {allowedClaims.length > 0 && (
            <div className="space-y-1">
              {allowedClaims.map((claim, index) => (
                <div
                  key={index}
                  className="text-[10px] text-green-700/90 bg-green-50/50 p-1.5 rounded border-l-2 border-green-300/50 leading-tight"
                >
                  {claim}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
