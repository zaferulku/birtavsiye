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
- Türk e-ticaret ürünleri hakkında bilgi vermek (telefon, laptop, tv, ev aleti, giyim, kozmetik)
- Kullanıcıya uygun ürün önermek, kategori yönlendirmesi yapmak
- Fiyat karşılaştırma ve özellik sorularına yanıt vermek
- Kısa, net, Türkçe cevaplar ver (maks 4-5 cümle)

Kurallar:
- Aşağıdaki "Bulunan Ürünler" listesi verilirse yanıtın onlardan seçilmeli
- Ürün URL'sini yanıta KOYMA — UI kartlar olarak ayrıca gösterecek
- Sadece listeden ürünü 1-3 tane öner, kullanıcıya neden uygun olduğunu açıkla
- Liste boşsa: "Şu an eşleşen ürün bulamadım, daha spesifik tarif eder misin?" de
- Dış site linki paylaşma
- Yanıtların Türkçe, sade, reklam dili olmadan`;

async function findRelevantProducts(userQuery: string): Promise<MatchedProduct[]> {
  try {
    const vecs = await nimEmbed({ input: userQuery });
    const queryVec = vecs[0];
    if (!queryVec) return [];
    const { data, error } = await sb.rpc("match_products", {
      query_embedding: queryVec,
      match_count: 6,
      min_similarity: 0.35,
    });
    if (error) {
      console.error("match_products RPC error:", error.message);
      return [];
    }
    return (data ?? []) as MatchedProduct[];
  } catch (e) {
    console.error("embed error:", e instanceof Error ? e.message : e);
    return [];
  }
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
