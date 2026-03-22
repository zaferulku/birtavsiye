"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";

const categoryGroups = [
  {
    title: "Elektronik",
    items: ["Telefon", "Laptop", "Tablet", "TV", "Kulaklık", "Kamera"],
    slug: "elektronik",
  },
  {
    title: "Kozmetik",
    items: ["Parfüm", "Cilt Bakım", "Saç Bakım", "Makyaj", "Güneş Kremi"],
    slug: "kozmetik",
  },
  {
    title: "Ev & Yaşam",
    items: ["Mutfak", "Mobilya", "Aydınlatma", "Dekorasyon", "Bahçe"],
    slug: "ev-aletleri",
  },
  {
    title: "Spor",
    items: ["Fitness", "Outdoor", "Spor Giyim", "Bisiklet", "Yüzme"],
    slug: "spor",
  },
];

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

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
    user?.email?.split("@")[0] ||
    "";

  return (
    <header className="bg-white border-b border-[#E8E4DF] sticky top-0 z-50">
      <div className="px-6">
        <div className="max-w-6xl mx-auto flex items-center gap-4 h-16">

          {/* Logo */}
          <Link href="/">
            <div className="font-syne font-extrabold text-xl cursor-pointer whitespace-nowrap">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-[#0F0E0D]">tavsiye</span>
              <span className="text-[#6B6760]">.net</span>
            </div>
          </Link>

          {/* Kategoriler */}
          <div
            className="relative"
            ref={categoryRef}
            onMouseEnter={() => setCategoryOpen(true)}
            onMouseLeave={() => setCategoryOpen(false)}
          >
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#0F0E0D] hover:text-[#E8460A] transition-colors whitespace-nowrap">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Kategoriler
            </button>

            {categoryOpen && (
              <div className="absolute left-0 top-8 bg-white border border-[#E8E4DF] rounded-2xl shadow-xl z-50 p-4 w-[600px]">
                <div className="grid grid-cols-4 gap-4">
                  {categoryGroups.map((group) => (
                    <div key={group.title}>
                      <Link href={"/kategori/" + group.slug}>
                        <div className="font-syne font-bold text-sm text-[#E8460A] mb-2 hover:underline cursor-pointer">
                          {group.title}
                        </div>
                      </Link>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                          <Link
                            key={item}
                            href={"/ara?q=" + encodeURIComponent(item)}
                            className="text-xs text-[#6B6760] hover:text-[#E8460A] transition-colors"
                            onClick={() => setCategoryOpen(false)}
                          >
                            {item}
                          </Link>
                        ))}
                        <Link
                          href={"/kategori/" + group.slug}
                          className="text-xs text-[#E8460A] font-medium mt-1 hover:underline"
                          onClick={() => setCategoryOpen(false)}
                        >
                          Daha Fazla →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Arama */}
          <form onSubmit={handleSearch} className="flex-1 flex items-center bg-[#F8F6F2] border border-[#E8E4DF] rounded-xl px-4 gap-2 h-10">
            <span className="text-[#A8A49F]">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün, kategori veya marka ara..."
              className="flex-1 bg-transparent text-sm outline-none text-[#0F0E0D] placeholder:text-[#A8A49F]"
            />
          </form>

          {/* Sağ Menü */}
          <div className="flex items-center gap-4">

            {/* Hesabım */}
            <div
              className="relative"
              ref={profileRef}
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-2 text-[#6B6760] hover:text-[#E8460A] transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span className="text-xs font-medium whitespace-nowrap">
                  {user ? displayName.split(" ")[0] : "Hesabım"}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-8 w-56 bg-white border border-[#E8E4DF] rounded-2xl shadow-lg overflow-hidden z-50">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-[#E8E4DF] bg-[#F8F6F2]">
                        <div className="font-medium text-sm">{displayName}</div>
                        <div className="text-xs text-[#A8A49F]">{user.email}</div>
                      </div>
                      {[
                        { href: "/profil", icon: "👤", label: "Profilim" },
                        { href: "/profil", icon: "💬", label: "Yorumlarım" },
                        { href: "/profil", icon: "♡", label: "Favorilerim" },
                        { href: "/admin", icon: "⚙️", label: "Admin Paneli" },
                      ].map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-[#6B6760] hover:bg-[#FFF0EB] hover:text-[#E8460A] transition-colors border-b border-[#E8E4DF] last:border-0"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
                      <button
                        onClick={() => { supabase.auth.signOut(); setUser(null); setProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <span>🚪</span>
                        <span>Çıkış Yap</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-3 border-b border-[#E8E4DF] bg-[#F8F6F2]">
                        <div className="text-sm font-medium">Hoş geldiniz!</div>
                        <div className="text-xs text-[#A8A49F]">Giriş yapın veya kayıt olun</div>
                      </div>
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="px-4 py-3 text-sm text-[#E8460A] font-medium hover:bg-[#FFF0EB] transition-colors border-b border-[#E8E4DF]">
                          Giriş Yap
                        </div>
                      </Link>
                      <Link href="/giris" onClick={() => setProfileOpen(false)}>
                        <div className="px-4 py-3 text-sm text-[#6B6760] hover:bg-[#FFF0EB] transition-colors">
                          Kayıt Ol
                        </div>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Favorilerim */}
            <Link href={user ? "/profil" : "/giris"} className="flex items-center gap-2 text-[#6B6760] hover:text-[#E8460A] transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span className="text-xs font-medium">Favorilerim</span>
            </Link>

            {/* Sepetim */}
            <Link href="#" className="flex items-center gap-2 text-[#6B6760] hover:text-[#E8460A] transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.874-7.148a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="text-xs font-medium">Sepetim</span>
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}