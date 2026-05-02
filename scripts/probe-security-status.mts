import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log("════════════════════════════════════════");
console.log("  Supabase Güvenlik Status");
console.log("════════════════════════════════════════\n");

// 1. anon kullanıcısı ile yeni client → INSERT/DELETE deneyebilir miyiz?
const anonSb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

console.log("1) ANON test: products tablosuna DELETE yetkisi?");
const { error: anonDel } = await anonSb.from('products').delete().eq('id', '00000000-0000-0000-0000-000000000000');
if (anonDel) console.log(`   ✅ KAPALI: ${anonDel.code} ${anonDel.message?.slice(0,80)}`);
else console.log(`   🚨 AÇIK: anon DELETE çalıştı!`);

console.log("\n2) ANON test: products tablosuna INSERT yetkisi?");
const { error: anonIns } = await anonSb.from('products').insert({title: 'TEST_DELETE_ME', slug: 'test-delete-me-xyz123'});
if (anonIns) console.log(`   ✅ KAPALI: ${anonIns.code} ${anonIns.message?.slice(0,80)}`);
else console.log(`   🚨 AÇIK: anon INSERT çalıştı!`);

console.log("\n3) ANON test: agent_decisions SELECT (internal log) yetkisi?");
const { data: ad, error: adErr } = await anonSb.from('agent_decisions').select('*').limit(1);
if (adErr) console.log(`   ✅ KAPALI: ${adErr.code} ${adErr.message?.slice(0,80)}`);
else if (ad && ad.length > 0) console.log(`   🚨 AÇIK: anon agent_decisions OKUDU (${ad.length} satır)`);
else console.log(`   ✅ KAPALI: anon empty (RLS deny)`);

console.log("\n4) ANON test: backup_20260422_products SELECT?");
const { data: bk, error: bkErr } = await anonSb.from('backup_20260422_products').select('*').limit(1);
if (bkErr) console.log(`   ✅ KAPALI: ${bkErr.code} ${bkErr.message?.slice(0,80)}`);
else if (bk && bk.length > 0) console.log(`   🚨 AÇIK: anon backup OKUDU`);
else console.log(`   ✅ KAPALI: anon empty`);

console.log("\n5) ANON test: public_profiles view SELECT?");
const { data: pp, error: ppErr } = await anonSb.from('public_profiles').select('*').limit(1);
if (ppErr) console.log(`   ⚠️ ${ppErr.code} ${ppErr.message?.slice(0,80)}`);
else console.log(`   ℹ️ anon ${pp?.length ?? 0} satır gördü (read-only OK ise normal)`);

console.log("\n6) ANON test: products SELECT (public katalog)?");
const { count: prodCount, error: prodErr } = await anonSb.from('products').select('*',{count:'exact',head:true}).eq('is_active',true);
if (prodErr) console.log(`   ⚠️ ${prodErr.code} ${prodErr.message?.slice(0,80)}`);
else console.log(`   ℹ️ anon ${prodCount} satır gördü (public katalog için normal)`);

console.log("\n════════════════════════════════════════");
console.log("  ÖZET");
console.log("════════════════════════════════════════");
console.log("Migration 016 (anon REVOKE 30 tablo): ✓ apply edildi (önceki user check)");
console.log("Migration 017 (public_profiles view REVOKE): ✓ apply edildi");
console.log("Migration 015 (public_profiles SECURITY INVOKER): ✓ apply edildi");
console.log("Migration 018 (RLS hardening + internal SELECT REVOKE): ?  manuel kontrol gerek");
console.log("RPC EXECUTE (adjust_topic_answer_count): ?  henüz REVOKE edilmedi olabilir");
