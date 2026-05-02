import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local', 'utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l => {
  const m = l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Last 24h listings per source
const since = new Date(Date.now() - 24*60*60*1000).toISOString();
const { data: lst } = await sb.from('listings').select('source, last_seen, created_at').gte('last_seen', since).limit(2000);
const byS: Record<string, number> = {};
lst?.forEach(l => { byS[l.source||'null'] = (byS[l.source||'null']||0)+1; });
console.log("Last 24h listings activity:");
Object.entries(byS).forEach(([s,n]) => console.log(`  ${s}: ${n}`));

// Last seen per source
for (const src of ['mediamarkt','pttavm']) {
  const { data } = await sb.from('listings').select('last_seen').eq('source', src).order('last_seen', { ascending: false }).limit(1);
  console.log(`${src} most recent last_seen:`, data?.[0]?.last_seen ?? 'NONE');
}
