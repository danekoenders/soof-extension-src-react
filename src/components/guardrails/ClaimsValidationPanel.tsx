import { useState } from 'react';
import type { ClaimsValidation } from '../../types/guardrail';

interface ClaimsValidationPanelProps {
  claimsValidation: ClaimsValidation;
  wasRegenerated: boolean;
}

export default function ClaimsValidationPanel({ 
  claimsValidation, 
  wasRegenerated 
}: ClaimsValidationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { 
    isCompliant, 
    allowedClaims = [], 
    complianceScore
  } = claimsValidation;

  const getComplianceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceIcon = (score: number) => {
    if (score >= 0.8) return '✅';
    if (score >= 0.6) return '⚠️';
    return '❌';
  };

  return (
    <div className="mt-2 border border-gray-200 rounded-lg bg-gray-50 animate-slide-in-from-top">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{getComplianceIcon(complianceScore)}</span>
          <span>Claims Validation</span>
          {wasRegenerated && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
              Regenerated
            </span>
          )}
          <span className={`text-xs font-semibold ${getComplianceColor(complianceScore)}`}>
            {Math.round(complianceScore * 100)}% compliant
          </span>
        </div>
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 animate-slide-in-from-top">
          {/* Compliance Score */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Compliance Score:</span>
            <span className={`font-semibold ${getComplianceColor(complianceScore)}`}>
              {Math.round(complianceScore * 100)}%
            </span>
          </div>

          {/* Allowed Claims (only) */}
          {allowedClaims.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-green-700 mb-1">
                Allowed Claims ({allowedClaims.length})
              </h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {allowedClaims.slice(0, 3).map((claim, index) => (
                  <div key={index} className="text-xs text-green-600 bg-green-50 p-2 rounded border-l-2 border-green-200">
                    {claim}
                  </div>
                ))}
                {allowedClaims.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{allowedClaims.length - 3} more allowed claims
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Status:</span>
              <span className={`font-semibold ${isCompliant ? 'text-green-600' : 'text-red-600'}`}>
                {isCompliant ? 'Compliant (regenerated on allowed claims)' : 'Non-compliant (regenerated)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
