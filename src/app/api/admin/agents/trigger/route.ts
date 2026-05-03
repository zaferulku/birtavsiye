import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "../../../../../lib/apiAdmin";
import { runScriptAgent } from "../../../../../lib/agentRunner";

export const runtime = "nodejs";
export const maxDuration = 120;

// Whitelist of script-based agents that can be manually triggered.
// Each entry maps agent_name → script command + args.
const SCRIPT_AGENTS: Record<
  string,
  {
    command: string;
    args: string[];
    relatedEntityType?: string;
    inputData: Record<string, unknown>;
    computeStatus?: (output: Record<string, unknown>, exit: number) => "success" | "partial" | "error" | "noop";
    computeConfidence?: (output: Record<string, unknown>) => number;
    computePatchProposed?: (output: Record<string, unknown>) => boolean;
  }
> = {
  "category-link-auditor": {
    command: "node",
    args: ["scripts/probe-nav-db-compare.mjs"],
    relatedEntityType: "system",
    inputData: { scope: "full", header_path: "src/app/components/layout/Header.tsx", auto_patch: false },
    computeStatus: (output, exit) => {
      if (exit !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const broken = Number(s?.broken ?? 0);
      const leaf = Number(s?.leaf ?? 0);
      if (broken > 0) return "partial";
      if (leaf === 0 && broken === 0) return "noop";
      return "success";
    },
    computeConfidence: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Number(s?.ambiguous ?? 0) > 0 ? 0.6 : 1.0;
    },
    computePatchProposed: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Boolean(s?.patchProposed) || Number(s?.broken ?? 0) > 0 || Number(s?.leaf ?? 0) > 0;
    },
  },
  "canonical-data-manager": {
    command: "node",
    args: ["scripts/canonical-health.mjs"],
    relatedEntityType: "system",
    inputData: { scope: "full" },
    computeStatus: (output, exit) => {
      if (exit !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const orphans = Number(s?.orphans ?? 0);
      const nullBrand = Number(s?.null_brand ?? 0);
      const nullCategory = Number(s?.null_category ?? 0);
      if (orphans > 0 || nullBrand > 0 || nullCategory > 0) return "success";
      return "noop";
    },
    computeConfidence: () => 1.0,
    computePatchProposed: () => false,
  },
  "price-intelligence": {
    command: "node",
    args: ["scripts/price-intelligence-snapshot.mjs"],
    relatedEntityType: "system",
    inputData: { window_hours: 24, threshold_percent: 10 },
    computeStatus: (output, exit) => {
      if (exit !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Number(s?.rows_24h ?? 0) === 0 ? "noop" : "success";
    },
    computeConfidence: () => 1.0,
    computePatchProposed: () => false,
  },
  "product-matcher": {
    command: "node",
    args: ["scripts/product-matcher-audit.mjs"],
    relatedEntityType: "system",
    inputData: { audit_mode: "exact_canonical_key" },
    computeStatus: (output, exit) => {
      if (exit !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Number(s?.exact_dup_groups ?? 0) > 0 ? "partial" : "success";
    },
    computeConfidence: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Number(s?.exact_dup_groups ?? 0) > 0 ? 0.95 : 1.0;
    },
    computePatchProposed: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Boolean(s?.patchProposed) || Number(s?.exact_dup_groups ?? 0) > 0;
    },
  },
  "site-supervisor": {
    command: "node",
    args: ["scripts/site-supervisor-healthcheck.mjs"],
    relatedEntityType: "system",
    inputData: { window_hours: 24, lookback_days: 7 },
    computeStatus: (output, exit) => {
      if (exit !== 0) return "error";
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      const sev = String(s?.severity ?? "low");
      return sev === "high" ? "partial" : "success";
    },
    computeConfidence: () => 1.0,
    computePatchProposed: (output) => {
      const s = (output.summary ?? output) as Record<string, unknown> | undefined;
      return Boolean(s?.patchProposed);
    },
  },
};

// POST /api/admin/agents/trigger  body: { agent_name }
export async function POST(req: NextRequest) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  let body: { agent_name?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid json" }, { status: 400 }); }

  const agentName = body.agent_name;
  if (!agentName || !(agentName in SCRIPT_AGENTS)) {
    return NextResponse.json({ error: `Bilinmeyen agent: ${agentName}. Geçerli: ${Object.keys(SCRIPT_AGENTS).join(", ")}` }, { status: 400 });
  }

  const config = SCRIPT_AGENTS[agentName];
  const result = await runScriptAgent(agentName, {
    command: config.command,
    args: config.args,
    cwd: process.cwd(),
    timeoutMs: 90_000,
    triggeredBy: "manual",
    inputData: { ...config.inputData, triggered_by_admin: admin.id },
    computeStatus: config.computeStatus,
    computeConfidence: config.computeConfidence,
    computePatchProposed: config.computePatchProposed,
    relatedEntityType: config.relatedEntityType ?? null,
  });

  return NextResponse.json({
    ok: result.success,
    agent: agentName,
    status: result.status,
    decisionId: result.decisionId,
    duration_ms: result.duration_ms,
    patch_proposed: result.patch_proposed,
    summary: (result.output.summary ?? null),
    error: result.error,
  });
}
