const UA_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";

const queries = [
  // Trendyol: brand prefix etkisi
  { site: "trendyol", q: "Apple iPhone 15 128GB", url: "https://www.trendyol.com/sr?q=Apple%20iPhone%2015%20128GB" },
  { site: "trendyol", q: "iPhone 15 128GB",        url: "https://www.trendyol.com/sr?q=iPhone%2015%20128GB" },
  { site: "trendyol", q: "iphone 15",              url: "https://www.trendyol.com/sr?q=iphone+15" },
  // N11: brand prefix etkisi
  { site: "n11",      q: "Apple iPhone 15 128GB",  url: "https://www.n11.com/arama?q=Apple%20iPhone%2015%20128GB" },
  { site: "n11",      q: "iPhone 15 128GB",        url: "https://www.n11.com/arama?q=iPhone%2015%20128GB" },
  { site: "n11",      q: "Apple AirPods Pro 2",    url: "https://www.n11.com/arama?q=Apple%20AirPods%20Pro%202" },
  { site: "n11",      q: "AirPods Pro 2",          url: "https://www.n11.com/arama?q=AirPods%20Pro%202" },
];

for (const t of queries) {
  console.log("──────────────────────────");
  console.log(t.site, "|", t.q);
  const t0 = Date.now();
  try {
    const res = await fetch(t.url, { headers: { "User-Agent": UA_IOS, Accept: "text/html", "Accept-Language": "tr-TR" }, redirect: "follow" });
    const html = await res.text();
    const ms = Date.now() - t0;
    console.log(`  ${res.status}  ${ms}ms  ${html.length}b  finalURL=${res.url.slice(0,80)}`);
    if (t.site === "trendyol") {
      const m1 = html.match(/href=["'](https?:\/\/(?:www\.)?trendyol\.com\/[^"']*-p-\d+[^"']*)["']/i)?.[1];
      const m2 = html.match(/href=["'](\/[^"']*-p-\d+[^"']*)["']/i)?.[1];
      const allCount = (html.match(/-p-\d+/g) ?? []).length;
      console.log(`  abs-match: ${m1 ?? "—"}`);
      console.log(`  rel-match: ${m2 ?? "—"}`);
      console.log(`  total -p- occurrences: ${allCount}`);
    } else {
      const a1 = html.match(/href=["'](https?:\/\/(?:www\.)?n11\.com\/urun\/[^"']+)["']/i)?.[1];
      const a2 = html.match(/href=["'](\/urun\/[^"']+)["']/i)?.[1];
      const allUrun = (html.match(/\/urun\/[a-z0-9-]+/gi) ?? []).length;
      console.log(`  abs-match: ${a1 ?? "—"}`);
      console.log(`  rel-match: ${a2 ?? "—"}`);
      console.log(`  total /urun/ occurrences: ${allUrun}`);
      // M sayfa varyantı?
      const mUrun = (html.match(/m\.n11\.com\/urun\/[a-z0-9-]+/gi) ?? []).length;
      console.log(`  m.n11.com/urun: ${mUrun}`);
    }
  } catch (e) { console.log("  ERR:", e instanceof Error ? e.message : e); }
}
console.log("\nDone.");
