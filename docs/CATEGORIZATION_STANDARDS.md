# birtavsiye Categorization Standards

Aligned with Google Product Taxonomy (2021-09-21) and Google Merchant Center guidance.

## Core Principles (from Google)

1. **One category per product.** Each product belongs to exactly one leaf.
2. **Primary function wins.** An MP3-player-with-clock = MP3 player, not Clock.
3. **Most specific level.** "MP3 player charger" → Charger Accessories, NOT "Electronics".
4. **Title + brand + spec-signals drive auto-classification.** Human override only for edge cases.
5. **Currency matters.** Taxonomy evolves; re-classify when rules change.

## birtavsiye 9-Root Taxonomy ↔ Google Mapping

| birtavsiye root (slug) | Google root | Notes |
|---|---|---|
| `elektronik` | Electronics | + partial from Cameras & Optics, Software |
| `ev-yasam` | Home & Garden + Furniture + Hardware | partial |
| `moda` | Apparel & Accessories + Luggage & Bags | |
| `kozmetik` | Health & Beauty > Personal Care | cosmetics, hair, skin, fragrance |
| `anne-bebek` | Baby & Toddler + parts of Toys & Games | |
| `spor-outdoor` | Sporting Goods | |
| `otomotiv` | Vehicles & Parts | |
| `kitap-hobi` | Media + Arts & Entertainment + Office Supplies | |
| `evcil-hayvan` | Animals & Pet Supplies | |

## Level 2–3 under Elektronik

Aligns with Google Electronics tree:

```
elektronik (Electronics)
├─ cep-telefonu (Electronics > Communications > Telephony)
│  ├─ akilli-telefon (Mobile Phones)
│  └─ telefon-aksesuar (Mobile Phone Accessories)
├─ bilgisayar-tablet (Electronics > Computers)
│  ├─ bilgisayar-laptop (Laptops)
│  ├─ bilgisayar-bilesenleri (Computer Components)
│  └─ tablet (Tablet Computers)
├─ tv-ses (Electronics > Home Theater + Audio)
│  ├─ tv (Televisions + Projectors)
│  └─ ses-kulaklik (Audio Components, Headphones)
├─ ag-yazici (Electronics > Networking + Print/Scan)
│  ├─ networking (Routers, Access Points)
│  ├─ yazici-tarayici (Printers, Scanners)
│  └─ navigasyon (GPS Navigation Systems)
├─ fotograf-kamera (Cameras & Optics)
├─ akilli-saat (Electronics > Wearable Technology > Smartwatches)
├─ oyun-konsol (Electronics > Video Game Consoles)
└─ ofis-elektronigi (Electronics > Office Electronics)
```

## Classification Decision Tree

Apply **in order** and stop at the first confident match:

### Step 1 — Brand Check (score 100)
Exclusive brand? (Cressi → diving, CeraVe → skincare, Kerastase → hair care)
→ Assign that category.

### Step 2 — Source Category Map (score 95)
`specs.mediamarkt_category` or `specs.pttavm_category` → look up SOURCE_CAT_MAP.

### Step 3 — Specs Type (score 95)
`specs["Ürün Tipi"]` (MediaMarkt) → direct map.

### Step 4 — Title Context (score 80–95)
Multi-word patterns only. Never single keywords.
- `maske + şnorkel/dalış` → su-sporlari (95)
- `yüz/cilt/kil maskesi` → cilt-bakimi (90)
- `saç maskesi` → sac-bakimi (95)
- `cerrahi/meltblown maske` → kisisel-hijyen (85)

### Step 5 — Accessory Detection
Accessory indicators override parent category:
- iPhone X Kılıf/Flip Cover/Cam Koruyucu → telefon-aksesuar (NOT akilli-telefon)
- Laptop Adaptör/Batarya/Klavye → bilgisayar-laptop
- MP3 charger → telefon-aksesuar (NOT ses-kulaklik)
- Camera lens/tripod/bag → fotograf-kamera (camera-specific)

### Step 6 — Default
If no rule fires with score ≥ 70, keep current category.
Score 50–70 → flag for review (logged, not applied).

## Known Cross-Category Pitfalls

| Product | Wrong (common) | Correct | Reason |
|---|---|---|---|
| Cressi Diving Mask | cilt-bakimi | su-sporlari | Brand + Sporting Goods > Water Sports |
| Zorro Costume Mask | cilt-bakimi | oyuncak | Toys & Games > Costumes |
| Welding Mask | cilt-bakimi | yapi-market | Hardware > Tools > Safety Masks |
| Kerastase Hair Mask | cilt-bakimi | sac-bakimi | Hair Care, not Skin Care |
| iPhone 15 Case | akilli-telefon | telefon-aksesuar | Accessory tier |
| Hiking A45 (fake phone brand) | outdoor-kamp | akilli-telefon | Despite "Hiking" name, it's a phone |
| VGA Cable | tv | bilgisayar-bilesenleri | Computer cable, not TV component |
| Saç Kurutma Makinesi | kucuk-ev-aletleri | sac-bakimi | Primary function: hair care |
| Powerbank | ses-kulaklik | telefon-aksesuar | Mobile charging |
| Gaming Mouse | ses-kulaklik | bilgisayar-bilesenleri | Peripheral |
| Nintendo Switch Bag | oyun-konsol | oyun-konsol | Keep (console-specific accessory) |
| TV Wall Mount | tv | mobilya-dekorasyon | Furniture > Mounts |
| Laptop Charger | bilgisayar-bilesenleri | bilgisayar-laptop | Laptop-specific |

## Brand-Category Exclusivity Catalog

**Water sports:** Cressi, Mares, Scubapro, Aqua Lung, Apeks, Salvimar, Beuchat, Apnea, Busso, Bestway, Dunny, Intex, Subea, Tusa, Speedo

**Bicycle:** Bianchi, Trek, Giant, Cube, Specialized, Merida, Kron, Salcano, Bisan

**Skincare only:** CeraVe, La Roche-Posay, Vichy, Bioderma, Eucerin, Cetaphil, Neutrogena, Olay, Nivea, Avene, Garnier

**Hair care only:** Kerastase, Schwarzkopf, Wella, Pantene, Head & Shoulders, Elseve, Elvive, TRESemmé, Palmolive, Olaplex

**Cameras only:** Canon, Nikon, Fujifilm, Olympus, GoPro, DJI, Insta360, Leica

**Audio only:** JBL, Bose, Beats, Sennheiser, AKG, Marshall, Harman Kardon, Edifier, Soundcore, Yamaha

**Anker / Baseus / Ugreen / Spigen:** telefon-aksesuar (phone chargers, powerbanks, cables)

**Ambiguous:** Apple, Samsung, Xiaomi, Huawei, Sony — score 40–70 across candidates, needs title/spec disambiguation.

## Data Sources & Reliability Ranking

1. **Brand exclusive** (score 100)
2. **Source site category** (score 95) — MediaMarkt, PttAVM
3. **Specs.Ürün Tipi** (score 95) — MediaMarkt enrichment
4. **Title contextual pattern** (score 80–95)
5. **Generic brand in multiple categories** (score 40–70)

## When to Add New Rules

After discovering miscategorization:

1. Check Google taxonomy for authoritative placement: https://www.google.com/basepages/producttype/taxonomy.en-US.txt
2. Identify signal strength (brand-exclusive? title-contextual? source-cat?)
3. Add rule to `scripts/classify-products-smart.mjs` following precedence.
4. Run `--dry-run` first. Verify top changes match expectation.
5. Run `--apply`.
6. Document the pattern in "Known Cross-Category Pitfalls".
7. If new exclusive brand, add to catalog.

## Google Merchant Center Principles Applied

| Google principle | birtavsiye implementation |
|---|---|
| Single category per product | `products.category_id` is singular |
| Primary function | classifier picks highest-scoring category |
| Most specific | leaf preferred; parent only if no leaf fits |
| Accessory tier | Kılıf/Adaptör/Şarj → dedicated accessory categories |
| Currency | re-run classifier after rule changes |

## References

- Google Product Taxonomy (en-US): https://www.google.com/basepages/producttype/taxonomy.en-US.txt
- Google Merchant Center — google_product_category: https://support.google.com/merchants/answer/6324436
- Classifier: `scripts/classify-products-smart.mjs`
- Classifier agent: `.claude/agents/category-classifier.md`
- Audit: `scripts/audit-categories.mjs`
