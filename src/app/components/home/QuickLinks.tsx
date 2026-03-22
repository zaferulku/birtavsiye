import Link from "next/link";

const links = [
  { icon: "🔥", label: "Fiyat Düşenler", href: "/ara?q=indirim", bg: "bg-orange-100", color: "text-orange-600" },
  { icon: "⭐", label: "En Tavsiye", href: "/ara?q=tavsiye", bg: "bg-yellow-100", color: "text-yellow-600" },
  { icon: "📱", label: "Telefon", href: "/kategori/telefon", bg: "bg-blue-100", color: "text-blue-600" },
  { icon: "💄", label: "Kozmetik", href: "/kategori/kozmetik", bg: "bg-pink-100", color: "text-pink-600" },
  { icon: "🎧", label: "Kulaklık", href: "/kategori/ses", bg: "bg-purple-100", color: "text-purple-600" },
  { icon: "💻", label: "Laptop", href: "/kategori/laptop", bg: "bg-green-100", color: "text-green-600" },
  { icon: "🏠", label: "Ev Aletleri", href: "/kategori/ev-aletleri", bg: "bg-teal-100", color: "text-teal-600" },
  { icon: "👟", label: "Spor", href: "/kategori/spor", bg: "bg-red-100", color: "text-red-600" },
  { icon: "📸", label: "Fotoğraf", href: "/kategori/fotograf", bg: "bg-indigo-100", color: "text-indigo-600" },
  { icon: "💊", label: "Sağlık", href: "/kategori/saglik", bg: "bg-emerald-100", color: "text-emerald-600" },
];

export default function QuickLinks() {
  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide">
          {links.map((l) => (
            <Link href={l.href} key={l.label}>
              <div className="flex flex-col items-center gap-2 cursor-pointer group min-w-[72px]">
                <div className={`w-14 h-14 ${l.bg} rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                  {l.icon}
                </div>
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap text-center group-hover:text-[#E8460A] transition-colors">
                  {l.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}