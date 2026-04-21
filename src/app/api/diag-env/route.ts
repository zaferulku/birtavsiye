import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    hasNvidia: !!process.env.NVIDIA_API_KEY,
    nvidiaLen: (process.env.NVIDIA_API_KEY || "").length,
    nvidiaPrefix: (process.env.NVIDIA_API_KEY || "").slice(0, 6),
    allKeys: Object.keys(process.env).filter(k => /nvidia|openai|groq|gemini|nim/i.test(k)),
  });
}
