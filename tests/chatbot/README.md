# Chatbot Dialog Dataset — 200 Scenarios

**Generated:** 2026-04-29
**Coverage:** 157 unique categories, 12 scenario types
**Format:** JSONL (one dialog per line)

## Senaryo dağılımı

| # | Senaryo | Adet | Test ettiği davranış |
|---|---|---|---|
| 1 | spec_narrow | 24 | Filter ekleme (color → brand → price), `merge_with_new_dims` |
| 2 | price_drilldown | 21 | Bot fiyat sorar, kullanıcı "en uygun" der |
| 3 | edge_typo | 21 | Yazım hatası, slang ("tlfn", "lpt") |
| 4 | budget_first | 19 | Bütçe odaklı arama ("5 bin altı laptop") |
| 5 | filter_remove | 18 | "Renk farketmez" → `user_requested_removal` |
| 6 | comparison | 17 | "X mı Y mı" karşılaştırma |
| 7 | category_change | 17 | Kategori değişimi → `category_changed_reset` |
| 8 | gift | 16 | "Anneme hediye" → kategori sorar |
| 9 | recommendation | 15 | "Tavsiye ver" → 3 segment |
| 10 | vague_widen | 13 | Tek kelime kategori → `single_word_widen` |
| 11 | zero_result_fallback | 11 | "Kırmızı yok ama 3 farklı renk var" alternatif sunma |
| 12 | filter_replace | 8 | Renk değiştirme (kırmızı→mavi), eklenmemeli |

## Dialog yapısı

```json
{
  "id": 1,
  "category_slug": "akilli-telefon",
  "scenario_type": "spec_narrow",
  "turns": [
    { "role": "user", "msg": "kırmızı telefon" },
    {
      "role": "bot",
      "msg": "Kırmızı telefon listeleniyor.",
      "loading_placeholder": true,
      "expected_state": {
        "category_slug": "akilli-telefon",
        "brand_filter": [],
        "variant_color_patterns": ["kırmızı"],
        "variant_storage_patterns": [],
        "price_min": null,
        "price_max": null
      },
      "expected_action": "merge_with_new_dims",
      "expected_product_count_min": 3,
      "expected_product_count_max": 30
    }
  ]
}
```

### Field açıklamaları

- **`expected_state`** → `mergeIntent` çağrısı sonunda bu state çıkmalı. `conversationState.ts:ConversationState` ile birebir uyumlu.
- **`expected_action`** → 6 olası değer: `merge_with_new_dims`, `single_word_widen`, `shortcut_keep_category`, `category_changed_reset`, `user_requested_removal`, `no_new_dims_keep`
- **`expected_product_count_min/max`** → Ürün sayısı bandı; tolerans veriyor.
- **`expected_zero_result_fallback: true`** → Bot 0 sonuç döndüğünde alternatif sunma davranışı bekleniyor.

## Kullanım — Eval Script

```bash
# DRY-RUN (5 dialog):
npm run eval:chatbot:dryrun

# Tüm 200 dialog:
npm run eval:chatbot

# Tek senaryo:
node scripts/eval-chatbot-dialogs.mjs --input tests/chatbot/fixtures/chatbot_dialogs_200.jsonl --scenario filter_remove

# Tek kategori:
node scripts/eval-chatbot-dialogs.mjs --input tests/chatbot/fixtures/chatbot_dialogs_200.jsonl --category akilli-telefon
```

## Mojibake fix (gerekiyorsa)

Yüklenen .txt'de Türkçe karakterler bozuksa (kÄ±rmÄ±zÄ± gibi):

```bash
node scripts/fix-mojibake-jsonl.mjs <bozuk-input> tests/chatbot/fixtures/chatbot_dialogs_200.jsonl
```

