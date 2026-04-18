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
- Birden fazla dosyaya dokunan büyük değişikliklerden önce kullanıcıya `npm run backup` öner — otomatik çalıştırma, onay iste (allowlist: `src scripts public .claude/agents`)
- Geri alma: `npm run undo` (soft reset, değişiklikler staged kalır); `npm run history` son 20 commit; `npm run status` kısa durum
