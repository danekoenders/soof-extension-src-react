interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="message-wrapper user">
      <div className="user-message">{text}</div>
    </div>
  );
}
