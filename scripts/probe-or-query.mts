import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Replicate the textClauses build
const terms = ["iphone", "15", "plus"];
const clauses = terms.flatMap((term) => [
  `title.ilike.%${term}%`,
  `brand.ilike.%${term}%`,
  `model_family.ilike.%${term}%`,
  `model_code.ilike.%${term}%`,
  `variant_storage.ilike.%${term}%`,
  `variant_color.ilike.%${term}%`,
]);
console.log("OR clauses:", clauses.length);
console.log(clauses.slice(0,4).join("  /  "));

const { data, error, count } = await sb.from('products')
  .select('id, title', { count: 'exact' })
  .or(clauses.join(','))
  .eq('is_active', true)
  .limit(10);
console.log(`\nResults: ${count} matches; first 5:`);
console.log("Error:", error?.message);
data?.slice(0,5).forEach(p => console.log(`  ${p.title?.slice(0,80)}`));

// Compare: simpler ilike on title only
const { data: simple, count: simpleCount } = await sb.from('products')
  .select('id, title', { count: 'exact' })
  .ilike('title', '%iphone%')
  .ilike('title', '%plus%')
  .eq('is_active', true)
  .limit(10);
console.log(`\nSimple AND ilike "iphone" + "plus": ${simpleCount} matches`);
simple?.slice(0,5).forEach(p => console.log(`  ${p.title?.slice(0,80)}`));
