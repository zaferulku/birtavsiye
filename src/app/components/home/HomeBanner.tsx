"use client";
import Link from "next/link";

const SLIDES = [
  {
    badge: "Kampanya",
    title: "En İyi Fiyatlar\nBirtavsiye'de",
    sub: "Binlerce ürünü karşılaştır, en ucuzunu bul",
    cta: "Fırsatları Keşfet",
    href: "/urunler",
    bg: "from-gray-900 to-gray-700",
    accent: "#E8460A",
  },
  {
    badge: "Elektronik",
    title: "Telefon & Laptop\nFırsatları",
    sub: "Samsung, Apple, Lenovo ve daha fazlası",
    cta: "Elektronik Ürünler",
    href: "/kategori/akilli-telefon",
    bg: "from-slate-800 to-slate-600",
    accent: "#3B82F6",
  },
  {
    badge: "Kozmetik",
    title: "Güzellik &\nKişisel Bakım",
    sub: "Binlerce ürün, en uygun fiyatlarla",
    cta: "Kozmetik Ürünler",
    href: "/kategori/makyaj",
    bg: "from-rose-900 to-rose-700",
    accent: "#F43F5E",
  },
];

const QUICK_CATS = [
  { label: "Telefon",    href: "/kategori/akilli-telefon",    icon: "📱" },
  { label: "Laptop",     href: "/kategori/bilgisayar-laptop", icon: "💻" },
  { label: "TV",         href: "/kategori/tv",                icon: "📺" },
  { label: "Kulaklık",   href: "/kategori/ses-kulaklik",      icon: "🎧" },
  { label: "Beyaz Eşya", href: "/kategori/beyaz-esya",        icon: "🫙" },
  { label: "Makyaj",     href: "/kategori/makyaj",            icon: "💋" },
  { label: "Spor",       href: "/kategori/fitness",           icon: "🏋️" },
  { label: "Giyim",      href: "/kategori/kadin-giyim",       icon: "👗" },
];

export default function HomeBanner() {
  return (
    <div className="w-full bg-white border-b border-gray-100">
      {/* Ana banner — Hepsiburada stili */}
      <div className="flex gap-3 p-3">
        {/* Sol: Ana kampanya kartı */}
        <Link href={SLIDES[0].href}
          className="flex-1 min-w-0 rounded-2xl overflow-hidden relative group cursor-pointer"
          style={{ minHeight: 148 }}>
          <div className={`absolute inset-0 bg-gradient-to-br ${SLIDES[0].bg}`} />
          <div className="relative z-10 p-5 h-full flex flex-col justify-between">
            <div>
              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 text-white/70 border border-white/20 tracking-wide uppercase">
                {SLIDES[0].badge}
              </span>
              <h2 className="text-white font-extrabold text-2xl leading-tight whitespace-pre-line">
                {SLIDES[0].title}
              </h2>
              <p className="text-white/50 text-xs mt-1.5">{SLIDES[0].sub}</p>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl mt-4 self-start transition-opacity group-hover:opacity-90"
              style={{ background: SLIDES[0].accent, color: "#fff" }}>
              {SLIDES[0].cta} →
            </span>
          </div>
        </Link>

        {/* Sağ: İki küçük kart */}
        <div className="flex flex-col gap-3 w-48 flex-shrink-0">
          {SLIDES.slice(1).map(s => (
            <Link key={s.href} href={s.href}
              className="flex-1 rounded-2xl overflow-hidden relative group cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${s.bg}`} />
              <div className="relative z-10 p-3.5 h-full flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wide">{s.badge}</span>
                  <p className="text-white font-bold text-sm leading-snug mt-0.5 whitespace-pre-line">{s.title}</p>
                </div>
                <span className="text-[11px] font-semibold text-white/60 mt-2 group-hover:text-white transition-colors">
                  {s.cta} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
