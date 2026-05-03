"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  productTitle?: string;
};

type RangeKey = "1w" | "1m" | "6m" | "1y";

type ChartPoint = {
  date: string;
  iso: string;
  price: number;
  projected?: boolean;
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "1w", label: "1 Hafta" },
  { key: "1m", label: "1 Ay" },
  { key: "6m", label: "6 Ay" },
  { key: "1y", label: "1 Yil" },
];

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
  productTitle,
}: Props) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeRange, setActiveRange] = useState<RangeKey>("1w");

  const toneClass =
    verdictTone === "good"
      ? "border-[#D7F0DF] bg-[#F1FBF4] text-[#166534]"
      : verdictTone === "watch"
        ? "border-[#F7DFC1] bg-[#FFF8EE] text-[#B45309]"
        : "border-[#E8E4DF] bg-[#FAF7F4] text-[#5F5952]";

  const dailySeries = useMemo(() => buildDailyLowSeries(history, currentLowPrice), [currentLowPrice, history]);
  const lowest7d = getWindowSeriesStat(dailySeries, 7, "min");
  const highest90d = getWindowSeriesStat(dailySeries, 90, "max");
  const detailSeries = useMemo(
    () => getDetailSeries(dailySeries, activeRange, currentLowPrice),
    [activeRange, currentLowPrice, dailySeries]
  );
  const detailHigh = detailSeries.length > 0 ? Math.max(...detailSeries.map((point) => point.price)) : null;
  const detailLow = detailSeries.length > 0 ? Math.min(...detailSeries.map((point) => point.price)) : null;
  const currentPrice = detailSeries.findLast((point) => !point.projected)?.price ?? currentLowPrice;

  if (variant === "compact") {
    const compactSeries = buildCompactSeries(dailySeries, {
      currentLowPrice,
      lowest30d,
      average90d,
    });

    return (
      <>
        <section className="min-h-[196px] rounded-[22px] border border-[#E3EEFC] bg-[#F4FAFF] p-3 shadow-[0_14px_28px_rgba(29,112,224,0.07)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5F8FD6]">
                Fiyat ozeti
              </p>
            </div>
            <span className="rounded-full border border-[#E0ECFB] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5F5952]">
              Son 90 gun
            </span>
          </div>

          {compactSeries.length > 1 && (
            <div className="mt-3 rounded-2xl border border-[#E0ECFB] bg-white px-2 py-2">
              <div className="h-14 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compactSeries} margin={{ top: 4, right: 4, left: 4, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke="#D97706"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, strokeWidth: 0, fill: "#D97706" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <dl className="mt-3 grid grid-cols-2 gap-3">
            <InsightCell label="7 Gun En Dusuk" value={formatNullablePrice(lowest7d)} accent />
            <InsightCell label="90 Gun En Yuksek" value={formatNullablePrice(highest90d)} />
          </dl>

          <button
            type="button"
            onClick={() => setIsDetailOpen(true)}
            className="mt-3 text-[11px] font-semibold text-[#1D70E0] transition hover:text-[#165BB6]"
          >
            Detayli Gor
          </button>
        </section>

        {isDetailOpen && (
          <DetailModal
            title={productTitle ?? "Fiyat Analizi"}
            activeRange={activeRange}
            onRangeChange={setActiveRange}
            onClose={() => setIsDetailOpen(false)}
            series={detailSeries}
            highest={detailHigh}
            lowest={detailLow}
            current={currentPrice}
          />
        )}
      </>
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

function DetailModal({
  title,
  activeRange,
  onRangeChange,
  onClose,
  series,
  highest,
  lowest,
  current,
}: {
  title: string;
  activeRange: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  onClose: () => void;
  series: ChartPoint[];
  highest: number | null;
  lowest: number | null;
  current: number | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-[860px] rounded-[24px] border border-[#DCEAFB] bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[22px] font-bold leading-tight text-[#171412]">{title} Fiyat Analizi</h3>
            <p className="mt-2 text-sm text-[#5E5750]">
              Secili donemdeki fiyat egilimini, dip ve tepe seviyelerini birlikte incele.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#DCEAFB] bg-white px-3 py-1.5 text-sm font-semibold text-[#5E5750] transition hover:border-[#1D70E0] hover:text-[#1D70E0]"
          >
            Kapat
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRangeChange(option.key);
              }}
              className={`rounded-xl border px-5 py-3 text-sm font-medium transition ${
                activeRange === option.key
                  ? "border-[#1D70E0] bg-[#EEF6FF] text-[#1D70E0]"
                  : "border-[#DCEAFB] bg-white text-[#5E5750] hover:border-[#1D70E0] hover:text-[#1D70E0]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div
          className="mt-6 rounded-[20px] border border-[#E6EEF8] bg-white px-4 py-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 18, left: 6, bottom: 10 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#DCEAFB" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  tickFormatter={(value: number) => `${Math.round(value).toLocaleString("tr-TR")} TL`}
                />
                <Tooltip
                  formatter={(value) => formatTL(typeof value === "number" ? value : Number(value ?? 0))}
                  labelFormatter={(label) => `Tarih: ${label}`}
                  contentStyle={{ borderRadius: 14, border: "1px solid #DCEAFB", boxShadow: "0 14px 32px rgba(15,23,42,0.12)" }}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#2F5FAF"
                  strokeWidth={3}
                  dot={{ r: 2.5, strokeWidth: 0, fill: "#2F5FAF" }}
                  activeDot={{ r: 5, fill: "#E8460A" }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-[#EEF2F7] pt-4 sm:grid-cols-3">
          <DetailMetric label="Donem Ici En Yuksek Fiyat" value={formatNullablePrice(highest)} />
          <DetailMetric label="Donem Ici En Dusuk Fiyat" value={formatNullablePrice(lowest)} />
          <DetailMetric label="Su Andaki Fiyat" value={formatNullablePrice(current)} strong />
        </div>
      </div>
    </div>
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
    <div className="rounded-xl border border-[#E0ECFB] bg-white px-2.5 py-2.5">
      <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8C837B]">{label}</dt>
      <dd className={`mt-1 text-[12px] font-semibold ${accent ? "text-[#E8460A]" : "text-[#171412]"}`}>
        {value}
      </dd>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#EEF2F7] pb-2 last:border-b-0 last:pb-0">
      <span className="text-sm text-[#5E5750]">{label}</span>
      <span className={`text-lg font-bold ${strong ? "text-[#171412]" : "text-[#2C3643]"}`}>{value}</span>
    </div>
  );
}

function formatNullablePrice(value: number | null) {
  return value === null ? "-" : formatTL(value);
}

function formatNullableDelta(value: number | null) {
  if (value === null) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(1)}%`;
}

function buildCompactSeries(
  dailySeries: ChartPoint[],
  fallback: {
    currentLowPrice: number | null;
    lowest30d: number | null;
    average90d: number | null;
  }
) {
  const historySeries = dailySeries.slice(-14);

  if (historySeries.length > 1) {
    return historySeries;
  }

  const fallbackSeries = [
    fallback.average90d !== null ? { date: "90g", iso: "90g", price: fallback.average90d } : null,
    fallback.lowest30d !== null ? { date: "30g", iso: "30g", price: fallback.lowest30d } : null,
    fallback.currentLowPrice !== null ? { date: "Bugun", iso: "bugun", price: fallback.currentLowPrice } : null,
  ].filter((item): item is ChartPoint => Boolean(item));

  if (fallbackSeries.length > 1) {
    return fallbackSeries;
  }

  return [];
}

function getWindowSeriesStat(
  series: ChartPoint[],
  days: number,
  mode: "min" | "max"
): number | null {
  if (series.length === 0) return null;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const values = series
    .filter((point) => new Date(point.iso).getTime() >= cutoff)
    .map((point) => point.price)
    .filter((price) => Number.isFinite(price));

  if (values.length === 0) return null;

  return mode === "min" ? Math.min(...values) : Math.max(...values);
}

function buildDailyLowSeries(history: HistoryRow[], currentLowPrice: number | null): ChartPoint[] {
  const dateMap = new Map<string, number>();

  for (const row of history) {
    const iso = row.recorded_at.slice(0, 10);
    const current = dateMap.get(iso);
    if (current === undefined || row.price < current) {
      dateMap.set(iso, row.price);
    }
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (currentLowPrice !== null) {
    dateMap.set(todayIso, currentLowPrice);
  }

  return [...dateMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([iso, price]) => ({
      iso,
      date: formatAxisDate(iso),
      price,
    }));
}

function getDetailSeries(series: ChartPoint[], range: RangeKey, currentLowPrice: number | null): ChartPoint[] {
  if (series.length === 0) {
    return currentLowPrice !== null
      ? [{ iso: "bugun", date: "Bugun", price: currentLowPrice }]
      : [];
  }

  const days =
    range === "1y" ? 365 : range === "6m" ? 183 : range === "1m" ? 31 : 7;

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = series.filter((point) => new Date(point.iso).getTime() >= cutoff);
  return filtered.length > 1 ? filtered : series.slice(-Math.min(series.length, 14));
}

function formatAxisDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
}
