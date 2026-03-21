"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

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
        <div className="flex-1 flex items-center bg-[#F8F6F2] border border-[#E8E4DF] rounded-xl px-4 gap-2 h-10">
          <span className="text-[#A8A49F]">🔍</span>
          <input
            type="text"
            placeholder="Ürün, kategori veya marka ara..."
            className="flex-1 bg-transparent text-sm outline-none text-[#0F0E0D] placeholder:text-[#A8A49F]"
          />
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <a href="/profil">
                <div className="w-8 h-8 rounded-full bg-[#FFF0EB] flex items-center justify-center text-xs font-bold text-[#E8460A] cursor-pointer hover:ring-2 hover:ring-[#E8460A] transition-all">
                  {session.user?.name?.[0]?.toUpperCase()}
                  </div>
                  </a>
                              <span className="text-sm font-medium text-[#0F0E0D] hidden md:block">
                  {session.user?.name?.split(" ")[0]}
                </span>
              </div>
              <button
                onClick={() => signOut()}
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