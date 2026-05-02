"use client";

type SearchSidebarCheckboxItem = {
  id: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  count?: number;
};

type SearchSidebarPillItem = {
  id: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
};

type SearchSidebarChipItem = {
  id: string;
  label: string;
  onRemove: () => void;
};

export type SearchSidebarSection =
  | {
      id: string;
      kind: "checkbox";
      title: string;
      count?: number;
      items: SearchSidebarCheckboxItem[];
      allOption?: SearchSidebarCheckboxItem;
    }
  | {
      id: string;
      kind: "pills";
      title: string;
      count?: number;
      items: SearchSidebarPillItem[];
    }
  | {
      id: string;
      kind: "chips";
      title: string;
      items: SearchSidebarChipItem[];
    };

type SearchFiltersSidebarProps = {
  sections: SearchSidebarSection[];
};

function CheckMarkIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.2 6.5 11 12.5 5" />
    </svg>
  );
}

function SidebarSearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
      />
    </svg>
  );
}

function SidebarSectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      {typeof count === "number" && (
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400">{count}</span>
      )}
    </div>
  );
}

function CheckboxRow({ item }: { item: SearchSidebarCheckboxItem }) {
  return (
    <button
      type="button"
      onClick={item.onToggle}
      className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition hover:bg-slate-50 ${
        item.selected ? "text-[#E8460A]" : "text-slate-700"
      }`}
    >
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${
          item.selected
            ? "border-[#E8460A] bg-[#FFF4EE] text-[#E8460A]"
            : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <CheckMarkIcon />
      </span>
      <span className="min-w-0 text-[13px] font-medium">{item.label}</span>
      {typeof item.count === "number" && (
        <span className="ml-auto rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400">{item.count}</span>
      )}
    </button>
  );
}

function SearchSidebarCheckboxSection({
  section,
}: {
  section: Extract<SearchSidebarSection, { kind: "checkbox" }>;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <SidebarSectionHeader title={section.title} count={section.count} />
      <div className="space-y-0.5">
        {section.allOption ? <CheckboxRow item={section.allOption} /> : null}
        {section.items.map((item) => (
          <CheckboxRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function SearchSidebarPillSection({
  section,
}: {
  section: Extract<SearchSidebarSection, { kind: "pills" }>;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4">
      <SidebarSectionHeader title={section.title} count={section.count} />
      <div className="flex flex-wrap gap-2">
        {section.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onToggle}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
              item.selected
                ? "border-[#E8460A] bg-[#FFF4EE] text-[#E8460A]"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#E8460A]/35"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchSidebarChipSection({
  section,
}: {
  section: Extract<SearchSidebarSection, { kind: "chips" }>;
}) {
  return (
    <div className="rounded-[22px] border border-[#F9D7C6] bg-[#FFF7F2] p-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E8460A]/75">{section.title}</div>
      <div className="flex flex-wrap gap-2">
        {section.items.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={item.onRemove}
            className="rounded-full border border-[#F3C7B2] bg-white px-3 py-1.5 text-xs font-semibold text-[#E8460A]"
          >
            {item.label} x
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SearchFiltersSidebar({ sections }: SearchFiltersSidebarProps) {
  return (
    <aside className="w-full flex-shrink-0 lg:w-[248px]">
      <div className="sticky top-24">
        <div className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-[#FFF6F1] px-4 py-4">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-300">
              <SidebarSearchIcon />
            </div>
            <div className="text-[16px] font-black tracking-tight text-slate-900">Filtrele</div>
            <div className="mt-1 text-[13px] leading-5 text-slate-500">Aramani biraz daha netlestirelim.</div>
          </div>

          <div className="space-y-5 overflow-y-auto px-5 py-5">
            {sections.map((section) => {
              if (section.kind === "checkbox") {
                return <SearchSidebarCheckboxSection key={section.id} section={section} />;
              }

              if (section.kind === "pills") {
                return <SearchSidebarPillSection key={section.id} section={section} />;
              }

              return <SearchSidebarChipSection key={section.id} section={section} />;
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
