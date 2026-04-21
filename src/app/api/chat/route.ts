import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nimChat, nimEmbed, type ChatMessage } from "../../../lib/ai/nimClient";

export const runtime = "nodejs";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type MatchedProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  model_family: string | null;
  image_url: string | null;
  category_id: string | null;
  similarity: number;
};

const SYSTEM_PROMPT_BASE = `Sen birtavsiye.net'in yapay zeka ürün danışmanısın.

Görevin:
- Kullanıcının **tarifi, fotoğrafı veya sesli komutu** ile doğru ürünü bulmasına yardım etmek
- Türk e-ticaret ürünleri (telefon, laptop, tv, ev aleti, giyim, kozmetik, anne-bebek, spor, oto, kitap vb.) hakkında bilgi vermek
- Kategori yönlendirmesi, fiyat karşılaştırması, özellik karşılaştırması yapmak
- Kısa, net, Türkçe cevaplar ver (maks 4-5 cümle)

Kurallar:
- Aşağıdaki "Bulunan Ürünler" listesi verilirse yanıtın onlardan seçilmeli
- Ürün URL'sini yanıta KOYMA — UI kartlar olarak ayrıca gösterecek
- 1-3 ürün öner, neden uygun olduğunu açıkla (özellik/fiyat/marka gerekçesi)
- Liste boşsa: daha spesifik tarif iste (renk, marka, bütçe, kullanım amacı)
- Dış site linki paylaşma
- Kesin fiyat verme — "yaklaşık X TL" veya "en düşük X TL'den" formatı
- Yanıtlar Türkçe, samimi, reklam dili olmadan

Muğlak sorguda netleştirme soruları sor:
- "spor ayakkabı" → "Koşu, yürüyüş mü yoksa basketbol mu? Ayak numaranız?"
- "anneme hediye" → "Yaş, ilgi alanı, bütçe?"
- "iyi bir laptop" → "Oyun mu, iş mi, öğrenci mi? Bütçe?"

Fiyat/özellik sorusunda:
- "10000 TL altı X" → query'yi fiyat filtresiyle eşle, uygun 3 ürünü listele
- "A ile B farkı" → her ikisinin kritik farklarını özetle

Görsel (imageBase64) geldiğinde:
- Önce görseli kısa bir cümleyle betimle (ör: "Siyah titanyum iPhone 15 Pro görüyorum")
- Sonra benzer ürünleri listeden öner
- Görselde marka/model net değilse kullanıcıdan teyit iste`;

async function findRelevantProducts(userQuery: string): Promise<MatchedProduct[]> {
  // 1) NVIDIA embed varsa vector similarity
  try {
    const vecs = await nimEmbed({ input: userQuery });
    const queryVec = vecs[0];
    if (queryVec) {
      const { data } = await sb.rpc("match_products", {
        query_embedding: queryVec,
        match_count: 6,
        min_similarity: 0.35,
      });
      if (data && data.length > 0) return data as MatchedProduct[];
    }
  } catch (e) {
    console.warn("embed fallback:", e instanceof Error ? e.message : e);
  }

  // 2) Keyword fallback — title ilike
  const words = userQuery.split(/\s+/).filter(w => w.length >= 3).slice(0, 4);
  if (words.length === 0) return [];
  const pattern = "%" + words.join("%") + "%";
  const { data } = await sb
    .from("products")
    .select("id, title, slug, brand, model_family, image_url, category_id")
    .ilike("title", pattern)
    .limit(6);
  return (data ?? []).map(p => ({ ...p, similarity: 0.5 })) as MatchedProduct[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[] | undefined;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const lastUser = [...messages].reverse().find(m => m.role === "user");
    const products = lastUser?.content ? await findRelevantProducts(lastUser.content) : [];

    const productContext = products.length > 0
      ? `\n\nBulunan Ürünler (similarity-ordered):\n` + products.map((p, i) =>
          `${i + 1}. ${p.brand ? p.brand + " " : ""}${p.model_family ?? p.title} — slug:${p.slug} (similarity: ${p.similarity.toFixed(2)})`
        ).join("\n")
      : `\n\n(Eşleşen ürün bulunamadı — genel sorular için listeye gerek yok, spesifik öneri soruluyorsa kullanıcıdan daha detay iste.)`;

    const systemPrompt = SYSTEM_PROMPT_BASE + productContext;

    const trimmed = messages.slice(-20);
    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...trimmed,
    ];

    const reply = await nimChat({
      model: "meta/llama-3.3-70b-instruct",
      messages: fullMessages,
      temperature: 0.3,
      maxTokens: 512,
    });

    return NextResponse.json({
      reply,
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        brand: p.brand,
        image_url: p.image_url,
      })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
