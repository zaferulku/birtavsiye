import { supabaseAdmin } from "./supabaseServer";
import { getUserFromRequest } from "./apiAuth";

export async function getAdminUser(req: Request): Promise<{ id: string; email: string | null } | null> {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) return null;
  return user;
}
