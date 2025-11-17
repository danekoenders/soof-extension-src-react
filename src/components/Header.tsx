interface HeaderProps {
  shopName: string;
  chatbotName: string;
  primaryColor?: string;
  secondaryColor?: string;
  onRestartChat: () => void;
  onCloseChat?: () => void;
  showCloseButton?: boolean;
}

export default function Header({
  shopName,
  chatbotName,
  primaryColor,
  secondaryColor,
  onRestartChat,
  onCloseChat,
  showCloseButton = false,
}: HeaderProps) {
  const headerGradient = {
    background: `linear-gradient(130deg, ${primaryColor} 50%, ${secondaryColor} 100%)`,
  };

  return (
    <div
      className="px-4 min-h-[70px] text-white flex flex-row items-center justify-between leading-tight text-lg"
      style={{
        ...headerGradient,
        // Add safe area padding for mobile widget (Safari notch)
        paddingTop: showCloseButton ? 'max(env(safe-area-inset-top, 0px), 12px)' : undefined,
        paddingRight: showCloseButton ? 'max(env(safe-area-inset-right, 0px), 16px)' : undefined,
        paddingLeft: showCloseButton ? 'max(env(safe-area-inset-left, 0px), 16px)' : undefined,
      }}
    >
      <div className="flex flex-col flex-1">
        <h4 className="text-lg m-0 text-white">
          {shopName || "Klantenservice"}
        </h4>
        <span className="text-sm text-white">
          Je chat met {chatbotName || "Soof"}
        </span>
      </div>

      <div className="flex flex-row items-center gap-2">
        {/* "Nieuwe chat" button - always show */}
        <button
          onClick={onRestartChat}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm w-fit h-fit px-3 py-1.5 rounded-lg text-white text-xs font-medium cursor-pointer transition-all duration-200 hover:shadow-md"
        >
          Nieuwe chat
        </button>

        {/* Close button for mobile widget - tiny X in header */}
        {showCloseButton && onCloseChat && (
          <button
            onClick={onCloseChat}
            className="bg-transparent hover:bg-white/20 active:bg-white/30 w-6 h-6 flex items-center justify-center text-white text-lg font-light cursor-pointer transition-all duration-200 touch-manipulation"
            aria-label="Close chat"
            style={{
              minWidth: '24px',
              minHeight: '24px',
              lineHeight: '1',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
