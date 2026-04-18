import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";

function verifyInternal(req: Request): boolean {
  return req.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

export async function POST(req: Request) {
  if (!verifyInternal(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const { query } = await req.json() as { query: string };

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  console.log(`[${new Date().toISOString()}] SEARCH /api/search/interpret q="${query}"`);

  const result = await runAgent(
    "turkish-search-agent",
    "Interpret Turkish search query: correct typos, normalize brand/model, extract price/category filters, detect intent",
    { query: query.trim() }
  );

  return NextResponse.json({
    success: result.success,
    agent: "turkish-search-agent",
    duration: Date.now() - start,
    original_query: query,
    interpretation: result.data,
    error: result.error,
  });
}
