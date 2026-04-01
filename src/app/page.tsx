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
    <main className="min-h-screen" style={{ background: "#F5F4F0" }}>
      <Header />

      {/* Toggle bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-center gap-1 py-2">
          <button
            onClick={() => setView("urunler")}
            title="Ürünler"
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              view === "urunler"
                ? "bg-[#E8460A]/10 text-[#E8460A]"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </button>

          <button
            onClick={() => setView("both")}
            title="İkili Görünüm"
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              view === "both"
                ? "bg-gray-900 text-white"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </button>

          <button
            onClick={() => setView("tavsiye")}
            title="Tavsiyeler"
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              view === "tavsiye"
                ? "bg-[#E8460A]/10 text-[#E8460A]"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </button>
        </div>
      </div>

      {/* İkili görünüm */}
      {view === "both" && (
        <div className="max-w-[1440px] mx-auto flex" style={{ minHeight: "calc(100vh - 132px)" }}>
          <div className="flex-1 min-w-0 bg-white border-r border-gray-200">
            <div className="px-6 pt-5 pb-1 flex items-center justify-between border-b border-gray-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#E8460A]">Ürünler</span>
                <h2 className="font-bold text-sm text-gray-800 mt-0.5">Fiyat Karşılaştır</h2>
              </div>
              <button onClick={() => setView("urunler")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
                Tam ekran
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <FeaturedProducts />
            </div>
          </div>

          <div className="w-[460px] flex-shrink-0 bg-[#FAFAF9]">
            <div className="px-5 pt-5 pb-1 flex items-center justify-between border-b border-gray-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#E8460A]">Topluluk</span>
                <h2 className="font-bold text-sm text-gray-800 mt-0.5">Bana Bir Tavsiye</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-400">Canlı</span>
                <button onClick={() => setView("tavsiye")} className="text-xs text-gray-400 hover:text-gray-600 ml-2 flex items-center gap-1 transition-colors">
                  Tam ekran
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                </button>
              </div>
            </div>
            <div className="px-5 py-4">
              <TopicFeed compact />
            </div>
          </div>
        </div>
      )}

      {/* Sadece Ürünler */}
      {view === "urunler" && (
        <div className="max-w-[1440px] mx-auto bg-white" style={{ minHeight: "calc(100vh - 132px)" }}>
          <div className="px-8 pt-5 pb-1 flex items-center justify-between border-b border-gray-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E8460A]">Ürünler</span>
              <h2 className="font-bold text-lg text-gray-800 mt-0.5">Fiyat Karşılaştır</h2>
            </div>
            <button onClick={() => setView("both")} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
              İkili görünüm
            </button>
          </div>
          <div className="px-8 py-5">
            <FeaturedProducts />
          </div>
        </div>
      )}

      {/* Sadece Tavsiye */}
      {view === "tavsiye" && (
        <div className="max-w-[1440px] mx-auto" style={{ minHeight: "calc(100vh - 132px)", background: "#FAFAF9" }}>
          <div className="px-8 pt-5 pb-1 flex items-center justify-between border-b border-gray-100">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#E8460A]">Topluluk</span>
              <h2 className="font-bold text-lg text-gray-800 mt-0.5">Bana Bir Tavsiye</h2>
            </div>
            <button onClick={() => setView("both")} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-400 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>
              İkili görünüm
            </button>
          </div>
          <div className="px-8 py-5">
            <TopicFeed />
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
