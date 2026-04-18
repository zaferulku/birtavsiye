-- Akıllı Telefon kategorisindeki aksesuar ürünlerini Telefon Aksesuar'a taşı
-- Supabase SQL Editor'da çalıştır
--
-- Context: akilli-telefon kategorisinde 2581 ürün var, ~1077'si aksesuar
-- (kılıf, kapak, ekran koruyucu, şarj cihazı, tutucu, vb.)
-- Bu script onları doğru kategoriye (telefon-aksesuar) taşır.

-- Preview (UPDATE'den önce kontrol için):
-- SELECT COUNT(*) AS to_move FROM products
-- WHERE category_id = '9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7'
-- AND (
--   title ILIKE '%kılıf%' OR
--   title ILIKE '%ekran koruyucu%' OR
--   title ILIKE '%şarj aleti%' OR title ILIKE '%şarj cihazı%' OR title ILIKE '%şarj kablosu%' OR
--   title ILIKE '%powerbank%' OR
--   title ILIKE '%telefon tutucu%' OR title ILIKE '%telefon standı%' OR
--   title ILIKE '%tornavida set%' OR title ILIKE '%tamir seti%' OR
--   title ILIKE '%nano cam%' OR title ILIKE '%tamperli cam%' OR title ILIKE '%seramik esnek%' OR
--   title ILIKE '% kapak -%' OR title ILIKE '% kapak %'
-- );

-- Actual migration:
UPDATE products
SET category_id = '97af4bfd-ed08-44b6-8f28-09131ae7920f'  -- Telefon Aksesuar
WHERE category_id = '9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7'  -- Akıllı Telefon
  AND (
    title ILIKE '%kılıf%'
    OR title ILIKE '%ekran koruyucu%'
    OR title ILIKE '%şarj aleti%'
    OR title ILIKE '%şarj cihazı%'
    OR title ILIKE '%şarj kablosu%'
    OR title ILIKE '%powerbank%'
    OR title ILIKE '%telefon tutucu%'
    OR title ILIKE '%telefon standı%'
    OR title ILIKE '%tornavida set%'
    OR title ILIKE '%tamir seti%'
    OR title ILIKE '%nano cam%'
    OR title ILIKE '%tamperli cam%'
    OR title ILIKE '%seramik esnek%'
    OR title ILIKE '% kapak -%'
    OR (title ILIKE '% kapak %' AND title NOT ILIKE '%kapaklı%')
  );

-- Xiaomi düdüklü tencere → mutfak-sofra
UPDATE products
SET category_id = '67bacfcf-7181-4955-a0aa-fd8676081032'  -- Mutfak & Sofra
WHERE category_id = '9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7'
  AND title ILIKE '%düdüklü tencere%';

-- Xiaomi elektrikli tornavida → yapı market
UPDATE products
SET category_id = 'bba66ecf-9bf3-4d70-b183-eeae51cf1a30'  -- Yapı Market & El Aletleri
WHERE category_id = '9f8b9ba9-ec64-4254-9e2c-b7d795d31ab7'
  AND title ILIKE '%xiaomi mi cordless%'
  AND title ILIKE '%tornavida%';

-- Sonuç raporu
SELECT
  c.name AS kategori,
  COUNT(p.id) AS urun_sayisi
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.slug IN ('akilli-telefon', 'telefon-aksesuar', 'mutfak-sofra', 'yapi-market')
GROUP BY c.name
ORDER BY urun_sayisi DESC;
