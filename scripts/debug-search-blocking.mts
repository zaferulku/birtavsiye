/**
 * Debug: Trendyol + N11 search response inceleme.
 * - HTTP status, content-length, final URL (redirect tespiti)
 * - Cloudflare/Akamai/Captcha fingerprint
 * - Anchor regex hit count + sample hrefs
 * - JSON-LD ve __NEXT_DATA__ varlığı
 * Read-only, yan etkisiz.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const headersTrendyol = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Referer: "https://www.trendyol.com/",
};
const headersN11 = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  Referer: "https://www.n11.com/",
};

const targets: Array<{ name: string; url: string; headers: Record<string, string> }> = [
  {
    name: "trendyol/iphone15",
    url: "https://www.trendyol.com/sr?q=" + encodeURIComponent("Apple iPhone 15 128GB"),
    headers: headersTrendyol,
  },
  {
    name: "n11/iphone15",
    url: "https://www.n11.com/arama?q=" + encodeURIComponent("Apple iPhone 15 128GB"),
    headers: headersN11,
  },
];

for (const t of targets) {
  console.log("──────────────────────────────────────────");
  console.log("TARGET:", t.name);
  console.log("URL:   ", t.url);

  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(t.url, { headers: t.headers, redirect: "follow" });
  } catch (err) {
    console.log("FETCH ERROR:", err instanceof Error ? err.message : String(err));
    continue;
  }
  const ms = Date.now() - t0;
  const html = await res.text();
  const ct = res.headers.get("content-type") ?? "?";
  console.log(`Status: ${res.status}  ContentType: ${ct}  ${ms}ms`);
  console.log(`FinalURL: ${res.url}`);
  console.log(`Length: ${html.length} bytes`);

  const flags = {
    cloudflare: /cloudflare|cf-ray|cf-chl|__cf_bm/i.test(html),
    akamai: /Akamai|ak_bmsc|_abck/i.test(html),
    captcha: /captcha|are you human/i.test(html),
    radware: /Radware/i.test(html),
    challenge: /challenge|verifying you are human|verify you/i.test(html),
  };
  console.log("Flags:", JSON.stringify(flags));

  const trendyolHrefs = Array.from(html.matchAll(/href=["']([^"']*-p-\d+[^"']*)["']/gi)).map(
    (m) => m[1]
  );
  const n11Hrefs = Array.from(html.matchAll(/href=["']([^"']*\/urun\/[^"']+)["']/gi)).map(
    (m) => m[1]
  );
  console.log(`Trendyol-shape hrefs (-p-NNN): ${trendyolHrefs.length}`);
  console.log(`N11-shape hrefs (/urun/...):   ${n11Hrefs.length}`);
  if (trendyolHrefs.length) console.log("  TY sample:", trendyolHrefs.slice(0, 3));
  if (n11Hrefs.length) console.log("  N11 sample:", n11Hrefs.slice(0, 3));

  console.log("--- HEAD (first 600 chars, whitespace collapsed) ---");
  console.log(html.slice(0, 600).replace(/\s+/g, " "));
  console.log("--- /HEAD ---");

  const ldMatches = html.match(/<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi) ?? [];
  console.log(`JSON-LD blocks: ${ldMatches.length}`);

  const next = /<script id="__NEXT_DATA__"/i.test(html);
  console.log("__NEXT_DATA__ present:", next);
  const winHits = html.match(/window\.__\w+__\s*=/g) ?? [];
  console.log("window.__X__ hits:", winHits.slice(0, 5));
}

console.log("\nDone.");
