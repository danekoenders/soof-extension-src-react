export function SkeletonUserMessage() {
  return (
    <div className="flex justify-end w-full animate-pulse">
      <div className="px-3 py-3 w-[60%] rounded-[20px_1px_20px_20px] bg-gray-200 h-12" />
    </div>
  );
}

export function SkeletonBotMessage() {
  return (
    <div className="flex flex-col items-start w-full gap-1.5 animate-pulse">
      <div className="px-3 py-3 rounded-[1px_20px_20px_20px] border border-gray-200 bg-gray-50 w-[70%] space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonMessages() {
  return (
    <>
      <SkeletonUserMessage />
      <SkeletonBotMessage />
      <SkeletonUserMessage />
      <SkeletonBotMessage />
    </>
  );
}

