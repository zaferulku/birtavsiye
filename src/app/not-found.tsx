import Link from "next/link";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";

export default function NotFound() {
  return (
    <main className="bg-gray-50 min-h-screen">
      <Header />
      <div className="max-w-[1400px] mx-auto px-8 py-20 flex flex-col items-center justify-center text-center">
        
        <div className="text-[120px] font-extrabold text-gray-100 leading-none select-none mb-4">
          404
        </div>
        
        <div className="text-2xl font-bold text-gray-800 mb-3">
          Sayfa Bulunamadi
        </div>
        
        <p className="text-sm text-gray-500 mb-8 max-w-md leading-relaxed">
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
          Ana sayfaya dönerek devam edebilirsiniz.
        </p>

        <div className="flex items-center gap-3">
          <Link href="/">
            <div className="px-6 py-3 bg-[#E8460A] text-white text-sm font-bold rounded-xl hover:bg-[#C93A08] transition-all cursor-pointer">
              Ana Sayfaya Don
            </div>
          </Link>
          <Link href="/ara?q=">
            <div className="px-6 py-3 border-2 border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-[#E8460A] hover:text-[#E8460A] transition-all cursor-pointer">
              Urun Ara
            </div>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 w-full max-w-lg">
          {[
            { href: "/kategori/elektronik", icon: "📱", label: "Elektronik" },
            { href: "/kategori/kozmetik", icon: "💄", label: "Kozmetik" },
            { href: "/kategori/spor", icon: "👟", label: "Spor" },
          ].map((c) => (
            <Link href={c.href} key={c.label}>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center hover:border-[#E8460A] hover:shadow-sm transition-all cursor-pointer">
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="text-xs font-medium text-gray-600">{c.label}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
      <Footer />
    </main>
  );
}