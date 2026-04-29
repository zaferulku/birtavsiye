import { NextRequest, NextResponse } from 'next/server'

// Maintenance kill-switch: env-driven (MAINTENANCE_MODE=true → 503 all traffic).
// Code push gerektirmez; Vercel env değişkeniyle açılır/kapanır.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === "true"

// Rate limiting için basit in-memory store (production'da Redis kullanılmalı)
const rateLimit = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60       // 60 istek
const RATE_WINDOW = 60_000  // 1 dakika

function getRateLimitKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }

  if (entry.count >= RATE_LIMIT) return true
  entry.count++
  return false
}

export function proxy(req: NextRequest) {
  if (MAINTENANCE_MODE) {
    return new NextResponse(
      'Site geçici olarak bakımda — Yarın tekrar deneyin',
      {
        status: 503,
        headers: {
          'Retry-After': '86400',
          'Content-Type': 'text/plain; charset=utf-8',
        },
      },
    )
  }

  const { pathname } = req.nextUrl

  const res = NextResponse.next()

  // API route'larına rate limiting uygula
  if (pathname.startsWith('/api/')) {
    const key = getRateLimitKey(req)
    if (isRateLimited(key)) {
      return new NextResponse(
        JSON.stringify({ error: 'Çok fazla istek. Lütfen bekleyin.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // /api/internal/* route'larına ek doğrulama
    if (pathname.startsWith('/api/internal/')) {
      const secret = req.headers.get('x-internal-secret')
      if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return new NextResponse(
          JSON.stringify({ error: 'Yetkisiz erişim' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
