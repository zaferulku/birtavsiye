import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const text = readFileSync('.env.local','utf8');
const env: Record<string,string> = {};
text.split(/\r?\n/).forEach(l=>{const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^["']|["']$/g,'');});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: cats } = await sb.from('categories').select('id, slug, name, parent_id');
const list = (cats ?? []) as Array<{id:string;slug:string;name:string;parent_id:string|null}>;

// Product count per category (in-memory aggregate)
const counts = new Map<string, number>();
let from = 0;
while (true) {
  const { data } = await sb.from('products').select('category_id').range(from, from+999);
  if (!data || data.length === 0) break;
  data.forEach((p:any) => { if(p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1); });
  if (data.length < 1000) break; from += 1000;
}

// Build tree
const childrenOf = new Map<string|null, typeof list>();
list.forEach(c => {
  const k = c.parent_id ?? null;
  if (!childrenOf.has(k)) childrenOf.set(k, []);
  childrenOf.get(k)!.push(c);
});
[...childrenOf.values()].forEach(arr => arr.sort((a,b) => a.name.localeCompare(b.name, 'tr')));

// Subtree sum (kategori + alt-kategoriler toplamı)
const subtreeSum = new Map<string, number>();
function calcSum(nodeId: string): number {
  if (subtreeSum.has(nodeId)) return subtreeSum.get(nodeId)!;
  let s = counts.get(nodeId) ?? 0;
  (childrenOf.get(nodeId) ?? []).forEach(c => { s += calcSum(c.id); });
  subtreeSum.set(nodeId, s);
  return s;
}
list.forEach(c => calcSum(c.id));

function print(parentId: string|null, prefix: string) {
  const kids = childrenOf.get(parentId) ?? [];
  kids.forEach((c, i) => {
    const last = i === kids.length - 1;
    const branch = last ? '└─ ' : '├─ ';
    const own = counts.get(c.id) ?? 0;
    const tree = subtreeSum.get(c.id) ?? 0;
    const num = (childrenOf.get(c.id)?.length ?? 0) > 0 ? `(${tree}, kendi=${own})` : `(${own})`;
    console.log(`${prefix}${branch}${c.name.padEnd(40)} [${c.slug.padEnd(35)}] ${num}`);
    const nextPrefix = prefix + (last ? '   ' : '│  ');
    print(c.id, nextPrefix);
  });
}

console.log(`Toplam kategori: ${list.length}\n`);
print(null, '');
