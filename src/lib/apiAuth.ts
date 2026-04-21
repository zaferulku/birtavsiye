import { createClient } from "@supabase/supabase-js";

// API route'larında session doğrulama — client Authorization: Bearer <access_token>
// header'ı gönderir, burada validate edilir. Anon key sadece auth doğrulama için
// server'da kullanılır, client'a gitmez.

export async function getUserFromRequest(req: Request): Promise<{ id: string; email: string | null } | null> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
