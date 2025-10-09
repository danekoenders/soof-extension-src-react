import { useState } from "react";

interface ClaimsCheckBadgeProps {
  wasRegenerated: boolean;
  allowedClaims?: string[];
  violatedClaims?: string[];
  isLoading?: boolean;
}

export default function ClaimsCheckBadge({
  wasRegenerated,
  allowedClaims = [],
  violatedClaims = [],
  isLoading = false,
}: ClaimsCheckBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-gray-400 bg-gray-50/50 rounded animate-fade-in">
        <div className="relative w-2.5 h-2.5">
          <div className="absolute inset-0 rounded-full border border-gray-300 border-t-gray-400 animate-spin"></div>
        </div>
        <span>Checken...</span>
      </div>
    );
  }

  // Not regenerated - show tooltip only
  if (!wasRegenerated) {
    return (
      <div className="relative inline-block animate-fade-in">
        <div
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded cursor-help hover:bg-green-50/60 transition-colors"
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
          <span>Gecheckt</span>
        </div>

        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 w-56 px-2.5 py-2 text-[11px] text-gray-700 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <p className="font-medium mb-0.5 text-xs">Antwoord validatie</p>
            <p className="text-gray-600 leading-tight">
              Dit bericht is gecontroleerd op gezondheidsclaims en voldoet aan
              de richtlijnen van de Nederlandse Voedsel- en Warenautoriteit.
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

  // Regenerated - show expandable list with same "Gecheckt" text
  return (
    <div className="inline-block w-full animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-green-600/80 bg-green-50/40 rounded hover:bg-green-50/60 transition-colors cursor-pointer"
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
        <span>Gecheckt</span>
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
          <p className="text-[11px] text-gray-600 leading-tight">
            Dit bericht is gecontroleerd op gezondheidsclaims, aangepast waar nodig, en voldoet aan de richtlijnen van de Nederlandse Voedsel- en Warenautoriteit.
          </p>

          {/* Allowed Claims */}
          {allowedClaims.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-green-600 flex items-center gap-1">
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Toegestane claims ({allowedClaims.length})
              </h4>
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
            </div>
          )}

          {/* Violated Claims */}
          {violatedClaims.length > 0 && (
            <div className="mb-2">
              <h4 className="text-[10px] font-semibold text-red-600 mb-1 flex items-center gap-1">
                <svg
                  className="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                Verboden claims ({violatedClaims.length})
              </h4>
              <div className="space-y-1">
                {violatedClaims.map((claim, index) => (
                  <div
                    key={index}
                    className="text-[10px] text-red-700/90 bg-red-50/50 p-1.5 rounded border-l-2 border-red-300/50 leading-tight"
                  >
                    {claim}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
