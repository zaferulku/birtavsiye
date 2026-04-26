"use client";

import { useState } from "react";

interface ProductGalleryProps {
  images?: string[];
  alt?: string;
}

export function ProductGallery({ images, alt = "Ürün görseli" }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const validImages = images?.filter(Boolean) ?? [];

  if (validImages.length === 0) {
    return (
      <div className="aspect-square w-full rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-sm">📷 Görsel yok</span>
      </div>
    );
  }

  const currentImage = validImages[activeIdx] ?? validImages[0];
  const hasMultiple = validImages.length > 1;

  const goPrev = () => setActiveIdx((i) => (i - 1 + validImages.length) % validImages.length);
  const goNext = () => setActiveIdx((i) => (i + 1) % validImages.length);

  return (
    <>
      {/* Ana foto + ok butonlari */}
      <div className="relative w-full overflow-hidden rounded-lg bg-gray-50 group" style={{ height: 380 }}>
        <img
          src={currentImage}
          alt={alt}
          className="w-full h-full object-contain transition-transform duration-300 hover:scale-105 cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100 z-10"
            aria-label="Önceki görsel"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {hasMultiple && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition opacity-0 group-hover:opacity-100 z-10"
            aria-label="Sonraki görsel"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {hasMultiple && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
            {activeIdx + 1} / {validImages.length}
          </div>
        )}

        {hasMultiple && validImages.length <= 10 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIdx(idx); }}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  idx === activeIdx ? 'bg-white w-4' : 'bg-white/50'
                }`}
                aria-label={`Görsel ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            aria-label="Kapat"
          >
            ✕
          </button>

          <img
            src={currentImage}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Önceki görsel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                aria-label="Sonraki görsel"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm px-3 py-1.5 rounded-md backdrop-blur-sm">
                {activeIdx + 1} / {validImages.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

export default ProductGallery;
