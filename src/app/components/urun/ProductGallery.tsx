"use client";
import { useState } from "react";

const images = ["📱", "🔋", "📷", "🖥️", "📦"];

export default function ProductGallery() {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="bg-white border border-[#E8E4DF] rounded-2xl h-72 flex items-center justify-center text-8xl mb-3 relative">
        <span className="absolute top-3 left-3 bg-[#E8460A] text-white text-xs font-semibold px-2 py-1 rounded-full">
          🔥 Çok Satan
        </span>
        {images[active]}
      </div>
      <div className="flex gap-2">
        {images.map((img, i) => (
          <div
            key={i}
            onClick={() => setActive(i)}
            className={`w-14 h-14 bg-white border-2 rounded-xl flex items-center justify-center text-xl cursor-pointer transition-all ${
              active === i ? "border-[#E8460A]" : "border-[#E8E4DF]"
            }`}
          >
            {img}
          </div>
        ))}
      </div>
    </div>
  );
}