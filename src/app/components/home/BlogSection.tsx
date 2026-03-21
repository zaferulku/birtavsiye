const posts = [
  { emoji: "🌿", bg: "bg-yellow-50", tag: "Kozmetik", title: "2025'in En İyi Güneş Kremleri: 15 Ürünü Test Ettik", type: "Uzman İncelemesi", time: "8 dk" },
  { emoji: "🎧", bg: "bg-purple-50", tag: "Elektronik", title: "2025 ANC Kulaklık Karşılaştırması: Sony mu, Bose mu?", type: "Karşılaştırma", time: "12 dk" },
  { emoji: "🏃", bg: "bg-green-50", tag: "Spor", title: "Hangi Akıllı Saat Sana Uygun? Kapsamlı Rehber", type: "Alım Rehberi", time: "10 dk" },
];

export default function BlogSection() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10 pt-0">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-xl">Blog & İncelemeler</h2>
        <span className="text-sm text-[#E8460A] font-medium cursor-pointer">
          Tümünü Gör →
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {posts.map((p) => (
          <div
            key={p.title}
            className="bg-white border border-[#E8E4DF] rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-all"
          >
            <div className={`h-36 ${p.bg} flex items-center justify-center text-5xl`}>
              {p.emoji}
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-[#E8460A] uppercase tracking-wide mb-2">
                {p.tag}
              </div>
              <div className="text-sm font-medium leading-snug mb-3">{p.title}</div>
              <div className="flex items-center gap-2 text-xs text-[#A8A49F]">
                <span>{p.type}</span>
                <span>·</span>
                <span>{p.time} okuma</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}