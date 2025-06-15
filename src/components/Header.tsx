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
    <div className="header" style={headerGradient}>
      <h4>{shopName || 'Customer Service'}</h4>
      <span>Je chat met {chatbotName || 'Soof'}</span>
      <div className="header-buttons">
        <button onClick={onRestartChat}>Nieuwe chat</button>
      </div>
    </div>
  );
}
