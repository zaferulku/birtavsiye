import { NextRequest, NextResponse } from "next/server";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const MM_BASE         = "https://www.mediamarkt.com.tr";

function scraperUrl(targetUrl: string): string {
  const encoded = encodeURIComponent(targetUrl);
  return `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encoded}&country_code=tr&render=true&premium=true`;
}

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

  // İşlemci
  const cpu =
    n.match(/Intel[®\s]+Core[™\s]+(?:i[3579]|Ultra\s*\d+|5|7|9)[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Intel[®\s]+Celeron[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Intel[®\s]+Pentium[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/AMD\s+Ryzen\s+[^\s,/|]+/i)?.[0]?.trim() ??
    n.match(/Apple\s+M\d+[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/Snapdragon\s+\d+[^\s,/|]*/i)?.[0]?.trim();
  if (cpu) specs["İşlemci"] = cpu.replace(/[®™]/g, "").trim();

  // RAM
  const ram = n.match(/(\d+)\s*GB\s+RAM/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*GB\s+(?:LPDDR|DDR)\d*/i)?.[0]?.trim();
  if (ram) specs["RAM"] = ram.replace(/RAM/i, "").trim() + " RAM";

  // Depolama
  const storage = n.match(/(\d+)\s*(?:GB|TB)\s+SSD/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*TB\s+(?:HDD|Disk)?/i)?.[0]?.trim() ??
    n.match(/(\d+)\s*GB\s+(?:eMMC|Flash|Depolama)/i)?.[0]?.trim();
  if (storage) specs["Depolama"] = storage;

  // Ekran boyutu
  const screen = n.match(/(\d+[,.]?\d*)\s*(?:inç|inch|''|")\b/i)?.[0]?.trim() ??
    n.match(/(\d+)['']\s/)?.[0]?.trim();
  if (screen) specs["Ekran"] = screen.replace(/inch/i, "inç");

  // Çözünürlük
  const res = n.match(/\b(4K|UHD|FHD|Full\s*HD|HD|WUXGA|WQHD|QHD|QLED|OLED|AMOLED)\b/i)?.[0];
  if (res) specs["Çözünürlük"] = res.toUpperCase().replace("FULL HD", "FHD");

  // Ekran kartı
  const gpu = n.match(/(?:NVIDIA\s+)?(?:GeForce\s+)?RTX\s*\d+\w*/i)?.[0]?.trim() ??
    n.match(/(?:NVIDIA\s+)?(?:GeForce\s+)?GTX\s*\d+\w*/i)?.[0]?.trim() ??
    n.match(/Radeon\s+[^\s,/|]+/i)?.[0]?.trim();
  if (gpu) specs["Ekran Kartı"] = gpu;

  // İşletim sistemi
  const os = n.match(/Windows\s+\d+[^\s,/|]*/i)?.[0]?.trim() ??
    n.match(/\bFreeDOS\b/i)?.[0]?.trim() ??
    n.match(/\bmacOS\b/i)?.[0]?.trim() ??
    n.match(/Android\s+\d+[^\s,/|]*/i)?.[0]?.trim();
  if (os) specs["İşletim Sistemi"] = os;

  // Yenile Hızı (Hz)
  const hz = n.match(/(\d+)\s*Hz/i)?.[0];
  if (hz) specs["Yenileme Hızı"] = hz;

  // Pil (mAh)
  const mah = n.match(/(\d{3,5})\s*mAh/i)?.[0];
  if (mah) specs["Batarya"] = mah;

  // Kamera
  const mp = n.match(/(\d+)\s*MP/i)?.[0];
  if (mp) specs["Kamera"] = mp;

  return specs;
}

function parseProducts(html: string): ParsedProduct[] {
  const results: ParsedProduct[] = [];
  const seen = new Set<string>();

  // ItemList JSON-LD: her Product'ı regex ile çıkar
  for (const raw of html.matchAll(
    /"@type"\s*:\s*"Product","name"\s*:\s*"([^"]+)","image"\s*:\s*"([^"]+)","offers"\s*:\s*\{"@type"\s*:\s*"Offer","price"\s*:\s*(\d+)[^}]*\}[^}]*"url"\s*:\s*"([^"]+)"/gs
  )) {
    if (results.length >= 24) break;
    const [, name, image, priceStr, url] = raw;
    if (seen.has(url)) continue;
    seen.add(url);

    results.push({
      name,
      url,
      image: image.startsWith("http") ? image : `${MM_BASE}${image}`,
      price: parseInt(priceStr, 10),
      specs: parseSpecsFromTitle(name),
    });
  }

  return results;
}

// GET /api/mediamarkt?q=laptop&page=1
export async function GET(request: NextRequest) {
  if (!SCRAPER_API_KEY) {
    return NextResponse.json(
      { error: "SCRAPER_API_KEY yapılandırılmamış" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q    = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (!q) {
    return NextResponse.json({ error: "q parametresi gerekli" }, { status: 400 });
  }

  const targetUrl = `${MM_BASE}/tr/search.html?query=${encodeURIComponent(q)}&page=${page}`;

  try {
    const res = await fetch(scraperUrl(targetUrl), { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `ScraperAPI hatası: ${res.status}` },
        { status: res.status }
      );
    }

    const html     = await res.text();
    const products = parseProducts(html);

    return NextResponse.json({
      products,
      totalCount: products.length,
      page,
      source: "mediamarkt",
    });
  } catch {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
