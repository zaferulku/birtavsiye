#!/usr/bin/env node
/**
 * Repair marketplace products that landed in legacy/duplicate category branches.
 *
 * Dry-run:
 *   node --env-file=.env.local scripts/repair-marketplace-category-canonicals.mjs
 *
 * Apply:
 *   APPLY=1 node --env-file=.env.local scripts/repair-marketplace-category-canonicals.mjs
 */
import { createClient } from "@supabase/supabase-js";

const apply = process.env.APPLY === "1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FOOD_GROUP_SLUG = "supermarket/gida-icecek";

const CATEGORY_DEFINITIONS = {
  [FOOD_GROUP_SLUG]: {
    name: "Gıda & İçecek",
    parentSlug: "supermarket",
    isLeaf: false,
  },
  [`${FOOD_GROUP_SLUG}/kahve`]: {
    name: "Kahve",
    parentSlug: FOOD_GROUP_SLUG,
    isLeaf: false,
  },
  [`${FOOD_GROUP_SLUG}/kahve/cekirdek-kahve`]: {
    name: "Çekirdek Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`]: {
    name: "Espresso, Cappucino Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`]: {
    name: "Filtre & Çekirdek Kahveler",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/hazir-kahve`]: {
    name: "Hazır Kahve",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/kahve-aksesuarlari`]: {
    name: "Kahve Aksesuarları",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`]: {
    name: "Kahve Kapsülleri",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  [`${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`]: {
    name: "Türk Kahvesi",
    parentSlug: `${FOOD_GROUP_SLUG}/kahve`,
  },
  "spor-outdoor/yoga-pilates/pilates-mati": {
    name: "Pilates Matı",
    parentSlug: "spor-outdoor/yoga-pilates",
  },
};

const FOOD_BRANCH_MOVES = [
  ["supermarket/gida", FOOD_GROUP_SLUG, "supermarket"],
  ["supermarket/atistirmalik", `${FOOD_GROUP_SLUG}/atistirmalik`, FOOD_GROUP_SLUG],
  ["supermarket/bakliyat-makarna", `${FOOD_GROUP_SLUG}/bakliyat-makarna`, FOOD_GROUP_SLUG],
  ["supermarket/dondurma-tatli", `${FOOD_GROUP_SLUG}/dondurma-tatli`, FOOD_GROUP_SLUG],
  ["supermarket/icecek", `${FOOD_GROUP_SLUG}/icecek`, FOOD_GROUP_SLUG],
  ["supermarket/kahvalti-kahve", `${FOOD_GROUP_SLUG}/kahvalti-kahve`, FOOD_GROUP_SLUG],
  ["supermarket/konserve-sos", `${FOOD_GROUP_SLUG}/konserve-sos`, FOOD_GROUP_SLUG],
  [`${FOOD_GROUP_SLUG}/icecek/kahve`, `${FOOD_GROUP_SLUG}/kahve`, FOOD_GROUP_SLUG],
];

const LEGACY_CATEGORY_TARGETS = {
  "supermarket/atistirmalik": `${FOOD_GROUP_SLUG}/atistirmalik`,
  "supermarket/bakliyat-makarna": `${FOOD_GROUP_SLUG}/bakliyat-makarna`,
  "supermarket/dondurma-tatli": `${FOOD_GROUP_SLUG}/dondurma-tatli`,
  "supermarket/icecek": `${FOOD_GROUP_SLUG}/icecek`,
  "supermarket/icecek/kahve": `${FOOD_GROUP_SLUG}/kahve`,
  "supermarket/icecek/kahve/cekirdek-kahve": `${FOOD_GROUP_SLUG}/kahve/cekirdek-kahve`,
  "supermarket/icecek/kahve/espresso-cappucino-kahve": `${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`,
  "supermarket/icecek/kahve/filtre-cekirdek-kahveler": `${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`,
  "supermarket/icecek/kahve/hazir-kahve": `${FOOD_GROUP_SLUG}/kahve/hazir-kahve`,
  "supermarket/icecek/kahve/kahve-aksesuarlari": `${FOOD_GROUP_SLUG}/kahve/kahve-aksesuarlari`,
  "supermarket/icecek/kahve/kahve-kapsulleri": `${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`,
  "supermarket/icecek/kahve/turk-kahvesi": `${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`,
  "supermarket/kahvalti-kahve": `${FOOD_GROUP_SLUG}/kahvalti-kahve`,
  "supermarket/kahve": `${FOOD_GROUP_SLUG}/kahve`,
  "supermarket/kahve/espresso": `${FOOD_GROUP_SLUG}/kahve/espresso-cappucino-kahve`,
  "supermarket/kahve/filtre-kahve": `${FOOD_GROUP_SLUG}/kahve/filtre-cekirdek-kahveler`,
  "supermarket/kahve/nespresso-kapsul": `${FOOD_GROUP_SLUG}/kahve/kahve-kapsulleri`,
  "supermarket/kahve/turk-kahvesi": `${FOOD_GROUP_SLUG}/kahve/turk-kahvesi`,
  "supermarket/konserve-sos": `${FOOD_GROUP_SLUG}/konserve-sos`,
  "spor-outdoor/spor-fitness/fitness-kondisyon/pilates/pilates-mati":
    "spor-outdoor/yoga-pilates/pilates-mati",
};

const TITLE_TARGETS = [
  {
    targetSlug: "spor-outdoor/yoga-pilates/yoga-mati",
    test: (text) => /\byoga mati\b|\byoga mat\b/.test(text),
  },
  {
    targetSlug: "spor-outdoor/yoga-pilates/pilates-mati",
    test: (text) => /\bpilates mati\b|\bpilates mat\b/.test(text),
  },
  {
    targetSlug: "spor-outdoor/yoga-pilates/pilates-topu",
    test: (text) => /\bpilates topu\b/.test(text),
  },
];

let categories = await fetchAllCategories();
let bySlug = new Map(categories.map((category) => [category.slug, category]));
let byId = new Map(categories.map((category) => [category.id, category]));

console.log(`Marketplace category canonical repair | mode=${apply ? "APPLY" : "DRY_RUN"}`);

await repairFoodHierarchy();

for (const [slug, definition] of Object.entries(CATEGORY_DEFINITIONS)) {
  await ensureCategory(slug, definition.name, definition.parentSlug, definition.isLeaf ?? true);
}

await refreshCategoryMaps();

const products = await fetchAllProducts();
const plannedMoves = [];

for (const product of products) {
  const current = product.category_id ? byId.get(product.category_id) : null;
  const targetSlug = resolveTargetSlug(product, current);
  if (!targetSlug || current?.slug === targetSlug) continue;

  const target = bySlug.get(targetSlug);
  if (!target) {
    console.warn(`missing target category ${targetSlug} for ${product.slug}`);
    continue;
  }

  plannedMoves.push({
    id: product.id,
    title: product.title,
    slug: product.slug,
    from: current?.slug ?? "(none)",
    to: target.slug,
    targetId: target.id,
  });
}

const grouped = new Map();
for (const move of plannedMoves) {
  const key = `${move.from} -> ${move.to}`;
  grouped.set(key, (grouped.get(key) ?? 0) + 1);
}

console.log("\n=== Planned moves ===");
for (const [transition, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${transition}`);
}

console.log("\n=== Samples ===");
for (const move of plannedMoves.slice(0, 30)) {
  console.log(`${move.title} | ${move.from} -> ${move.to}`);
}

if (apply) {
  let moved = 0;
  for (const chunk of chunkArray(plannedMoves, 100)) {
    const movesByTarget = new Map();
    for (const move of chunk) {
      const ids = movesByTarget.get(move.targetId) ?? [];
      ids.push(move.id);
      movesByTarget.set(move.targetId, ids);
    }

    for (const [targetId, ids] of movesByTarget) {
      const { error } = await sb
        .from("products")
        .update({ category_id: targetId })
        .in("id", ids);
      if (error) {
        console.warn(`product move failed target=${targetId}: ${error.message}`);
        continue;
      }
      moved += ids.length;
    }
  }

  await repairLeafFlags();
  console.log(`\nMoved products: ${moved}`);
} else {
  console.log("\nDry-run only. Add APPLY=1 to update products/categories.");
}

function resolveTargetSlug(product, currentCategory) {
  const titleText = normalize(product.title);
  const sourceText = normalize(
    [
      product.specs?.pttavm_category,
      product.specs?.pttavm_path,
      product.title,
    ]
      .filter(Boolean)
      .join(" "),
  );

  for (const rule of TITLE_TARGETS) {
    if (rule.test(titleText)) return rule.targetSlug;
  }

  if (/\bpilates mati\b|\bpilates mat\b/.test(sourceText)) {
    return "spor-outdoor/yoga-pilates/pilates-mati";
  }

  if (!currentCategory) return null;
  return LEGACY_CATEGORY_TARGETS[currentCategory.slug] ?? null;
}

async function refreshCategoryMaps() {
  if (!apply) {
    bySlug = new Map(categories.map((category) => [category.slug, category]));
    byId = new Map(categories.map((category) => [category.id, category]));
    return;
  }
  categories = await fetchAllCategories();
  bySlug = new Map(categories.map((category) => [category.slug, category]));
  byId = new Map(categories.map((category) => [category.id, category]));
}

async function repairFoodHierarchy() {
  const [foodSeedMove, ...branchMoves] = FOOD_BRANCH_MOVES;
  if (foodSeedMove) {
    await moveCategoryPrefix(foodSeedMove[0], foodSeedMove[1], foodSeedMove[2]);
  }

  await ensureCategory(FOOD_GROUP_SLUG, "Gıda & İçecek", "supermarket", false);
  await refreshCategoryMaps();

  for (const [fromSlug, toSlug, parentSlug] of branchMoves) {
    await moveCategoryPrefix(fromSlug, toSlug, parentSlug);
  }
}

async function moveCategoryPrefix(fromSlug, toSlug, newParentSlug) {
  if (fromSlug === toSlug) return;
  const matches = categories
    .filter((category) => category.slug === fromSlug || category.slug.startsWith(`${fromSlug}/`))
    .sort((left, right) => left.slug.length - right.slug.length);

  if (matches.length === 0) return;

  const root = matches.find((category) => category.slug === fromSlug);
  const parent = newParentSlug ? bySlug.get(newParentSlug) : null;
  if (newParentSlug && !parent) {
    console.warn(`cannot move ${fromSlug}: parent not found ${newParentSlug}`);
    return;
  }

  console.log(`move category branch: ${fromSlug} -> ${toSlug} (${matches.length} rows)`);

  for (const category of matches) {
    const nextSlug = `${toSlug}${category.slug.slice(fromSlug.length)}`;
    if (nextSlug === category.slug) continue;

    const collision = bySlug.get(nextSlug);
    if (collision && collision.id !== category.id) {
      console.warn(`slug collision, skip ${category.slug} -> ${nextSlug}`);
      continue;
    }

    const patch = {
      slug: nextSlug,
      ...(root?.id === category.id && parent ? { parent_id: parent.id } : {}),
      ...(root?.id === category.id && nextSlug === FOOD_GROUP_SLUG
        ? { name: "Gıda & İçecek", is_leaf: false, is_active: true }
        : {}),
    };

    if (apply) {
      const { error } = await sb.from("categories").update(patch).eq("id", category.id);
      if (error) {
        console.warn(`category move failed ${category.slug} -> ${nextSlug}: ${error.message}`);
        continue;
      }
    }

    bySlug.delete(category.slug);
    Object.assign(category, patch);
    bySlug.set(category.slug, category);
    byId.set(category.id, category);
  }

  await refreshCategoryMaps();
}

async function ensureCategory(slug, name, parentSlug, isLeaf = true) {
  const parent = bySlug.get(parentSlug);
  if (!parent) throw new Error(`parent category not found: ${parentSlug}`);

  const existing = bySlug.get(slug);
  if (existing) {
    if (
      existing.parent_id === parent.id &&
      existing.is_leaf === isLeaf &&
      existing.name === name &&
      existing.is_active === true
    ) {
      return existing;
    }

    console.log(`repair category shape: ${slug}`);
    const patch = { parent_id: parent.id, name, is_leaf: isLeaf, is_active: true };
    if (apply) {
      const { error } = await sb
        .from("categories")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw new Error(`category repair failed ${slug}: ${error.message}`);
    }
    Object.assign(existing, patch);
    bySlug.set(existing.slug, existing);
    byId.set(existing.id, existing);
    return existing;
  }

  console.log(`create category: ${slug}`);
  if (!apply) {
    const synthetic = {
      id: `dry-run:${slug}`,
      slug,
      name,
      parent_id: parent.id,
      is_leaf: isLeaf,
      is_active: true,
    };
    categories.push(synthetic);
    bySlug.set(slug, synthetic);
    byId.set(synthetic.id, synthetic);
    return synthetic;
  }

  await sb.from("categories").update({ is_leaf: false }).eq("id", parent.id);
  const { data, error } = await sb
    .from("categories")
    .insert({
      slug,
      name,
      parent_id: parent.id,
      is_leaf: isLeaf,
      is_active: true,
    })
        .select("id, slug, name, parent_id, is_leaf, is_active")
    .single();

  if (error || !data) throw new Error(`category create failed ${slug}: ${error?.message}`);
  bySlug.set(data.slug, data);
  byId.set(data.id, data);
  return data;
}

async function repairLeafFlags() {
  const fresh = await fetchAllCategories();
  const childCounts = new Map();
  for (const category of fresh) {
    if (!category.parent_id) continue;
    childCounts.set(category.parent_id, (childCounts.get(category.parent_id) ?? 0) + 1);
  }

  for (const category of fresh) {
    const isLeaf = !childCounts.has(category.id);
    if (category.is_leaf === isLeaf) continue;
    const { error } = await sb
      .from("categories")
      .update({ is_leaf: isLeaf })
      .eq("id", category.id);
    if (error) console.warn(`leaf flag repair failed ${category.slug}: ${error.message}`);
  }
}

async function fetchAllCategories() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, parent_id, is_leaf, is_active")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`category fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function fetchAllProducts() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("products")
      .select("id, slug, title, category_id, specs, is_active")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`product fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
