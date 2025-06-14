interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="message-container-user">
      <div className="user-message">{text}</div>
    </div>
  );
}
