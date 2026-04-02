import { createClient } from '@supabase/supabase-js'

// Server-only client — service_role key ile, tarayıcıya hiç gönderilmez
// Yalnızca Next.js API route ve server component'lerde kullan
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil')
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
