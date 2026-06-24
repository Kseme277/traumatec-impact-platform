export default function ChatTypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5" aria-label="…">
      <span className="size-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:0ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:150ms]" />
      <span className="size-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-gray-500 [animation-delay:300ms]" />
    </span>
  );
}
