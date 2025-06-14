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
    <div className="chat-header" style={headerGradient}>
      <h4>{shopName || 'Customer Service'}</h4>
      <span>You are now chatting with {chatbotName || 'Soof'}</span>
      <div className="chat-header-buttons">
        <button onClick={onRestartChat}>New Chat</button>
      </div>
    </div>
  );
}
