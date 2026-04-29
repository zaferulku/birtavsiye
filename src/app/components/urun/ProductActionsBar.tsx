"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const COMPARE_STORAGE_KEY = "birtavsiye:compare-products";

type Props = {
  productId: string;
  productSlug: string;
  productTitle: string;
  currentPrice: number | null;
};

export default function ProductActionsBar({
  productId,
  productSlug,
  productTitle,
  currentPrice,
}: Props) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [compareActive, setCompareActive] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(
    currentPrice !== null ? String(Math.round(currentPrice)) : ""
  );
  const [alertLoading, setAlertLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const productUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/urun/${productSlug}`;
    }
    return `${window.location.origin}/urun/${productSlug}`;
  }, [productSlug]);

  useEffect(() => {
    const syncState = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.email) {
        setEmail(session.user.email);
      }

      if (session?.access_token) {
        const response = await fetch(`/api/me/favorites?product_id=${productId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
          .then((result) => result.json())
          .catch(() => null);

        setIsFavorite(Boolean(response?.favorited));
      }

      const compareIds = readCompareIds();
      setCompareActive(compareIds.includes(productId));
    };

    void syncState();
  }, [productId]);

  const handleFavorite = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      window.location.href = "/giris";
      return;
    }

    setFavoriteLoading(true);
    setMessage(null);

    try {
      if (isFavorite) {
        await fetch(`/api/me/favorites?product_id=${productId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        setIsFavorite(false);
        setMessage("Favorilerden cikarildi.");
      } else {
        await fetch("/api/me/favorites", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ product_id: productId }),
        });
        setIsFavorite(true);
        setMessage("Favorilere eklendi.");
      }
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleShare = async () => {
    setMessage(null);

    if (navigator.share) {
      try {
        await navigator.share({
          title: productTitle,
          url: productUrl,
        });
        return;
      } catch {
        // Ignore cancellation and fall back to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(productUrl);
      setMessage("Urun baglantisi kopyalandi.");
    } catch {
      setMessage("Baglanti kopyalanamadi.");
    }
  };

  const handleCompare = () => {
    const existingIds = readCompareIds();
    const nextIds = existingIds.includes(productId)
      ? existingIds.filter((id) => id !== productId)
      : [...existingIds, productId].slice(0, 4);

    writeCompareIds(nextIds);
    const isNowActive = nextIds.includes(productId);
    setCompareActive(isNowActive);

    if (!isNowActive) {
      setMessage("Urun karsilastirmadan cikarildi.");
      return;
    }

    if (nextIds.length >= 2) {
      window.location.href = `/karsilastir?ids=${nextIds.join(",")}`;
      return;
    }

    setMessage("Bir urun daha secince karsilastirma acilacak.");
  };

  const handleAlertSubmit = async () => {
    const numericTargetPrice = Number(targetPrice.replace(",", "."));
    if (!Number.isFinite(numericTargetPrice) || numericTargetPrice <= 0) {
      setMessage("Gecerli bir hedef fiyat gir.");
      return;
    }

    setAlertLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage("Alarm kurmak icin giris yap.");
        return;
      }

      const response = await fetch("/api/price-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          target_price: numericTargetPrice,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(typeof payload?.error === "string" ? payload.error : "Alarm kaydedilemedi.");
        return;
      }

      setShowAlertForm(false);
      setMessage("Fiyat alarmi kaydedildi.");
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          onClick={handleFavorite}
          loading={favoriteLoading}
          active={isFavorite}
          label={isFavorite ? "Favoride" : "Favorilere Al"}
          icon={<HeartIcon active={isFavorite} />}
        />
        <ActionButton onClick={handleShare} label="Paylas" icon={<ShareIcon />} />
        <ActionButton
          onClick={handleCompare}
          active={compareActive}
          label={compareActive ? "Karsilastirmada" : "Karsilastir"}
          icon={<CompareIcon />}
        />
        <ActionButton
          onClick={() => setShowAlertForm((current) => !current)}
          active={showAlertForm}
          label="Alarm Kur"
          icon={<BellIcon />}
        />
      </div>

      {showAlertForm && (
        <div className="rounded-2xl border border-[#EFE7DF] bg-[#FAF7F4] p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
            <label className="flex flex-col gap-1 text-xs font-semibold text-[#5E5750]">
              E-posta (hesabindan)
              <input
                type="email"
                value={email}
                readOnly
                placeholder={email ? "" : "Once giris yap"}
                className="rounded-xl border border-[#E8E4DF] bg-gray-50 px-3 py-2.5 text-sm font-normal text-[#171412] outline-none cursor-not-allowed"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-[#5E5750]">
              Hedef fiyat
              <input
                type="number"
                inputMode="decimal"
                min="1"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder="50000"
                className="rounded-xl border border-[#E8E4DF] bg-white px-3 py-2.5 text-sm font-normal text-[#171412] outline-none transition focus:border-[#E8460A]"
              />
            </label>

            <button
              type="button"
              onClick={handleAlertSubmit}
              disabled={alertLoading}
              className="self-end rounded-xl bg-[#E8460A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#C83C08] disabled:opacity-60"
            >
              {alertLoading ? "Kaydediliyor" : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {message && <p className="text-xs font-medium text-[#8A8179]">{message}</p>}
    </div>
  );
}

function ActionButton({
  onClick,
  label,
  icon,
  active = false,
  loading = false,
}: {
  onClick: () => void;
  label: string;
  icon: ReactNode;
  active?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-[#F3C8B8] bg-[#FFF3EE] text-[#E8460A]"
          : "border-[#EFE7DF] bg-white text-[#4D4741] hover:border-[#E8460A] hover:text-[#E8460A]"
      } disabled:opacity-60`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function readCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeCompareIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill={active ? "currentColor" : "none"} stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M10 17.25l-1.45-1.32C4.4 12.16 2 9.98 2 7.27A3.77 3.77 0 015.82 3.5c1.18 0 2.31.54 3.03 1.4A4.05 4.05 0 0112.88 3.5 3.77 3.77 0 0116.7 7.27c0 2.71-2.4 4.89-6.55 8.66L10 17.25z"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M13.75 6.25l-7.5 3.75m0 0l7.5 3.75M6.25 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm7.5 7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm0-10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
      />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M3.75 4.5h5v11h-5zm7.5 0h5v11h-5zM5.75 7.5h1m6.5 0h1m-9 3h1m6.5 0h1"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M10 3.5a3.5 3.5 0 00-3.5 3.5v1.2c0 .73-.22 1.44-.64 2.04L4.75 12h10.5l-1.11-1.76a3.87 3.87 0 01-.64-2.04V7A3.5 3.5 0 0010 3.5zm-1.5 11.75a1.5 1.5 0 003 0"
      />
    </svg>
  );
}
