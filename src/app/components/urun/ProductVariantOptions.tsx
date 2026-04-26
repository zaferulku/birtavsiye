"use client";

import Link from "next/link";
import { formatFreshnessLabel } from "@/lib/listingSignals";
import { formatTL } from "./offerUtils";
import type { VariantOption } from "./ProductDetailShell";

type Props = {
  currentSlug: string;
  currentStorage: string | null;
  currentColor: string | null;
  variants: VariantOption[];
};

type VariantCard = {
  key: string;
  label: string;
  slug: string;
  title: string;
  image_url: string | null;
  min_price: number | null;
  freshest_seen_at?: string | null;
  active: boolean;
};

export default function ProductVariantOptions({
  currentSlug,
  currentStorage,
  currentColor,
  variants,
}: Props) {
  const storageCards = buildOptionCards(variants, "storage", currentStorage, currentSlug);
  const colorCards = buildOptionCards(variants, "color", currentColor, currentSlug);

  if (storageCards.length <= 1 && colorCards.length <= 1) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[22px] border border-[#E8E4DF] bg-white p-4 shadow-sm">
      {storageCards.length > 1 && (
        <OptionSection
          title="Hafiza Secenekleri"
          subtitle="Secenekler icindeki en dusuk fiyat gosterilir."
          items={storageCards}
        />
      )}

      {colorCards.length > 1 && (
        <OptionSection
          title="Renk Secenekleri"
          subtitle="Renk varyantlari mevcut urun ailesinden listelenir."
          items={colorCards}
        />
      )}
    </section>
  );
}

function OptionSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: VariantCard[];
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-bold text-[#171412]">{title}</h2>
        <p className="mt-1 text-xs text-[#8A8179]">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.key}
            href={`/urun/${item.slug}`}
            className={`group flex flex-col overflow-hidden rounded-2xl border transition ${
              item.active
                ? "border-[#E8460A] bg-[#FFF5F0] shadow-sm"
                : "border-[#EFE7DF] bg-white hover:border-[#E8460A] hover:shadow-sm"
            }`}
          >
            <div className="aspect-square w-full bg-[#FAF7F4]">
              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-full w-full object-contain p-3"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl text-[#D1CAC3]">
                  {item.label.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1 p-3">
              <span className="text-sm font-semibold text-[#171412] group-hover:text-[#E8460A]">
                {item.label}
              </span>
              {item.min_price !== null ? (
                <>
                  <span className="mt-auto text-sm font-black text-[#E8460A]">{formatTL(item.min_price)}</span>
                  <span className="text-[10px] text-[#8A8179]">
                    Son fiyat: {formatFreshnessLabel(item.freshest_seen_at ?? null)}
                  </span>
                </>
              ) : (
                <span className="mt-auto text-xs text-[#8A8179]">Aktif fiyat bekleniyor</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function buildOptionCards(
  variants: VariantOption[],
  kind: "storage" | "color",
  selectedValue: string | null,
  currentSlug: string
): VariantCard[] {
  const bestByValue = new Map<string, VariantOption>();

  for (const variant of variants) {
    const value = kind === "storage" ? variant.variant_storage : variant.variant_color;
    if (!value) continue;

    const existing = bestByValue.get(value);
    if (!existing) {
      bestByValue.set(value, variant);
      continue;
    }

    const existingPrice = existing.min_price ?? Number.POSITIVE_INFINITY;
    const candidatePrice = variant.min_price ?? Number.POSITIVE_INFINITY;

    if (candidatePrice < existingPrice) {
      bestByValue.set(value, variant);
      continue;
    }

    if (
      candidatePrice === existingPrice &&
      (variant.freshest_seen_at ?? "") > (existing.freshest_seen_at ?? "")
    ) {
      bestByValue.set(value, variant);
    }
  }

  return Array.from(bestByValue.entries())
    .sort(([left], [right]) => left.localeCompare(right, "tr"))
    .map(([value, variant]) => ({
      key: `${kind}-${value}`,
      label: value,
      slug: variant.slug,
      title: variant.title,
      image_url: variant.image_url,
      min_price: variant.min_price,
      freshest_seen_at: variant.freshest_seen_at,
      active: variant.slug === currentSlug || value === selectedValue,
    }));
}
