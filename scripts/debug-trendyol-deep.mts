const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36";
const UA_MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const UA_ANDROID = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/121.0.0.0 Mobile Safari/537.36";

const targets = [
  { name: "TY-apigw-discovery", url: "https://apigw.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=iphone+15&culture=tr-TR&storefrontId=1", headers: { "User-Agent": UA, Accept: "application/json", Origin: "https://www.trendyol.com", Referer: "https://www.trendyol.com/" } },
  { name: "TY-public-discovery-bare", url: "https://public.trendyol.com/discovery-web-searchgw-service/v2/api/infinite-scroll/sr?q=iphone+15", headers: { "User-Agent": UA, Accept: "application/json" } },
  { name: "TY-androidUA", url: "https://www.trendyol.com/sr?q=iphone+15", headers: { "User-Agent": UA_ANDROID, Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" } },
  { name: "TY-iosUA", url: "https://www.trendyol.com/sr?q=iphone+15", headers: { "User-Agent": UA_MOBILE, Accept: "text/html", "Accept-Language": "tr-TR,tr;q=0.9" } },
  { name: "TY-googlebot", url: "https://www.trendyol.com/sr?q=iphone+15", headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", Accept: "text/html" } },
  { name: "TY-mdc", url: "https://mdc.trendyol.com/discovery-mweb-searchgw-service/v2/api/infinite-scroll/sr?q=iphone+15", headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://m.trendyol.com/" } },
];

for (const t of targets) {
  console.log("──────────────────────────");
  console.log(t.name, "→", t.url);
  const t0 = Date.now();
  try {
    const res = await fetch(t.url, { headers: t.headers, redirect: "follow" });
    const body = await res.text();
    const ms = Date.now() - t0;
    const ct = res.headers.get("content-type") ?? "?";
    const cf = /Cloudflare|Attention Required/i.test(body);
    const tyHrefs = (body.match(/-p-\d+/g) ?? []).length;
    const priceHits = (body.match(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*TL/g) ?? []).length;
    let jsonOk = false; let prodCount = 0;
    if (ct.includes("json")) {
      try { const j = JSON.parse(body); jsonOk = true; prodCount = j.result?.products?.length ?? j.products?.length ?? 0; } catch {}
    }
    console.log(`  ${res.status}  ${ms}ms  ${body.length}b  CF=${cf}  TY-hrefs=${tyHrefs}  price=${priceHits}  json=${jsonOk}  prods=${prodCount}`);
    if (jsonOk && prodCount > 0) {
      const j = JSON.parse(body); const p = (j.result?.products ?? j.products)[0];
      console.log("  Sample:", JSON.stringify(p).slice(0, 200));
    } else if (tyHrefs > 0) {
      console.log("  First href:", body.match(/href=["']([^"']*-p-\d+[^"']*)["']/i)?.[1]);
    } else {
      console.log("  Head:", body.slice(0, 250).replace(/\s+/g, " "));
    }
  } catch (e) { console.log("  ERR:", e instanceof Error ? e.message : e); }
}
console.log("\nDone.");
