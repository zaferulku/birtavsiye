/**
 * Intent type — kullanıcının üst-düzey niyeti.
 *
 * Bu state.category_slug / brand_filter'dan FARKLI bir kategoriye girer.
 * intent_type cevabın TÜRÜNÜ belirler (ürün listele mi, bilgi ver mi, selamla mı).
 * Filters cevabın İÇERİĞİNİ daraltır.
 *
 * Felsefe:
 * - product_search: %80 vakaları kapsıyor — varsayılan
 * - knowledge_query: KB'den bilgi (parfüm notaları, cilt tipleri vb.)
 * - store_help: kargo/iade/garanti — forum + KB karışımı
 * - greeting/smalltalk: ürün açma, kısa cevap
 * - off_topic: kibarca konuyu geri getir
 */
export type IntentType =
  | "product_search"
  | "knowledge_query"
  | "store_help"
  | "greeting"
  | "smalltalk"
  | "off_topic";

/**
 * Hangi intent_type hangi backend yolunu kullanır?
 */
export const INTENT_ROUTING: Record<
  IntentType,
  {
    needs_smart_search: boolean;
    needs_knowledge: boolean;
    needs_forum: boolean;
    short_response: boolean;
  }
> = {
  product_search: {
    needs_smart_search: true,
    needs_knowledge: false,
    needs_forum: false,
    short_response: false,
  },
  knowledge_query: {
    needs_smart_search: false,
    needs_knowledge: true,
    needs_forum: false,
    short_response: false,
  },
  store_help: {
    needs_smart_search: false,
    needs_knowledge: true,
    needs_forum: true,
    short_response: false,
  },
  greeting: {
    needs_smart_search: false,
    needs_knowledge: false,
    needs_forum: false,
    short_response: true,
  },
  smalltalk: {
    needs_smart_search: false,
    needs_knowledge: false,
    needs_forum: false,
    short_response: true,
  },
  off_topic: {
    needs_smart_search: false,
    needs_knowledge: false,
    needs_forum: false,
    short_response: true,
  },
};

/**
 * Heuristic pre-classifier — LLM'e gitmeden önce hızlı sınıflandırma.
 * Eğer açık bir match varsa LLM'i atla, response süresini düşür.
 *
 * Match yoksa null döner — caller fallback'e (product_search default) gider.
 */
// Vocative tail allowed: "selam claude", "merhaba dostum" — but only one extra
// word, so "merhaba telefon arıyorum" still falls through to LLM/product_search.
const GREETING_PATTERNS = [
  /^(merhaba|selam|hey|hello|hi|sa|selamün aleyküm|günaydın|iyi akşamlar|iyi geceler)([,\s]+\w+)?\.?!?\??$/i,
  /^(naber|nasılsın|nasılsınız)\??$/i,
];
const THANKS_PATTERNS = [
  /^(teşekkür(ler)?|sağol(asın)?|eyvallah|sağ ol|tşk|tesekkur|tesekkurler|thanks)\.?!?$/i,
];
const SMALLTALK_PATTERNS = [
  /^(napıyorsun|ne haber|nasıl gidiyor)\??$/i,
];
const STORE_HELP_PATTERNS = [
  /\b(kargo|gönderim|teslimat|iade|iadem|garanti|fatura|kapıda ödeme|havale|kredi kartı taksit|şifre(mi)?|hesab(ım|ımı)|üyelik|abonelik|aboneliğ)\b/i,
];
const KNOWLEDGE_PATTERNS = [
  /\b(nedir|ne demek|nasıl|nelerdir|farkı (ne|nedir)|tipi|tipleri|nota(ları|sı)|cilt tipi|saç tipi|hangi (durumda|şartta))\b/i,
];

export function heuristicClassify(message: string): IntentType | null {
  const m = message.trim();
  if (!m) return null;
  if (m.length > 120) return null; // uzun mesaj → LLM/default karar versin

  for (const p of GREETING_PATTERNS) if (p.test(m)) return "greeting";
  for (const p of THANKS_PATTERNS) if (p.test(m)) return "smalltalk";
  for (const p of SMALLTALK_PATTERNS) if (p.test(m)) return "smalltalk";
  for (const p of STORE_HELP_PATTERNS) if (p.test(m)) return "store_help";

  // KNOWLEDGE: ama "iphone nedir" → product_inquiry/search değil bilgi
  // "kargo nasıl" → store_help (üstte yakalanır)
  // "parfüm notası nedir" → knowledge_query
  for (const p of KNOWLEDGE_PATTERNS) {
    if (p.test(m)) {
      // Eğer mesajda spesifik ürün/marka geçiyorsa product_search'e bırak
      // Tek başına "nedir" / "nasıl" sorusu → knowledge
      if (m.split(/\s+/).length <= 6) return "knowledge_query";
    }
  }

  return null; // caller default'a (product_search) düşer
}
