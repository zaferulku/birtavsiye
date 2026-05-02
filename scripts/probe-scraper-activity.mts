import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log("=== Listings — son aktivite (last_seen) ===");
for (const src of ['pttavm', 'mediamarkt']) {
  const { data } = await sb.from('listings').select('last_seen').eq('source', src).order('last_seen', {ascending: false}).limit(1);
  console.log(`  ${src.padEnd(15)} son listing.last_seen: ${(data?.[0] as any)?.last_seen ?? 'YOK'}`);
}

console.log("\n=== Listings — son 24 saatte yeni eklenen (created_at) ===");
const since = new Date(Date.now() - 24*3600*1000).toISOString();
for (const src of ['pttavm', 'mediamarkt']) {
  const { count } = await sb.from('listings').select('*',{count:'exact',head:true}).eq('source', src).gte('created_at', since);
  console.log(`  ${src.padEnd(15)} son 24h yeni: ${count}`);
}

console.log("\n=== Agent decisions — son scraper kayıtları ===");
const { data: ad } = await sb.from('agent_decisions').select('agent_name, created_at')
  .like('agent_name', '%scrape%').order('created_at', {ascending: false}).limit(3);
ad?.forEach((r:any) => console.log(`  ${r.agent_name.padEnd(30)} ${r.created_at}`));

console.log("\n=== Şu an saat ===");
console.log(`  ${new Date().toISOString()}`);
