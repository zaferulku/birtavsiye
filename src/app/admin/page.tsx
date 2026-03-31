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

  // Fiyat yönetimi
  const [stores, setStores] = useState<any[]>([]);
  const [allPrices, setAllPrices] = useState<any[]>([]);
  const [priceProductId, setPriceProductId] = useState("");
  const [priceProductPrices, setPriceProductPrices] = useState<any[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState("");
  const [priceError, setPriceError] = useState("");

  // Icecat arama
  const [icecatQuery, setIcecatQuery] = useState("");
  const [icecatBrand, setIcecatBrand] = useState("");
  const [icecatLoading, setIcecatLoading] = useState(false);
  const [icecatError, setIcecatError] = useState("");

  // Ürün form alanları
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [specs, setSpecs] = useState<any[]>([]);
  const [categorySlug, setCategorySlug] = useState("telefon");
  const [icecatProductId, setIcecatProductId] = useState("");

  useEffect(() => {
    checkAdmin();
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === "fiyatler") {
      loadStoresAndPrices();
    }
  }, [activeTab]);

  useEffect(() => {
    if (priceProductId) loadProductPrices(priceProductId);
    else setPriceProductPrices([]);
  }, [priceProductId]);

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

  const loadStoresAndPrices = async () => {
    const { data: storeData } = await supabase.from("stores").select("*").order("name");
    if (storeData) setStores(storeData);
    const { data: priceData } = await supabase
      .from("prices").select("id, price, product_id, store_id, products(title), stores(name, url)")
      .order("price", { ascending: true });
    if (priceData) setAllPrices(priceData);
  };

  const loadProductPrices = async (productId: string) => {
    const { data } = await supabase
      .from("prices").select("id, price, store_id, stores(name, url)")
      .eq("product_id", productId).order("price", { ascending: true });
    setPriceProductPrices(data || []);
  };

  const handleAddPrice = async () => {
    if (!priceProductId || !storeName.trim() || !priceValue) {
      setPriceError("Ürün, mağaza adı ve fiyat zorunlu!");
      return;
    }
    const parsed = parseFloat(priceValue.replace(",", "."));
    if (isNaN(parsed)) { setPriceError("Geçersiz fiyat!"); return; }
    setPriceSaving(true); setPriceError(""); setPriceSuccess("");

    // Store bul veya oluştur
    let storeId: string;
    const { data: existingStore } = await supabase
      .from("stores").select("id").ilike("name", storeName.trim()).maybeSingle();
    if (existingStore) {
      storeId = existingStore.id;
    } else {
      const { data: newStore, error: storeErr } = await supabase
        .from("stores").insert({ name: storeName.trim(), url: storeUrl.trim() || null }).select("id").single();
      if (storeErr) { setPriceError("Mağaza oluşturulamadı: " + storeErr.message); setPriceSaving(false); return; }
      storeId = newStore.id;
    }

    // Aynı ürün+mağaza kombinasyonu varsa güncelle, yoksa ekle
    const { error } = await supabase.from("prices").upsert(
      { product_id: priceProductId, store_id: storeId, price: parsed, affiliate_url: affiliateUrl.trim() || null },
      { onConflict: "product_id,store_id" }
    );
    if (error) {
      setPriceError(error.message);
    } else {
      setPriceSuccess("✅ Fiyat eklendi!");
      setStoreName(""); setStoreUrl(""); setPriceValue(""); setAffiliateUrl("");
      loadProductPrices(priceProductId);
      loadStoresAndPrices();
    }
    setPriceSaving(false);
  };

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm("Bu fiyatı silmek istediğine emin misin?")) return;
    await supabase.from("prices").delete().eq("id", priceId);
    setPriceProductPrices(prev => prev.filter(p => p.id !== priceId));
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase()
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const fetchFromIcecat = async () => {
    if (!icecatQuery.trim()) return;
    setIcecatLoading(true);
    setIcecatError("");

    try {
      let url = "";
      // EAN mi yoksa Marka+Model mi?
      if (/^\d{8,14}$/.test(icecatQuery.trim())) {
        url = `/api/icecat?ean=${encodeURIComponent(icecatQuery.trim())}`;
      } else {
        if (!icecatBrand.trim()) {
          setIcecatError("EAN değilse Marka alanını da doldur!");
          setIcecatLoading(false);
          return;
        }
        url = `/api/icecat?brand=${encodeURIComponent(icecatBrand.trim())}&productCode=${encodeURIComponent(icecatQuery.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.msg === "ERROR" || data.error) {
        setIcecatError(data.msg || data.error || "Ürün bulunamadı");
        setIcecatLoading(false);
        return;
      }

      const product = data.data;
      if (!product) {
        setIcecatError("Ürün bulunamadı");
        setIcecatLoading(false);
        return;
      }

      // Bilgileri forma doldur
      const productTitle = product.GeneralInfo?.ProductName || product.GeneralInfo?.Title || "";
      const productBrand = product.GeneralInfo?.BrandName || "";
      const productDesc = product.GeneralInfo?.SummaryDescription?.LongSummaryDescription || 
                          product.GeneralInfo?.SummaryDescription?.ShortSummaryDescription || "";
      const productImage = product.Image?.HighPic || product.Image?.LowPic || product.Image?.Pic500x500 || "";
      const productSpecs = product.FeaturesGroups || [];
      const productId = product.GeneralInfo?.IcecatId || "";

      handleTitleChange(productBrand + " " + productTitle);
      setBrand(productBrand);
      setDescription(productDesc);
      setImageUrl(productImage);
      setSpecs(productSpecs);
      setIcecatProductId(String(productId));

      setSuccess("✅ Icecat'ten bilgiler çekildi! Kontrol edip kaydedin.");
    } catch (err) {
      setIcecatError("Bağlantı hatası");
    }
    setIcecatLoading(false);
  };

  const handleAdd = async () => {
    if (!title || !slug || !brand) { setError("Başlık, slug ve marka zorunlu!"); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    const category = categories.find((c) => c.slug === categorySlug);

    // Specs'i JSON olarak kaydet
    const specsJson = specs.length > 0 ? JSON.stringify(specs) : null;

    const { error } = await supabase.from("products").insert({
      title, slug, brand, description,
      image_url: imageUrl || null,
      category_id: category?.id || null,
      specs: specsJson,
      icecat_id: icecatProductId || null,
    });

    if (error) {
      setError(error.message.includes("unique") ? "Bu slug zaten kullanılıyor." : error.message);
    } else {
      setSuccess("✅ Ürün eklendi!");
      setTitle(""); setSlug(""); setBrand(""); setDescription("");
      setImageUrl(""); setSpecs([]); setIcecatProductId("");
      setIcecatQuery(""); setIcecatBrand("");
      loadProducts();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Silmek istediğine emin misin?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return (
    <main><Header />
      <div className="max-w-6xl mx-auto px-6 py-20 text-center text-gray-400">Yükleniyor...</div>
      <Footer />
    </main>
  );

  return (
    <main>
      <Header />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="font-bold text-2xl mb-2">Admin Paneli</h1>
        <p className="text-sm text-gray-400 mb-6">birtavsiye.net — {products.length} ürün</p>

        <div className="flex border-b border-gray-200 mb-6">
          {[["urunler", "Ürünler"], ["ekle", "Yeni Ürün Ekle"], ["fiyatler", "Fiyat Yönetimi"]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-500"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "urunler" && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {products.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">Henüz ürün yok</div>
            ) : products.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-gray-400">{p.brand} — {p.slug}</div>
                </div>
                <div className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString("tr-TR")}</div>
                <div className="flex gap-2">
                  <a href={"/urun/" + p.slug} target="_blank"
                    className="text-xs text-[#E8460A] border border-[#E8460A] rounded-lg px-2 py-1 hover:bg-orange-50 transition-all">
                    Gör
                  </a>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-all">
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ekle" && (
          <div className="space-y-5">

            {/* Icecat Arama Bölümü */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-blue-800 mb-1 flex items-center gap-2">
                🔍 Icecat'ten Otomatik Çek
              </h2>
              <p className="text-xs text-blue-600 mb-3">EAN barkodu veya Marka + Model kodu girerek ürün bilgilerini otomatik doldur</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs text-blue-700 mb-1 block font-medium">Marka (EAN değilse)</label>
                  <input type="text" value={icecatBrand} onChange={(e) => setIcecatBrand(e.target.value)}
                    placeholder="Apple, Samsung..."
                    className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-blue-700 mb-1 block font-medium">EAN Barkod veya Model Kodu</label>
                  <div className="flex gap-2">
                    <input type="text" value={icecatQuery} onChange={(e) => setIcecatQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchFromIcecat()}
                      placeholder="0194253716853 veya MYE02TU/A"
                      className="flex-1 border border-blue-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white" />
                    <button onClick={fetchFromIcecat} disabled={icecatLoading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all whitespace-nowrap">
                      {icecatLoading ? "Çekiliyor..." : "Çek"}
                    </button>
                  </div>
                </div>
              </div>

              {icecatError && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  ❌ {icecatError}
                </div>
              )}

              {/* Görsel önizleme */}
              {imageUrl && (
                <div className="mt-3 flex items-center gap-3 bg-white border border-blue-200 rounded-xl p-3">
                  <img src={imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg border border-gray-100" />
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{title}</div>
                    <div className="text-xs text-gray-500">{brand}</div>
                    <div className="text-xs text-green-600 mt-1">✅ Icecat'ten çekildi</div>
                  </div>
                </div>
              )}
            </div>

            {/* Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-5">Ürün Bilgileri</h2>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ürün Adı</label>
                  <input type="text" value={title} onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="iPhone 16 Pro 256GB"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Slug</label>
                  <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] font-mono" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Marka</label>
                  <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)}
                    placeholder="Apple"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Kategori</label>
                  <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] bg-white">
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Görsel URL</label>
                  <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Açıklama</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] resize-none" />
                </div>

                {specs.length > 0 && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-2 block">Teknik Özellikler ({specs.length} grup)</label>
                    <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto text-xs text-gray-600 space-y-2">
                      {specs.slice(0, 3).map((group: any, i: number) => (
                        <div key={i}>
                          <div className="font-semibold text-gray-700 mb-1">{group.LocalName || group.Name}</div>
                          {group.Features?.slice(0, 4).map((f: any, j: number) => (
                            <div key={j} className="flex gap-2 pl-2">
                              <span className="text-gray-400">{f.Feature?.Name?.Value}:</span>
                              <span>{f.LocalValue || f.Value}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {specs.length > 3 && <div className="text-gray-400">+{specs.length - 3} grup daha...</div>}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleAdd} disabled={saving}
                className="mt-5 bg-[#E8460A] text-white rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50 hover:bg-[#C93A08] transition-all">
                {saving ? "Ekleniyor..." : "Ürünü Ekle"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "fiyatler" && (
          <div className="space-y-5">
            {/* Ürün Seç */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-base mb-3">Ürün Seç</h2>
              <select value={priceProductId} onChange={(e) => setPriceProductId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] bg-white">
                <option value="">-- Ürün seçin --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title} ({p.brand})</option>
                ))}
              </select>

              {/* Seçili ürünün mevcut fiyatları */}
              {priceProductId && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">Mevcut Fiyatlar</div>
                  {priceProductPrices.length === 0 ? (
                    <div className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200 rounded-xl">
                      Bu ürün için henüz fiyat eklenmemiş
                    </div>
                  ) : (
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                      {priceProductPrices.map((p: any, i: number) => (
                        <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                          <div className="flex-1">
                            <div className="text-sm font-medium">{p.stores?.name}</div>
                            <div className="text-xs text-gray-400">{p.stores?.url || "URL yok"}</div>
                          </div>
                          <div className="font-bold text-sm text-[#E8460A]">{Number(p.price).toLocaleString("tr-TR")} TL</div>
                          <button onClick={() => handleDeletePrice(p.id)}
                            className="text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition-all">
                            Sil
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Fiyat Ekle */}
            {priceProductId && (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="font-bold text-base mb-4">Fiyat Ekle / Güncelle</h2>

                {priceError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{priceError}</div>}
                {priceSuccess && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{priceSuccess}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mağaza Adı</label>
                    <input list="stores-list" type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Trendyol, Hepsiburada, Amazon..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                    <datalist id="stores-list">
                      {stores.map((s) => <option key={s.id} value={s.name} />)}
                    </datalist>
                    <div className="text-xs text-gray-400 mt-1">Aynı isimde mağaza varsa otomatik eşleştirilir</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Fiyat (TL)</label>
                    <input type="text" value={priceValue} onChange={(e) => setPriceValue(e.target.value)}
                      placeholder="74999"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Mağaza Ana URL (opsiyonel)</label>
                    <input type="text" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)}
                      placeholder="https://www.trendyol.com"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                    <div className="text-xs text-gray-400 mt-1">Mağazanın genel adresi, bir kez girilir</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Affiliate / Ürün URL (opsiyonel)</label>
                    <input type="text" value={affiliateUrl} onChange={(e) => setAffiliateUrl(e.target.value)}
                      placeholder="https://ty.gl/... veya amzn.to/..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]" />
                    <div className="text-xs text-gray-400 mt-1">Trendyol/Amazon affiliate linki — kazanç buradan gelir</div>
                  </div>
                </div>

                <button onClick={handleAddPrice} disabled={priceSaving}
                  className="mt-4 bg-[#E8460A] text-white rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50 hover:bg-[#C93A08] transition-all">
                  {priceSaving ? "Kaydediliyor..." : "Fiyatı Kaydet"}
                </button>
              </div>
            )}

            {/* Tüm fiyatlar özeti */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-base mb-3">Tüm Fiyatlar ({allPrices.length})</h2>
              {allPrices.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-8">Henüz fiyat eklenmemiş</div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                  {allPrices.map((p: any, i: number) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-700">{(p.products as any)?.title}</div>
                        <div className="text-xs text-gray-400">{p.stores?.name}</div>
                      </div>
                      <div className="font-bold text-sm">{Number(p.price).toLocaleString("tr-TR")} TL</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}