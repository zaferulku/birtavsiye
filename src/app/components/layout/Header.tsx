"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

// ──────────────────────────────────────────────────────────
// NAV_GROUPS: Navbar'da görünen ANA başlıklar
// Her grup altında: DB kategorileri (slug + görünen ad) + markalar
// ──────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    title: "Elektronik",
    icon: "📱",
    categories: [
      {
        label: "Akıllı Telefon", slug: "akilli-telefon", icon: "📱",
        brands: ["Apple", "Samsung", "Xiaomi", "Huawei", "Sony"],
      },
      {
        label: "Bilgisayar & Tablet", slug: "bilgisayar-tablet", icon: "💻",
        brands: ["Apple", "Lenovo", "HP", "Dell", "Asus", "Samsung"],
      },
      {
        label: "TV", slug: "tv", icon: "📺",
        brands: ["Samsung", "LG", "Sony", "Philips", "Hisense"],
      },
      {
        label: "Ses & Kulaklık", slug: "ses-kulaklik", icon: "🎧",
        brands: ["Sony", "JBL", "Bose", "Apple", "Samsung", "Jabra"],
      },
      {
        label: "Akıllı Saat", slug: "akilli-saat", icon: "⌚",
        brands: ["Samsung", "Apple", "Garmin", "Huawei", "Xiaomi"],
      },
      {
        label: "Fotoğraf & Kamera", slug: "fotograf-kamera", icon: "📷",
        brands: ["Sony", "Canon", "Nikon", "Fujifilm", "DJI"],
      },
      {
        label: "Oyun & Konsol", slug: "oyun-konsol", icon: "🎮",
        brands: ["Sony", "Microsoft", "Nintendo", "Logitech", "Razer"],
      },
    ],
  },
  {
    title: "Ev & Yaşam",
    icon: "🏠",
    categories: [
      {
        label: "Beyaz Eşya", slug: "beyaz-esya", icon: "🫙",
        brands: ["Arçelik", "Bosch", "LG", "Samsung", "Beko", "Vestel"],
      },
      {
        label: "Küçük Ev Aletleri", slug: "kucuk-ev-aletleri", icon: "🔌",
        brands: ["Philips", "Dyson", "Bosch", "Tefal", "Braun"],
      },
      {
        label: "Ev & Dekorasyon", slug: "ev-yasam", icon: "🏠",
        brands: ["IKEA", "Karaca", "English Home", "Madame Coco"],
      },
    ],
  },
  {
    title: "Kozmetik & Bakım",
    icon: "💄",
    categories: [
      {
        label: "Kozmetik & Kişisel Bakım", slug: "kozmetik-bakim", icon: "💄",
        brands: ["L'Oréal", "Nivea", "Gillette", "Philips", "Braun", "Maybelline"],
      },
    ],
  },
  {
    title: "Spor & Outdoor",
    icon: "🏃",
    categories: [
      {
        label: "Spor & Outdoor", slug: "spor-outdoor", icon: "🏃",
        brands: ["Nike", "Adidas", "Under Armour", "Garmin", "Decathlon"],
      },
    ],
  },
  {
    title: "Bebek & Çocuk",
    icon: "🧸",
    categories: [
      {
        label: "Bebek & Çocuk", slug: "bebek-cocuk", icon: "🧸",
        brands: ["Chicco", "Joie", "Maxi-Cosi", "LEGO", "Fisher-Price"],
      },
    ],
  },
  {
    title: "Kitap & Hobi",
    icon: "📚",
    categories: [
      {
        label: "Kitap & Hobi", slug: "kitap-hobi", icon: "📚",
        brands: ["İş Bankası Yayınları", "Yapı Kredi", "Doğan Kitap"],
      },
    ],
  },
  {
    title: "Otomotiv",
    icon: "🚗",
    categories: [
      {
        label: "Otomotiv", slug: "otomotiv", icon: "🚗",
        brands: ["Bosch", "Pioneer", "Garmin", "3M", "Meguiar's"],
      },
    ],
  },
  {
    title: "Evcil Hayvan",
    icon: "🐾",
    categories: [
      {
        label: "Evcil Hayvan", slug: "evcil-hayvan", icon: "🐾",
        brands: ["Royal Canin", "Purina", "Hill's", "Pedigree", "Whiskas"],
      },
    ],
  },
];

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);
  const groupTimer = useRef<NodeJS.Timeout | null>(null);

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

  const openGroup = (title: string) => { if (groupTimer.current) clearTimeout(groupTimer.current); setActiveGroup(title); };
  const closeGroup = () => { groupTimer.current = setTimeout(() => setActiveGroup(null), 150); };

  const active = NAV_GROUPS.find(g => g.title === activeGroup);

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

      {/* ── ÜST BAR: Logo + Arama + Hesap ── */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center gap-5 h-16">

          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-extrabold tracking-tight whitespace-nowrap">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-gray-900">tavsiye</span>
              <span className="text-[#E8460A]">.net</span>
            </div>
          </Link>

          {/* Arama */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-xl px-4 gap-3 h-11 focus-within:bg-white transition-all border border-transparent focus-within:border-[#E8460A]/40 focus-within:ring-2 focus-within:ring-[#E8460A]/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#E8460A] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ürün, kategori veya marka ara..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400" />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            )}
          </form>

          {/* Hesap + Favoriler */}
          <div className="flex items-center gap-5">

            <div className="relative" onMouseEnter={openProfile} onMouseLeave={closeProfile}>
              <Link href={user ? "/profil" : "/giris"}>
                <div className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  <span className="text-[10px] font-medium">{user ? displayName.split(" ")[0].slice(0, 10) : "Hesabım"}</span>
                </div>
              </Link>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  onMouseEnter={openProfile} onMouseLeave={closeProfile}>
                  {user ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="font-semibold text-sm truncate">{displayName}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map(item => (
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
                        <div className="w-full py-2.5 border-2 border-gray-200 text-sm font-medium rounded-xl text-center hover:border-[#E8460A] hover:text-[#E8460A] transition-colors">Kayıt Ol</div>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link href={user ? "/profil" : "/giris"} className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-[10px] font-medium">Favoriler</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KATEGORİ NAV BARI ── */}
      <div className="bg-white border-b border-gray-100 relative">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center h-11">
          {NAV_GROUPS.map(group => (
            <div
              key={group.title}
              className="relative flex-shrink-0"
              onMouseEnter={() => openGroup(group.title)}
              onMouseLeave={closeGroup}
            >
              {/* Ana grup butonu */}
              <button className={`flex items-center gap-1.5 px-4 h-11 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeGroup === group.title
                  ? "text-[#E8460A] border-[#E8460A]"
                  : "text-gray-700 border-transparent hover:text-[#E8460A] hover:border-[#E8460A]"
              }`}>
                <span className="text-base">{group.icon}</span>
                <span>{group.title}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-400 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* ── DROPDOWN ── */}
              {activeGroup === group.title && active && (
                <div
                  className="absolute left-0 top-11 bg-white z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.13)", borderRadius: "0 0 16px 16px", minWidth: active.categories.length === 1 ? "360px" : "680px" }}
                  onMouseEnter={() => openGroup(group.title)}
                  onMouseLeave={closeGroup}
                >
                  {active.categories.length === 1 ? (
                    /* Tek kategorili grup (Spor, Kozmetik vb.) — tek sütun */
                    <div className="p-5">
                      <Link href={"/kategori/" + active.categories[0].slug} onClick={() => setActiveGroup(null)}>
                        <div className="flex items-center gap-2 font-bold text-sm text-gray-800 hover:text-[#E8460A] mb-3 transition-colors">
                          <span>{active.categories[0].icon}</span>
                          <span>Tüm {active.categories[0].label}</span>
                        </div>
                      </Link>
                      <div className="grid grid-cols-2 gap-1">
                        {active.categories[0].brands.map(brand => (
                          <Link key={brand} href={"/ara?q=" + encodeURIComponent(brand)} onClick={() => setActiveGroup(null)}>
                            <div className="flex items-center px-2 py-1.5 rounded-xl text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors">
                              <span className="text-xs">{brand}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Çok kategorili grup (Elektronik, Ev & Yaşam vb.) — iki bölüm */
                    <div className="flex">
                      {/* Sol: Alt kategori listesi */}
                      <div className="w-52 border-r border-gray-100 py-3 flex-shrink-0">
                        <div className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kategoriler</div>
                        {active.categories.map(cat => (
                          <Link key={cat.slug} href={"/kategori/" + cat.slug} onClick={() => setActiveGroup(null)}>
                            <div className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-[#E8460A] transition-colors group cursor-pointer">
                              <span className="text-base">{cat.icon}</span>
                              <span className="flex-1 font-medium">{cat.label}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-300 group-hover:text-[#E8460A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </div>
                          </Link>
                        ))}
                      </div>

                      {/* Sağ: Popüler markalar (tüm grubun markaları) */}
                      <div className="flex-1 py-3 px-4">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Popüler Markalar</div>
                        <div className="grid grid-cols-3 gap-1">
                          {Array.from(new Set(active.categories.flatMap(c => c.brands))).slice(0, 12).map(brand => (
                            <Link key={brand} href={"/ara?q=" + encodeURIComponent(brand)} onClick={() => setActiveGroup(null)}>
                              <div className="flex items-center px-2 py-2 rounded-xl text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors cursor-pointer">
                                <span className="text-xs font-medium truncate">{brand}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </header>
  );
}
