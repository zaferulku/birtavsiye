@AGENTS.md
@~/.claude/skills/birtavsiye-patterns/SKILL.md

# birtavsiye

Next.js 16 + Supabase + Tailwind v4 Türk ürün öneri platformu.

## Kritik Kurallar

- `TopicFeed.tsx` değişince `tavsiyeler/page.tsx` de kontrol et — ikisi birlikte değişiyor
- Supabase: server component'larda `supabaseServer.ts`, client component'larda `supabase.ts`
- DB değişikliği = `scripts/add-<özellik>.sql` dosyası oluştur
- Realtime subscription'larda mutlaka `useEffect` cleanup ile `removeChannel` çağır
- Hero.tsx, QuickLinks.tsx, BlogSection.tsx kasıtlı kaldırıldı — yeniden ekleme
- Bir özelliği uygulamadan önce git log'da revert var mı kontrol et
- Commit mesajları `feat:/fix:/redesign:/security:` + Türkçe açıklama
