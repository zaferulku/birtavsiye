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
  const body = await req.json() as {
    task: string;
    agent?: "master" | "task-router";
    payload?: Record<string, unknown>;
  };

  if (!body.task) {
    return NextResponse.json({ error: "task required" }, { status: 400 });
  }

  const agentName = body.agent === "task-router" ? "task-router" : "master-orchestrator";

  console.log(`[${new Date().toISOString()}] ORCHESTRATOR ${agentName} task="${body.task}"`);

  const result = await runAgent(
    agentName,
    body.task,
    body.payload ?? {}
  );

  return NextResponse.json({
    success: result.success,
    agent: agentName,
    duration: Date.now() - start,
    routing: result.data,
    error: result.error,
  });
}
