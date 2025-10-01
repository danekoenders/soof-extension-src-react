
interface GuardrailStatusProps {
  phase: 'thinking' | 'validating' | 'regenerating' | 'done';
  message?: string;
}

export default function GuardrailStatus({ phase, message }: GuardrailStatusProps) {
  const getPhaseConfig = (phase: string) => {
    switch (phase) {
      case 'thinking':
        return {
          icon: '🤔',
          text: message || 'Thinking…',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
        };
      case 'validating':
        return {
          icon: '🔍',
          text: message || 'Validating health claims…',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      case 'regenerating':
        return {
          icon: '✨',
          text: message || 'Regenerating compliant response…',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'done':
        return {
          icon: '✅',
          text: message || 'Response validated',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      default:
        return {
          icon: '🤔',
          text: 'Processing…',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const config = getPhaseConfig(phase);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} text-sm font-medium ${config.color} animate-slide-in-from-top animate-pulse-gentle`}>
      <span className="text-base">{config.icon}</span>
      <span>{config.text}</span>
      {(phase === 'validating' || phase === 'regenerating') && (
        <div className="flex items-center ml-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
