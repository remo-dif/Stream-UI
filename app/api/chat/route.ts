import { NextRequest, NextResponse } from "next/server";

const NEST_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Chat Proxy Route
 * 
 * This route acts as a thin middleware between the frontend (AI SDK) and the 
 * NestJS backend. It handles:
 * 1. Auth injection: Forwards the Bearer token from the browser.
 * 2. Validation: Ensures a conversationId and valid user message exist.
 * 3. Error Translation: Maps NestJS status codes (429, 402) to UI-friendly JSON.
 * 4. Stream Piping: Pipes the raw SSE body directly back to the client.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { messages, conversationId, data } = body;

  // Basic validation before hitting the expensive backend
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 },
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user" },
      { status: 400 },
    );
  }

  // Forward the request to the internal NestJS streaming endpoint
  const nestResponse = await fetch(
    `${NEST_API}/chat/conversations/${conversationId}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        message: lastMessage.content,
        history: messages.slice(0, -1), // Send previous messages as context
        metadata: data,
      }),
    },
  );

  // Handle non-200 responses from the backend
  if (!nestResponse.ok) {
    const err = await nestResponse.json().catch(() => ({}));

    // Rate limit handling: Extract Retry-After for the UI countdown
    if (nestResponse.status === 429) {
      const retryAfter = nestResponse.headers.get("retry-after") || "60";
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfter: parseInt(retryAfter) },
        {
          status: 429,
          headers: { "Retry-After": retryAfter },
        },
      );
    }

    // Payment Required (Quota Exceeded)
    if (nestResponse.status === 402) {
      return NextResponse.json(
        { error: "Token quota exceeded. Please upgrade your plan." },
        { status: 402 },
      );
    }

    return NextResponse.json(
      { error: err.message || "Backend error" },
      { status: nestResponse.status },
    );
  }

  /**
   * SSE Stream Setup:
   * - Content-Type: text/event-stream is required for browser EventSource/Fetch parsing.
   * - Cache-Control: no-cache prevents Vercel/CDN from caching partial responses.
   * - X-Accel-Buffering: no is critical for Nginx/Cloudflare to disable buffering.
   */
  return new Response(nestResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// Ensure the route runs in the Node.js runtime for streaming support
export const runtime = "nodejs";
export const maxDuration = 60;
