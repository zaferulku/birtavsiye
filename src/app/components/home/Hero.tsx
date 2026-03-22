import Link from "next/link";

export default function Hero() {
  return (
    <section className="bg-[#0F0E0D] text-white px-6 py-12">
      <div className="max-w-6xl mx-auto grid grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="font-syne font-extrabold text-4xl leading-tight mb-3">
            Doğru ürünü bul,{" "}
            <em className="text-[#FF6B35] not-italic">en ucuza</em> satın al
          </h1>
          <p className="text-[#888] text-sm mb-6 leading-relaxed">
            Topluluk tavsiyeleri ve gerçek zamanlı fiyat karşılaştırması ile
            akıllıca alışveriş yap.
          </p>
          <div className="flex gap-6 mt-5">
            {[
              { n: "250K+", l: "Ürün" },
              { n: "85+", l: "Mağaza" },
              { n: "4.2M", l: "Kullanıcı" },
              { n: "%38", l: "Ort. Tasarruf" },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="font-syne font-bold text-xl">{s.n}</div>
                <div className="text-[#666] text-xs mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="bg-[#E8460A] text-white text-xs font-semibold px-3 py-1 rounded-full inline-block mb-3">
            🏆 Bu Haftanın Favorisi
          </div>
          <div className="bg-white/10 rounded-xl h-36 flex items-center justify-center text-5xl mb-3">
            💻
          </div>
          <div className="font-syne font-bold text-lg mb-2">MacBook Air M3 13"</div>
          <div className="flex items-center gap-3">
            <span className="text-[#FF6B35] font-bold text-xl">47.499 ₺</span>
            <Link href="/urun/macbook-air-m3">
              <span className="bg-[#E8460A]/20 text-[#FF6B35] text-xs px-2 py-1 rounded cursor-pointer hover:bg-[#E8460A]/40 transition-all">
                En Ucuz · 12 Mağaza
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}