interface HeaderProps {
  shopName: string;
  chatbotName: string;
  theme: {
    primaryBackground: string;
    secondaryBackground: string;
    tertiaryAccent: string;
  };
  onRestartChat: () => void;
}

export default function Header({ 
  shopName, 
  chatbotName, 
  theme, 
  onRestartChat, 
}: HeaderProps) {
  const headerGradient = {
    background: `linear-gradient(130deg, ${theme.primaryBackground} 50%, ${theme.secondaryBackground} 100%)`
  };

  return (
    <div 
      className="min-h-[140px] text-white rounded-t-2xl flex flex-col items-center justify-center leading-tight text-lg"
      style={headerGradient}
    >
      <h4 className="text-lg m-0 text-white">{shopName || 'Customer Service'}</h4>
      <span className="text-sm text-white">Je chat met {chatbotName || 'Soof'}</span>
      <div className="flex gap-2.5 mt-2.5">
        <button 
          onClick={onRestartChat}
          className="w-fit h-fit px-2.5 py-1 rounded border border-gray-700 bg-transparent text-gray-700 text-xs cursor-pointer hover:bg-gray-50 transition-colors"
        >
          Nieuwe chat
        </button>
      </div>
    </div>
  );
}
