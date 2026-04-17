-- =============================================
-- birtavsiye.net — Tüm Tablolar İçin RLS
-- Supabase Dashboard > SQL Editor'de çalıştır
-- =============================================

-- -----------------------------------------------
-- products: Herkes okur, sadece admin yazar
-- -----------------------------------------------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON products FOR SELECT USING (true);

CREATE POLICY "products_admin_insert" ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "products_admin_update" ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "products_admin_delete" ON products FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------
-- categories: Herkes okur, sadece admin yazar
-- -----------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT USING (true);

CREATE POLICY "categories_admin_insert" ON categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "categories_admin_update" ON categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "categories_admin_delete" ON categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------
-- profiles: Herkes okur (topic yazarlarının genderi gösterilir)
--           Kullanıcı kendi profilini oluşturur/günceller
-- -----------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- -----------------------------------------------
-- topics: Herkes okur, giriş yapan oluşturur/günceller
--         (oy ve cevap sayısı herhangi bir giriş yapmış kullanıcı tarafından güncellenir)
-- -----------------------------------------------
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics_select" ON topics FOR SELECT USING (true);

CREATE POLICY "topics_insert" ON topics FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "topics_update" ON topics FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "topics_admin_delete" ON topics FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------
-- topic_answers: Herkes okur, giriş yapan yazar/günceller
-- -----------------------------------------------
ALTER TABLE topic_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_answers_select" ON topic_answers FOR SELECT USING (true);

CREATE POLICY "topic_answers_insert" ON topic_answers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "topic_answers_update" ON topic_answers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "topic_answers_admin_delete" ON topic_answers FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------
-- topic_votes: Kullanıcı kendi oyunu yönetir
-- -----------------------------------------------
ALTER TABLE topic_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_votes_select" ON topic_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "topic_votes_insert" ON topic_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_votes_update" ON topic_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "topic_votes_delete" ON topic_votes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- topic_answer_votes: Kullanıcı kendi oyunu yönetir
-- -----------------------------------------------
ALTER TABLE topic_answer_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topic_answer_votes_select" ON topic_answer_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "topic_answer_votes_insert" ON topic_answer_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "topic_answer_votes_update" ON topic_answer_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "topic_answer_votes_delete" ON topic_answer_votes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- community_posts: Herkes okur, giriş yapan yazar/günceller
-- -----------------------------------------------
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_posts_select" ON community_posts FOR SELECT USING (true);

CREATE POLICY "community_posts_insert" ON community_posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "community_posts_update" ON community_posts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "community_posts_admin_delete" ON community_posts FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------
-- post_votes: Kullanıcı kendi oyunu yönetir
-- -----------------------------------------------
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_votes_select" ON post_votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "post_votes_insert" ON post_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_votes_update" ON post_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "post_votes_delete" ON post_votes FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------
-- favorites: Kullanıcı kendi favorilerini yönetir
-- -----------------------------------------------
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select" ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert" ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete" ON favorites FOR DELETE
  USING (auth.uid() = user_id);
