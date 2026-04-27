import { supabaseAdmin } from "./supabaseServer";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
};

let _fullCategoriesCache: CategoryNode[] | null = null;
let _fullCacheTs = 0;

async function fetchAllCategoriesFull(): Promise<CategoryNode[]> {
  const now = Date.now();
  if (_fullCategoriesCache && now - _fullCacheTs < 60_000) return _fullCategoriesCache;
  const { data } = await supabaseAdmin.from("categories").select("id, slug, name, parent_id, icon");
  _fullCategoriesCache = (data ?? []) as CategoryNode[];
  _fullCacheTs = now;
  return _fullCategoriesCache;
}

export async function fetchCategoryPath(categoryId: string | null): Promise<CategoryNode[]> {
  if (!categoryId) return [];
  const all = await fetchAllCategoriesFull();
  const byId = new Map(all.map(c => [c.id, c]));
  const chain: CategoryNode[] = [];
  let currentId: string | null = categoryId;
  for (let i = 0; i < 6 && currentId; i++) {
    const node = byId.get(currentId);
    if (!node) break;
    chain.unshift(node);
    currentId = node.parent_id;
  }
  return chain;
}

import { trSlug } from "./turkishNormalize";

export function toSlug(text: string): string {
  return trSlug(text, 200);
}

export const brandToSlug = toSlug;
export const modelFamilyToSlug = toSlug;

export async function fetchChildCategories(parentId: string): Promise<CategoryNode[]> {
  const { data } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name, parent_id, icon")
    .eq("parent_id", parentId)
    .order("name");
  return (data ?? []) as CategoryNode[];
}

let _allCategoriesCache: { id: string; parent_id: string | null }[] | null = null;
let _cacheTs = 0;
const CACHE_MS = 60_000;

async function fetchAllCategoriesOnce() {
  const now = Date.now();
  if (_allCategoriesCache && now - _cacheTs < CACHE_MS) return _allCategoriesCache;
  const { data } = await supabaseAdmin.from("categories").select("id, parent_id");
  _allCategoriesCache = (data ?? []) as { id: string; parent_id: string | null }[];
  _cacheTs = now;
  return _allCategoriesCache;
}

export async function fetchDescendantIds(rootId: string): Promise<string[]> {
  const all = await fetchAllCategoriesOnce();
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parent_id) continue;
    const arr = childrenByParent.get(c.parent_id) ?? [];
    arr.push(c.id);
    childrenByParent.set(c.parent_id, arr);
  }
  const ids: string[] = [rootId];
  const stack = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    const kids = childrenByParent.get(cur) ?? [];
    for (const k of kids) { ids.push(k); stack.push(k); }
  }
  return ids;
}
