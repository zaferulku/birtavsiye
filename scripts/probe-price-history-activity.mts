import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Son 24 saat price_history (en aktif listing'ler)
const since = new Date(Date.now() - 24*3600*1000).toISOString();
const { data } = await sb.from('price_history').select('listing_id, recorded_at').gte('recorded_at', since);
const byListing = new Map<string, number>();
data?.forEach((r:any) => byListing.set(r.listing_id, (byListing.get(r.listing_id) ?? 0) + 1));
console.log("Son 24h price_history toplam:", data?.length ?? 0);
console.log("Etkilenen listing sayısı   :", byListing.size);
console.log("\nTop 10 listing (en çok kayıt):");
[...byListing.entries()].sort(([,a],[,b])=>b-a).slice(0,10).forEach(([id,n])=>console.log(`  ${n.toString().padStart(4)}  ${id}`));

// Toplam history vs listing
const { count: totalHist } = await sb.from('price_history').select('*',{count:'exact',head:true});
const { count: totalListings } = await sb.from('listings').select('*',{count:'exact',head:true});
console.log(`\nToplam price_history: ${totalHist}`);
console.log(`Toplam listings     : ${totalListings}`);
console.log(`Ortalama kayıt/listing: ${(totalHist! / totalListings!).toFixed(2)}`);
