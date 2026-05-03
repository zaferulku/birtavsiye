import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "../../../../../lib/apiAdmin";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

export const runtime = "nodejs";

// GET /api/admin/agents/decisions?agent=...&status=...&triggered_by=...&pending=true&limit=50
export async function GET(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = req.nextUrl;
  const agent = url.searchParams.get("agent");
  const status = url.searchParams.get("status");
  const triggeredBy = url.searchParams.get("triggered_by");
  const pending = url.searchParams.get("pending") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

  let q = supabaseAdmin
    .from("agent_decisions")
    .select(
      "id, timestamp, agent_name, agent_version, method, confidence, latency_ms, tokens_used, status, triggered_by, patch_proposed, patch_applied_at, related_entity_type, related_entity_id, output_data"
    )
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (agent) q = q.eq("agent_name", agent);
  if (status) q = q.eq("status", status);
  if (triggeredBy) q = q.eq("triggered_by", triggeredBy);
  if (pending) q = q.eq("patch_proposed", true).is("patch_applied_at", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Özet
  const { data: summary } = await supabaseAdmin
    .from("agent_decisions")
    .select("agent_name, status, patch_proposed, patch_applied_at")
    .gte("timestamp", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const counts = {
    last24h: summary?.length ?? 0,
    pending_patches: (summary ?? []).filter(
      (r) => r.patch_proposed === true && r.patch_applied_at === null
    ).length,
    errors_24h: (summary ?? []).filter((r) => r.status === "error").length,
    by_agent: Object.fromEntries(
      Object.entries(
        (summary ?? []).reduce((acc: Record<string, number>, r) => {
          acc[r.agent_name] = (acc[r.agent_name] ?? 0) + 1;
          return acc;
        }, {})
      )
    ),
  };

  return NextResponse.json({ decisions: data ?? [], counts });
}

// PATCH /api/admin/agents/decisions  body: { id, action: "apply" | "dismiss" }
// Apply: patch_applied_at = now() (admin onayladı)
// Dismiss: patch_applied_at = now() ama dismiss flag de bırakır (zaten output_data'da)
export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  let body: { id?: number | string; action?: "apply" | "dismiss" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }
  if (!body.id || (body.action !== "apply" && body.action !== "dismiss")) {
    return NextResponse.json({ error: "id ve action ('apply' | 'dismiss') gerekli" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("agent_decisions")
    .update({ patch_applied_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("id, agent_name, patch_applied_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, decision: data, action: body.action });
}
