// Internal API isteklerini doğrulamak için kullanılır
// Client → /api/internal/* route'larına bu header ile istek atar

export const API_SECRET_HEADER = 'x-internal-secret'

export function validateApiSecret(req: Request): boolean {
  const secret = req.headers.get(API_SECRET_HEADER)
  return secret === process.env.INTERNAL_API_SECRET
}

// Client tarafında kullanmak için (NEXT_PUBLIC_ olmadığı için doğrudan kullanılamaz)
// Bunun yerine /api/internal/* route'ları Supabase session token ile doğrular
export function getAuthHeader(sessionToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }
  return headers
}
