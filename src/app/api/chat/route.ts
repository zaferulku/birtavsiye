import { NextResponse } from "next/server";
import { nimChat, type ChatMessage } from "../../../lib/ai/nimClient";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Sen birtavsiye.net'in yapay zeka ürün danışmanısın.

Görevin:
- Türk e-ticaret ürünleri hakkında bilgi vermek (telefon, laptop, tv, ev aleti, giyim, kozmetik)
- Kullanıcıya uygun ürün önermek, kategori yönlendirmesi yapmak
- Fiyat karşılaştırma ve özellik sorularına yanıt vermek
- Kısa, net, Türkçe cevaplar ver (maks 4-5 cümle)

Kurallar:
- Kesin bilmediğin fiyat/stok bilgisi için "birtavsiye.net'te karşılaştırabilirsin" yönlendirmesi yap
- Dış site linki paylaşma
- Spesifik ürün modelinde fikir sorunca 2-3 alternatif ver, karşılaştır
- Yanıtların Türkçe, sade, reklam dili olmadan
- Ürün URL paylaşma (henüz tool calling yok, yanlış link üretebilirsin)`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[] | undefined;
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    const trimmed = messages.slice(-20);

    const fullMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmed,
    ];

    const reply = await nimChat({
      model: "meta/llama-3.3-70b-instruct",
      messages: fullMessages,
      temperature: 0.3,
      maxTokens: 512,
    });

    return NextResponse.json({ reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
