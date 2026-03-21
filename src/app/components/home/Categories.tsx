import Link from "next/link";

const cats = [
  { icon: "📱", name: "Telefon", count: "14.2K", slug: "telefon" },
  { icon: "💄", name: "Kozmetik", count: "28.5K", slug: "kozmetik" },
  { icon: "🎧", name: "Ses", count: "6.8K", slug: "ses" },
  { icon: "🏠", name: "Ev Aletleri", count: "19.1K", slug: "ev-aletleri" },
  { icon: "👟", name: "Spor", count: "11.3K", slug: "spor" },
  { icon: "📺", name: "TV", count: "3.4K", slug: "tv" },
  { icon: "🍳", name: "Mutfak", count: "9.6K", slug: "mutfak" },
  { icon: "🎮", name: "Oyun", count: "5.1K", slug: "oyun" },
  { icon: "👶", name: "Bebek", count: "7.7K", slug: "bebek" },
  { icon: "📸", name: "Fotoğraf", count: "4.2K", slug: "fotograf" },
  { icon: "💊", name: "Sağlık", count: "16.4K", slug: "saglik" },
  { icon: "📚", name: "Kitap", count: "82K", slug: "kitap" },
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
          <Link href={`/kategori/${c.slug}`} key={c.name}>
            <div className="bg-white border border-[#E8E4DF] rounded-xl p-4 text-center cursor-pointer hover:border-[#E8460A] hover:bg-[#FFF0EB] transition-all">
              <div className="text-2xl mb-2">{c.icon}</div>
              <div className="text-xs font-medium">{c.name}</div>
              <div className="text-xs text-[#A8A49F] mt-1">{c.count} ürün</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}