import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// includeEmptyListings=true to see what's filtered
const mod = await import('../src/lib/search/productRetrieval');
const { products } = await mod.retrieveRankedProducts({
  sb,
  query: "iphone 15 plus",
  limit: 30,
  offset: 0,
  includeEmptyListings: true,
});
console.log("includeEmpty=true total:", products.length);
products.slice(0,15).forEach((p,i)=>console.log(`[${i+1}] ${p.title?.slice(0,75)} | brand=${p.brand} | listings=${p.listing_count} | score=${p.search_score}`));

// Also run with includeEmpty=false to see how filter strips
const r2 = await mod.retrieveRankedProducts({
  sb, query: "iphone 15 plus", limit: 30, offset: 0,
});
console.log("\nincludeEmpty=false total:", r2.products.length);
r2.products.slice(0,5).forEach(p => console.log(`  ${p.title?.slice(0,70)} | listings=${p.listing_count}`));
