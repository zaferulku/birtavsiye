/**
 * Trendyol & N11 için alternatif endpoint deneme.
 * Cloudflare 403 olunca public API/JSON endpoint'ler genelde daha gevşek.
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36";
const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

const targets = [
  {
    name: "TY-discovery-api",
    url: "https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=" + encodeURIComponent("iphone 15 128gb") + "&culture=tr-TR",
    headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.trendyol.com/" },
  },
  {
    name: "TY-mobile-html",
    url: "https://m.trendyol.com/sr?q=" + encodeURIComponent("iphone 15 128gb"),
    headers: { "User-Agent": UA_MOBILE, Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
  },
  {
    name: "N11-suggest-json",
    url: "https://www.n11.com/searchSuggestion?searchTerm=" + encodeURIComponent("iphone 15"),
    headers: { "User-Agent": UA, Accept: "application/json", "X-Requested-With": "XMLHttpRequest", Referer: "https://www.n11.com/" },
  },
  {
    name: "N11-mobile-html",
    url: "https://urun.n11.com/arama?q=" + encodeURIComponent("iphone 15"),
    headers: { "User-Agent": UA_MOBILE, Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" },
  },
  {
    name: "N11-API-search",
    url: "https://api.n11.com/search/products?q=" + encodeURIComponent("iphone 15"),
    headers: { "User-Agent": UA, Accept: "application/json" },
  },
];

for (const t of targets) {
  console.log("──────────────────────────────────────────");
  console.log("TARGET:", t.name);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(t.url, { headers: t.headers, redirect: "follow" });
  } catch (e) { console.log("ERR:", e instanceof Error ? e.message : e); continue; }
  const ms = Date.now() - t0;
  const body = await res.text();
  console.log(`Status: ${res.status}  ${ms}ms  Length: ${body.length}  CT: ${res.headers.get("content-type")}`);
  console.log(`FinalURL: ${res.url}`);
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  if (isJson) {
    try {
      const j = JSON.parse(body);
      const productCount = (j.result?.products?.length ?? j.products?.length ?? j.data?.products?.length ?? j.suggestionList?.length ?? 0);
      console.log("  JSON OK | productCount-ish:", productCount);
      const firstPrice = JSON.stringify(j).match(/"price"[:\s]*["{]?([\d.,]+)/);
      console.log("  First price-like:", firstPrice?.[1] ?? "—");
      console.log("  Sample keys:", Object.keys(j).slice(0, 8));
    } catch { console.log("  invalid JSON; head:", body.slice(0, 300)); }
  } else {
    const cf = /Cloudflare|Attention Required/i.test(body);
    console.log("  Cloudflare block:", cf);
    const tyHrefs = (body.match(/-p-\d+/g) ?? []).length;
    const n11Hrefs = (body.match(/\/urun\/[a-z0-9-]+/gi) ?? []).length;
    const priceHits = (body.match(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*TL/g) ?? []).length;
    console.log(`  TY-shape ${tyHrefs} | N11-shape ${n11Hrefs} | price-hits ${priceHits}`);
    if (priceHits > 0) console.log("  First TL match:", body.match(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*TL/)?.[0]);
  }
}
console.log("\nDone.");
