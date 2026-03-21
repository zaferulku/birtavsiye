"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("urunler");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("telefon");

  useEffect(() => {
    checkAdmin();
    loadProducts();
    loadCategories();
  }, []);

  const checkAdmin = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.push("/giris"); return; }
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle();
    if (!profile?.is_admin) { router.push("/"); return; }
    setLoading(false);
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, title, slug, brand, created_at")
      .order("created_at", { ascending: false });
    if (data) setProducts(data);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name, slug");
    if (data) setCategories(data);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleAdd = async () => {
    if (!title || !slug || !brand) { setError("Baslik, slug ve marka zorunlu!"); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    const category = categories.find((c) => c.slug === categorySlug);
    const { error } = await supabase.from("products").insert({
      title, slug, brand, description, category_id: category?.id || null,
    });
    if (error) {
      setError(error.message.includes("unique") ? "Bu slug zaten kullaniliyor." : error.message);
    } else {
      setSuccess("Urun eklendi!");
      setTitle(""); setSlug(""); setBrand(""); setDescription("");
      loadProducts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silmek istedigine emin misin?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-[#A8A49F]">
          Yukleniyor...
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-syne font-bold text-2xl mb-2">Admin Paneli</h1>
        <p className="text-sm text-[#A8A49F] mb-6">birtavsiye.net - {products.length} urun</p>
        <div className="flex border-b border-[#E8E4DF] mb-6">
          {["urunler", "ekle"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t
                  ? "border-[#E8460A] text-[#E8460A]"
                  : "border-transparent text-[#6B6760]"
              }`}
            >
              {t === "urunler" ? "Urunler" : "Yeni Urun Ekle"}
            </button>
          ))}
        </div>
        {activeTab === "urunler" && (
          <div className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden">
            {products.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-4 py-3 border-b border-[#E8E4DF] last:border-0 ${
                  i % 2 === 0 ? "bg-white" : "bg-[#F8F6F2]/30"
                }`}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-[#A8A49F]">{p.brand} - {p.slug}</div>
                </div>
                <div className="text-xs text-[#A8A49F]">
                  {new Date(p.created_at).toLocaleDateString("tr-TR")}
                </div>
                <div className="flex gap-2">
                   <a
                    href={"/urun/" + p.slug}
                    target="_blank"
                    className="text-xs text-[#E8460A] border border-[#E8460A] rounded-lg px-2 py-1 hover:bg-[#FFF0EB] transition-all"
                  >
                    Gor
                  </a>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-all"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ekle" && (
          <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6">
            <h2 className="font-syne font-bold text-lg mb-5">Yeni Urun Ekle</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">
                {success}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#6B6760] mb-1 block">Urun Adi</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="iPhone 16 Pro 256GB"
                  className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B6760] mb-1 block">Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="iphone-16-pro-256gb"
                  className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B6760] mb-1 block">Marka</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Apple"
                  className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#6B6760] mb-1 block">Kategori</label>
                <select
                  value={categorySlug}
                  onChange={(e) => setCategorySlug(e.target.value)}
                  className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-[#6B6760] mb-1 block">Aciklama</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Urun hakkinda kisa bir aciklama..."
                  rows={3}
                  className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] resize-none"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="mt-5 bg-[#E8460A] text-white rounded-xl px-6 py-3 text-sm font-medium disabled:opacity-50 hover:bg-[#C93A08] transition-all"
            >
              {saving ? "Ekleniyor..." : "Urunu Ekle"}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}