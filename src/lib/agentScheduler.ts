import { supabaseAdmin } from "./supabaseServer";

// Returns ISO string of last successful run, or null
export async function getLastRun(agentName: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("agent_logs")
    .select("created_at")
    .eq("agent_name", agentName)
    .eq("status", "success")
    .order("created_at", { ascending: false })
    .limit(1);

  return data?.[0]?.created_at ?? null;
}

// Returns true if enough time has passed since last successful run
export async function shouldRun(
  agentName: string,
  minIntervalMs: number
): Promise<boolean> {
  const lastRun = await getLastRun(agentName);
  if (!lastRun) return true;
  return Date.now() - new Date(lastRun).getTime() >= minIntervalMs;
}
