interface UserMessageProps {
  text: string;
}

export default function UserMessage({ text }: UserMessageProps) {
  return (
    <div className="flex flex-col items-end w-full gap-1.5">
      <div className="rounded-[20px_1px_20px_20px] border border-gray-300 bg-gray-200 text-black max-w-[90%] px-3 py-3 break-words">
        {text}
      </div>
    </div>
  );
}
