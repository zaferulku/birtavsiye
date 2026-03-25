"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function GirisSayfasi() {
  const router = useRouter();
  const [tab, setTab] = useState<"giris" | "kayit" | "sifre">("giris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<"kadin" | "erkek" | "">("");
  const [ageRange, setAgeRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleGiris = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError("Email veya şifre hatalı."); }
    else { router.push("/"); }
    setLoading(false);
  };

  const handleKayit = async () => {
    if (!gender) { setError("Lütfen cinsiyetinizi seçin."); return; }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    });
    if (error) { setError("Kayıt başarısız: " + error.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        username: email.split("@")[0],
        gender,
        age_range: ageRange,
      });
    }
    setSuccess("Doğrulama emaili gönderildi! Emailini kontrol et.");
    setLoading(false);
  };

  const handleSifreSifirla = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://birtavsiye.net/sifre-yenile",
    });
    if (error) { setError("Bir hata oluştu: " + error.message); }
    else { setSuccess("Şifre sıfırlama linki emailine gönderildi!"); }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#F8F6F2] flex items-center justify-center px-4">
      <div className="bg-white border border-[#E8E4DF] rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/">
            <div className="font-extrabold text-2xl cursor-pointer mb-2">
              <span className="text-[#E8460A]">bir</span>
              <span className="text-[#0F0E0D]">tavsiye</span>
              <span className="text-[#6B6760]">.net</span>
            </div>
          </Link>
        </div>

        {tab !== "sifre" && (
          <div className="flex border-b border-[#E8E4DF] mb-6">
            {(["giris", "kayit"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-all ${
                  tab === t ? "border-[#E8460A] text-[#E8460A]" : "border-transparent text-[#6B6760]"
                }`}>
                {t === "giris" ? "Giriş Yap" : "Kayıt Ol"}
              </button>
            ))}
          </div>
        )}

        {tab === "sifre" && (
          <div className="mb-6">
            <button onClick={() => { setTab("giris"); setError(""); setSuccess(""); }}
              className="text-sm text-[#6B6760] hover:text-[#E8460A] flex items-center gap-1">
              ← Geri dön
            </button>
            <h2 className="font-bold text-lg mt-3">Şifremi Unuttum</h2>
            <p className="text-sm text-[#6B6760] mt-1">Emailine şifre sıfırlama linki göndereceğiz.</p>
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4">{success}</div>}

        <div className="flex flex-col gap-3">
          {tab === "kayit" && (
            <input type="text" placeholder="Adın Soyadın" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border border-[#E8E4DF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A]" />
          )}

          <input type="email" placeholder="Email adresin" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-[#E8E4DF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A]" />

          {tab !== "sifre" && (
            <input type="password" placeholder="Şifren" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border border-[#E8E4DF] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A]" />
          )}

          {tab === "kayit" && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Cinsiyetin</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "kadin", label: "Kadın", emoji: "👩" },
                    { value: "erkek", label: "Erkek", emoji: "👨" },
                  ].map((g) => (
                    <button key={g.value} type="button"
                      onClick={() => setGender(g.value as "kadin" | "erkek")}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        gender === g.value
                          ? "border-[#E8460A] bg-orange-50 text-[#E8460A]"
                          : "border-[#E8E4DF] text-gray-600 hover:border-[#E8460A]"
                      }`}>
                      <span className="text-xl">{g.emoji}</span> {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Yaş Aralığın</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"].map((age) => (
                    <button key={age} type="button"
                      onClick={() => setAgeRange(age)}
                      className={`py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                        ageRange === age
                          ? "border-[#E8460A] bg-orange-50 text-[#E8460A]"
                          : "border-[#E8E4DF] text-gray-600 hover:border-[#E8460A]"
                      }`}>
                      {age}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "giris" && (
            <div className="text-right">
              <button onClick={() => { setTab("sifre"); setError(""); setSuccess(""); }}
                className="text-xs text-[#E8460A] hover:underline">
                Şifremi unuttum
              </button>
            </div>
          )}

          <button
            onClick={tab === "giris" ? handleGiris : tab === "kayit" ? handleKayit : handleSifreSifirla}
            disabled={loading}
            className="bg-[#E8460A] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#C93A08] transition-all disabled:opacity-50">
            {loading ? "Yükleniyor..." : tab === "giris" ? "Giriş Yap" : tab === "kayit" ? "Kayıt Ol" : "Link Gönder"}
          </button>
        </div>

        {tab !== "sifre" && (
          <>
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[#E8E4DF]" />
              <span className="text-xs text-[#A8A49F]">veya</span>
              <div className="flex-1 h-px bg-[#E8E4DF]" />
            </div>
            <button
              onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "https://birtavsiye.net" } })}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-[#E8E4DF] rounded-xl py-3 px-4 text-sm font-medium hover:border-[#E8460A] transition-all">
              <span className="text-lg">G</span>
              Google ile Giriş Yap
            </button>
          </>
        )}
      </div>
    </main>
  );
}