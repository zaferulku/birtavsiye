import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
console.log("url:", url, "key len:", key?.length);
const sb = createClient(url, key);
const { data } = await sb.from('categories').select('id, slug, name, is_active, is_leaf, parent_id').ilike('slug', '%spor%cant%').limit(20);
console.log("spor*cant:", JSON.stringify(data, null, 2));
const { data: all } = await sb.from('categories').select('slug, is_active').or('slug.eq.spor-cantasi,slug.ilike.spor%').limit(20);
console.log("\nspor-cantasi/spor%:", JSON.stringify(all, null, 2));
