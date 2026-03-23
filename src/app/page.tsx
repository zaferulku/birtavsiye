"use client";
import { useState } from "react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import FeaturedProducts from "./components/home/FeaturedProducts";
import TopicFeed from "./components/home/TopicFeed";

export default function Home() {
  const [view, setView] = useState<"both" | "urunler" | "tavsiye">("both");

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      {/* Geçiş ikonları */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-center gap-1.5 py-2">

          <button onClick={() => setView("urunler")} title="Sadece Ürünler"
  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
    view === "urunler" ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
  }`}>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
</button>

<button onClick={() => setView("both")} title="İkili Görünüm"
  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
    view === "both" ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
  }`}>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" />
  </svg>
</button>

<button onClick={() => setView("tavsiye")} title="Sadece Tavsiye"
  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
    view === "tavsiye" ? "bg-orange-100 text-orange-500" : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
  }`}>
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
</button>

        </div>
      </div>

      {/* İkili görünüm */}
      {view === "both" && (
        <div className="max-w-[1400px] mx-auto flex" style={{ minHeight: "calc(100vh - 130px)" }}>

          <div className="flex-1 px-6 py-6" style={{ background: "rgba(219, 234, 254, 0.2)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-gray-700">Ürünlerde Ara</h2>
            </div>
            <FeaturedProducts />
          </div>

          <div className="w-px bg-gray-200 flex-shrink-0" />

          <div className="flex-1 px-6 py-6" style={{ background: "rgba(243, 244, 246, 0.5)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base text-gray-700">Bana Bir Tavsiye</h2>
            </div>
            <TopicFeed />
          </div>

        </div>
      )}

      {/* Sadece Ürünler */}
      {view === "urunler" && (
        <div className="max-w-[1400px] mx-auto px-8 py-6" style={{ minHeight: "calc(100vh - 130px)", background: "rgba(219, 234, 254, 0.2)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl text-gray-800">Ürünlerde Ara</h2>
            <button onClick={() => setView("both")}
              className="text-xs text-blue-400 hover:text-blue-600 font-medium border border-blue-100 px-2.5 py-1 rounded-full hover:bg-blue-50 transition-all">
              ← İkili Görünüm
            </button>
          </div>
          <FeaturedProducts />
        </div>
      )}

      {/* Sadece Tavsiye */}
      {view === "tavsiye" && (
        <div className="max-w-[1400px] mx-auto px-8 py-6" style={{ minHeight: "calc(100vh - 130px)", background: "rgba(243, 244, 246, 0.5)" }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-xl text-gray-800">Bana Bir Tavsiye</h2>
            <button onClick={() => setView("both")}
              className="text-xs text-gray-400 hover:text-gray-600 font-medium border border-gray-200 px-2.5 py-1 rounded-full hover:bg-gray-100 transition-all">
              ← İkili Görünüm
            </button>
          </div>
          <TopicFeed />
        </div>
      )}

      <Footer />
    </main>
  );
}