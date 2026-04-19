import Link from "next/link";

interface Variant {
  storage: string | null;
  color: string | null;
  count: number;
  minPrice: number | null;
  anyInStock: boolean;
}

interface Props {
  slug: string;
  storages: string[];
  colors: string[];
  selectedStorage: string | null;
  selectedColor: string | null;
  variants: Variant[];
}

function buildUrl(slug: string, storage: string | null, color: string | null): string {
  const params = new URLSearchParams();
  if (storage) params.set("s", storage);
  if (color) params.set("c", color);
  const q = params.toString();
  return `/urun/${slug}${q ? "?" + q : ""}`;
}

function colorSwatch(color: string): string {
  const palette: Record<string, string> = {
    "Siyah": "#1a1a1a", "Beyaz": "#f5f5f5", "Gri": "#6b7280",
    "Kırmızı": "#dc2626", "Mavi": "#2563eb", "Yeşil": "#16a34a",
    "Sarı": "#eab308", "Turuncu": "#ea580c", "Mor": "#7c3aed",
    "Pembe": "#ec4899", "Altın": "#ca8a04", "Gümüş": "#9ca3af",
    "Bej": "#d4b896", "Kahve": "#78350f",
    "Lacivert": "#1e3a8a", "Bordo": "#7f1d1d",
    "Beyaz Titanyum": "#e5e5e5", "Siyah Titanyum": "#2a2a2a",
    "Natürel Titanyum": "#c0b9a8", "Çöl Titanyum": "#cea07a",
    "Gece Siyahı": "#0a0a0a", "Derin Mor": "#4c1d95", "Derin Mavi": "#1e40af",
    "Parlak Siyah": "#000000", "İnci Beyazı": "#f8f8f0",
    "Lotus Mavi": "#3b82f6", "Kozmik Turuncu": "#ff6b35",
    "Sis Mavisi": "#6ba3c5", "Uzay Grisi": "#525252",
    "Yıldız Işığı": "#f0e5d3", "Ultramarine": "#4366bb",
    "Lavanta": "#c4a7d6", "Lila": "#b794d6",
    "Haki": "#7a8450",
  };
  return palette[color] || "#cccccc";
}

export default function VariantSwitcher({
  slug,
  storages,
  colors,
  selectedStorage,
  selectedColor,
  variants,
}: Props) {
  if (storages.length <= 1 && colors.length <= 1) return null;

  const isAvailable = (storage: string | null, color: string | null): boolean => {
    return variants.some(v => v.storage === storage && v.color === color && v.count > 0);
  };

  return (
    <div className="space-y-4">
      {storages.length > 1 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Hafıza
          </div>
          <div className="flex flex-wrap gap-2">
            {storages.map(s => {
              const active = s === selectedStorage;
              const avail = isAvailable(s, selectedColor);
              return (
                <Link
                  key={s}
                  href={buildUrl(slug, s, selectedColor)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    active
                      ? "border-[#E8460A] bg-orange-50 text-[#E8460A]"
                      : avail
                        ? "border-gray-200 text-gray-700 hover:border-[#E8460A]"
                        : "border-gray-100 text-gray-400 line-through"
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {colors.length > 1 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Renk {selectedColor && <span className="text-gray-800 normal-case">— {selectedColor}</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            {colors.map(c => {
              const active = c === selectedColor;
              const avail = isAvailable(selectedStorage, c);
              const bg = colorSwatch(c);
              return (
                <Link
                  key={c}
                  href={buildUrl(slug, selectedStorage, c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                    active
                      ? "border-[#E8460A] bg-orange-50"
                      : avail
                        ? "border-gray-200 hover:border-[#E8460A]"
                        : "border-gray-100 opacity-50"
                  }`}
                  title={c}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ backgroundColor: bg }}
                  />
                  <span className={active ? "text-[#E8460A]" : "text-gray-700"}>{c}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
