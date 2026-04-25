"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";
import PriceHistoryChart from "./PriceHistoryChart";
import { formatTL } from "./offerUtils";

type HistoryRow = {
  recorded_at: string;
  price: number;
  stores: { name: string };
};

type Props = {
  history: HistoryRow[];
  currentLowPrice: number | null;
  lowest30d: number | null;
  average90d: number | null;
  vsLowest30dPct: number | null;
  vsAverage90dPct: number | null;
  verdictTitle: string;
  verdictBody: string;
  verdictTone: "good" | "neutral" | "watch";
  variant?: "full" | "compact";
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
};

export default function PriceInsightsPanel({
  history,
  currentLowPrice,
  lowest30d,
  average90d,
  vsLowest30dPct,
  vsAverage90dPct,
  verdictTitle,
  verdictBody,
  verdictTone,
  variant = "full",
  primaryActionLabel,
  onPrimaryAction,
}: Props) {
  const toneClass =
    verdictTone === "good"
      ? "border-[#D7F0DF] bg-[#F1FBF4] text-[#166534]"
      : verdictTone === "watch"
        ? "border-[#F7DFC1] bg-[#FFF8EE] text-[#B45309]"
        : "border-[#E8E4DF] bg-[#FAF7F4] text-[#5F5952]";

  const latestRecordedAt = history[history.length - 1]?.recorded_at ?? null;

  if (variant === "compact") {
    const compactSeries = buildCompactSeries(history, {
      currentLowPrice,
      lowest30d,
      average90d,
    });

    return (
      <section className="rounded-[22px] border border-[#E8E4DF] bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
              Fiyat karari
            </p>
            <h2 className="mt-1 text-sm font-bold text-[#171412]">{verdictTitle}</h2>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>
            {toneLabel(verdictTone)}
          </span>
        </div>

        <p className="mt-2.5 text-[12px] leading-5 text-[#6D655E]">{verdictBody}</p>

        {compactSeries.length > 1 && (
          <div className="mt-3 rounded-2xl border border-[#F1E6DE] bg-[#FFF9F6] px-2 py-2">
            <div className="h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={compactSeries} margin={{ top: 4, right: 4, left: 4, bottom: 2 }}>
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={compactStroke(verdictTone)}
                    strokeWidth={2.5}
                    dot={{ r: 2.5, strokeWidth: 0, fill: compactStroke(verdictTone) }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          <InsightCell label="En dusuk" value={formatNullablePrice(currentLowPrice)} accent />
          <InsightCell label="30 gun dip" value={formatNullablePrice(lowest30d)} />
          <InsightCell label="90 gun ort." value={formatNullablePrice(average90d)} />
          <InsightCell label="30 gun fark" value={formatNullableDelta(vsLowest30dPct)} />
        </dl>

        {vsAverage90dPct !== null && (
          <p className="mt-2.5 text-[11px] leading-4 text-[#8A8179]">
            90 gun ortalamasina gore fark: {formatNullableDelta(vsAverage90dPct)}.
          </p>
        )}

        <p className="mt-1.5 text-[11px] leading-4 text-[#8A8179]">
          Son kayit: {formatRecordedAt(latestRecordedAt)}
        </p>

        {onPrimaryAction && primaryActionLabel && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="mt-3 w-full rounded-xl border border-[#E8E4DF] px-4 py-2.5 text-xs font-semibold text-[#171412] transition hover:border-[#E8460A] hover:text-[#E8460A]"
          >
            {primaryActionLabel}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-[#E8E4DF] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A06B53]">
            Fiyat gecmisi
          </p>
          <h2 className="mt-1 text-lg font-bold text-[#171412]">Karar kutusu</h2>
          <p className="mt-1 text-sm text-[#6D655E]">
            Son 90 gunun fiyat hareketine gore kisa bir karar ozetidir.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Simdiki en dusuk" value={formatNullablePrice(currentLowPrice)} accent />
        <MetricCard label="30 gun dip" value={formatNullablePrice(lowest30d)} />
        <MetricCard label="90 gun ortalama" value={formatNullablePrice(average90d)} />
        <MetricCard
          label="30 gun farki"
          value={formatNullableDelta(vsLowest30dPct)}
          positive={vsLowest30dPct !== null && vsLowest30dPct <= 2}
          warn={vsLowest30dPct !== null && vsLowest30dPct >= 10}
        />
      </div>

      <div className={`mt-4 rounded-[18px] border px-4 py-4 ${toneClass}`}>
        <div className="text-sm font-bold">{verdictTitle}</div>
        <p className="mt-2 text-sm leading-6">{verdictBody}</p>
        {vsAverage90dPct !== null && (
          <p className="mt-2 text-xs opacity-80">
            90 gun ortalamasina gore fark: {formatNullableDelta(vsAverage90dPct)}.
          </p>
        )}
      </div>

      {history.length > 0 ? (
        <>
          <PriceHistoryChart history={history} />
          <p className="mt-2 text-xs leading-5 text-[#8A8179]">
            Grafik urun bedeli uzerinden okunur. Kargo ve kampanya detaylari magaza sayfasinda farkli olabilir.
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-[#E8E4DF] px-4 py-4 text-sm text-[#6D655E]">
          Bu urun icin henuz yeterli fiyat gecmisi birikmedi.
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  accent = false,
  positive = false,
  warn = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  warn?: boolean;
}) {
  const valueClass = accent
    ? "text-[#E8460A]"
    : positive
      ? "text-[#15803D]"
      : warn
        ? "text-[#B45309]"
        : "text-[#171412]";

  return (
    <div className="rounded-[18px] border border-[#EFE7DF] bg-[#FAF7F4] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8179]">{label}</div>
      <div className={`mt-1 text-lg font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

function InsightCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#F3EAE3] bg-[#FCFAF8] px-2.5 py-2">
      <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8C837B]">{label}</dt>
      <dd className={`mt-1 text-[12px] font-semibold ${accent ? "text-[#E8460A]" : "text-[#171412]"}`}>
        {value}
      </dd>
    </div>
  );
}

function toneLabel(tone: "good" | "neutral" | "watch") {
  if (tone === "good") return "Iyi seviye";
  if (tone === "watch") return "Beklenebilir";
  return "Normal";
}

function formatNullablePrice(value: number | null) {
  return value === null ? "-" : formatTL(value);
}

function formatNullableDelta(value: number | null) {
  if (value === null) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function formatRecordedAt(value: string | null) {
  if (!value) return "Bilinmiyor";

  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "1 saatten yeni";
  if (diffHours < 24) return `${diffHours} saat once`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gun once`;
}

function buildCompactSeries(
  history: HistoryRow[],
  fallback: {
    currentLowPrice: number | null;
    lowest30d: number | null;
    average90d: number | null;
  }
) {
  const dailyLowMap = new Map<string, number>();

  for (const row of history) {
    const dayKey = row.recorded_at.slice(0, 10);
    const current = dailyLowMap.get(dayKey);
    if (current === undefined || row.price < current) {
      dailyLowMap.set(dayKey, row.price);
    }
  }

  const historySeries = [...dailyLowMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-14)
    .map(([date, price]) => ({
      date: date.slice(5).replace("-", "/"),
      price,
    }));

  if (historySeries.length > 1) {
    return historySeries;
  }

  const fallbackSeries = [
    fallback.average90d !== null ? { date: "90g", price: fallback.average90d } : null,
    fallback.lowest30d !== null ? { date: "30g", price: fallback.lowest30d } : null,
    fallback.currentLowPrice !== null ? { date: "Bugun", price: fallback.currentLowPrice } : null,
  ].filter((item): item is { date: string; price: number } => Boolean(item));

  if (fallbackSeries.length > 1) {
    return fallbackSeries;
  }

  if (historySeries.length === 1) {
    return [
      historySeries[0],
      { ...historySeries[0], date: "Bugun" },
    ];
  }

  return [];
}

function compactStroke(tone: "good" | "neutral" | "watch") {
  if (tone === "good") return "#16A34A";
  if (tone === "watch") return "#D97706";
  return "#E8460A";
}
