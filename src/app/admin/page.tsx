"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import DuplicateProductPanel from "../components/admin/DuplicateProductPanel";

type PriceHealthListing = {
  id: string;
  source: string | null;
  price: number | null;
  last_seen: string | null;
  source_url: string | null;
  source_product_id: string | null;
  is_active: boolean | null;
  in_stock: boolean | null;
};

type PriceHealthAlert = {
  key:
    | "history_stalled"
    | "stale_active_listings"
    | "missing_identity_listings"
    | "invalid_price_listings"
    | "unsupported_active_sources";
  severity: "warn" | "error";
  count: number;
  title: string;
  description: string;
  action: string;
};

type PriceHealthResponse = {
  status: "ok" | "warn" | "error";
  generated_at: string;
  stale_after_hours: number;
  summary: {
    active_listings: number;
    stale_active_listings: number;
    missing_identity_listings: number;
    invalid_price_listings: number;
    unsupported_active_sources: number;
    history_rows_last_24h: number;
  };
  alerts: PriceHealthAlert[];
  product: null | {
    id: string;
    title: string;
    slug: string;
    brand: string | null;
    total_listings: number;
    active_listings: number;
    stale_active_listings: number;
    missing_identity_listings: number;
    invalid_price_listings: number;
    unsupported_active_sources: number;
    listings: PriceHealthListing[];
  };
};

// P6.12: Admin internal panel için minimal Supabase row shape'leri.
// Strict tipi yerine erişilen field'ları opsiyonel/unknown bırakmak admin'in
// tablodan tabloya değişen JSON-LD spec yapısına uyumlu olur.
type AdminProductRow = {
  id: string;
  title?: string;
  brand?: string | null;
  slug?: string;
  created_at?: string;
};
type AdminCategoryRow = {
  id: string;
  slug: string;
  name: string;
};
type AdminStoreRow = {
  id: string;
  name: string;
  url?: string | null;
};
type AdminPriceRow = {
  id: string;
  product_id?: string;
  price: number | string;
  stores?: { name?: string; url?: string };
  products?: { title?: string };
};
type AdminCsvRow = Record<string, string | undefined> & { category?: string };
type IcecatSpecGroup = {
  Name?: string;
  LocalName?: string;
  Features?: Array<{
    Feature?: { Name?: { Value?: string } };
    LocalValue?: string;
    Value?: string;
  }>;
};

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<AdminCategoryRow[]>([]);
  const [activeTab, setActiveTab] = useState("urunler");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Fiyat yönetimi
  const [stores, setStores] = useState<AdminStoreRow[]>([]);
  const [allPrices, setAllPrices] = useState<AdminPriceRow[]>([]);
  const [priceProductId, setPriceProductId] = useState("");
  const [priceProductPrices, setPriceProductPrices] = useState<AdminPriceRow[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [priceValue, setPriceValue] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [priceSaving, setPriceSaving] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState("");
  const [priceError, setPriceError] = useState("");
  const [priceHealth, setPriceHealth] = useState<PriceHealthResponse | null>(null);
  const [priceHealthLoading, setPriceHealthLoading] = useState(false);
  const [priceHealthError, setPriceHealthError] = useState("");

  // CSV import
  const [_csvText, setCsvText] = useState("");
  const [csvParsed, setCsvParsed] = useState<AdminCsvRow[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState("");

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
  const [specs, setSpecs] = useState<IcecatSpecGroup[]>([]);
  const [categorySlug, setCategorySlug] = useState("telefon");
  const [icecatProductId, setIcecatProductId] = useState("");

  // P6.12: 4 useEffect aşağıdaki deps array'lerine fn-ref'ler eklenmedi —
  // her render'da fn yeniden oluşur, deps'e koyunca infinite loop oluşur.
  // Doğru çözüm useCallback wrap (6 fn × ayrı audit) scope dışı, P6.12g borç.
  // Mevcut davranış mount/state-trigger ile manuel kontrol, infinite loop yok.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    checkAdmin();
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!loading && !priceHealth && !priceHealthLoading) {
      loadPriceHealth(priceProductId || undefined);
    }
  }, [loading, priceHealth, priceHealthLoading, priceProductId]);

  useEffect(() => {
    if (activeTab === "fiyatler") {
      loadStoresAndPrices();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "fiyatler") return;
    if (priceProductId) loadProductPrices(priceProductId);
    else setPriceProductPrices([]);
    loadPriceHealth(priceProductId || undefined);
  }, [priceProductId, activeTab]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const getAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" } as const;
  };

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { router.push("/giris"); return; }
    const res = await fetch("/api/admin/check", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { router.push("/"); return; }
    setLoading(false);
  };

  const loadProducts = async () => {
    const auth = await getAuth();
    if (!auth) return;
    const res = await fetch("/api/admin/products", { headers: auth }).then(r => r.json()).catch(() => null);
    if (Array.isArray(res?.products)) setProducts(res.products);
  };

  const loadCategories = async () => {
    const res = await fetch("/api/public/categories").then(r => r.json()).catch(() => null);
    if (Array.isArray(res?.categories)) setCategories(res.categories);
  };

  const loadStoresAndPrices = async () => {
    const auth = await getAuth();
    if (!auth) return;
    const [sRes, pRes] = await Promise.all([
      fetch("/api/admin/stores", { headers: auth }).then(r => r.json()).catch(() => null),
      fetch("/api/admin/prices", { headers: auth }).then(r => r.json()).catch(() => null),
    ]);
    if (Array.isArray(sRes?.stores)) setStores(sRes.stores);
    if (Array.isArray(pRes?.prices)) setAllPrices(pRes.prices);
  };

  const loadProductPrices = async (productId: string) => {
    const auth = await getAuth();
    if (!auth) return;
    const res = await fetch(`/api/admin/prices?product_id=${productId}`, { headers: auth })
      .then(r => r.json()).catch(() => null);
    setPriceProductPrices(res?.prices || []);
  };

  const loadPriceHealth = async (productId?: string) => {
    const auth = await getAuth();
    if (!auth) return;
    setPriceHealthLoading(true);
    setPriceHealthError("");
    try {
      const suffix = productId ? `?product_id=${encodeURIComponent(productId)}` : "";
      const response = await fetch(`/api/admin/prices/health${suffix}`, { headers: auth });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        setPriceHealthError(json?.error || "Saglik ozeti yuklenemedi");
        return;
      }
      setPriceHealth(json as PriceHealthResponse);
    } catch {
      setPriceHealthError("Saglik ozeti yuklenemedi");
    } finally {
      setPriceHealthLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!priceProductId || !storeName.trim() || !priceValue) {
      setPriceError("Ürün, mağaza adı ve fiyat zorunlu!");
      return;
    }
    const parsed = parseFloat(priceValue.replace(",", "."));
    if (isNaN(parsed)) { setPriceError("Geçersiz fiyat!"); return; }
    setPriceSaving(true); setPriceError(""); setPriceSuccess("");

    const auth = await getAuth();
    if (!auth) { setPriceError("Oturum yok"); setPriceSaving(false); return; }

    const storeRes = await fetch("/api/admin/stores", {
      method: "POST", headers: auth,
      body: JSON.stringify({ name: storeName.trim(), url: storeUrl.trim() }),
    }).then(r => r.json()).catch(() => null);
    const storeId = storeRes?.store?.id;
    if (!storeId) { setPriceError("Mağaza oluşturulamadı"); setPriceSaving(false); return; }

    const res = await fetch("/api/admin/prices", {
      method: "POST", headers: auth,
      body: JSON.stringify({
        product_id: priceProductId, store_id: storeId,
        price: parsed, affiliate_url: affiliateUrl.trim() || null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Hata" }));
      setPriceError(j.error || "Hata");
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
    const auth = await getAuth();
    if (!auth) return;
    await fetch(`/api/admin/prices?id=${priceId}`, { method: "DELETE", headers: auth });
    setPriceProductPrices(prev => prev.filter(p => p.id !== priceId));
    loadPriceHealth(priceProductId || undefined);
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
    } catch {
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

    const auth = await getAuth();
    if (!auth) { setError("Oturum yok"); setSaving(false); return; }
    const res = await fetch("/api/admin/products", {
      method: "POST", headers: auth,
      body: JSON.stringify({
        title, slug, brand, description,
        image_url: imageUrl || null,
        category_id: category?.id || null,
        specs: specsJson,
        icecat_id: icecatProductId || null,
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Hata" }));
      setError((j.error || "").includes("unique") ? "Bu slug zaten kullanılıyor." : (j.error || "Hata"));
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
    const auth = await getAuth();
    if (!auth) return;
    await fetch(`/api/admin/products?id=${id}`, { method: "DELETE", headers: auth });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // CSV parse: başlık satırı + veri satırları
  const parseCSV = (text: string) => {
    setCsvError(""); setCsvResult("");
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { setCsvError("En az 1 başlık + 1 veri satırı gerekli"); setCsvParsed([]); return; }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const required = ["title", "brand", "category", "image_url"];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length > 0) { setCsvError(`Eksik sütunlar: ${missing.join(", ")}`); setCsvParsed([]); return; }

    const rows = lines.slice(1).map(line => {
      // Virgüllü değerlere izin vermek için basit CSV parse
      const vals: string[] = [];
      let cur = ""; let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; }
        else if (ch === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      vals.push(cur.trim());
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = (vals[i] || "").replace(/"/g, ""); });
      return row;
    }).filter(r => r.title && r.brand);

    setCsvParsed(rows);
    if (rows.length === 0) setCsvError("Geçerli satır bulunamadı");
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file, "utf-8");
  };

  function makeSlug(str: string) {
    return str.toLowerCase()
      .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
      .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      + "-" + Math.random().toString(36).slice(2, 6);
  }

  const handleCsvImport = async () => {
    if (csvParsed.length === 0) return;
    setCsvImporting(true); setCsvResult(""); setCsvError("");
    let ok = 0; let fail = 0;

    const auth = await getAuth();
    if (!auth) { setCsvError("Oturum yok"); setCsvImporting(false); return; }
    for (const row of csvParsed) {
      const rowCategory = row.category ?? "";
      const cat = categories.find(c => c.slug === rowCategory || c.name.toLowerCase() === rowCategory.toLowerCase());
      const res = await fetch("/api/admin/products", {
        method: "POST", headers: auth,
        body: JSON.stringify({
          title: row.title,
          slug: makeSlug(row.title ?? ""),
          brand: row.brand,
          description: row.description || null,
          image_url: row.image_url || null,
          category_id: cat?.id || null,
          specs: row.specs ? JSON.parse(row.specs) : null,
        }),
      });
      if (!res.ok) fail++; else ok++;
    }

    setCsvResult(`✅ ${ok} ürün eklendi${fail > 0 ? `, ❌ ${fail} hata` : ""}`);
    setCsvImporting(false);
    setCsvParsed([]);
    setCsvText("");
    loadProducts();
  };

  const formatHealthTime = (value?: string | null) => {
    if (!value) return "Henuz gorulmedi";
    return new Date(value).toLocaleString("tr-TR");
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
          {[["urunler", "Ürünler"], ["ekle", "Yeni Ürün Ekle"], ["csv", "CSV Import"], ["fiyatler", "Fiyat Yönetimi"]].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-gray-500"
              }`}>
              <span className="inline-flex items-center gap-2">
                <span>{label}</span>
                {t === "fiyatler" && priceHealth && priceHealth.status !== "ok" && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      priceHealth.status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {priceHealth.alerts.length || "!"}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>

        {activeTab === "urunler" && (
          <>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {products.length === 0 ? (
              <div className="text-center py-16 text-sm text-gray-400">Henüz ürün yok</div>
            ) : products.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.title}</div>
                  <div className="text-xs text-gray-400">{p.brand} — {p.slug}</div>
                </div>
                <div className="text-xs text-gray-400">{p.created_at ? new Date(p.created_at).toLocaleDateString("tr-TR") : ""}</div>
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
          <div className="mt-5">
            <DuplicateProductPanel onMerged={loadProducts} />
          </div>
          </>
        )}

        {activeTab === "ekle" && (
          <div className="space-y-5">

            {/* Icecat Arama Bölümü */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-blue-800 mb-1 flex items-center gap-2">
                🔍 Icecat&apos;ten Otomatik Çek
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
                  <Image src={imageUrl} alt="" width={64} height={64} className="w-16 h-16 object-contain rounded-lg border border-gray-100" />
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{title}</div>
                    <div className="text-xs text-gray-500">{brand}</div>
                    <div className="text-xs text-green-600 mt-1">✅ Icecat&apos;ten çekildi</div>
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
                      {specs.slice(0, 3).map((group: IcecatSpecGroup, i: number) => (
                        <div key={i}>
                          <div className="font-semibold text-gray-700 mb-1">{group.LocalName || group.Name}</div>
                          {group.Features?.slice(0, 4).map((f, j: number) => (
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

        {activeTab === "csv" && (
          <div className="space-y-5">
            {/* Şablon indirme */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h2 className="font-bold text-sm text-blue-800 mb-1">CSV Formatı</h2>
              <p className="text-xs text-blue-600 mb-3">Dosyanın ilk satırı başlık olmalı. Zorunlu: <strong>title, brand, category, image_url</strong></p>
              <div className="bg-white border border-blue-100 rounded-xl p-3 font-mono text-xs text-gray-600 overflow-x-auto">
                title,brand,category,image_url,description<br />
                {`"iPhone 15 Pro 256GB",Apple,telefon,https://example.com/img.jpg,"Apple'ın amiral gemisi"`}<br />
                {`"Galaxy S24 Ultra",Samsung,telefon,https://example.com/img2.jpg,""`}
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Kategoriler: <strong>telefon, laptop, tv, ses, kozmetik, ev-aletleri, spor, oyun, fotograf, saglik, bebek, kitap</strong>
              </p>
              <button
                onClick={() => {
                  const csv = "title,brand,category,image_url,description\n\"iPhone 15 Pro 256GB\",Apple,telefon,https://example.com/img.jpg,\"Açıklama\"\n";
                  const a = document.createElement("a");
                  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
                  a.download = "urun-sablonu.csv";
                  a.click();
                }}
                className="mt-3 text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-all"
              >
                Şablon İndir
              </button>
            </div>

            {/* Dosya yükle */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-base mb-4">CSV Dosyası Yükle</h2>

              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-10 cursor-pointer hover:border-[#E8460A] hover:bg-orange-50 transition-all">
                <div className="text-3xl mb-2">📂</div>
                <div className="text-sm font-medium text-gray-700">CSV dosyası seç</div>
                <div className="text-xs text-gray-400 mt-1">.csv formatında, UTF-8 kodlamasında</div>
                <input type="file" accept=".csv" onChange={handleCsvFile} className="hidden" />
              </label>

              {csvError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{csvError}</div>
              )}

              {csvParsed.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">{csvParsed.length} ürün hazır — önizleme:</div>
                  <div className="border border-gray-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {csvParsed.slice(0, 20).map((row, i) => (
                      <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                        {row.image_url && (
                          <Image src={row.image_url} alt="" width={40} height={40} className="w-10 h-10 object-contain rounded-lg border border-gray-100 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{row.title}</div>
                          <div className="text-xs text-gray-400">{row.brand} · {row.category}</div>
                        </div>
                        <div className="text-xs text-green-600 font-medium">✓</div>
                      </div>
                    ))}
                    {csvParsed.length > 20 && (
                      <div className="text-center py-2 text-xs text-gray-400">+{csvParsed.length - 20} ürün daha</div>
                    )}
                  </div>

                  <button onClick={handleCsvImport} disabled={csvImporting}
                    className="mt-4 bg-[#E8460A] text-white rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-50 hover:bg-[#C93A08] transition-all">
                    {csvImporting ? `İçe aktarılıyor... (${csvParsed.length} ürün)` : `${csvParsed.length} Ürünü İçe Aktar`}
                  </button>
                </div>
              )}

              {csvResult && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl font-medium">{csvResult}</div>
              )}
            </div>
          </div>
        )}

        {activeTab === "fiyatler" && (
          <div className="space-y-5">
            <div className={`border rounded-2xl p-5 ${
              priceHealth?.status === "error"
                ? "bg-red-50 border-red-200"
                : priceHealth?.status === "warn"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-green-50 border-green-200"
            }`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-bold text-base text-gray-900">Fiyat Akışı Sağlık Özeti</h2>
                  <div className="text-xs text-gray-600 mt-1">
                    Aktif listing, stale veri ve eksik kimlik alanlarını kontrol eder.
                    {priceHealth ? ` Son tarama: ${formatHealthTime(priceHealth.generated_at)}.` : ""}
                  </div>
                </div>
                <button
                  onClick={() => loadPriceHealth(priceProductId || undefined)}
                  disabled={priceHealthLoading}
                  className="text-xs font-semibold border border-gray-300 bg-white rounded-lg px-3 py-2 hover:border-[#E8460A] hover:text-[#E8460A] transition-all disabled:opacity-50"
                >
                  {priceHealthLoading ? "Yenileniyor..." : "Yenile"}
                </button>
              </div>

              {priceHealthError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                  {priceHealthError}
                </div>
              )}

              {priceHealth ? (
                <>
                  <div className="space-y-2 mb-4">
                    {priceHealth.alerts.length > 0 ? (
                      priceHealth.alerts.map((alert) => (
                        <div
                          key={alert.key}
                          className={`rounded-xl border px-4 py-3 ${
                            alert.severity === "error"
                              ? "bg-red-50 border-red-200"
                              : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className={`text-sm font-semibold ${
                                alert.severity === "error" ? "text-red-700" : "text-amber-800"
                              }`}>
                                {alert.title}
                              </div>
                              <div className="text-xs text-gray-700 mt-1">{alert.description}</div>
                              <div className="text-xs text-gray-600 mt-2">Aksiyon: {alert.action}</div>
                            </div>
                            <div className={`text-xs font-bold whitespace-nowrap ${
                              alert.severity === "error" ? "text-red-700" : "text-amber-700"
                            }`}>
                              {alert.count > 0 ? `${alert.count} kayit` : "Kontrol et"}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/80 border border-white rounded-xl px-4 py-3 text-sm text-green-700">
                        Su an fiyat akisini bloke eden aktif bir uyari yok.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      ["Aktif Listing", priceHealth.summary.active_listings, "text-gray-900"],
                      ["Stale Aktif", priceHealth.summary.stale_active_listings, "text-amber-700"],
                      ["Kimlik Eksik", priceHealth.summary.missing_identity_listings, "text-amber-700"],
                      ["Hatalı Fiyat", priceHealth.summary.invalid_price_listings, "text-red-600"],
                      ["Desteksiz Kaynak", priceHealth.summary.unsupported_active_sources, "text-amber-700"],
                      ["24s History", priceHealth.summary.history_rows_last_24h, "text-gray-900"],
                    ].map(([label, value, tone]) => (
                      <div key={String(label)} className="bg-white/80 border border-white rounded-xl p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
                        <div className={`text-2xl font-bold mt-2 ${String(tone)}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {priceHealth.product && (
                    <div className="mt-4 bg-white/80 border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{priceHealth.product.title}</div>
                          <div className="text-xs text-gray-500">
                            {(priceHealth.product.brand || "Marka yok")} · {priceHealth.product.slug}
                          </div>
                        </div>
                        <a
                          href={"/urun/" + priceHealth.product.slug}
                          target="_blank"
                          className="text-xs text-[#E8460A] border border-[#E8460A] rounded-lg px-2 py-1 hover:bg-orange-50 transition-all"
                        >
                          Ürünü Aç
                        </a>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        {[
                          ["Toplam", priceHealth.product.total_listings],
                          ["Aktif", priceHealth.product.active_listings],
                          ["Stale", priceHealth.product.stale_active_listings],
                          ["Kimlik Eksik", priceHealth.product.missing_identity_listings],
                          ["Hatalı Fiyat", priceHealth.product.invalid_price_listings],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="border border-gray-100 rounded-xl p-3 bg-white">
                            <div className="text-xs text-gray-500">{label}</div>
                            <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
                          </div>
                        ))}
                      </div>

                      {priceHealth.product.listings.length > 0 && (
                        <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
                          {priceHealth.product.listings.map((listing, i) => (
                            <div
                              key={listing.id}
                              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${
                                i % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800">{listing.source || "Kaynak yok"}</div>
                                <div className="text-xs text-gray-400 truncate">
                                  {listing.source_url || listing.source_product_id || "Kimlik bilgisi eksik"}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 whitespace-nowrap">
                                {listing.price != null ? `${Number(listing.price).toLocaleString("tr-TR")} TL` : "Fiyat yok"}
                              </div>
                              <div className="text-xs text-gray-400 whitespace-nowrap">
                                {formatHealthTime(listing.last_seen)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  {priceHealthLoading ? "Saglik ozeti yukleniyor..." : "Henuz saglik verisi yok."}
                </div>
              )}
            </div>

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
                      {priceProductPrices.map((p, i: number) => (
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
                  {allPrices.map((p, i: number) => (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-700">{p.products?.title}</div>
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
