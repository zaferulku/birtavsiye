const cats = [
  { icon: "📱", name: "Telefon", count: "14.2K" },
  { icon: "💄", name: "Kozmetik", count: "28.5K" },
  { icon: "🎧", name: "Ses", count: "6.8K" },
  { icon: "🏠", name: "Ev Aletleri", count: "19.1K" },
  { icon: "👟", name: "Spor", count: "11.3K" },
  { icon: "📺", name: "TV", count: "3.4K" },
  { icon: "🍳", name: "Mutfak", count: "9.6K" },
  { icon: "🎮", name: "Oyun", count: "5.1K" },
  { icon: "👶", name: "Bebek", count: "7.7K" },
  { icon: "📸", name: "Fotoğraf", count: "4.2K" },
  { icon: "💊", name: "Sağlık", count: "16.4K" },
  { icon: "📚", name: "Kitap", count: "82K" },
];

export default function Categories() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne font-bold text-xl">Kategoriler</h2>
        <span className="text-sm text-[#E8460A] font-medium cursor-pointer">
          Tümünü Gör →
        </span>
      </div>
      <div className="grid grid-cols-6 gap-3">
        {cats.map((c) => (
          <div
            key={c.name}
            className="bg-white border border-[#E8E4DF] rounded-xl p-4 text-center cursor-pointer hover:border-[#E8460A] hover:bg-[#FFF0EB] transition-all"
          >
            <div className="text-2xl mb-2">{c.icon}</div>
            <div className="text-xs font-medium">{c.name}</div>
            <div className="text-xs text-[#A8A49F] mt-1">{c.count} ürün</div>
          </div>
        ))}
      </div>
    </section>
  );
}