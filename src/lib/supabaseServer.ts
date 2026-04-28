import { createClient } from '@supabase/supabase-js'

// Server-only client — service_role key ile, tarayıcıya hiç gönderilmez
// Yalnızca Next.js API route ve server component'lerde kullan
//
// NOT: Module-level throw kaldırıldı (önceden env eksikse build prerender
// sırasında "Failed to collect page data for /api/cron/affiliate" hatası
// veriyordu — module evaluate her import'ta crash ediyordu). Env doluyken
// davranış aynı; eksikse warn + placeholder client (request atılınca runtime'da
// DNS/auth hatası alınır, build kırılmaz).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[supabaseServer] SUPABASE_SERVICE_ROLE_KEY tanımlı değil — server query'leri runtime'da fail edecek. " +
      'Vercel → Project Settings → Environment Variables → SUPABASE_SERVICE_ROLE_KEY ekle (Production+Preview+Development).',
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
