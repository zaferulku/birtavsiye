"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} className="w-3 h-3" viewBox="0 0 20 20" fill={s <= rating ? "#E8A000" : "#E0E0E0"}>
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const menuItems = [
  { key: "bilgiler", icon: "👤", label: "Kullanici Bilgilerim" },
  { key: "yorumlar", icon: "💬", label: "Yorumlarim" },
  { key: "degerlendirmeler", icon: "⭐", label: "Degerlendirmelerim" },
  { key: "favoriler", icon: "♡", label: "Favorilerim" },
];

const AYLAR = ["Ocak","Subat","Mart","Nisan","Mayis","Haziran","Temmuz","Agustos","Eylul","Ekim","Kasim","Aralik"];

export default function ProfilSayfasi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState("bilgiler");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showNewPass2, setShowNewPass2] = useState(false);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/giris"); return; }
      setUser(data.user);
      loadProfile(data.user.id);
      loadPosts(data.user.id);
      loadFavorites(data.user.id);
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (data) {
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setPhone(data.phone || "");
      setGender(data.gender || "");
      if (data.birth_date) {
        const parts = data.birth_date.split("-");
        setBirthYear(parts[0] || "");
        setBirthMonth(parts[1] || "");
        setBirthDay(parts[2]?.slice(0, 2) || "");
      }
    }
  };

  const loadPosts = async (userId: string) => {
    const { data } = await supabase.from("community_posts")
      .select("*, products(title, slug, image_url)")
      .eq("user_id", userId).is("parent_id", null)
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const loadFavorites = async (userId: string) => {
    const { data } = await supabase.from("favorites")
      .select("*, products(id, title, slug, brand, image_url)")
      .eq("user_id", userId).order("created_at", { ascending: false });
    if (data) setFavorites(data);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const birthDate = (birthYear && birthMonth && birthDay)
      ? `${birthYear}-${birthMonth}-${birthDay}`
      : null;
    await supabase.from("profiles").upsert({
  id: user.id, username, full_name: fullName, bio, phone, birth_date: birthDate,
  gender,
});
    setSaveMsg("Kaydedildi!");
    setTimeout(() => setSaveMsg(""), 2000);
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (!newPass || !newPass2) { setPasswordMsg("Yeni sifre alanlari bos birakilamaz."); return; }
    if (newPass !== newPass2) { setPasswordMsg("Yeni sifreler eslesmiyor."); return; }
    if (newPass.length < 6) { setPasswordMsg("Sifre en az 6 karakter olmali."); return; }
    setPassLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) setPasswordMsg("Hata: " + error.message);
    else { setPasswordMsg("Sifre basariyla guncellendi!"); setCurrentPass(""); setNewPass(""); setNewPass2(""); }
    setPassLoading(false);
    setTimeout(() => setPasswordMsg(""), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const displayName = username || fullName || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "";
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "";
  const isPureRating = (p: any) => p.body === `${p.rating} yildiz puan verildi.`;

  if (!user) return null;

  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="grid grid-cols-4 gap-6">

          {/* Sol Menü */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-[#E8460A]/10 flex items-center justify-center text-[#E8460A] font-extrabold text-xl flex-shrink-0">
                  {displayName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{displayName}</div>
                  <div className="text-xs text-gray-400 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">Uyelik: {joinDate}</div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              {menuItems.map((item) => (
                <button key={item.key} onClick={() => setActiveMenu(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm border-b border-gray-50 last:border-0 transition-all ${
                    activeMenu === item.key
                      ? "bg-orange-50 text-[#E8460A] font-semibold border-l-4 border-l-[#E8460A]"
                      : "text-gray-600 hover:bg-gray-50 hover:text-[#E8460A]"
                  }`}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.key === "yorumlar" && <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{posts.filter(p => !isPureRating(p)).length}</span>}
                  {item.key === "degerlendirmeler" && <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{posts.filter(p => p.rating > 0).length}</span>}
                  {item.key === "favoriler" && <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{favorites.length}</span>}
                </button>
              ))}
            </div>

            <button onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-red-200 text-red-500 rounded-2xl text-sm font-medium hover:bg-red-50 transition-all">
              🚪 Cikis Yap
            </button>
          </div>

          {/* Sağ İçerik */}
          <div className="col-span-3">

            {activeMenu === "bilgiler" && (
              <div className="grid grid-cols-2 gap-6">
                {/* Üyelik Bilgileri */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-base text-[#E8460A] mb-5">Uyelik Bilgilerim</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Kullanici Adi</label>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder="kullanici_adi"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Ad Soyad</label>
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        placeholder="Adiniz Soyadiniz"
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">E-Mail</label>
                      <input type="text" value={user?.email || ""} disabled
                        className="w-full border border-gray-100 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cep Telefonu</label>
                      <div className="flex gap-2">
                        <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-500 bg-gray-50 flex-shrink-0">+90</div>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                          placeholder="5XX XXX XX XX"
                          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Dogum Tarihi</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#E8460A] bg-white transition-all">
                          <option value="">Gun</option>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
                          ))}
                        </select>
                        <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#E8460A] bg-white transition-all">
                          <option value="">Ay</option>
                          {AYLAR.map((m, i) => (
                            <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                          ))}
                        </select>
                        <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)}
                          className="border border-gray-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-[#E8460A] bg-white transition-all">
                          <option value="">Yil</option>
                          {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 10 - i).map((y) => (
                            <option key={y} value={String(y)}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <div>
  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Cinsiyet</label>
  <div className="grid grid-cols-2 gap-2">
    {[
      { value: "kadin", label: "Kadın", emoji: "👩" },
      { value: "erkek", label: "Erkek", emoji: "👨" },
    ].map((g) => (
      <button key={g.value} type="button"
        onClick={() => setGender(g.value)}
        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
          gender === g.value
            ? "border-[#E8460A] bg-orange-50 text-[#E8460A]"
            : "border-gray-200 text-gray-600 hover:border-[#E8460A]"
        }`}>
        <span>{g.emoji}</span> {g.label}
      </button>
    ))}
  </div>
</div>

                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Hakkinda</label>
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                        placeholder="Kendinden bahset..." rows={3}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all resize-none" />
                    </div>
                    {saveMsg && <div className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{saveMsg}</div>}
                    <button onClick={handleSave} disabled={saving}
                      className="w-full py-3 bg-[#E8460A] text-white rounded-xl text-sm font-bold hover:bg-[#C93A08] disabled:opacity-50 transition-all">
                      {saving ? "Kaydediliyor..." : "Guncelle"}
                    </button>
                  </div>
                </div>

                {/* Şifre */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h2 className="font-bold text-base text-[#E8460A] mb-5">Sifre Guncelleme</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Su Anki Sifre</label>
                      <div className="relative">
                        <input type={showCurrentPass ? "text" : "password"} value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all pr-10" />
                        <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                          {showCurrentPass ? "🙈" : "👁"}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Yeni Sifre</label>
                      <div className="relative">
                        <input type={showNewPass ? "text" : "password"} value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all pr-10" />
                        <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                          {showNewPass ? "🙈" : "👁"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">En az 6 karakter olmali.</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 mb-1.5 block">Yeni Sifre (Tekrar)</label>
                      <div className="relative">
                        <input type={showNewPass2 ? "text" : "password"} value={newPass2}
                          onChange={(e) => setNewPass2(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8460A] transition-all pr-10" />
                        <button type="button" onClick={() => setShowNewPass2(!showNewPass2)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                          {showNewPass2 ? "🙈" : "👁"}
                        </button>
                      </div>
                    </div>
                    {passwordMsg && (
                      <div className={`text-xs px-3 py-2 rounded-lg border ${passwordMsg.includes("basariy") ? "text-green-600 bg-green-50 border-green-100" : "text-red-500 bg-red-50 border-red-100"}`}>
                        {passwordMsg}
                      </div>
                    )}
                    <button onClick={handlePasswordChange} disabled={passLoading}
                      className="w-full py-3 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:border-[#E8460A] hover:text-[#E8460A] disabled:opacity-50 transition-all">
                      {passLoading ? "Guncelleniyor..." : "Guncelle"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeMenu === "yorumlar" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-base text-gray-900 mb-5">Yorumlarim</h2>
                {posts.filter(p => !isPureRating(p)).length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">💬</div>
                    <div className="text-sm text-gray-500">Henuz yorum yapmadiniz</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.filter(p => !isPureRating(p)).map((p) => (
                      <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#E8460A]/30 transition-all">
                        <div className="flex items-start gap-3">
                          {p.products?.image_url && (
                            <img src={p.products.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <Link href={"/urun/" + p.products?.slug}>
                              <div className="text-xs font-semibold text-[#E8460A] hover:underline mb-1 truncate">{p.products?.title}</div>
                            </Link>
                            {p.rating > 0 && <div className="mb-1"><StarRating rating={p.rating} /></div>}
                            <p className="text-sm text-gray-700">{p.body}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString("tr-TR")}</span>
                              <span className="text-xs text-gray-400">👍 {p.votes || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMenu === "degerlendirmeler" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-base text-gray-900 mb-5">Degerlendirmelerim</h2>
                {posts.filter(p => p.rating > 0).length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">⭐</div>
                    <div className="text-sm text-gray-500">Henuz degerlendirme yapmadiniz</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.filter(p => p.rating > 0).map((p) => (
                      <div key={p.id} className="border border-gray-100 rounded-xl p-4 hover:border-[#E8460A]/30 transition-all">
                        <div className="flex items-center gap-3">
                          {p.products?.image_url && (
                            <img src={p.products.image_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <Link href={"/urun/" + p.products?.slug}>
                              <div className="text-xs font-semibold text-[#E8460A] hover:underline mb-1">{p.products?.title}</div>
                            </Link>
                            <StarRating rating={p.rating} />
                            {!isPureRating(p) && <p className="text-sm text-gray-700 mt-1">{p.body}</p>}
                            <span className="text-xs text-gray-400 mt-1 block">{new Date(p.created_at).toLocaleDateString("tr-TR")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMenu === "favoriler" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-bold text-base text-gray-900 mb-5">Favorilerim</h2>
                {favorites.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">♡</div>
                    <div className="text-sm text-gray-500">Henuz favori eklemediniz</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {favorites.map((f) => (
                      <Link href={"/urun/" + f.products?.slug} key={f.id}>
                        <div className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-[#E8460A]/30 transition-all cursor-pointer">
                          <div className="h-32 bg-gray-50 overflow-hidden">
                            {f.products?.image_url ? (
                              <img src={f.products.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="text-xs text-gray-400 mb-0.5">{f.products?.brand}</div>
                            <div className="text-xs font-semibold text-gray-800 line-clamp-2">{f.products?.title}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}