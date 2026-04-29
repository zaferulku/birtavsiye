"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Bir sorun oluştu</h1>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar denemek ister misin?
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 rounded-full bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Yeniden dene
        </button>
        {error?.digest && (
          <p className="mt-6 text-xs text-gray-400">Referans: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
