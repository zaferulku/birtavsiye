# Hiyerarşik URL Standardı

Site URL yapısı breadcrumb hiyerarşisini 1:1 yansıtır. Rastgele / düz URL yok.

## Temel Prensip

**URL = Breadcrumb.** Kullanıcı hangi hiyerarşide ilerliyorsa URL aynı o hiyerarşiyi göstermeli.

## URL Formatları

### 1. Kategori sayfaları — hiyerarşik path

```
/elektronik
/elektronik/cep-telefonu
/elektronik/cep-telefonu/akilli-telefon
/moda/kadin/kadin-giyim
/anne-bebek/bebek-bakim
```

- Her segment bir kategori slug'ı
- Parent chain zorunlu (root'tan leaf'e kadar)
- Slug'lar `categories` tablosunda tanımlı olmalı

### 2. Marka sayfaları — kategori kapsamında

```
/elektronik/cep-telefonu/akilli-telefon/apple
/moda/erkek/erkek-ayakkabi/nike
/kozmetik/cilt-bakimi/cerave
```

- Son segment brand slug
- Brand, seçili kategori leaf'inde ürünü olan markalardan olmalı
- Tek başına `/marka/apple` URL'i **deprecated** (gelecekte silinecek)

### 3. Model sayfaları — marka altında

```
/elektronik/cep-telefonu/akilli-telefon/apple/iphone-16-pro
/moda/erkek/erkek-ayakkabi/nike/air-max-270
```

- Son segment model_family slug'ı
- `/marka/[brand]/[model]` backward-compat için redirect

### 4. Ürün sayfaları — düz slug korunur

```
/urun/apple-iphone-16-pro-256-gb-beyaz-titanyum
```

- Ürün detay tek-seviyeli `/urun/[slug]` yapısında kalır (SEO + paylaşım kolaylığı)
- Breadcrumb hiyerarşiyi gösterir; URL değil

## Header NAV Standardı

### YAP
- Her sub-item için DB'de GERÇEK kategori varsa: `/{chain}/{slug}`
- Eğer yoksa: `/kategori/{parent-slug}?q={filter}` — kategori sayfası, filtreli
- Brand linkleri: `/{chain}/{brand-slug}`
- Tag linkleri: `/kategori/{parent-slug}?q={tag}`

### YAPMA
- `/ara?q=...` — text search'e yönlendirme YOK (yalnız arama çubuğu için)
- Jenerik parent'a yönlendirme (q veya model filter ile spesifikleştir)
- Rastgele dış link — tüm nav iç sayfalara gitmeli

## Yeni Kategori Ekleme Kuralı

1. **Parent'ı belirle.** Kategori hangi root/mid altında?
2. **Slug seç.** Küçük harf, tire-ayrımlı, Türkçe char yok: `emzik`, `biberon`, `oto-koltugu`
3. **Migration script'e ekle.** `scripts/migrate-category-hierarchy.mjs` içindeki `ROOTS`, `MID`, veya `LEAVES` haritasına ekle:
   ```js
   "emzik": "bebek-bakim",
   ```
4. **Migration'ı çalıştır:** `node --env-file=.env.local scripts/migrate-category-hierarchy.mjs`
5. **Header NAV'a ekle** — sub-item slug bu yeni kategoriye denk gelecek
6. **Classifier'a ekle** — `scripts/classify-products-smart.mjs` içine title pattern ile otomatik atama kuralı

## Tipik Genişletmeler

### Anne-Bebek
```
anne-bebek (root)
├─ bebek-bakim (mevcut)
│  ├─ bebek-bezi, islak-mendil, biberon, emzik, mama, bebek-kozmetik
├─ bebek-arabasi (mevcut)
│  ├─ puset, oto-koltugu, yuruteç
├─ cocuk-odasi (mevcut)
│  ├─ besik, bebek-yatak
```

### Elektronik Telefon Aksesuar
```
elektronik → cep-telefonu → telefon-aksesuar
  ├─ telefon-kilifi
  ├─ sarj-kablo
  ├─ powerbank
  └─ ekran-koruyucu
```

## Migration Örneği

```js
// scripts/add-bebek-subcategories.mjs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NEW_LEAVES = {
  "emzik": "bebek-bakim",
  "biberon": "bebek-bakim",
  "mama": "bebek-bakim",
};

for (const [slug, parentSlug] of Object.entries(NEW_LEAVES)) {
  const { data: parent } = await sb.from("categories").select("id").eq("slug", parentSlug).maybeSingle();
  await sb.from("categories").insert({
    slug,
    name: slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" "),
    parent_id: parent.id,
    icon: "📦",
  });
}
```

## Referanslar

- URL catch-all route: `src/app/[...segments]/page.tsx`
- Category tree helpers: `src/lib/categoryTree.ts`
- Header NAV: `src/app/components/layout/Header.tsx`
- Classification standards: `docs/CATEGORIZATION_STANDARDS.md`
- Agent: `.claude/agents/category-classifier.md`
