import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const mod = await import('../src/lib/search/productRetrieval');
const { products, diagnostics } = await mod.retrieveRankedProducts({
  sb,
  query: "iphone 15 plus",
  limit: 20,
  offset: 0,
});
console.log("total:", products.length);
products.slice(0,10).forEach((p,i)=>console.log(`[${i+1}] ${p.title?.slice(0,75)} | brand=${p.brand} | listings=${p.listing_count} | score=${p.search_score}`));
console.log("\ndiag:", JSON.stringify(diagnostics, null, 2)?.slice(0, 600));
