"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function ProfilSayfasi() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/giris"); return; }
      setUser(data.user);
      loadProfile(data.user.id);
      loadPosts(data.user.id);
    });
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setBio(data.bio || "");
    }
    setLoading(false);
  };

  const loadPosts = async (userId: string) => {
    const { data } = await supabase
      .from("community_posts")
      .select("id, body, votes, created_at, product_id")
      .eq("user_id", userId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (data) setPosts(data);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      full_name: fullName,
      bio,
    });
    if (error) {
      setError(error.message.includes("unique") ? "Bu kullanıcı adı alınmış." : error.message);
    } else {
      setSuccess("Profil güncellendi!");
    }
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main>
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-[#A8A49F]">
          Yükleniyor...
        </div>
        <Footer />
      </main>
    );
  }

  const displayName = fullName || user?.email?.split("@")[0] || "Kullanıcı";

  return (
    <main>
      <Header />
      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#FFF0EB] flex items-center justify-center text-2xl font-bold text-[#E8460A]">
              {displayName[0].toUpperCase()}
            </div>
            <div>
              <h1 className="font-syne font-bold text-xl">{displayName}</h1>
              <div className="text-sm text-[#A8A49F]">{user?.email}</div>
              {profile?.username && (
                <div className="text-sm text-[#E8460A] font-medium">@{profile.username}</div>
              )}
              {profile?.bio && (
                <div className="text-sm text-[#6B6760] mt-1">{profile.bio}</div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="ml-auto text-xs text-[#6B6760] border border-[#E8E4DF] rounded-lg px-4 py-2 hover:border-[#E8460A] hover:text-[#E8460A] transition-all"
            >
              Çıkış Yap
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center py-4 border-t border-[#E8E4DF]">
            <div>
              <div className="font-syne font-bold text-xl text-[#E8460A]">{posts.length}</div>
              <div className="text-xs text-[#A8A49F] mt-1">Yorum</div>
            </div>
            <div>
              <div className="font-syne font-bold text-xl text-[#E8460A]">
                {posts.reduce((acc, p) => acc + (p.votes || 0), 0)}
              </div>
              <div className="text-xs text-[#A8A49F] mt-1">Beğeni</div>
            </div>
            <div>
              <div className="font-syne font-bold text-xl text-[#E8460A]">
                {new Date(user?.created_at).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
              </div>
              <div className="text-xs text-[#A8A49F] mt-1">Üyelik</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="bg-white border border-[#E8E4DF] rounded-2xl p-5">
              <h2 className="font-syne font-bold text-sm mb-4">Profili Düzenle</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2 rounded-lg mb-3">
                  {success}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-[#6B6760] mb-1 block">Kullanıcı Adı</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kullanici_adi"
                    className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6B6760] mb-1 block">Ad Soyad</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Adın Soyadın"
                    className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6B6760] mb-1 block">Hakkında</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Kendinden bahset..."
                    rows={3}
                    className="w-full border border-[#E8E4DF] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#E8460A] resize-none"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#E8460A] text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50 hover:bg-[#C93A08] transition-all"
                >
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <div className="bg-white border border-[#E8E4DF] rounded-2xl p-5">
              <h2 className="font-syne font-bold text-sm mb-4">
                Yorumlarım ({posts.length})
              </h2>
              {posts.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="text-sm text-[#A8A49F]">Henüz yorum yapmadın.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {posts.map((p) => (
                    <div key={p.id} className="border border-[#E8E4DF] rounded-xl p-3">
                      <div className="text-sm text-[#0F0E0D] mb-2">{p.body}</div>
                      <div className="flex items-center gap-3 text-xs text-[#A8A49F]">
                        <span>👍 {p.votes || 0}</span>
                        <span>
                          {new Date(p.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}