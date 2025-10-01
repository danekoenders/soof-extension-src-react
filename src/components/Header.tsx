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
    background: `linear-gradient(130deg, ${theme.primaryBackground} 50%, ${theme.secondaryBackground} 100%)`,
  };

  return (
    <div
      className="px-4 min-h-[70px] text-white rounded-t-2xl flex flex-row items-center justify-between leading-tight text-lg"
      style={headerGradient}
    >
      <div className="flex flex-col">
        <h4 className="text-lg m-0 text-white">
          {shopName || "Customer Service"}
        </h4>
        <span className="text-sm text-white">
          Je chat met {chatbotName || "Soof"}
        </span>
      </div>

      <button
        onClick={onRestartChat}
        className="bg-gray-50 hover:bg-gray-200 w-fit h-fit px-3 py-1 rounded border border-gray-700 text-gray-700 text-xs cursor-pointer transition-colors"
      >
        Nieuwe chat
      </button>
    </div>
  );
}
