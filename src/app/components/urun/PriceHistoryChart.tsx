"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

type HistoryRow = {
  recorded_at: string;
  price: number;
  stores: { name: string };
};

type ChartPoint = { date: string; [store: string]: string | number };

const STORE_COLORS: Record<string, string> = {
  Trendyol:           "#F27A1A",
  Hepsiburada:        "#FF6000",
  MediaMarkt:         "#CC0000",
  "Amazon TR":        "#FF9900",
  "Vatan Bilgisayar": "#E31E24",
  Teknosa:            "#005BAA",
  n11:                "#6F2DA8",
  PttAVM:             "#FFC300",
};

function buildChartData(rows: HistoryRow[]) {
  const dateMap = new Map<string, ChartPoint>();
  const stores = new Set<string>();

  for (const r of rows) {
    const date = r.recorded_at.slice(0, 10);
    const store = r.stores?.name ?? "?";
    stores.add(store);
    if (!dateMap.has(date)) dateMap.set(date, { date });
    dateMap.get(date)![store] = r.price;
  }

  const sorted = [...dateMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  return { data: sorted, stores: [...stores] };
}

interface Props {
  history: HistoryRow[];
}

export default function PriceHistoryChart({ history }: Props) {
  if (!history || history.length === 0) return null;

  const { data, stores } = buildChartData(history);

  return (
    <div className="mt-4 md:mt-6 w-full">
      <h3 className="text-sm font-bold text-gray-700 mb-2 md:mb-3">Fiyat Geçmişi</h3>
      <div className="w-full" style={{ minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} minTickGap={20} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${Number(v).toLocaleString("tr-TR")}`}
              width={60}
            />
            <Tooltip
              formatter={(v) => `${Number(v).toLocaleString("tr-TR")} ₺`}
              labelStyle={{ fontSize: 11 }}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {stores.map(s => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={STORE_COLORS[s] ?? "#888"}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
