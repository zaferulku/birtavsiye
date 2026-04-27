import { NextRequest, NextResponse } from "next/server";

const MM_BASE = "https://www.mediamarkt.com.tr";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
};

interface ParsedProduct {
  name:  string;
  url:   string;
  image: string;
  price: number;
  specs: Record<string, string>;
}

function parseSpecsFromTitle(name: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const n = name;

  const cpu =
    n.match(/Intel[®\s]+Core[™\s]+(?:i[3579]|Ultra\s*\d+|5|7|9)[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Intel[®\s]+Celeron[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Intel[®\s]+Pentium[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/AMD\s+Ryzen\s+[^\s,/|]+/i)?.[0]?.trim() ??
    n.match(/Apple\s+M\d+[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Snapdragon\s+\d+[^\s,/|]*/i)?.[0]?.trim();
  if (cpu) specs["İşlemci"] = cpu.replace(/[®™]/g, "").trim();

  const ram = n.match(/(\d+)\s*GB\s+RAM/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*GB\s+(?:LPDDR|DDR)\d*/i)?.[0]?.trim();
  if (ram) specs["RAM"] = ram.replace(/RAM/i, "").trim() + " RAM";

  const storage = n.match(/(\d+)\s*(?:GB|TB)\s+SSD/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*TB\s+(?:HDD|Disk)?/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*GB\s+(?:eMMC|Flash|Depolama)/i)?.[0]?.trim();
  if (storage) specs["Depolama"] = storage;

  const screen = n.match(/(\d+[,.]?\d*)\s*(?:inç|inch|''|")\b/i)?.[0]?.trim() ??
    n.match(/(\d+)['']\s/)?.[0]?.trim();
  if (screen) specs["Ekran"] = screen.replace(/inch/i, "inç");

  const res = n.match(/\b(4K|UHD|FHD|Full\s*HD|HD|WUXGA|WQHD|QHD|QLED|OLED|AMOLED)\b/i)?.[0];
  if (res) specs["Çözünürlük"] = res.toUpperCase().replace("FULL HD", "FHD");

  const gpu = n.match(/(?:NVIDIA\s+)?(?:GeForce\s+)?RTX\s*\d+\w*/i)?.[0]?.trim() ??
    n.match(/(?:NVIDIA\s+)?(?:GeForce\s+)?GTX\s*\d+\w*/i)?.[0]?.trim() ??
    n.match(/Radeon\s+[^\s,/|]+/i)?.[0]?.trim();
  if (gpu) specs["Ekran Kartı"] = gpu;

  const os = n.match(/Windows\s+\d+[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/\bFreeDOS\b/i)?.[0]?.trim() ??
    n.match(/\bmacOS\b/i)?.[0]?.trim() ??
    n.match(/Android\s+\d+[^\s,/|]*/i)?.[0]?.trim();
  if (os) specs["İşletim Sistemi"] = os;

  const hz = n.match(/(\d+)\s*Hz/i)?.[0];
  if (hz) specs["Yenileme Hızı"] = hz;

  const mah = n.match(/(\d{3,5})\s*mAh/i)?.[0];
  if (mah) specs["Batarya"] = mah;

  const mp = n.match(/(\d+)\s*MP/i)?.[0];
  if (mp) specs["Kamera"] = mp;

  return specs;
}

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen = new Set<string>();

  // JSON-LD script bloklarını parse et (MediaMarkt, ItemList içinde Product kullanıyor)
  const scriptMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  for (const scriptMatch of scriptMatches) {
    try {
      const json = JSON.parse(scriptMatch[1]);
      const items: Record<string, unknown>[] =
        json["@type"] === "ItemList"
          ? (json.itemListElement ?? []).map((el: Record<string, unknown>) => el.item as Record<string, unknown>)
          : json["@type"] === "Product"
          ? [json]
          : [];

      for (const item of items) {
        if (!item || item["@type"] !== "Product") continue;
        const name  = item.name as string;
        const url   = item.url as string;
        const image = item.image as string;
        const rawPrice = (item.offers as Record<string, unknown>)?.price;
        const price = typeof rawPrice === "number"
          ? rawPrice
          : typeof rawPrice === "string"
            ? Number(rawPrice)
            : NaN;
        if (!name || !url) continue;
        if (seen.has(url)) continue;
        seen.add(url);

        // price'sızsa detail-fetch için tag'le; geçici 0 koy, route GET içinde fallback yapacağız
        const finalPrice = Number.isFinite(price) && price > 0 ? price : 0;

        results.push({
          name,
          url: url.startsWith("http") ? url : `${MM_BASE}${url}`,
          image: image
            ? (image.startsWith("http") ? image : `${MM_BASE}${image}`)
            : "",
          price: finalPrice,
          specs: parseSpecsFromTitle(name),
        });
      }
    } catch {
      // parse hatası — bu script bloğunu atla
    }
  }

  return results;
}

// GET /api/mediamarkt?q=laptop&page=1
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${MM_BASE}/tr/search.html?query=${encodeURIComponent(q)}&page=${page}`;

  try {
    const res = await fetch(targetUrl, { headers: FETCH_HEADERS, next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json({ error: `MediaMarkt hatası: ${res.status}` }, { status: res.status });
    }

    const html     = await res.text();
    const products = parseProducts(html);

    // Fallback: search'te price=0 dönen ürünler için detail page'den price çek.
    // (Search JSON-LD'sinde bazı varyantlar price'sız gelir; live fetcher modülü
    //  data-price/HTML body'sinden price extract edebilir.)
    const needsLive = products.filter((p) => !p.price || p.price <= 0);
    if (needsLive.length > 0) {
      const { fetchMediaMarkt } = await import("@/lib/scrapers/live/mediamarkt");
      const fetchCtx = (sourceUrl: string) => ({
        sourceUrl,
        productId: "",
        sourceProductId: "",
        store: { id: "", name: "MediaMarkt", source: "mediamarkt" as const },
        listingId: null,
      });
      // Concurrency 4 — MM rate limit dostu
      const CONC = 4;
      for (let i = 0; i < needsLive.length; i += CONC) {
        const batch = needsLive.slice(i, i + CONC);
        await Promise.all(batch.map(async (prod) => {
          try {
            const live = await fetchMediaMarkt(fetchCtx(prod.url));
            if (live.price && live.price > 0 && live.in_stock) {
              prod.price = live.price;
            }
          } catch {
            // skip — listing eklenmeyecek (price=0 kalır, /api/sync defensive filter atar)
          }
        }));
      }
    }

    return NextResponse.json({ products, totalCount: products.length, page, source: "mediamarkt" });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
