"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error.tsx]", error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="antialiased">
        <main className="min-h-screen flex items-center justify-center px-4 bg-white">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Beklenmeyen bir hata</h1>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Uygulama yüklenirken kritik bir sorun oluştu. Sayfayı yenilemeyi dene.
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
      </body>
    </html>
  );
}
