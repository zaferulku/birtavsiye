// Kadın (Venus) ve Erkek (Mars) sembol SVG ikonları

export function FemaleIcon({ size = 16, className = "", color = "#e91e8c" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Daire */}
      <circle cx="12" cy="9" r="6" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Aşağı çizgi */}
      <line x1="12" y1="15" x2="12" y2="21" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Yatay çizgi */}
      <line x1="9" y1="19" x2="15" y2="19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function MaleIcon({ size = 16, className = "", color = "#2196f3" }: { size?: number; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Daire */}
      <circle cx="10" cy="13" r="6" stroke={color} strokeWidth="2.5" fill="none" />
      {/* Ok çizgisi */}
      <line x1="14.5" y1="8.5" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Ok başı - yatay */}
      <line x1="15" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Ok başı - dikey */}
      <line x1="20" y1="3" x2="20" y2="8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function GenderSymbol({ gender, size = 14, white = false }: { gender?: string | null; size?: number; white?: boolean }) {
  const color = white ? "#ffffff" : undefined;
  if (gender === "kadin") return <FemaleIcon size={size} color={color ?? "#e91e8c"} />;
  if (gender === "erkek") return <MaleIcon size={size} color={color ?? "#2196f3"} />;
  if (gender === "gizli") return <span style={{ fontSize: size * 0.9 }}>🔒</span>;
  return null;
}
