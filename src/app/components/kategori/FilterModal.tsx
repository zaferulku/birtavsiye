"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SourceOption = { name: string; label: string; count: number; href: string };

export default function FilterModal({
  sources,
  currentSource,
  clearHref,
}: {
  sources: SourceOption[];
  currentSource: string | null;
  clearHref: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const activeFilterCount = currentSource ? 1 : 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filtrele</span>
        {activeFilterCount > 0 && (
          <span className="bg-[#2F80ED] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Filtrele</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Kapat"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Pazar Yeri</h3>
                {sources.length === 0 ? (
                  <div className="text-sm text-gray-400">Bu kategoride satıcı bilgisi yok.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s) => {
                      const selected = currentSource === s.name;
                      return (
                        <Link
                          key={s.name}
                          href={s.href}
                          onClick={() => setOpen(false)}
                          className={`text-sm px-3 py-1.5 rounded-full border transition ${
                            selected
                              ? "bg-slate-100 text-slate-900 border-slate-400 font-semibold"
                              : "bg-white text-gray-700 border-gray-200 hover:border-slate-400"
                          }`}
                        >
                          {s.label} <span className="text-gray-500">({s.count})</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              {currentSource ? (
                <Link
                  href={clearHref}
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-600 hover:text-[#E8460A] font-medium"
                >
                  Temizle
                </Link>
              ) : <span />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-[#2F80ED] hover:bg-[#1E6FDC] text-white font-semibold text-sm px-6 py-2 rounded-lg transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
