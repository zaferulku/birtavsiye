/**
 * Chatbot turn'ün üst-düzey kategorisi.
 * mergeIntent action'ından deterministik türetilir — LLM yok.
 * Frontend ranking + UI hint + agent_decisions log için kullanılır.
 */

import type { ConversationState, MergeAction } from "./conversationState";

export type TurnType =
  | "open"             // İlk mesaj veya yeni konu (state temiz)
  | "refine"           // Mevcut bağlamı daralt (yeni filtre, brand, kategori spec)
  | "broaden"          // Mevcut bağlamı genişlet (filtre kaldırma, single-word widen)
  | "switch_category"  // Kategori değişti, state reset
  | "sort_only"        // Sadece sıralama değişti, filter aynı
  | "clarify"          // Bot soru sormalı (yeni dim yok)
  | "ack";             // Greeting, smalltalk, off_topic — non-product turn

/**
 * Action + previous state'ten TurnType türet.
 * Pure function — yan etki yok.
 */
export function classifyTurn(
  action: MergeAction,
  prev: ConversationState,
): TurnType {
  // Non-product turns
  if (
    action === "intent_type_greeting" ||
    action === "intent_type_smalltalk" ||
    action === "intent_type_off_topic" ||
    action === "intent_type_store_help" ||
    action === "intent_type_knowledge_query"
  ) {
    return "ack";
  }

  // Reset / kategori değişimi
  if (action === "category_changed_reset") return "switch_category";

  // Genişletme (filtre kaldırma, kategoriye geri dönme, shortcut)
  if (
    action === "single_word_widen" ||
    action === "user_requested_removal" ||
    action === "shortcut_keep_category"
  ) {
    return "broaden";
  }

  // Sadece sıralama
  if (action === "best_value_sort_applied") return "sort_only";

  // Filtre eklemeleri — bağlam yoksa "open", varsa "refine"
  if (
    action === "merge_with_new_dims" ||
    action === "installment_filter_added" ||
    action === "rating_filter_added"
  ) {
    const hasPrevContext =
      prev.category_slug !== null ||
      (prev.brand_filter?.length ?? 0) > 0 ||
      (prev.variant_color_patterns?.length ?? 0) > 0 ||
      prev.price_min !== null ||
      prev.price_max !== null;
    return hasPrevContext ? "refine" : "open";
  }

  // Yeni dimension yok → bot soru sormalı
  if (action === "no_new_dims_keep") return "clarify";

  // intent_type_product_search veya beklenmeyen literal — varsayılan
  return "open";
}
