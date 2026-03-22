"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

const categories = [
  { title: "Elektronik", slug: "elektronik", items: ["Akilli Telefon", "Laptop", "Tablet", "TV", "Kulaklik", "Kamera"] },
  { title: "Kozmetik", slug: "kozmetik", items: ["Parfum", "Cilt Bakim", "Sac Bakim", "Makyaj"] },
  { title: "Ev & Yasam", slug: "ev-aletleri", items: ["Mutfak", "Mobilya", "Aydinlatma", "Dekorasyon"] },
  { title: "Spor", slug: "spor", items: ["Fitness", "Outdoor", "Spor Giyim", "Bisiklet"] },
  { title: "Bebek", slug: "bebek", items: ["Bebek Bakim", "Oyuncaklar", "Bebek Giyim"] },
  { title: "Kitap", slug: "kitap", items: ["Roman", "Kisisel Gelisim", "Cocuk Kitaplari"] },
];

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [allCatsOpen, setAllCatsOpen] = useState(false);
  const profileTimer = useRef<NodeJS.Timeout | null>(null);
  const catsTimer = useRef<NodeJS.Timeout | null>(null);

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

  const openProfile = () => {
    if (profileTimer.current) clearTimeout(profileTimer.current);
    setProfileOpen(true);
  };
  const closeProfile = () => {
    profileTimer.current = setTimeout(() => setProfileOpen(false), 200);
  };

  const openCats = () => {
    if (catsTimer.current) clearTimeout(catsTimer.current);
    setAllCatsOpen(true);
  };
  const closeCats = () => {
    catsTimer.current = setTimeout(() => setAllCatsOpen(false), 200);
  };

  return (
    <header className="bg-white sticky top-0 z-50" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>

      {/* Satir 1: Logo + Arama + Ikonlar */}
      <div className="border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center gap-5 h-16">

          <Link href="/">
            <div className="text-2xl font-extrabold cursor-pointer whitespace-nowrap tracking-tight">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-gray-900">tavsiye</span>
              <span className="text-[#E8460A]">.net</span>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-lg px-4 gap-3 h-11 focus-within:ring-2 focus-within:ring-[#E8460A]/20 focus-within:bg-white transition-all border border-transparent focus-within:border-[#E8460A]/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#E8460A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Urun, kategori veya marka ara..."
              className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </form>

          <div className="flex items-center gap-6">

            {/* Hesabim */}
            <div className="relative" onMouseEnter={openProfile} onMouseLeave={closeProfile}>
              <button className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors min-w-[52px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="text-xs font-medium">{user ? displayName.split(" ")[0] : "Hesabim"}</span>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-12 w-60 bg-white rounded-2xl overflow-hidden z-50"
                  style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
                  onMouseEnter={openProfile}
                  onMouseLeave={closeProfile}
                >
                  {user ? (
                    <>
                      <div className="px-5 py-4 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8460A] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {displayName[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-gray-800 truncate">{displayName}</div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "💬", label: "Yorumlarim" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map((item) => (
                        <Link key={item.label} href={item.href} onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-5 py-3 text-sm text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors border-b border-gray-50 last:border-0">
                          <span>{item.icon}</span>
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      ))}
                      <button onClick={() => { supabase.auth.signOut(); setUser(null); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium">
                        <span>🚪</span><span>Cikis Yap</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-5 py-4 bg-gradient-to-br from-orange-50 to-red-50 border-b border-gray-100">
                        <div className="font-bold text-sm text-gray-800">Hos Geldiniz!</div>
                        <div className="text-xs text-gray-500 mt-0.5">Giris yapin veya kayit olun</div>
                      </div>
                      <div className="p-3 flex flex-col gap-2">
                        <Link href="/giris" onClick={() => setProfileOpen(false)}>
                          <div className="w-full py-2.5 bg-[#E8460A] text-white text-sm font-bold rounded-xl text-center hover:bg-[#C93A08] transition-colors">
                            Giris Yap
                          </div>
                        </Link>
                        <Link href="/giris" onClick={() => setProfileOpen(false)}>
                          <div className="w-full py-2.5 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-xl text-center hover:border-[#E8460A] hover:text-[#E8460A] transition-colors">
                            Kayit Ol
                          </div>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Favorilerim */}
            <Link href={user ? "/profil" : "/giris"} className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors min-w-[52px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-xs font-medium">Favorilerim</span>
            </Link>

            {/* Sepetim */}
            <Link href="#" className="flex flex-col items-center gap-0.5 text-gray-600 hover:text-[#E8460A] transition-colors min-w-[52px]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.874-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="text-xs font-medium">Sepetim</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Satir 2: Kategoriler nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center h-10">

          <div className="relative mr-4" onMouseEnter={openCats} onMouseLeave={closeCats}>
            <button className="flex items-center gap-2 h-10 pr-4 text-sm font-bold text-gray-800 hover:text-[#E8460A] transition-colors border-r border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Kategoriler
            </button>

            {allCatsOpen && (
              <div
                className="absolute left-0 top-10 bg-white z-50 p-5 w-[640px] rounded-b-2xl"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.12)" }}
                onMouseEnter={openCats}
                onMouseLeave={closeCats}
              >
                <div className="grid grid-cols-3 gap-6">
                  {categories.map((cat) => (
                    <div key={cat.title}>
                      <Link href={"/kategori/" + cat.slug} onClick={() => setAllCatsOpen(false)}>
                        <div className="font-bold text-sm text-[#E8460A] mb-2 hover:underline cursor-pointer">{cat.title}</div>
                      </Link>
                      {cat.items.map((item) => (
                        <Link key={item} href={"/ara?q=" + encodeURIComponent(item)} onClick={() => setAllCatsOpen(false)}>
                          <div className="text-xs text-gray-500 py-1 hover:text-[#E8460A] transition-colors cursor-pointer">{item}</div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <div key={cat.title} className="relative group">
                <Link href={"/kategori/" + cat.slug}>
                  <div className="px-3 h-10 flex items-center text-xs font-medium text-gray-600 hover:text-[#E8460A] whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-[#E8460A] transition-all">
                    {cat.title}
                  </div>
                </Link>
                <div className="absolute left-0 top-10 bg-white rounded-b-xl hidden group-hover:block z-50 min-w-[160px] py-2" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}>
                  {cat.items.map((item) => (
                    <Link key={item} href={"/ara?q=" + encodeURIComponent(item)}>
                      <div className="px-4 py-2 text-xs text-gray-600 hover:bg-orange-50 hover:text-[#E8460A] transition-colors cursor-pointer">{item}</div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </header>
  );
}