"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<any>(null);

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
    <header className="bg-white border-b border-[#E8E4DF] px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center gap-4 h-14">
        <Link href="/">
          <div className="font-syne font-extrabold text-xl cursor-pointer">
            <span className="text-[#E8460A]">bir</span>
            <span className="text-[#0F0E0D]">tavsiye</span>
            <span className="text-[#6B6760]">.net</span>
          </div>
        </Link>

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

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profil">
                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-[#FFF0EB] flex items-center justify-center text-xs font-bold text-[#E8460A] hover:ring-2 hover:ring-[#E8460A] transition-all">
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[#0F0E0D] hidden md:block">
                    {displayName.split(" ")[0]}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => { supabase.auth.signOut(); setUser(null); }}
                className="text-xs text-[#6B6760] border border-[#E8E4DF] rounded-lg px-3 py-2 hover:border-[#E8460A] hover:text-[#E8460A] transition-all"
              >
                Çıkış
              </button>
            </div>
          ) : (
            <Link href="/giris">
              <button className="text-sm font-medium text-[#E8460A] border border-[#E8460A] rounded-lg px-4 py-2 hover:bg-[#FFF0EB] transition-all">
                Giriş Yap
              </button>
            </Link>
          )}
          <Link href="/kategori/elektronik">
            <button className="bg-[#E8460A] text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
              Fiyat Karşılaştır
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}