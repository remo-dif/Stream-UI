import { MessageSkeleton } from "@/components/ui/Skeleton";

/**
 * ChatLoading Component
 * 
 * A loading state component for the chat interface. 
 * It renders the MessageSkeleton to provide a consistent visual 
 * experience during page transitions.
 */
export default function ChatLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden py-4">
        <MessageSkeleton />
      </div>
    </div>
  );
}
