"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

type FilterSection = {
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
  searchable?: boolean;
  defaultOpen?: boolean;
};

type PricePreset = {
  label: string;
  min: string | null;
  max: string | null;
  active: boolean;
};

type Props = {
  sections: FilterSection[];
  pricePresets: PricePreset[];
  hasActiveFilters: boolean;
};

const VISIBLE_LIMIT = 8;

export default function CategoryFiltersSidebar({
  sections,
  pricePresets,
  hasActiveFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sections.map((section) => [section.id, section.defaultOpen ?? false]))
  );
  const [showAllSections, setShowAllSections] = useState<Record<string, boolean>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  // Optimistic UI: checkbox click anlik gorunsun, URL push debounce edilsin
  const initialOptimistic = useMemo<Record<string, string[]>>(() => {
    const acc: Record<string, string[]> = {};
    for (const s of sections) acc[s.id] = s.selected;
    return acc;
  }, [sections]);
  const [optimisticSelected, setOptimisticSelected] = useState(initialOptimistic);

  // Server'dan yeni props geldiginde optimistic state'i resync et
  useEffect(() => {
    setOptimisticSelected(initialOptimistic);
  }, [initialOptimistic]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushUrl = (params: URLSearchParams) => {
    const query = params.toString();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // 80ms — hizli ardarda tiklamada tek push, ama gecikme algilanmaz
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, 80);
  };

  const updateUrl = (mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutator(params);
    pushUrl(params);
  };

  const toggleValue = (param: string, value: string) => {
    // Optimistic local update — checkbox anlik tepki versin
    setOptimisticSelected((prev) => {
      const cur = prev[param] ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [param]: next };
    });
    updateUrl((params) => {
      const current = (params.get(param) ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      if (next.length === 0) params.delete(param);
      else params.set(param, next.join(","));
    });
  };

  const setPricePreset = (min: string | null, max: string | null) => {
    updateUrl((params) => {
      if (min) params.set("min", min);
      else params.delete("min");

      if (max) params.set("max", max);
      else params.delete("max");
    });
  };

  const clearFilters = () => {
    updateUrl((params) => {
      for (const key of [
        "marka",
        "model",
        "hafiza",
        "renk",
        "ram",
        "batarya",
        "yil",
        "mobil",
        "ekran",
        "cozunurluk",
        "yenileme",
        "min",
        "max",
      ]) {
        params.delete(key);
      }
    });
  };

  return (
    <aside className="w-full md:w-[296px] md:min-w-[296px] md:max-w-[296px] flex-shrink-0">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white">
        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#111827]">Filtrele</h2>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
                disabled={isPending}
              >
                Temizle
              </button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
          <AccordionSection
            id="fiyat"
            label="Fiyat"
            open={openSections.fiyat ?? true}
            onToggle={() => setOpenSections((prev) => ({ ...prev, fiyat: !prev.fiyat }))}
          >
            <div className="space-y-2">
              {pricePresets.map((preset) => (
                <button
                  key={`${preset.label}-${preset.min ?? "none"}-${preset.max ?? "none"}`}
                  type="button"
                  onClick={() => setPricePreset(preset.min, preset.max)}
                  className={`flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left text-[14px] transition ${
                    preset.active ? "text-[#111827]" : "text-[#374151] hover:text-[#111827]"
                  }`}
                  disabled={isPending}
                >
                  <span
                    className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border ${
                      preset.active ? "border-[#111827]" : "border-[#CBD5E1]"
                    }`}
                  >
                    {preset.active ? <span className="h-2.5 w-2.5 rounded-full bg-[#111827]" /> : null}
                  </span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </AccordionSection>

          {sections.map((section) => {
            const term = searchTerms[section.id] ?? "";
            const baseOptions = term.trim()
              ? section.options.filter((option) =>
                  option.label.toLocaleLowerCase("tr").includes(term.toLocaleLowerCase("tr"))
                )
              : section.options;
            const filteredOptions = showAllSections[section.id]
              ? baseOptions
              : baseOptions.slice(0, VISIBLE_LIMIT);
            const canShowMore =
              !term.trim() && section.options.length > VISIBLE_LIMIT && !showAllSections[section.id];

            return (
              <AccordionSection
                key={section.id}
                id={section.id}
                label={section.label}
                open={openSections[section.id] ?? Boolean(section.defaultOpen)}
                onToggle={() =>
                  setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))
                }
              >
                {section.searchable && section.options.length > 8 ? (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={term}
                      onChange={(event) =>
                        setSearchTerms((prev) => ({ ...prev, [section.id]: event.target.value }))
                      }
                      placeholder={`${section.label} ara`}
                      className="w-full rounded-md border border-[#D9E0EA] px-3 py-2 text-[13px] text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#111827]"
                    />
                  </div>
                ) : null}

                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const currentSelected = optimisticSelected[section.id] ?? section.selected;
                    const checked = currentSelected.includes(option.value);
                    return (
                      <button
                        key={`${section.id}-${option.value}`}
                        type="button"
                        onClick={() => toggleValue(section.id, option.value)}
                        className="flex w-full items-center gap-3 rounded-md px-1 py-1.5 text-left transition hover:bg-[#F8FAFC]"
                        disabled={isPending}
                      >
                        <span
                          className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] border ${
                            checked ? "border-[#111827] bg-[#111827]" : "border-[#CBD5E1] bg-white"
                          }`}
                        >
                          {checked ? (
                            <svg
                              className="h-3 w-3 text-white"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            >
                              <path d="M5 10.5 8.5 14 15 6.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 text-[14px] text-[#374151]">{option.label}</span>
                        <span className="text-[12px] text-[#9CA3AF]">({option.count})</span>
                      </button>
                    );
                  })}
                </div>

                {canShowMore ? (
                  <button
                    type="button"
                    onClick={() => setShowAllSections((prev) => ({ ...prev, [section.id]: true }))}
                    className="mt-2 text-[13px] font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
                  >
                    Tümünü Göster
                  </button>
                ) : null}
              </AccordionSection>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function AccordionSection({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[#E5E7EB] last:border-b-0" id={`filter-${id}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-[#1F2937]">{label}</span>
        <svg
          className={`h-4 w-4 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  );
}
