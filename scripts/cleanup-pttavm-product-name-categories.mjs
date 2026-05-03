#!/usr/bin/env node
/**
 * Collapse PttAVM categories that were accidentally created from product names.
 *
 * Dry-run:
 *   node --env-file=.env.local scripts/cleanup-pttavm-product-name-categories.mjs
 *
 * Apply:
 *   APPLY=1 node --env-file=.env.local scripts/cleanup-pttavm-product-name-categories.mjs
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

const categories = await fetchAllCategories();
const byId = new Map(categories.map((category) => [category.id, category]));
const childrenByParent = new Map();

for (const category of categories) {
  if (!category.parent_id) continue;
  const children = childrenByParent.get(category.parent_id) ?? [];
  children.push(category);
  childrenByParent.set(category.parent_id, children);
}

const productLikeRoots = [];

for (const category of categories) {
  if (!category.parent_id || category.slug.split("/").length < 3) continue;
  if (!looksLikeProductNameCategory(category)) continue;

  let parent = byId.get(category.parent_id) ?? null;
  let parentAlreadyProductLike = false;
  while (parent) {
    if (looksLikeProductNameCategory(parent)) {
      parentAlreadyProductLike = true;
      break;
    }
    parent = parent.parent_id ? byId.get(parent.parent_id) ?? null : null;
  }

  if (!parentAlreadyProductLike) productLikeRoots.push(category);
}

let movedProducts = 0;
let deletedCategories = 0;
let errors = 0;

console.log(
  `PttAVM product-name category cleanup | mode=${apply ? "APPLY" : "DRY_RUN"} | roots=${productLikeRoots.length}`,
);

for (const root of productLikeRoots.sort((a, b) => a.slug.localeCompare(b.slug))) {
  const targetParentId = root.parent_id;
  if (!targetParentId) continue;

  const subtree = collectSubtree(root);
  const subtreeIds = subtree.map((category) => category.id);
  const target = byId.get(targetParentId);

  const { count: productCount, error: countError } = await sb
    .from("products")
    .select("id", { count: "exact", head: true })
    .in("category_id", subtreeIds);

  if (countError) {
    errors += 1;
    console.warn(`count failed ${root.slug}: ${countError.message}`);
    continue;
  }

  console.log(
    `${String(productCount ?? 0).padStart(4)} products | ${String(subtree.length).padStart(3)} categories | ${root.slug} -> ${target?.slug ?? "(parent)"}`,
  );

  if (!apply) continue;

  if ((productCount ?? 0) > 0) {
    const { error: moveError } = await sb
      .from("products")
      .update({ category_id: targetParentId })
      .in("category_id", subtreeIds);

    if (moveError) {
      errors += 1;
      console.warn(`product move failed ${root.slug}: ${moveError.message}`);
      continue;
    }
    movedProducts += productCount ?? 0;
  }

  for (const category of subtree.sort((a, b) => b.slug.length - a.slug.length)) {
    const { error: deleteError } = await sb
      .from("categories")
      .delete()
      .eq("id", category.id);

    if (deleteError) {
      errors += 1;
      console.warn(`category delete failed ${category.slug}: ${deleteError.message}`);
      continue;
    }
    deletedCategories += 1;
  }
}

if (apply) {
  await repairLeafFlags();
}

console.log("\n=== Summary ===");
console.log(`roots: ${productLikeRoots.length}`);
console.log(`moved products: ${movedProducts}`);
console.log(`deleted categories: ${deletedCategories}`);
console.log(`errors: ${errors}`);
if (!apply) console.log("\nDry-run only. Add APPLY=1 to update products/categories.");

function collectSubtree(root) {
  const result = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    result.push(current);
    for (const child of childrenByParent.get(current.id) ?? []) {
      stack.push(child);
    }
  }

  return result;
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

function looksLikeProductNameCategory(category) {
  const text = normalize(category.slug.split("/").at(-1) ?? category.name ?? "");
  if (!text) return false;

  const brandOrModel =
    /\b(apple|iphone|ipad|samsung|galaxy|xiaomi|redmi|dyson|jacobs|microsoft|xbox|sony|nikon|canon|philips|lenovo|thinkpad|asus|bosch|huawei|oppo|vivo|realme|tecno|infinix|gpack|zore|lexar|gigastone)\b/.test(text);
  const productTerms =
    /\b(turkiye garantili|uyumlu|gb|tb|ssd|ram|mah|series|watch|macbook|thinkpad|airpods|kapsul|paket|adapt[oö]r|batarya|klavye|fan|ekran koruyucu|kordon|kumanda|kilif|kılıf)\b/.test(text);
  const hasDigit = /\d/.test(text);
  const tokenCount = text.split(/[^a-z0-9]+/).filter(Boolean).length;

  return brandOrModel && (hasDigit || productTerms || tokenCount >= 5);
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
    const { error: updateError } = await sb
      .from("categories")
      .update({ is_leaf: isLeaf })
      .eq("id", category.id);

    if (updateError) {
      errors += 1;
      console.warn(`leaf repair failed ${category.id}: ${updateError.message}`);
    }
  }
}

async function fetchAllCategories() {
  const rows = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("categories")
      .select("id, slug, name, parent_id")
      .range(from, from + 999);

    if (error) throw new Error(`category fetch failed: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  return rows;
}
