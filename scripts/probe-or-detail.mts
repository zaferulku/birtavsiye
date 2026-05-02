import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// EXACT replica of textQuery in retrieveRankedProducts
const terms = ["iphone", "15", "plus"];
const escapeIlike = (t: string) => t.replace(/[%_]/g, "\$&").slice(0, 100);
const textClauses = terms.flatMap((term) => {
  const safe = escapeIlike(term);
  return [
    `title.ilike.%${safe}%`,
    `brand.ilike.%${safe}%`,
    `model_family.ilike.%${safe}%`,
    `model_code.ilike.%${safe}%`,
    `variant_storage.ilike.%${safe}%`,
    `variant_color.ilike.%${safe}%`,
  ];
});

const SELECT_FIELDS = "id, title, slug, brand, image_url, category_id, model_code, model_family, variant_storage, variant_color, created_at, prices:listings(id, price, source, last_seen, is_active, in_stock)";

let q = sb.from("products")
  .select(SELECT_FIELDS)
  .or(textClauses.join(","))
  .eq("is_active", true)
  .range(0, 79)
  .order("created_at", { ascending: false });

const { data, error } = await q;
console.log("OR query rows:", data?.length, "err:", error?.message);
const plus = data?.filter(p => /iphone 15 plus/i.test(p.title));
console.log("\niphone 15 plus matches in result:", plus?.length);
plus?.forEach(p => console.log(`  ${p.title?.slice(0,65)} | created=${p.created_at?.slice(0,10)} | listings=${p.prices?.length}`));
