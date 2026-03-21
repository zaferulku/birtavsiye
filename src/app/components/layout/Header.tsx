export default function Header() {
  return (
    <header className="bg-white border-b border-[#E8E4DF] px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center gap-4 h-14">
        <div className="font-syne font-extrabold text-xl">
          <span className="text-[#E8460A]">bir</span>
          <span className="text-[#0F0E0D]">tavsiye</span>
          <span className="text-[#6B6760]">.net</span>
        </div>
        <div className="flex-1 flex items-center bg-[#F8F6F2] border border-[#E8E4DF] rounded-xl px-4 gap-2 h-10">
          <span className="text-[#A8A49F]">🔍</span>
          <input
            type="text"
            placeholder="Ürün, kategori veya marka ara..."
            className="flex-1 bg-transparent text-sm outline-none text-[#0F0E0D] placeholder:text-[#A8A49F]"
          />
        </div>
        <button className="bg-[#E8460A] text-white rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
          Fiyat Karşılaştır
        </button>
      </div>
    </header>
  );
}