"use client";
import { useState } from "react";

interface Props {
  productId: string;
  currentPrice: number | null;
}

export default function PriceAlertModal({ productId, currentPrice }: Props) {
  const [open, setOpen]     = useState(false);
  const [email, setEmail]   = useState("");
  const [target, setTarget] = useState(currentPrice ? String(Math.floor(Number(currentPrice) * 0.9)) : "");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/price-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, email, target_price: Number(target) }),
    });
    if (res.ok) {
      setStatus("ok");
    } else {
      const d = await res.json();
      setErrMsg(d.error || "Hata oluştu");
      setStatus("err");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-amber-50 border-t border-amber-100 px-4 py-3 text-xs text-amber-700 hover:bg-amber-100 transition-all font-medium text-left"
      >
        🔔 Fiyat düşünce haber ver — Alarm kur
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>

            {status === "ok" ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-3">✅</div>
                <div className="font-bold text-gray-800 mb-1">Alarm kuruldu!</div>
                <div className="text-sm text-gray-500 mb-4">
                  Fiyat hedef fiyatın altına düştüğünde e-posta ile bildirim alacaksın.
                </div>
                <button onClick={() => { setOpen(false); setStatus("idle"); }}
                  className="text-sm text-[#E8460A] font-semibold">Kapat</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-base">🔔 Fiyat Alarmı</h2>
                  <button type="button" onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                </div>

                {currentPrice && (
                  <div className="bg-gray-50 rounded-xl px-4 py-2 mb-4 text-sm text-gray-500">
                    Şu anki fiyat:{" "}
                    <span className="font-bold text-gray-800">
                      {Number(currentPrice).toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                )}

                <label className="block text-xs font-semibold text-gray-600 mb-1">Hedef fiyat (₺)</label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  required
                  min={1}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-[#E8460A] focus:ring-1 focus:ring-[#E8460A]/20"
                  placeholder="örn: 11000"
                />

                <label className="block text-xs font-semibold text-gray-600 mb-1">E-posta adresin</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 outline-none focus:border-[#E8460A] focus:ring-1 focus:ring-[#E8460A]/20"
                  placeholder="ornek@email.com"
                />

                {status === "err" && (
                  <p className="text-xs text-red-500 mb-3">{errMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-[#E8460A] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#C93A08] transition-all disabled:opacity-50"
                >
                  {status === "loading" ? "Kaydediliyor…" : "Alarm Kur"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
