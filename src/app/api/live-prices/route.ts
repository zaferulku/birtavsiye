/**
 * SSE endpoint: /api/live-prices
 * Streams live price updates to the client as each store responds.
 */

import { createClient } from "@supabase/supabase-js";
import { fetchLivePricesForProduct } from "@/lib/scrapers/live";
import type { SseEvent } from "@/lib/scrapers/live/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  const forceFresh = url.searchParams.get("fresh") === "1";

  if (!productId) {
    return new Response(
      JSON.stringify({ error: "product_id query param required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
    return new Response(
      JSON.stringify({ error: "invalid product_id format" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: SseEvent) => {
        const eventType = event.type;
        const data = JSON.stringify(event);
        const payload = `event: ${eventType}\ndata: ${data}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          console.warn("[sse] emit failed:", err);
        }
      };

      request.signal.addEventListener("abort", () => {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });

      try {
        await fetchLivePricesForProduct(supabase, productId, emit, {
          forceFresh,
          globalTimeoutMs: 5000,
        });
      } catch (err: any) {
        console.error("[sse] fetch error:", err);
        emit({
          type: "done",
          total_stores: 0,
          successful: 0,
          failed: 1,
          duration_ms: 0,
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
