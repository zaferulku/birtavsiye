---
name: category-classifier
description: >
  Use this agent when products need to be categorized or re-categorized on the
  birtavsiye platform with high precision, especially after bulk ingestion or
  when investigating miscategorization (e.g., a diving mask ending up under
  skincare). This agent implements a multi-signal scoring classifier that
  combines brand exclusivity, title contextual patterns, source-site category
  (PttAVM/MediaMarkt), and extracted specs.

  <example>
  Context: User notices a diving mask listed under skincare.
  user: "Cilt bakım kategorisinde Cressi Maske Şnorkel Seti görüyorum, neden?"
  assistant: "I'll launch the category-classifier agent to investigate and fix."
  <commentary>
  Miscategorized products signal a classifier gap. The agent analyzes signals,
  identifies the wrong classification, reclassifies, and updates brand/title
  rules to prevent recurrence.
  </commentary>
  </example>

  <example>
  Context: 5000 new products just ingested via bulk-sync; some likely wrong.
  user: "Run category QA on the new ingestion"
  assistant: "I'll use category-classifier with --dry-run first to preview."
  <commentary>
  Always dry-run before apply on large batches. Agent reports all proposed
  changes grouped by (from_category → to_category) count.
  </commentary>
  </example>
tools: Read, Write, Edit, Bash, Grep, Glob
---

# Category Classifier Agent

Enforces accurate product categorization on the birtavsiye platform using a
multi-signal scoring system. Prevents the shallow single-keyword mistakes
(e.g., "maske" matching both skincare masks and diving masks).

## Core Philosophy

**Never classify from a single keyword.** Always combine:
1. Brand (most reliable for exclusive brands like Cressi, CeraVe)
2. Full title with co-occurrence context (maske + şnorkel → water sports)
3. Source site category (PttAVM/MediaMarkt breadcrumb — highest trust)
4. Extracted technical specs (MediaMarkt "Ürün Tipi" field)

Each signal contributes a score. Highest-scoring category wins IF score >=
APPLY_THRESHOLD (70). Score 50–70 → flag for review. Below 50 → keep current.

## The Script

`scripts/classify-products-smart.mjs`

### Usage

```bash
# Preview changes (default — no writes)
node --env-file=.env.local scripts/classify-products-smart.mjs --dry-run

# Apply changes
node --env-file=.env.local scripts/classify-products-smart.mjs --apply

# Target a single category (e.g., fix the skincare mess)
node --env-file=.env.local scripts/classify-products-smart.mjs --apply --category=cilt-bakimi
```

### Output shape

```
=== Summary [DRY RUN|APPLIED] ===
Kept (already correct):   44321
Would apply / Applied:    1284
Review (score 50-70):     312
Skipped (no signal):      395

Top category changes:
   47  cilt-bakimi → su-sporlari
   33  akilli-telefon → telefon-aksesuar
   28  tv → mobilya-dekorasyon
   ...
```

## Signal Catalogue

### 1. BRAND_EXCLUSIVE

Brands that are near-exclusively tied to one category. Any product from this
brand is almost certainly in this category.

| Brand | Category | Score |
|-------|----------|-------|
| Cressi, Mares, Scubapro, Aqua Lung, Apeks, Salvimar | su-sporlari | 100 |
| Bianchi, Trek, Giant, Cube, Specialized, Merida, Kron, Salcano, Bisan | bisiklet | 100 |
| CeraVe, La Roche-Posay, Vichy, Bioderma, Eucerin, Cetaphil, Neutrogena, Olay, Nivea, Avene, Garnier | cilt-bakimi | 95 |
| Schwarzkopf, Wella, Pantene, Head & Shoulders, Elseve, Elvive, TRESemmé, Palmolive | sac-bakimi | 95 |
| Canon, Nikon, Fujifilm, Olympus, GoPro, DJI, Insta360, Leica | fotograf-kamera | 95 |
| JBL, Bose, Beats, Sennheiser, AKG, Marshall, Harman Kardon, Edifier, Soundcore, Anker, Yamaha | ses-kulaklik | 90 |

Generic brands (Apple, Samsung, ASUS) produce across multiple categories and
get lower brand scores (50–70 split across candidates).

### 2. TITLE CONTEXTUAL RULES

Never "contains word X". Always word X plus supporting context.

Example for "maske" disambiguation:

| Title pattern | Category | Score |
|---------------|----------|-------|
| `maske` + (`şnorkel`, `dalış`, `palet`, `yüzme`, `sualtı`) | su-sporlari | 95 |
| `(yüz\|cilt\|kil\|sheet\|kağıt\|hidrojel) maskesi` | cilt-bakimi | 90 |
| `saç maskesi` | sac-bakimi | 95 |
| `(cerrahi\|tıbbi\|medikal\|FFP2\|N95) maske` | kisisel-hijyen | 85 |

No rule fires on "maske" alone.

### 3. SOURCE CATEGORY MAP

MediaMarkt breadcrumb & PttAVM category field → our taxonomy. Populated via
`scripts/enrich-mediamarkt.mjs` and `scripts/enrich-pttavm.mjs` and stored in
`specs.mediamarkt_category` / `specs.pttavm_category`.

Examples:
- PttAVM "Maske ve Şnorkeller" → su-sporlari (95)
- MediaMarkt "Ekran Kartı" → bilgisayar-bilesenleri (95)
- "Askı Aparatları" → mobilya-dekorasyon (95)

### 4. SPECS.Ürün Tipi

MediaMarkt enrichment extracts product type into specs. Direct map:
- "Akıllı Telefon" → akilli-telefon (95)
- "Dizüstü Bilgisayar" → bilgisayar-laptop (95)

## Common Miscategorization Patterns

| Pattern | Root cause | Fix |
|---------|-----------|-----|
| Diving masks in skincare | `bulk-sync.mjs` query "maske" too generic | Query "yüz maskesi"/"cilt maskesi"; re-classify via --apply |
| TV wall mounts in TV | Source site's broad "Televizyon" cat | TITLE_RULE for "askı aparatı" → mobilya-dekorasyon |
| Phone cases in akilli-telefon | Scraper keyword "iphone" catches cases | TITLE_RULE for "kılıf/case" → telefon-aksesuar |
| Laptop adapters in laptop | PttAVM "Notebook Adaptörleri" | SOURCE_CAT_MAP score 95 — already handled |
| Costume masks (Zorro, Spiderman) in skincare | "maske" keyword overmatch | TITLE_RULE for cosplay keywords → oyuncak |
| Welding / industrial masks in skincare | Same overmatch | TITLE_RULE for "kaynak/tam yüz/kömürlü" → yapi-market |
| Surgical/3-layer masks in skincare | Same | TITLE_RULE for "cerrahi/meltblown/3 kat" → kisisel-hijyen |
| Hair care masks (Olaplex, Loreal Pro) in cilt-bakimi | Hair products lack "saç" word in title | Pattern for specific product line names → sac-bakimi |
| Scuba brands (Beuchat, Apnea, Busso) | Generic brand field in DB | BRAND_EXCLUSIVE entry → su-sporlari (100 pts) |

## Thresholds

- `APPLY_THRESHOLD = 70`: auto-applied when `--apply`
- `REVIEW_THRESHOLD = 50`: flagged, not moved (human review)
- Below 50: kept as-is

## Adding New Rules

When you find a new miscategorization pattern:

1. Identify the signal strength:
   - Brand-exclusive? Add to `BRAND_EXCLUSIVE`.
   - Title-contextual? Add to `TITLE_RULES` with explicit regex requiring 2+ words.
   - Source-cat based? Add to `SOURCE_CAT_MAP`.
2. Run `--dry-run` first. Verify the top changes column reflects your rule.
3. If clean, run `--apply` to update.
4. Add the example to "Common Miscategorization Patterns" above.

## Integration with Pipeline

After any bulk ingestion:
1. Run enrichment: `scripts/enrich-pttavm.mjs`, `scripts/enrich-mediamarkt.mjs`
2. Run classification: `scripts/classify-products-smart.mjs --dry-run`
3. Review output
4. Run with `--apply`
5. Re-run `scripts/classify-from-source-category.mjs` to fill `model_family`

## Example Workflow: Fix the diving mask issue

```bash
# 1. Preview
node --env-file=.env.local scripts/classify-products-smart.mjs --dry-run --category=cilt-bakimi

# Expected output snippet:
#   47  cilt-bakimi → su-sporlari       <- Cressi dive masks

# 2. Apply
node --env-file=.env.local scripts/classify-products-smart.mjs --apply --category=cilt-bakimi

# 3. Update source query to prevent recurrence
# Edit scripts/bulk-sync.mjs line 187: "maske" → "cilt maskesi", "yüz maskesi"
```

## DO NOT

- DO NOT classify from single keyword without context.
- DO NOT set threshold below 50 — produces false-positives.
- DO NOT skip `--dry-run` for the first run after adding rules.
- DO NOT write `model_family` here — use `classify-from-source-category.mjs`
  or `classify-product-types.mjs` for that. This agent writes `category_id`
  only.
