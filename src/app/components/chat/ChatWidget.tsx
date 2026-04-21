"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type ProductCard = { id: string; title: string; slug: string; brand: string | null; image_url: string | null };
type Msg = { role: "user" | "assistant"; content: string; products?: ProductCard[]; image?: string };

const INITIAL_MSG: Msg = {
  role: "assistant",
  content: "Merhaba! Aklın mı karışık? Ne aradığını yaz, beraber bulalım.",
};

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text && !pendingImage) return;
    if (loading) return;
    setInput("");
    const imageToSend = pendingImage;
    setPendingImage(null);
    setOpen(true);
    const next: Msg[] = [...messages, { role: "user", content: text || "(görsel ile arama)", image: imageToSend ?? undefined }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, imageBase64: imageToSend }),
      });
      const j = await res.json();
      if (j.reply) {
        setMessages([...next, { role: "assistant", content: j.reply, products: j.products }]);
      } else {
        setMessages([...next, { role: "assistant", content: "Bir hata oluştu, tekrar dene." }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Bağlantı hatası, tekrar dene." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleBarKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { alert("Görsel 5MB'dan büyük olamaz."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (result) setPendingImage(result);
    };
    reader.readAsDataURL(f);
  }

  function toggleRecording() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      alert("Tarayıcın ses tanımayı desteklemiyor. Chrome veya Edge kullan.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "tr-TR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    setRecording(true);
    try { rec.start(); } catch { setRecording(false); }
  }

  return (
    <>
      {/* Konuşma paneli — sağ kenarda, sadece send'den sonra açık */}
      {open && (
        <div className="fixed right-4 bottom-24 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(48vh,480px)] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-[#0F0E0D] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <div className="font-bold text-sm">birtavsiye Asistan</div>
              <div className="text-[10px] text-gray-400">Ürün danışmanı</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition"
              aria-label="Paneli kapat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} gap-2`}>
                {m.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.image} alt="Gönderilen görsel" className="max-w-[200px] max-h-[200px] rounded-xl border border-gray-200" />
                )}
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#E8460A] text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.products && m.products.length > 0 && (
                  <div className="w-full grid grid-cols-2 gap-2">
                    {m.products.slice(0, 6).map(p => (
                      <Link key={p.id} href={`/urun/${p.slug}`} className="bg-white border border-gray-200 rounded-xl p-2 hover:border-[#E8460A] hover:shadow-sm transition group">
                        <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden mb-1.5 flex items-center justify-center">
                          {p.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image_url} alt={p.title} className="w-full h-full object-contain p-1 group-hover:scale-105 transition" />
                          ) : (
                            <span className="text-2xl">📦</span>
                          )}
                        </div>
                        <div className="text-[9px] font-bold text-[#E8460A] uppercase truncate">{p.brand}</div>
                        <div className="text-[10px] font-medium text-gray-800 line-clamp-2 leading-tight">{p.title}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-2xl rounded-bl-sm text-xs">
                  Yazıyor<span className="animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Sabit alt bar — yeri asla değişmez */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(720px,calc(100vw-2rem))]">
        {pendingImage && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow px-3 py-2 mb-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingImage} alt="Yüklenen görsel" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 text-xs text-gray-600">Görsel ile arama — bir soru ekleyip gönder</div>
            <button
              onClick={() => setPendingImage(null)}
              className="text-gray-400 hover:text-gray-700 transition"
              aria-label="Görseli kaldır"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-full shadow-lg flex items-center gap-2 pl-3 pr-2 py-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePick}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-[#E8460A] hover:bg-gray-50 transition"
            aria-label="Görsel ekle"
            title="Görsel ile arama"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleBarKey}
            placeholder="Aklın mı karışık? Ne aradığını yaz, beraber bulalım."
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400 py-1 min-w-0"
            disabled={loading}
          />

          {input.trim() || pendingImage ? (
            <button
              type="button"
              onClick={() => send()}
              className="flex-shrink-0 bg-[#E8460A] hover:bg-[#C93A08] text-white rounded-full w-9 h-9 flex items-center justify-center transition"
              aria-label="Gönder"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleRecording}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full transition text-sm font-medium ${recording ? "bg-red-50 text-red-600 animate-pulse" : "text-gray-600 hover:bg-gray-50"}`}
              aria-label="Sesle ara"
              title="Sesle ara"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0M12 18v3M12 3a3 3 0 00-3 3v5a3 3 0 106 0V6a3 3 0 00-3-3z" />
              </svg>
              <span>{recording ? "Dinleniyor…" : "Ses"}</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
