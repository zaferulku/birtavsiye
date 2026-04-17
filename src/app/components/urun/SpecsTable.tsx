export default function SpecsTable({ specs }: { specs: Record<string, string> | null }) {
  const entries = specs ? Object.entries(specs).filter(([, v]) => v) : [];
  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="font-bold text-lg text-gray-900 mb-4">Teknik Özellikler</h2>
      <div className="divide-y divide-gray-50">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center py-3 gap-4">
            <div className="w-40 flex-shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {key}
            </div>
            <div className="text-sm text-gray-800 font-medium">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
