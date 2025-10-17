interface HeaderProps {
  shopName: string;
  chatbotName: string;
  primaryColor?: string;
  secondaryColor?: string;
  onRestartChat: () => void;
}

export default function Header({
  shopName,
  chatbotName,
  primaryColor,
  secondaryColor,
  onRestartChat,
}: HeaderProps) {
  const headerGradient = {
    background: `linear-gradient(130deg, ${primaryColor || '#0040c0'} 50%, ${secondaryColor || '#ffffff'} 100%)`,
  };

  return (
    <div
      className="px-4 min-h-[70px] text-white flex flex-row items-center justify-between leading-tight text-lg"
      style={headerGradient}
    >
      <div className="flex flex-col">
        <h4 className="text-lg m-0 text-white">
          {shopName || "Klantenservice"}
        </h4>
        <span className="text-sm text-white">
          Je chat met {chatbotName || "Soof"}
        </span>
      </div>

      <button
        onClick={onRestartChat}
        className="bg-white/20 hover:bg-white/30 backdrop-blur-sm w-fit h-fit px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:shadow-md"
      >
        Nieuwe chat
      </button>
    </div>
  );
}
