import { createTextStreamResponse } from "ai";
import { NextRequest, NextResponse } from "next/server";

const NEST_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function createBackendTextStream(body: ReadableStream<Uint8Array>) {
  let buffer = "";
  const decoder = new TextDecoder();
  const processBuffer = (
    controller: TransformStreamDefaultController<string>,
    flush = false,
  ) => {
    let boundary = buffer.indexOf("\n\n");

    while (boundary !== -1) {
      const eventBlock = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      for (const line of eventBlock.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;

        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload) as { text?: string; error?: string };
          if (parsed.text) controller.enqueue(parsed.text);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (error) {
          if (error instanceof Error && error.message !== payload) {
            throw error;
          }
        }
      }

      boundary = buffer.indexOf("\n\n");
    }

    if (flush && buffer.trim()) {
      const payload = buffer.replace(/^data:\s*/, "").trim();
      buffer = "";
      if (!payload || payload === "[DONE]") return;

      const parsed = JSON.parse(payload) as { text?: string };
      if (parsed.text) controller.enqueue(parsed.text);
    }
  };

  return body
    .pipeThrough(
      new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true });
          processBuffer(controller);
        },
        flush(controller) {
          buffer += decoder.decode();
          processBuffer(controller, true);
        },
      }),
    );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { messages, conversationId } = body;

  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId is required" },
      { status: 400 },
    );
  }

  const lastMessage = messages?.[messages.length - 1];
  const content =
    typeof lastMessage?.text === "string"
      ? lastMessage.text
      : Array.isArray(lastMessage?.parts)
        ? lastMessage.parts
            .filter((part: { type?: string }) => part.type === "text")
            .map((part: { text?: string }) => part.text ?? "")
            .join("")
        : "";

  if (!content.trim()) {
    return NextResponse.json(
      { error: "A user message is required" },
      { status: 400 },
    );
  }

  const nestResponse = await fetch(
    `${NEST_API}/api/v1/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
    },
  );

  if (!nestResponse.ok) {
    const err = await nestResponse.json().catch(() => ({}));

    return NextResponse.json(
      {
        error:
          err.error ||
          err.message ||
          "Backend error",
        code: err.code,
      },
      { status: nestResponse.status },
    );
  }

  if (!nestResponse.body) {
    return NextResponse.json({ error: "Empty stream" }, { status: 502 });
  }

  return createTextStreamResponse({
    textStream: createBackendTextStream(nestResponse.body),
    headers: {
      "Cache-Control": "no-cache",
    },
  });
}

export const runtime = "nodejs";
export const maxDuration = 60;
