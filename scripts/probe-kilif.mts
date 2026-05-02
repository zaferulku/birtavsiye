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

// Query 1: "iphone kılıf" — 2 term
const r1 = await mod.retrieveRankedProducts({ sb, query: "iphone kılıf", limit: 5, includeEmptyListings: true });
console.log("'iphone kılıf' count:", r1.products.length);
r1.products.slice(0,3).forEach(p => console.log(`  ${p.title?.slice(0,60)} | cat=${p.category_slug}`));

// Query 2: "iphone kilif" — 2 term simple  
const r2 = await mod.retrieveRankedProducts({ sb, query: "iphone kilif", limit: 5, includeEmptyListings: true });
console.log("\n'iphone kilif' count:", r2.products.length);
r2.products.slice(0,3).forEach(p => console.log(`  ${p.title?.slice(0,60)} | cat=${p.category_slug}`));

// Query 3: "kılıf" — 1 term
const r3 = await mod.retrieveRankedProducts({ sb, query: "kılıf", limit: 5, includeEmptyListings: true });
console.log("\n'kılıf' count:", r3.products.length);
r3.products.slice(0,3).forEach(p => console.log(`  ${p.title?.slice(0,60)} | cat=${p.category_slug}`));
