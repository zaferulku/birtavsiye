"use client";

import { useEffect, useRef, useState } from "react";

export type HeaderSearchSuggestion = {
  id: string;
  label: string;
  description: string;
  href: string;
  kind: "product" | "category" | "brand";
};

type HeaderSearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitQuery: (value: string) => void;
  onSelectSuggestion: (suggestion: HeaderSearchSuggestion) => void;
};

export default function HeaderSearchBar({
  query,
  onQueryChange,
  onSubmitQuery,
  onSelectSuggestion,
}: HeaderSearchBarProps) {
  const blurTimer = useRef<NodeJS.Timeout | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<HeaderSearchSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasLoadedSuggestions, setHasLoadedSuggestions] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const trimmed = query.trim();
    setActiveIndex(0);

    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      setHasLoadedSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoadingSuggestions(true);
      setHasLoadedSuggestions(false);
      fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : { suggestions: [] }))
        .then((payload: { suggestions?: HeaderSearchSuggestion[] }) => {
          setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
          setIsOpen(Boolean(trimmed));
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingSuggestions(false);
            setHasLoadedSuggestions(true);
          }
        });
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onQueryChange(trimmed);
    setIsOpen(false);
    setActiveIndex(0);
    onSubmitQuery(trimmed);
  };

  const selectSuggestion = (suggestion: HeaderSearchSuggestion) => {
    onQueryChange(suggestion.label);
    setIsOpen(false);
    setActiveIndex(0);
    onSelectSuggestion(suggestion);
  };

  return (
    <div
      className="relative z-[70] flex-1 min-w-0"
      onFocus={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
        if (query.trim()) setIsOpen(true);
      }}
      onBlur={() => {
        blurTimer.current = setTimeout(() => setIsOpen(false), 120);
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isOpen && suggestions[activeIndex]) {
            selectSuggestion(suggestions[activeIndex]);
            return;
          }
          submit(query);
        }}
        className="flex items-center bg-gray-100 rounded-xl px-3 md:px-4 gap-2 md:gap-3 h-11 focus-within:bg-white transition-all border border-transparent focus-within:border-[#E8460A]/40 focus-within:ring-2 focus-within:ring-[#E8460A]/10 min-w-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 text-[#E8460A] flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setActiveIndex(0);
            setIsOpen(Boolean(event.target.value.trim()));
          }}
          onKeyDown={(event) => {
            if (!suggestions.length) return;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current + 1) % suggestions.length);
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
            }

            if (event.key === "Tab" && isOpen && suggestions[activeIndex]) {
              event.preventDefault();
              selectSuggestion(suggestions[activeIndex]);
            }

            if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder="Urun, marka veya kategori ara"
          className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
          autoComplete="off"
          aria-label="Header arama"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              setIsOpen(false);
            }}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0 min-w-11 min-h-11 flex items-center justify-center"
          >
            ×
          </button>
        )}
      </form>

      {isOpen && query.trim().length >= 2 && (suggestions.length > 0 || loadingSuggestions || hasLoadedSuggestions) && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
          <div className="border-b border-slate-100 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Arama onerileri
          </div>
          <div className="py-0.5">
            {loadingSuggestions && suggestions.length === 0 && (
              <div className="px-4 py-3 text-[13px] font-medium text-slate-400">Araniyor...</div>
            )}
            {!loadingSuggestions && hasLoadedSuggestions && suggestions.length === 0 && (
              <div className="px-4 py-3 text-[13px] font-medium text-slate-400">Sonuc bulunamadi</div>
            )}
            {suggestions.map((suggestion, index) => {
              const isActive = index === activeIndex;

              return (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
                    isActive ? "bg-[#FFF5EF] text-[#E8460A]" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold leading-[18px]">{suggestion.label}</div>
                    <div className="truncate text-[11px] leading-[14px] text-slate-400">{suggestion.description}</div>
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">
                    {suggestion.kind === "product" ? "Urun" : suggestion.kind === "category" ? "Kategori" : "Marka"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
