"use client";
import { useState, useEffect } from "react";

export default function ProductGallery({ imageUrl }: { imageUrl?: string }) {
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lightbox]);

  if (!imageUrl) {
    return (
      <div className="bg-gray-50 border border-gray-100 rounded-2xl h-64 flex items-center justify-center">
        <span className="text-6xl opacity-30">📷</span>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className="bg-white border border-gray-100 rounded-2xl overflow-hidden cursor-zoom-in group"
        style={{ height: "380px" }}
        onClick={() => setLightbox(true)}
      >
        <img
          src={imageUrl}
          alt="Ürün görseli"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          className="transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-lg font-bold transition-colors"
            >
              ×
            </button>
            <img
              src={imageUrl}
              alt="Ürün görseli"
              className="max-h-[80vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
}