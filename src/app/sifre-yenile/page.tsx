"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SifreYenile() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSifreGuncelle = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError("Hata: " + error.message);
    } else {
      setSuccess("Şifren güncellendi! Yönlendiriliyorsun...");
      setTimeout(() => router.push("/"), 2000);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">
      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/">
            <div className="font-syne font-extrabold text-2xl cursor-pointer mb-2">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-[#0F0E0D]">tavsiye</span>
              <span className="text-[#6B6760]">.net</span>
            </div>
          </Link>
          <h1 className="font-syne font-bold text-lg mt-2">Yeni Şifre Belirle</h1>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Yeni şifren"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-[#E8E4DF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A]"
          />
          <button
            onClick={handleSifreGuncelle}
            disabled={loading}
            className="bg-[#E8460A] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#C93A08] transition-all disabled:opacity-50"
          >
            {loading ? "Güncelleniyor..." : "Şifremi Güncelle"}
          </button>
        </div>
      </div>
    </main>
  );
}