import { NextResponse } from "next/server";
import { getAdminUser } from "../../../../lib/apiAdmin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ is_admin: false }, { status: 403 });
  return NextResponse.json({ is_admin: true });
}
