#!/usr/bin/env node
/**
 * site-supervisor-healthcheck.mjs
 *
 * site-supervisor agent için master health check.
 * Diğer agent'ları izler, anomalileri tespit eder, admin'e bildirir.
 *
 * Kontrol kapsamı:
 *   1. Cooldown ihlalleri (cron çalışmıyor mu?)
 *   2. 24h hata oranı (hangi agent'lar status='error' veriyor?)
 *   3. Bekleyen patch sayısı (admin onayı bekleyen)
 *   4. Stub vs gerçek agent oranı
 *   5. DB sağlık metrikleri (toplam product, listing, price_history 24h)
 *
 * Output:
 *   - scripts/.site-supervisor.json (full report)
 *   - stdout: __AUDIT_JSON__<summary>
 *
 * Patch policy:
 *   - patch_proposed=true if overdue>0 OR pending_patches>5 OR errors_24h>0
 *   - Severity: low/medium/high
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('site-supervisor: master health check başlıyor');

// Beklenen interval (saat) — cron route'larındaki MIN_INTERVAL_MS ile uyumlu
const AGENT_INTERVALS_HOURS = {
  'category-link-auditor': 1,
  'site-supervisor': 1,
  'safety': 1,
  'price-intelligence': 1,
  'comparison-engine': 1,
  'notification-dispatcher': 0.25, // 10 min
  'canonical-data-manager': 6,
  'checkout-info-extractor': 6,
  'migration-supervisor': 24,
  'product-matcher': 24,
  'product-classifier': 24,
  'product-enricher': 24,
  'seo-landing-generator': 24,
  'review-aggregator': 168, // 7d
};

const now = Date.now();
const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
const since7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

// 1. Bilinen agent isimleri (son 7 gün agent_decisions'a yazmış olanlar)
const { data: recentRows } = await sb
  .from('agent_decisions')
  .select('agent_name')
  .gte('timestamp', since7d);
const knownAgents = [...new Set((recentRows ?? []).map(r => r.agent_name))].sort();
console.log(`site-supervisor: ${knownAgents.length} bilinen agent`);

// 2. Her agent için son run zamanı
const overdueAgents = [];
const lastSeen = {};
for (const agentName of knownAgents) {
  const { data: latest } = await sb
    .from('agent_decisions')
    .select('timestamp, status, method')
    .eq('agent_name', agentName)
    .order('timestamp', { ascending: false })
    .limit(1);
  if (!latest?.[0]) continue;
  const latestTs = new Date(latest[0].timestamp).getTime();
  const ageHours = (now - latestTs) / 3600000;
  lastSeen[agentName] = {
    timestamp: latest[0].timestamp,
    age_hours: Number(ageHours.toFixed(2)),
    status: latest[0].status,
    method: latest[0].method,
  };
  const expectedHours = AGENT_INTERVALS_HOURS[agentName] ?? 1;
  // 2x interval'i aştıysa overdue
  if (ageHours > expectedHours * 2) {
    overdueAgents.push({
      agent: agentName,
      expected_hours: expectedHours,
      age_hours: Number(ageHours.toFixed(2)),
      hours_overdue: Number((ageHours - expectedHours).toFixed(2)),
      last_seen: latest[0].timestamp,
    });
  }
}

// 3. 24h hata sayıları (agent başına)
const { data: errors24h } = await sb
  .from('agent_decisions')
  .select('agent_name, timestamp')
  .eq('status', 'error')
  .gte('timestamp', since24h);
const errorByAgent = {};
for (const r of errors24h ?? []) {
  errorByAgent[r.agent_name] = (errorByAgent[r.agent_name] ?? 0) + 1;
}
const totalErrors24h = Object.values(errorByAgent).reduce((s, n) => s + n, 0);

// 4. Bekleyen patch sayısı
const { count: pendingPatches } = await sb
  .from('agent_decisions')
  .select('id', { count: 'exact', head: true })
  .eq('patch_proposed', true)
  .is('patch_applied_at', null);

// 5. Stub agent'lar (son 24h hâlâ stub method'la yazıyor olanlar)
const { data: stubs24h } = await sb
  .from('agent_decisions')
  .select('agent_name')
  .eq('method', 'stub')
  .gte('timestamp', since24h);
const stubAgents = [...new Set((stubs24h ?? []).map(r => r.agent_name))].sort();

// 6. DB metrikleri
const [
  { count: totalProducts },
  { count: totalListings },
  { count: priceHistory24h },
  { count: totalCategories },
] = await Promise.all([
  sb.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
  sb.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true),
  sb.from('price_history').select('id', { count: 'exact', head: true }).gte('recorded_at', since24h),
  sb.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
]);

// 7. 24h toplam decision sayısı
const { count: totalDecisions24h } = await sb
  .from('agent_decisions')
  .select('id', { count: 'exact', head: true })
  .gte('timestamp', since24h);

// 8. Severity
let severity = 'low';
const errorAgentsCount = Object.keys(errorByAgent).length;
if (overdueAgents.length > 5 || (pendingPatches ?? 0) > 10 || errorAgentsCount > 3) {
  severity = 'high';
} else if (overdueAgents.length > 0 || (pendingPatches ?? 0) > 5 || errorAgentsCount > 0) {
  severity = 'medium';
}

const realAgents = knownAgents.filter(a => !stubAgents.includes(a));

const summary = {
  // Agent ekosistemi
  agents_known: knownAgents.length,
  agents_real: realAgents.length,
  agents_stub: stubAgents.length,
  // Anomali tespiti
  overdue_count: overdueAgents.length,
  errors_24h: totalErrors24h,
  agents_with_errors: errorAgentsCount,
  pending_patches: pendingPatches ?? 0,
  total_decisions_24h: totalDecisions24h ?? 0,
  // DB metrikleri
  total_products: totalProducts ?? 0,
  total_listings: totalListings ?? 0,
  price_history_24h: priceHistory24h ?? 0,
  total_categories: totalCategories ?? 0,
  // Karar
  patchProposed: overdueAgents.length > 0 || (pendingPatches ?? 0) > 5 || errorAgentsCount > 0,
  severity,
};

const report = {
  generatedAt: new Date().toISOString(),
  summary,
  overdue_agents: overdueAgents,
  error_counts_24h: errorByAgent,
  stub_agents: stubAgents,
  real_agents: realAgents,
  last_seen: lastSeen,
};

writeFileSync('./scripts/.site-supervisor.json', JSON.stringify(report, null, 2));

console.log('\n=== SITE SUPERVISOR HEALTH ===');
console.log(`Bilinen agent:                ${summary.agents_known}`);
console.log(`Gerçek agent:                 ${summary.agents_real}`);
console.log(`Stub agent (henüz 0):         ${summary.agents_stub}`);
console.log(`Overdue (cron kırık?):        ${summary.overdue_count}`);
console.log(`24h hata sayısı:              ${summary.errors_24h} (${summary.agents_with_errors} agent)`);
console.log(`Bekleyen patch:               ${summary.pending_patches}`);
console.log(`24h toplam decision:          ${summary.total_decisions_24h}`);
console.log(`Aktif products / listings:    ${summary.total_products} / ${summary.total_listings}`);
console.log(`24h price_history yazımları:  ${summary.price_history_24h}`);
console.log(`Severity:                     ${summary.severity}`);
console.log(`Patch proposed:               ${summary.patchProposed}`);

if (overdueAgents.length > 0) {
  console.log('\nOverdue agents:');
  for (const o of overdueAgents) {
    console.log(`  ${o.agent.padEnd(25)} ${o.age_hours}h (beklenen ${o.expected_hours}h)`);
  }
}
if (Object.keys(errorByAgent).length > 0) {
  console.log('\n24h hatalı agents:');
  for (const [a, n] of Object.entries(errorByAgent)) {
    console.log(`  ${a.padEnd(25)} ${n} hata`);
  }
}

console.log(`\nReport: scripts/.site-supervisor.json`);
console.log('\n__AUDIT_JSON__' + JSON.stringify(summary));
