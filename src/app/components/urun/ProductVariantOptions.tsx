"use client";

import Link from "next/link";
import { compareStorageValues, normalizeStorageValue } from "@/lib/storageValue";
import { formatTL } from "./offerUtils";
import type { VariantOption } from "./ProductDetailShell";

type Props = {
  currentSlug: string;
  currentStorage: string | null;
  currentColor: string | null;
  variants: VariantOption[];
  currentTitle: string;
  currentImageUrl: string | null;
  currentPrice: number | null;
  currentFreshness: string | null;
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
  currentTitle,
  currentImageUrl,
  currentPrice,
  currentFreshness,
}: Props) {
  const storageCards = buildOptionCards(variants, "storage", currentStorage, currentSlug, {
    title: currentTitle,
    image_url: currentImageUrl,
    min_price: currentPrice,
    freshest_seen_at: currentFreshness,
  });
  const colorCards = buildOptionCards(variants, "color", currentColor, currentSlug, {
    title: currentTitle,
    image_url: currentImageUrl,
    min_price: currentPrice,
    freshest_seen_at: currentFreshness,
  });

  if (storageCards.length === 0 && colorCards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 rounded-[22px] border border-[#E8E4DF] bg-white p-4 shadow-sm">
      {storageCards.length > 0 && (
        <OptionSection title="Bellek Kapasitesi" items={storageCards} mode="storage" />
      )}

      {colorCards.length > 0 && <OptionSection title="Renk" items={colorCards} mode="color" />}
    </section>
  );
}

function OptionSection({
  title,
  items,
  mode,
}: {
  title: string;
  items: VariantCard[];
  mode: "storage" | "color";
}) {
  const showImage = mode === "color";

  return (
    <div>
      <div className="mb-2">
        <h2 className="text-[15px] font-semibold text-[#171412]">{title}</h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.key}
            href={`/urun/${item.slug}`}
            className={
              showImage
                ? `group flex h-[56px] w-[128px] items-center gap-2 rounded-md border px-3 transition ${
                    item.active
                      ? "border-[#111827] bg-white shadow-[0_0_0_1px_rgba(17,24,39,0.08)]"
                      : "border-[#111827] bg-white hover:border-[#111827]"
                  }`
                : `flex h-[38px] min-w-[76px] items-center justify-center rounded-md border px-4 text-center transition ${
                    item.active
                      ? "border-[#111827] bg-white shadow-[0_0_0_1px_rgba(17,24,39,0.08)]"
                      : "border-[#111827] bg-white hover:border-[#111827]"
                  }`
            }
          >
            {showImage ? (
              <>
                <div className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-sm bg-[#F5F7FA]">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#D1CAC3]">
                      {item.label.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col leading-none">
                  <span className="truncate text-[13px] font-medium text-[#1F2A37]">{item.label}</span>
                  {item.min_price !== null ? (
                    <span className="mt-1 truncate text-[12px] font-medium text-[#64748B]">
                      {formatTL(item.min_price)}
                    </span>
                  ) : (
                    <span className="mt-1 truncate text-[12px] font-medium text-[#94A3B8]">
                      Fiyat bekleniyor
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="truncate text-[14px] font-medium text-[#1F2A37]">{item.label}</span>
            )}
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
  currentSlug: string,
  currentProduct: {
    title: string;
    image_url: string | null;
    min_price: number | null;
    freshest_seen_at: string | null;
  }
): VariantCard[] {
  const bestByValue = new Map<string, VariantOption>();
  const normalizedSelectedValue = normalizeVariantValue(kind, selectedValue);

  for (const variant of variants) {
    const rawValue = kind === "storage" ? variant.variant_storage : variant.variant_color;
    const value = normalizeVariantValue(kind, rawValue);
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

  if (bestByValue.size === 0 && normalizedSelectedValue) {
    bestByValue.set(normalizedSelectedValue, {
      id: currentSlug,
      slug: currentSlug,
      title: currentProduct.title,
      image_url: currentProduct.image_url,
      variant_storage: kind === "storage" ? normalizedSelectedValue : null,
      variant_color: kind === "color" ? normalizedSelectedValue : null,
      min_price: currentProduct.min_price,
      freshest_seen_at: currentProduct.freshest_seen_at,
    });
  }

  return Array.from(bestByValue.entries())
    .sort(([left], [right]) => compareVariantValues(kind, left, right))
    .map(([value, variant]) => ({
      key: `${kind}-${value}`,
      label: value,
      slug: variant.slug,
      title: variant.title,
      image_url: variant.image_url,
      min_price: variant.min_price,
      freshest_seen_at: variant.freshest_seen_at,
      active: variant.slug === currentSlug || value === normalizedSelectedValue,
    }));
}

function normalizeVariantValue(kind: "storage" | "color", value: string | null): string | null {
  if (!value) return null;

  if (kind === "color") {
    return value.trim().replace(/\s+/g, " ");
  }

  return normalizeStorageValue(value);
}

function compareVariantValues(kind: "storage" | "color", left: string, right: string) {
  if (kind === "color") {
    return left.localeCompare(right, "tr");
  }

  return compareStorageValues(left, right);
}
