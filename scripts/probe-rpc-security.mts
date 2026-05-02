import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const anonSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 1. SECURITY DEFINER RPC anon EXECUTE açık mı?
console.log("1) ANON test: adjust_topic_answer_count RPC EXECUTE?");
const { error: rpcErr } = await anonSb.rpc('adjust_topic_answer_count', {
  p_topic_id: '00000000-0000-0000-0000-000000000000',
  p_delta: 0
});
if (rpcErr) console.log(`   ✅ KAPALI: ${rpcErr.code ?? '?'} ${rpcErr.message?.slice(0,80)}`);
else console.log(`   🚨 AÇIK: anon RPC çağırabildi!`);

// 2. public katalog tablolar (products/categories) — frontend okuma için anon SELECT lazım mı?
console.log("\n2) Frontend impact: anon kategori list?");
const { data: cats, error: catErr } = await anonSb.from('categories').select('slug').limit(5);
if (catErr) console.log(`   ⚠️ ${catErr.code} ${catErr.message?.slice(0,80)}`);
else console.log(`   ℹ️ anon ${cats?.length ?? 0} kategori gördü ${cats?.length === 0 ? '(RLS deny — frontend supabaseAdmin ile çalışıyor)' : '(public)'}`);

// 3. Diğer RPC'ler
const otherRpcs = ['smart_search', 'match_products', 'retrieve_knowledge'];
console.log("\n3) Diğer RPC'ler (read-only):");
for (const fn of otherRpcs) {
  try {
    const { error } = await anonSb.rpc(fn, { query_embedding: null, keyword_patterns: ['x'], match_threshold: 0.3, match_count: 1 });
    if (error) console.log(`   ${fn.padEnd(25)} ⚠️ ${error.code ?? '?'} ${error.message?.slice(0,60)}`);
    else console.log(`   ${fn.padEnd(25)} ℹ️ anon çağırabildi (read-only OK)`);
  } catch (e:any) { console.log(`   ${fn.padEnd(25)} err: ${e.message?.slice(0,60)}`); }
}
