import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const mod = await import('../src/lib/search/productRetrieval');
const { products } = await mod.retrieveRankedProducts({
  sb, query: "iphone 15 plus", limit: 10, offset: 0, includeEmptyListings: true,
});
console.log("total:", products.length);
products.forEach((p,i)=>{
  console.log(`[${i+1}] ${p.title?.slice(0,60)}`);
  console.log(`    cat=${p.category_slug} | lexical=${p.score_breakdown?.lexical} | total=${p.search_score} | reasons=${p.ranking_reasons?.join(",")?.slice(0,120)}`);
});
