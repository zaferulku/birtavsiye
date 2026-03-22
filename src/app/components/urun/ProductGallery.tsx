"use client";
import { useState } from "react";

export default function ProductGallery({ imageUrl }: { imageUrl?: string }) {
  return (
    <div>
      <div className="bg-white border border-[#E8E4DF] rounded-2xl h-72 flex items-center justify-center overflow-hidden relative mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Ürün görseli"
            className="w-full h-full object-cover rounded-2xl"
          />
        ) : (
          <span className="text-8xl">📱</span>
        )}
      </div>
    </div>
  );
}