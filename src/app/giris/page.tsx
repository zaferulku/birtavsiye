"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function GirisSayfasi() {
  return (
    <main className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">
      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <div className="font-syne font-extrabold text-2xl cursor-pointer mb-2">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-[#0F0E0D]">tavsiye</span>
              <span className="text-[#6B6760]">.net</span>
            </div>
          </Link>
          <h1 className="font-syne font-bold text-xl mb-2">Hoş geldin!</h1>
          <p className="text-sm text-[#6B6760]">
            Giriş yap, topluluğa katıl ve deneyimlerini paylaş.
          </p>
        </div>
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#E8E4DF] rounded-xl py-3 px-4 text-sm font-medium hover:border-[#E8460A] transition-all cursor-pointer"
        >
          <span className="text-lg">G</span>
          Google ile Giriş Yap
        </button>
        <div className="mt-6 text-center text-xs text-[#A8A49F]">
          Giriş yaparak{" "}
          <span className="text-[#E8460A] cursor-pointer">Kullanım Şartları</span>
          {" "}ve{" "}
          <span className="text-[#E8460A] cursor-pointer">Gizlilik Politikası</span>
          &apos;nı kabul etmiş olursunuz.
        </div>
      </div>
    </main>
  );
}