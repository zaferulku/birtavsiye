/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.mmsrg.com' },       // MediaMarkt
      { protocol: 'https', hostname: 'cdn-img.pttavm.com' },     // PttAVM
      { protocol: 'https', hostname: 'productimages.hepsiburada.net' }, // Hepsiburada
      { protocol: 'https', hostname: 'cdn.dsmcdn.com' },         // Trendyol/DSM
      { protocol: 'https', hostname: 'cdn.trendyol.com' },       // Trendyol
      { protocol: 'https', hostname: 'm.media-amazon.com' },     // Amazon
      { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
      { protocol: 'https', hostname: 'n11scdn.akamaized.net' },  // N11
      { protocol: 'https', hostname: 'n11scdn1.akamaized.net' },
      { protocol: 'https', hostname: 'n11scdn2.akamaized.net' },
      { protocol: 'https', hostname: 'n11scdn3.akamaized.net' },
      { protocol: 'https', hostname: 'n11scdn4.akamaized.net' },
      { protocol: 'https', hostname: 'www.vatanbilgisayar.com' },
      { protocol: 'https', hostname: 'cdn.vatanbilgisayar.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' kaldırıldı (RCE riski).
              // 'unsafe-inline' geçici — TODO: nonce-based CSP migrasyonu (proxy.ts üzerinden per-request nonce inject)
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
