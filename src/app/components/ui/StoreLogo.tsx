"use client";

const STORE_DOMAINS: Record<string, string> = {
  "Trendyol":         "trendyol.com",
  "Hepsiburada":      "hepsiburada.com",
  "MediaMarkt":       "mediamarkt.com.tr",
  "Amazon TR":        "amazon.com.tr",
  "Vatan Bilgisayar": "vatanbilgisayar.com",
  "Teknosa":          "teknosa.com",
  "n11":              "n11.com",
  "GittiGidiyor":     "gittigidiyor.com",
  "PttAVM":           "pttavm.com",
};

const STORE_ACCENT: Record<string, string> = {
  "Trendyol":         "#F27A1A",
  "Hepsiburada":      "#FF6000",
  "MediaMarkt":       "#CC0000",
  "Amazon TR":        "#FF9900",
  "Vatan Bilgisayar": "#E31E24",
  "Teknosa":          "#005BAA",
  "n11":              "#6F2DA8",
  "GittiGidiyor":     "#00A0D6",
  "PttAVM":           "#FFC300",
};

interface StoreLogoProps {
  name: string;
  size?: number;
  className?: string;
}

export default function StoreLogo({ name, size = 20, className = "" }: StoreLogoProps) {
  const domain = STORE_DOMAINS[name];
  const color  = STORE_ACCENT[name] ?? "#888";
  const letter = name[0]?.toUpperCase() ?? "?";

  if (domain) {
    return (
      <span className={`relative inline-flex flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt={name}
          width={size}
          height={size}
          className="rounded object-contain w-full h-full"
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const fb = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        <span
          style={{ width: size, height: size, background: color, fontSize: size * 0.5, display: "none" }}
          className="absolute inset-0 rounded items-center justify-center text-white font-bold">
          {letter}
        </span>
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size, background: color, fontSize: size * 0.5 }}
      className={`rounded inline-flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}>
      {letter}
    </span>
  );
}

export { STORE_ACCENT, STORE_DOMAINS };
