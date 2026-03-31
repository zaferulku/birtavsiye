import { NextRequest, NextResponse } from "next/server";

// Trendyol'un kendi sitesinin kullandığı public search API
// Kategori slug'ı ve sayfa numarası alır, ürün listesi döner
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");   // örn: "akilli-telefon-x-c103498"
  const page = searchParams.get("page") || "1";
  const q    = searchParams.get("q");      // arama sorgusu (slug yerine)

  if (!slug && !q) {
    return NextResponse.json({ error: "slug veya q parametresi gerekli" }, { status: 400 });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9",
    "Origin": "https://www.trendyol.com",
    "Referer": "https://www.trendyol.com/",
  };

  try {
    let apiUrl: string;

    if (q) {
      // Arama sorgusu
      apiUrl = `https://public.trendyol.com/discovery-web-searchgw-service/api/filter/sr?q=${encodeURIComponent(q)}&pi=${page}&culture=tr-TR&userGenderId=1&pId=0&scoringAlgorithmId=2&channelId=1`;
    } else {
      // Kategori slug
      apiUrl = `https://public.trendyol.com/discovery-web-searchgw-service/api/filter/${slug}?pi=${page}&culture=tr-TR&userGenderId=1&pId=0&scoringAlgorithmId=2&channelId=1`;
    }

    const res = await fetch(apiUrl, { headers });

    if (!res.ok) {
      return NextResponse.json({ error: `Trendyol API hatası: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();

    // Sadece ihtiyacımız olan alanları döndür
    const products = (data?.result?.products || []).map((p: any) => ({
      id:          p.id,
      contentId:   p.contentId,
      name:        p.name,
      brand:       p.brand?.name || "",
      price:       p.price?.sellingPrice || p.price?.originalPrice || 0,
      image:       p.images?.[0] ? `https://cdn.dsmcdn.com${p.images[0]}` : "",
      images:      (p.images || []).map((img: string) => `https://cdn.dsmcdn.com${img}`),
      url:         `https://www.trendyol.com${p.url || ""}`,
      description: p.description || "",
      category:    p.categoryName || "",
      ratingScore: p.ratingScore || 0,
      totalRatings:p.totalRatingCount || 0,
    }));

    return NextResponse.json({
      products,
      totalCount: data?.result?.totalCount || 0,
      pageCount:  Math.ceil((data?.result?.totalCount || 0) / 24),
      page: parseInt(page),
    });

  } catch (err) {
    return NextResponse.json({ error: "Bağlantı hatası" }, { status: 500 });
  }
}
