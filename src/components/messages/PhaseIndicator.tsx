import { getPhaseMessage } from "../../types/phase";

interface PhaseIndicatorProps {
  phase: string;
  message?: string;
}

export default function PhaseIndicator({
  phase,
  message,
}: PhaseIndicatorProps) {
  // Don't display phase indicators for validating and regenerating
  // These phases are handled by the ClaimsCheckBadge component instead
  if (phase === "validating" || phase === "regenerating") {
    return null;
  }

  return (
    <div className="flex items-start w-full animate-slide-in-from-left">
      <div className="px-3 py-2 rounded-[1px_20px_20px_20px] flex items-center gap-2 max-w-[90%] bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 border border-gray-200/50">
        {/* Message text */}
        <span className="animate-flow-left text-sm text-gray-700">
          {message || getPhaseMessage(phase)}
        </span>
      </div>
    </div>
  );
}
