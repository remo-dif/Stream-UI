import Link from "next/link";
import { MessageSquare } from "lucide-react";

/**
 * NotFound Component
 * 
 * The default 404 page for the application. It provides a clear 
 * message and a link back to the primary chat interface.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-center px-6">
      <div>
        <p className="text-8xl font-bold text-primary/20 mb-4">404</p>
        <h1 className="text-2xl font-bold mb-2">Page not found</h1>
        <p className="text-muted-foreground text-sm mb-8">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Back to Chat
        </Link>
      </div>
    </div>
  );
}
