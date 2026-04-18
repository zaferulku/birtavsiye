import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agentRunner";
import { supabaseAdmin } from "@/lib/supabaseServer";

function verifyWebhook(req: Request): boolean {
  return req.headers.get("x-internal-secret") === process.env.INTERNAL_API_SECRET;
}

export async function POST(req: Request) {
  if (!verifyWebhook(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const { review_id, content, author_id } = await req.json() as {
    review_id: string;
    content: string;
    author_id?: string;
  };

  if (!review_id || !content) {
    return NextResponse.json({ error: "review_id and content required" }, { status: 400 });
  }

  console.log(`[${new Date().toISOString()}] WEBHOOK /api/webhook/review/new review_id=${review_id}`);

  // 1. Moderation first
  const modResult = await runAgent(
    "content-moderator",
    "Analyze this review for spam, offensive content, and policy violations. Return risk_score (0-1) and reason.",
    { review_id, content, author_id }
  );

  const riskScore = (modResult.data.risk_score as number) ?? 0;
  const reason = (modResult.data.reason as string) ?? "";
  const status = riskScore >= 0.6 ? "rejected" : "approved";

  await supabaseAdmin.from("review_queue").insert({
    review_id,
    status,
    risk_score: riskScore,
    reason,
  });

  // 2. Sentiment only if approved
  let sentimentResult = null;
  if (status === "approved") {
    sentimentResult = await runAgent(
      "review-sentiment-analyzer",
      "Analyze the sentiment and key topics of this approved review",
      { review_id, content }
    );
  }

  return NextResponse.json({
    success: true,
    agent: "content-moderator",
    duration: Date.now() - start,
    risk_score: riskScore,
    status,
    sentiment: sentimentResult?.data ?? null,
  });
}
