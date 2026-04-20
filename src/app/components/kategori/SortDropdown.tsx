"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type SortOption = { label: string; val: string; href: string };

export default function SortDropdown({ options, currentSort }: { options: SortOption[]; currentSort: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const active = options.find(o => o.val === currentSort) ?? options[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 transition shadow-sm"
      >
        <span className="text-gray-500">Sırala:</span>
        <span>{active.label}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
          {options.map(opt => {
            const selected = opt.val === currentSort;
            return (
              <Link
                key={opt.val}
                href={opt.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition ${selected ? "text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${selected ? "border-[#E8460A]" : "border-gray-300"}`}>
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#E8460A]" />}
                </span>
                <span className={selected ? "font-semibold" : ""}>{opt.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
