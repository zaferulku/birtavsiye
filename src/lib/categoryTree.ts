import { supabase } from "./supabase";

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
};

export async function fetchCategoryPath(categoryId: string | null): Promise<CategoryNode[]> {
  if (!categoryId) return [];
  const chain: CategoryNode[] = [];
  let currentId: string | null = categoryId;
  for (let i = 0; i < 6 && currentId; i++) {
    const res = await supabase
      .from("categories")
      .select("id, slug, name, parent_id, icon")
      .eq("id", currentId)
      .maybeSingle();
    const node = res.data as CategoryNode | null;
    if (!node) break;
    chain.unshift(node);
    currentId = node.parent_id;
  }
  return chain;
}

export function toSlug(text: string): string {
  return text
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const brandToSlug = toSlug;
export const modelFamilyToSlug = toSlug;

export async function fetchChildCategories(parentId: string): Promise<CategoryNode[]> {
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, parent_id, icon")
    .eq("parent_id", parentId)
    .order("name");
  return (data ?? []) as CategoryNode[];
}

export async function fetchDescendantIds(rootId: string): Promise<string[]> {
  const ids: string[] = [rootId];
  let frontier = [rootId];
  for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .in("parent_id", frontier);
    const children = (data ?? []).map((r: { id: string }) => r.id);
    if (children.length === 0) break;
    ids.push(...children);
    frontier = children;
  }
  return ids;
}
