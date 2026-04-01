"use client";
import { useState } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import FeaturedProducts from "./components/home/FeaturedProducts";
import TopicFeed from "./components/home/TopicFeed";

type View = "both" | "urunler" | "tavsiye";

export default function Home() {
  const [view, setView] = useState<View>("both");

  return (
    <main className="min-h-screen bg-[#F4F2EE]">
      <Header />

      {/* Sub-bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[88px] z-40">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between h-11">

          {/* Panel Seçici */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("urunler")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === "urunler" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Ürünler
            </button>
            <button
              onClick={() => setView("both")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === "both" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              İkili Görünüm
            </button>
            <button
              onClick={() => setView("tavsiye")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                view === "tavsiye" ? "bg-white shadow text-gray-800" : "text-gray-500 hover:text-gray-700"
              }`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              Tavsiyeler
            </button>
          </div>

          {/* Sağ kısım: bilgi */}
          <div className="text-xs text-gray-400 hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
              Canlı tavsiye akışı
            </span>
            <span>Fiyatlar anlık güncellenir</span>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="max-w-[1400px] mx-auto" style={{ minHeight: "calc(100vh - 140px)" }}>

        {/* İKİLİ GÖRÜNÜM */}
        {view === "both" && (
          <div className="flex h-full">

            {/* Sol: Ürünler */}
            <div className="flex-1 min-w-0 px-5 py-5 border-r border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">Ürünler & Fiyat Karşılaştırma</h2>
                  <p className="text-xs text-gray-400 mt-0.5">En düşük fiyatı bul, mağazaları karşılaştır</p>
                </div>
                <button onClick={() => setView("urunler")} className="text-xs text-[#E8460A] font-semibold hover:underline hidden sm:block">
                  Tam Ekran →
                </button>
              </div>
              <FeaturedProducts />
            </div>

            {/* Sağ: Tavsiyeler */}
            <div className="w-[420px] flex-shrink-0 px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">Bana Bir Tavsiye</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Topluluktan gerçek zamanlı tavsiyeler</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-400">Canlı</span>
                </div>
              </div>
              <TopicFeed />
            </div>

          </div>
        )}

        {/* SADECE ÜRÜNLER */}
        {view === "urunler" && (
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-extrabold text-xl text-gray-900">Ürünler & Fiyat Karşılaştırma</h2>
                <p className="text-sm text-gray-400 mt-1">En düşük fiyatı bul, mağazaları karşılaştır</p>
              </div>
              <button onClick={() => setView("both")} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:border-gray-400 transition-all">
                ← İkili Görünüm
              </button>
            </div>
            <FeaturedProducts />
          </div>
        )}

        {/* SADECE TAVSİYELER */}
        {view === "tavsiye" && (
          <div className="max-w-3xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-extrabold text-xl text-gray-900">Bana Bir Tavsiye</h2>
                <p className="text-sm text-gray-400 mt-1">Topluluktan gerçek zamanlı tavsiyeler</p>
              </div>
              <button onClick={() => setView("both")} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg text-gray-500 hover:border-gray-400 transition-all">
                ← İkili Görünüm
              </button>
            </div>
            <TopicFeed />
          </div>
        )}

      </div>

      <Footer />
    </main>
  );
}
