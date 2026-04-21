-- ==================================================================
-- 🚨 URGENT RLS FIX — ANON KEY İLE UPDATE/DELETE BLOK
-- ==================================================================
-- Mevcut durumda anon key ile products/prices/categories/stores
-- UPDATE ve DELETE yapılabiliyor. Bu SQL tüm public tablolarda
-- sadece admin veya service_role'un yazabilmesini sağlar.
--
-- NASIL ÇALIŞTIRILIR:
-- 1. Supabase Dashboard → SQL Editor aç
-- 2. Bu dosyanın TÜMÜNÜ kopyala → yapıştır → RUN
-- 3. "Success. No rows returned" mesajı görmeli
-- 4. Aşağıdaki verification query'yi de çalıştır
-- ==================================================================

-- PRODUCTS
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_admin_insert" ON products;
DROP POLICY IF EXISTS "products_admin_update" ON products;
DROP POLICY IF EXISTS "products_admin_delete" ON products;
DROP POLICY IF EXISTS "products_public_read" ON products;
DROP POLICY IF EXISTS "products_admin_only_write" ON products;
DROP POLICY IF EXISTS "products_admin_only_update" ON products;
DROP POLICY IF EXISTS "products_admin_only_delete" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for all" ON products;
DROP POLICY IF EXISTS "Enable update for all" ON products;
DROP POLICY IF EXISTS "Enable delete for all" ON products;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read"
  ON products FOR SELECT USING (true);

CREATE POLICY "products_admin_only_write"
  ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "products_admin_only_update"
  ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "products_admin_only_delete"
  ON products FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));


-- PRICES
DROP POLICY IF EXISTS "prices_select" ON prices;
DROP POLICY IF EXISTS "prices_admin_insert" ON prices;
DROP POLICY IF EXISTS "prices_admin_update" ON prices;
DROP POLICY IF EXISTS "prices_admin_delete" ON prices;
DROP POLICY IF EXISTS "prices_public_read" ON prices;
DROP POLICY IF EXISTS "prices_admin_only_insert" ON prices;
DROP POLICY IF EXISTS "prices_admin_only_update" ON prices;
DROP POLICY IF EXISTS "prices_admin_only_delete" ON prices;
DROP POLICY IF EXISTS "Enable read access for all users" ON prices;
DROP POLICY IF EXISTS "Enable insert for all" ON prices;
DROP POLICY IF EXISTS "Enable update for all" ON prices;
DROP POLICY IF EXISTS "Enable delete for all" ON prices;

ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prices_public_read"
  ON prices FOR SELECT USING (true);

CREATE POLICY "prices_admin_only_insert"
  ON prices FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "prices_admin_only_update"
  ON prices FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "prices_admin_only_delete"
  ON prices FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));


-- CATEGORIES
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_admin_insert" ON categories;
DROP POLICY IF EXISTS "categories_admin_update" ON categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON categories;
DROP POLICY IF EXISTS "categories_public_read" ON categories;
DROP POLICY IF EXISTS "categories_admin_only_insert" ON categories;
DROP POLICY IF EXISTS "categories_admin_only_update" ON categories;
DROP POLICY IF EXISTS "categories_admin_only_delete" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert for all" ON categories;
DROP POLICY IF EXISTS "Enable update for all" ON categories;
DROP POLICY IF EXISTS "Enable delete for all" ON categories;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read"
  ON categories FOR SELECT USING (true);

CREATE POLICY "categories_admin_only_insert"
  ON categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "categories_admin_only_update"
  ON categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "categories_admin_only_delete"
  ON categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));


-- STORES
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_admin_insert" ON stores;
DROP POLICY IF EXISTS "stores_admin_update" ON stores;
DROP POLICY IF EXISTS "stores_admin_delete" ON stores;
DROP POLICY IF EXISTS "stores_public_read" ON stores;
DROP POLICY IF EXISTS "stores_admin_only_insert" ON stores;
DROP POLICY IF EXISTS "stores_admin_only_update" ON stores;
DROP POLICY IF EXISTS "stores_admin_only_delete" ON stores;
DROP POLICY IF EXISTS "Enable read access for all users" ON stores;
DROP POLICY IF EXISTS "Enable insert for all" ON stores;
DROP POLICY IF EXISTS "Enable update for all" ON stores;
DROP POLICY IF EXISTS "Enable delete for all" ON stores;

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stores_public_read"
  ON stores FOR SELECT USING (true);

CREATE POLICY "stores_admin_only_insert"
  ON stores FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "stores_admin_only_update"
  ON stores FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "stores_admin_only_delete"
  ON stores FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));


-- ==================================================================
-- VERIFICATION (yukarıdaki RUN'dan sonra bunu da çalıştır)
-- ==================================================================
SELECT
  tablename,
  policyname,
  cmd AS operation,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products','prices','categories','stores')
ORDER BY tablename, cmd;
