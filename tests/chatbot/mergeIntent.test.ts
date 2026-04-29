// Framework-less smoke test for mergeIntent first-turn behavior.
// Regression guard for Bug C — opening turns that set only category
// must produce action="merge_with_new_dims" (not "no_new_dims_keep").
//
// Run: npx tsx tests/chatbot/mergeIntent.test.ts
import { mergeIntent, emptyState } from "../../src/lib/chatbot/conversationState";

let failures = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) {
    console.error("FAIL:", msg);
    failures++;
  }
}

// --- Test 1: opening turn with category only ---
{
  const prev = emptyState();
  const { next, action } = mergeIntent(
    prev,
    {
      intent_type: "product_search",
      category_slug: "camasir-makinesi",
      brand_filter: [],
      variant_color_patterns: [],
    },
    "çamaşır makinesi arıyorum",
    null
  );
  assert(action === "merge_with_new_dims",
    `[opening turn category only] action=${action} expected merge_with_new_dims`);
  assert(next.category_slug === "camasir-makinesi",
    `[opening turn] next.category_slug=${next.category_slug}`);
  assert(next.intent_type === "product_search",
    `[opening turn] next.intent_type=${next.intent_type}`);
  assert(next.last_set_dimensions.includes("category"),
    `[opening turn] last_set_dimensions=${JSON.stringify(next.last_set_dimensions)} should include "category"`);
}

// --- Test 2: same-category continuation with no new dims keeps "no_new_dims_keep" ---
{
  const prev = { ...emptyState(), category_slug: "camasir-makinesi" };
  const { action } = mergeIntent(
    prev,
    {
      intent_type: "product_search",
      category_slug: "camasir-makinesi",
      brand_filter: [],
      variant_color_patterns: [],
    },
    "tamam",
    null
  );
  assert(action === "no_new_dims_keep",
    `[same-category no-new-dim] action=${action} expected no_new_dims_keep (category unchanged should not count)`);
}

// --- Test 3: opening turn with category + brand counts both dims ---
{
  const prev = emptyState();
  const { next, action } = mergeIntent(
    prev,
    {
      intent_type: "product_search",
      category_slug: "akilli-telefon",
      brand_filter: ["Apple"],
      variant_color_patterns: [],
    },
    "Apple telefon arıyorum",
    null
  );
  assert(action === "merge_with_new_dims",
    `[opening category+brand] action=${action}`);
  assert(
    next.last_set_dimensions.includes("category") &&
      next.last_set_dimensions.includes("brand"),
    `[opening category+brand] last_set_dimensions=${JSON.stringify(next.last_set_dimensions)}`
  );
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("✅ mergeIntent first-turn tests passed (3 cases)");
