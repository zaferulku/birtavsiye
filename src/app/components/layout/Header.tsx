"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

// Ana kategori yapısı — Trendyol + Hepsiburada + Amazon TR karışımı
// Her kategori: alt kategoriler + en yaygın markalar
const NAV_CATEGORIES = [
  {
    title: "Akıllı Telefon",
    slug: "akilli-telefon",
    icon: "📱",
    subs: ["Tüm Telefonlar", "iPhone", "Samsung Galaxy", "Xiaomi", "Huawei", "Telefon Kılıfı", "Ekran Koruyucu", "Şarj Aleti", "Kablo & Adaptör"],
    brands: ["Apple", "Samsung", "Xiaomi", "Huawei", "Sony", "LG", "Motorola", "OnePlus"],
  },
  {
    title: "Bilgisayar & Tablet",
    slug: "bilgisayar-tablet",
    icon: "💻",
    subs: ["Laptop", "Masaüstü PC", "Tablet", "Monitör", "Klavye", "Mouse", "Çanta & Kılıf", "Bellek & Depolama"],
    brands: ["Apple", "Lenovo", "HP", "Dell", "Asus", "Samsung", "Microsoft", "Acer"],
  },
  {
    title: "TV",
    slug: "tv",
    icon: "📺",
    subs: ["OLED TV", "QLED TV", "4K TV", "8K TV", "55 inç ve Üzeri", "50 inç ve Altı", "Projeksiyon", "TV Duvar Askısı"],
    brands: ["Samsung", "LG", "Sony", "Philips", "Vestel", "Arçelik", "Hisense", "TCL"],
  },
  {
    title: "Ses & Kulaklık",
    slug: "ses-kulaklik",
    icon: "🎧",
    subs: ["Kablosuz Kulaklık", "Kablolu Kulaklık", "Soundbar", "Bluetooth Hoparlör", "Kulak İçi", "Oyuncu Kulaklığı", "Mikrofon", "Ev Sinema"],
    brands: ["Sony", "JBL", "Bose", "Samsung", "Apple", "Jabra", "Sennheiser", "Logitech"],
  },
  {
    title: "Akıllı Saat",
    slug: "akilli-saat",
    icon: "⌚",
    subs: ["Akıllı Saat", "Spor & Fitness Bilekliği", "GPS Saat", "Çocuk Saati", "Saat Kordonu", "Şarj Aleti"],
    brands: ["Samsung", "Apple", "Garmin", "Fitbit", "Huawei", "Xiaomi", "Amazfit"],
  },
  {
    title: "Fotoğraf & Kamera",
    slug: "fotograf-kamera",
    icon: "📷",
    subs: ["Aynasız Kamera", "DSLR", "Kompakt Kamera", "Lens", "Drone", "Aksiyon Kamera", "Fotoğraf Çantası", "Tripod"],
    brands: ["Sony", "Canon", "Nikon", "Fujifilm", "Panasonic", "GoPro", "DJI"],
  },
  {
    title: "Oyun & Konsol",
    slug: "oyun-konsol",
    icon: "🎮",
    subs: ["PlayStation", "Xbox", "Nintendo Switch", "PC Gaming", "Oyun Kolu", "VR & Sanal Gerçeklik", "Gaming Mouse", "Gaming Kulaklık"],
    brands: ["Sony", "Microsoft", "Nintendo", "Logitech", "Razer", "HyperX", "SteelSeries"],
  },
  {
    title: "Beyaz Eşya",
    slug: "beyaz-esya",
    icon: "🫙",
    subs: ["Çamaşır Makinesi", "Kurutma Makinesi", "Bulaşık Makinesi", "Buzdolabı", "No-Frost", "Fırın & Ocak", "Klima", "Davlumbaz"],
    brands: ["Arçelik", "Bosch", "Siemens", "LG", "Samsung", "Vestel", "Beko", "Miele"],
  },
  {
    title: "Küçük Ev Aletleri",
    slug: "kucuk-ev-aletleri",
    icon: "🔌",
    subs: ["Kahve Makinesi", "Robot Süpürge", "Süpürge", "Blender", "Tost Makinesi", "Çay Makinesi", "Saç Kurutma", "Epilatör"],
    brands: ["Philips", "Dyson", "Bosch", "Tefal", "Arçelik", "Braun", "iRobot"],
  },
  {
    title: "Kozmetik & Bakım",
    slug: "kozmetik-bakim",
    icon: "💄",
    subs: ["Parfüm", "Cilt Bakım", "Güneş Kremi", "Makyaj", "Saç Bakım", "Erkek Bakım", "Traş Makinesi", "Diş Bakım"],
    brands: ["L'Oréal", "Nivea", "Gillette", "Philips", "Braun", "MAC", "Maybelline"],
  },
  {
    title: "Spor & Outdoor",
    slug: "spor-outdoor",
    icon: "🏃",
    subs: ["Koşu & Yürüyüş", "Fitness & Gym", "Bisiklet", "Yüzme", "Kamp & Dağcılık", "Yoga & Pilates", "Takım Sporu", "Sporcu Gıdası"],
    brands: ["Nike", "Adidas", "Under Armour", "Garmin", "Salomon", "Decathlon"],
  },
  {
    title: "Ev & Yaşam",
    slug: "ev-yasam",
    icon: "🏠",
    subs: ["Mobilya", "Aydınlatma", "Dekorasyon", "Mutfak Gereçleri", "Banyo", "Uyku Ürünleri", "Bahçe", "Temizlik"],
    brands: ["IKEA", "Karaca", "English Home", "Madame Coco", "Philips", "Tefal"],
  },
  {
    title: "Bebek & Çocuk",
    slug: "bebek-cocuk",
    icon: "🧸",
    subs: ["Bebek Arabası", "Oto Koltuğu", "Mama Sandalyesi", "Oyuncak", "Bebek Bakım", "Bebek Giysisi", "Emzirme"],
    brands: ["Chicco", "Joie", "Maxi-Cosi", "LEGO", "Fisher-Price", "Graco"],
  },
  {
    title: "Otomotiv",
    slug: "otomotiv",
    icon: "🚗",
    subs: ["Araç Kamerası", "GPS & Navigasyon", "Araba Bakım", "Araç Ses Sistemi", "Lastik & Jant", "Araç Aksesuarı"],
    brands: ["Pioneer", "Garmin", "Bosch", "Meguiar's", "3M", "BlackVue"],
  },
  {
    title: "Evcil Hayvan",
    slug: "evcil-hayvan",
    icon: "🐾",
    subs: ["Kedi", "Köpek", "Kuş", "Balık & Akvaryum", "Mama", "Oyuncak", "Taşıma Çantası", "Veteriner"],
    brands: ["Royal Canin", "Purina", "Hill's", "Pedigree", "Whiskas"],
  },
];

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);
  const catTimer = useRef<NodeJS.Timeout | null>(null);
  const allCatTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push("/ara?q=" + encodeURIComponent(query));
  };

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] || "";

  const openProfile = () => { if (profileTimer.current) clearTimeout(profileTimer.current); setProfileOpen(true); };
  const closeProfile = () => { profileTimer.current = setTimeout(() => setProfileOpen(false), 150); };

  const openCat = (slug: string) => {
    if (catTimer.current) clearTimeout(catTimer.current);
    setActiveCategory(slug);
  };
  const closeCat = () => {
    catTimer.current = setTimeout(() => setActiveCategory(null), 150);
  };

  const openAllCats = () => { if (allCatTimer.current) clearTimeout(allCatTimer.current); setAllCatsOpen(true); };
  const closeAllCats = () => { allCatTimer.current = setTimeout(() => setAllCatsOpen(false), 150); };

  const activeCat = NAV_CATEGORIES.find(c => c.slug === activeCategory);

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

      {/* Üst Bar — Logo + Arama + Hesap */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center gap-5 h-16">

          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-extrabold cursor-pointer whitespace-nowrap tracking-tight">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-gray-900">tavsiye</span>
              <span className="text-[#E8460A]">.net</span>
            </div>
          </Link>

          {/* Arama */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 gap-3 h-11 focus-within:ring-2 focus-within:ring-[#E8460A]/20 focus-within:bg-white transition-all border border-transparent focus-within:border-[#E8460A]/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#E8460A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün, kategori veya marka ara..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400" />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </form>

          {/* Sağ ikonlar */}
          <div className="flex items-center gap-4">

            {/* Hesabım */}
            <div className="relative" onMouseEnter={openProfile} onMouseLeave={closeProfile}>
              <Link href={user ? "/profil" : "/giris"}>
                <div className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-[10px] font-medium">{user ? displayName.split(" ")[0].slice(0,10) : "Hesabım"}</span>
                </div>
              </Link>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  onMouseEnter={openProfile} onMouseLeave={closeProfile}>
                  {user ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="font-semibold text-sm text-gray-800 truncate">{displayName}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map((item) => (
                        <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors border-b border-gray-50 last:border-0">
                          <span>{item.icon}</span><span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button onClick={() => { supabase.auth.signOut(); setUser(null); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                        <span>🚪</span><span>Çıkış Yap</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-3 flex flex-col gap-2">
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl text-center hover:bg-[#C93A08] transition-colors">Giriş Yap</div>
                      </Link>
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="w-full py-2.5 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-xl text-center hover:border-[#E8460A] hover:text-[#E8460A] transition-colors">Kayıt Ol</div>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Favorilerim */}
            <Link href={user ? "/profil" : "/giris"} className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-[10px] font-medium">Favoriler</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Kategori Navigasyonu */}
      <div className="bg-white border-b border-gray-100 relative">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center h-10 gap-1">

          {/* Tüm Kategoriler butonu */}
          <div className="relative flex-shrink-0" onMouseEnter={openAllCats} onMouseLeave={closeAllCats}>
            <button className="flex items-center gap-2 h-10 pr-4 mr-2 text-sm font-bold text-gray-800 hover:text-[#E8460A] transition-colors border-r border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Kategoriler
            </button>

            {/* Tüm Kategoriler mega menu */}
            {allCatsOpen && (
              <div
                className="absolute left-0 top-10 bg-white z-50 rounded-b-2xl"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)", width: "780px" }}
                onMouseEnter={openAllCats} onMouseLeave={closeAllCats}
              >
                <div className="grid grid-cols-3 gap-0 p-6">
                  {NAV_CATEGORIES.map((cat) => (
                    <div key={cat.slug} className="mb-5">
                      <Link href={"/kategori/" + cat.slug} onClick={() => setAllCatsOpen(false)}>
                        <div className="flex items-center gap-2 font-bold text-sm text-gray-800 hover:text-[#E8460A] mb-1.5 transition-colors">
                          <span className="text-base">{cat.icon}</span>{cat.title}
                        </div>
                      </Link>
                      <div className="space-y-0.5 pl-6">
                        {cat.brands.slice(0, 4).map((brand) => (
                          <Link key={brand} href={"/ara?q=" + encodeURIComponent(brand) + "&kategori=" + cat.slug} onClick={() => setAllCatsOpen(false)}>
                            <div className="text-xs text-gray-500 py-0.5 hover:text-[#E8460A] transition-colors">{brand}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Kategori pilleri — Trendyol tarzı, hover'da dropdown */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide flex-1">
            {NAV_CATEGORIES.map((cat) => (
              <div
                key={cat.slug}
                className="relative flex-shrink-0"
                onMouseEnter={() => openCat(cat.slug)}
                onMouseLeave={closeCat}
              >
                <Link href={"/kategori/" + cat.slug}>
                  <div className={`px-3 h-10 flex items-center gap-1 text-xs font-medium whitespace-nowrap cursor-pointer border-b-2 transition-all ${
                    activeCategory === cat.slug
                      ? "text-[#E8460A] border-[#E8460A]"
                      : "text-gray-600 hover:text-[#E8460A] border-transparent hover:border-[#E8460A]"
                  }`}>
                    <span className="text-sm">{cat.icon}</span>
                    <span>{cat.title}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </Link>

                {/* Hover dropdown — alt kategoriler + markalar */}
                {activeCategory === cat.slug && activeCat && (
                  <div
                    className="absolute left-0 top-10 bg-white z-50 rounded-b-2xl"
                    style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)", minWidth: "520px" }}
                    onMouseEnter={() => openCat(cat.slug)}
                    onMouseLeave={closeCat}
                  >
                    <div className="flex">
                      {/* Sol: Alt kategoriler */}
                      <div className="w-56 border-r border-gray-100 py-3">
                        <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Alt Kategoriler</div>
                        {activeCat.subs.map((sub) => (
                          <Link key={sub} href={"/ara?q=" + encodeURIComponent(sub)} onClick={() => setActiveCategory(null)}>
                            <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#E8460A] transition-colors cursor-pointer group">
                              <span>{sub}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-300 group-hover:text-[#E8460A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Sağ: Markalar */}
                      <div className="flex-1 py-3">
                        <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Markalar</div>
                        <div className="grid grid-cols-2 px-3">
                          {activeCat.brands.map((brand) => (
                            <Link key={brand} href={"/ara?q=" + encodeURIComponent(brand) + "&kategori=" + cat.slug} onClick={() => setActiveCategory(null)}>
                              <div className="flex items-center gap-2 px-2 py-2 rounded-xl text-sm text-gray-700 hover:bg-orange-50 hover:text-[#E8460A] transition-colors cursor-pointer">
                                <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                  {brand[0]}
                                </div>
                                <span className="text-xs font-medium">{brand}</span>
                              </div>
                            </Link>
                          ))}
                        </div>

                        {/* Tüm ürünlere git */}
                        <div className="mt-2 mx-3 pt-3 border-t border-gray-100">
                          <Link href={"/kategori/" + cat.slug} onClick={() => setActiveCategory(null)}>
                            <div className="text-xs text-[#E8460A] font-semibold hover:underline">
                              Tüm {cat.title} ürünleri →
                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

    </header>
  );
}
