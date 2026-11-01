import type { ReactNode } from "react";

/** Stylized component illustrations for identification games (no labels, so they can be quizzed). */
const S = { stroke: "#cbd5e1", strokeWidth: 3, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const H = "#fb923c";
const C = "#38bdf8";
const V = "#facc15";
const B = "#12203d";

const ART: Record<string, ReactNode> = {
  compressor: (
    <g>
      <rect x="55" y="30" width="90" height="125" rx="40" {...S} fill={B} />
      <path d="M60 90 h80" {...S} opacity={0.4} />
      <circle cx="100" cy="60" r="10" fill={V} />
      <path d="M145 70 h25 M145 120 h25" stroke={C} strokeWidth={8} strokeLinecap="round" />
      <rect x="40" y="155" width="120" height="12" rx="4" fill="#1b2c50" />
    </g>
  ),
  "condenser-coil": (
    <g>
      <rect x="30" y="40" width="140" height="120" rx="12" fill={B} stroke={H} strokeWidth={3} />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={40 + i * 11} y1={50} x2={40 + i * 11} y2={150} stroke={H} strokeOpacity={0.5} strokeWidth={2} />
      ))}
      <circle cx="100" cy="100" r="30" {...S} fill={B} />
      <path d="M100 70 l8 30 -8 30 -8 -30 z" fill="#94a3b8" />
    </g>
  ),
  "evaporator-coil": (
    <g>
      <path d="M40 160 L100 40 L160 160" fill={B} stroke={C} strokeWidth={4} />
      {Array.from({ length: 8 }, (_, i) => (
        <path key={i} d={`M${55 + i * 6} ${140 - i * 12} h${90 - i * 12}`} stroke={C} strokeOpacity={0.5} strokeWidth={2} />
      ))}
      <rect x="30" y="160" width="140" height="14" rx="4" fill="#1b2c50" stroke="#64748b" />
    </g>
  ),
  txv: (
    <g>
      <rect x="70" y="80" width="60" height="50" rx="8" {...S} fill={B} />
      <circle cx="100" cy="60" r="20" {...S} fill={B} />
      <path d="M20 105 h50 M130 105 h50" stroke={C} strokeWidth={8} strokeLinecap="round" />
      <path d="M100 40 C100 10 160 10 165 40" {...S} strokeWidth={2} />
      <rect x="150" y="40" width="30" height="12" rx="5" fill={V} />
    </g>
  ),
  piston: (
    <g>
      <rect x="60" y="80" width="80" height="40" rx="16" {...S} fill={B} />
      <circle cx="100" cy="100" r="5" fill={C} />
      <path d="M20 100 h40 M140 100 h40" stroke={C} strokeWidth={8} strokeLinecap="round" />
      <path d="M85 80 v40 M115 80 v40" {...S} opacity={0.4} />
    </g>
  ),
  "filter-drier": (
    <g>
      <rect x="55" y="75" width="90" height="50" rx="22" {...S} fill={B} />
      <path d="M20 100 h35 M145 100 h35" stroke={H} strokeWidth={6} strokeLinecap="round" />
      <path d="M150 100 l-8 -8 m8 8 l-8 8" stroke="#e2e8f0" strokeWidth={3} />
    </g>
  ),
  accumulator: (
    <g>
      <rect x="65" y="35" width="70" height="130" rx="30" {...S} fill={B} />
      <path d="M85 35 V15 H40 M115 35 V15 H160" stroke={C} strokeWidth={7} strokeLinecap="round" fill="none" />
    </g>
  ),
  "reversing-valve": (
    <g>
      <rect x="40" y="80" width="120" height="40" rx="18" {...S} fill={B} />
      <path d="M100 80 V40 M70 120 V160 M100 120 V160 M130 120 V160" stroke={H} strokeWidth={7} strokeLinecap="round" />
      <rect x="135" y="55" width="35" height="25" rx="4" fill={V} />
    </g>
  ),
  "service-valve": (
    <g>
      <rect x="70" y="70" width="60" height="60" rx="8" {...S} fill={B} />
      <path d="M100 70 V40" {...S} strokeWidth={8} />
      <rect x="88" y="28" width="24" height="14" rx="3" fill="#94a3b8" />
      <path d="M20 100 h50 M130 100 h30" stroke={C} strokeWidth={8} strokeLinecap="round" />
      <circle cx="160" cy="100" r="9" fill={V} />
    </g>
  ),
  capacitor: (
    <g>
      <rect x="60" y="50" width="80" height="120" rx="20" {...S} fill={B} />
      <ellipse cx="100" cy="52" rx="40" ry="10" {...S} fill="#1b2c50" />
      <rect x="72" y="32" width="12" height="12" rx="2" fill={H} />
      <rect x="94" y="32" width="12" height="12" rx="2" fill={V} />
      <rect x="116" y="32" width="12" height="12" rx="2" fill={C} />
    </g>
  ),
  contactor: (
    <g>
      <rect x="55" y="40" width="90" height="120" rx="10" {...S} fill={B} />
      <rect x="70" y="85" width="60" height="30" rx="5" fill="#1b2c50" stroke={V} strokeWidth={3} />
      {[75, 125].map((x) => (
        <g key={x}>
          <rect x={x - 10} y={48} width={20} height={14} rx={2} fill="#94a3b8" />
          <rect x={x - 10} y={138} width={20} height={14} rx={2} fill="#94a3b8" />
        </g>
      ))}
    </g>
  ),
  transformer: (
    <g>
      <rect x="50" y="60" width="100" height="80" rx="8" {...S} fill={B} />
      <path d="M75 60 V140 M125 60 V140" stroke={V} strokeWidth={3} opacity={0.6} />
      <path d="M50 80 h-25 M50 120 h-25 M150 80 h25 M150 120 h25" stroke={V} strokeWidth={4} strokeLinecap="round" />
    </g>
  ),
  thermostat: (
    <g>
      <rect x="45" y="40" width="110" height="120" rx="22" {...S} fill={B} />
      <circle cx="100" cy="95" r="34" fill="#0c2340" stroke={C} strokeWidth={3} />
      <text x="100" y="104" textAnchor="middle" fontSize="24" fontWeight="800" fill="#fff">
        72
      </text>
    </g>
  ),
  "control-board": (
    <g>
      <rect x="35" y="45" width="130" height="110" rx="6" fill="#0f3d2e" stroke="#4ade80" strokeWidth={3} />
      {[60, 80, 100, 120].map((x) => (
        <rect key={x} x={x} y={60} width={12} height={20} rx={2} fill="#1b2c50" />
      ))}
      <circle cx="140" cy="70" r="6" fill="#ef4444" />
      <path d="M50 130 h100" stroke={V} strokeWidth={6} strokeDasharray="6 6" />
    </g>
  ),
  blower: (
    <g>
      <circle cx="100" cy="100" r="60" {...S} fill={B} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <line key={i} x1={100 + Math.cos(a) * 30} y1={100 + Math.sin(a) * 30} x2={100 + Math.cos(a) * 58} y2={100 + Math.sin(a) * 58} stroke={C} strokeWidth={3} />;
      })}
      <circle cx="100" cy="100" r="22" {...S} fill="#1b2c50" />
    </g>
  ),
  "condenser-fan": (
    <g>
      <circle cx="100" cy="100" r="65" {...S} fill={B} />
      {[0, 120, 240].map((d) => (
        <path key={d} d="M100 100 C110 60 140 50 150 70 C140 90 120 100 100 100" fill="#94a3b8" transform={`rotate(${d} 100 100)`} />
      ))}
      <circle cx="100" cy="100" r="12" {...S} fill="#1b2c50" />
    </g>
  ),
  "air-filter": (
    <g>
      <rect x="40" y="40" width="120" height="120" rx="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={6} />
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M${52 + i * 12} 46 l6 54 -6 54`} stroke="#94a3b8" strokeWidth={2} fill="none" />
      ))}
    </g>
  ),
  hsi: (
    <g>
      <rect x="80" y="130" width="40" height="30" rx="4" {...S} fill="#1b2c50" />
      <path d="M90 130 V50 h20 v80" stroke={H} strokeWidth={8} fill="none" />
      <path d="M85 160 v20 M115 160 v20" {...S} />
    </g>
  ),
  "flame-sensor": (
    <g>
      <path d="M50 150 h40 l50 -90" stroke="#e2e8f0" strokeWidth={6} strokeLinecap="round" fill="none" />
      <rect x="30" y="140" width="30" height="22" rx="3" fill="#cbd5e1" />
      <path d="M150 70 q-15 -30 0 -50 q15 20 0 50" fill={C} opacity={0.8} />
    </g>
  ),
  inducer: (
    <g>
      <circle cx="95" cy="110" r="45" {...S} fill={B} />
      <rect x="125" y="40" width="40" height="40" rx="6" {...S} fill={B} />
      <path d="M95 65 V30 H140" stroke="#94a3b8" strokeWidth={10} fill="none" />
      <circle cx="95" cy="110" r="15" {...S} fill="#1b2c50" />
    </g>
  ),
  "pressure-switch": (
    <g>
      <circle cx="100" cy="100" r="45" {...S} fill={B} />
      <path d="M100 55 V25" stroke="#64748b" strokeWidth={8} strokeLinecap="round" />
      <rect x="85" y="140" width="30" height="16" rx="3" fill={V} />
    </g>
  ),
  "limit-switch": (
    <g>
      <rect x="60" y="70" width="80" height="60" rx="30" {...S} fill={B} />
      <path d="M100 130 V175" stroke="#94a3b8" strokeWidth={8} />
      <rect x="70" y="55" width="12" height="18" rx="2" fill={V} />
      <rect x="118" y="55" width="12" height="18" rx="2" fill={V} />
    </g>
  ),
  "float-switch": (
    <g>
      <rect x="40" y="110" width="120" height="50" rx="6" fill="#0c2340" stroke={C} strokeWidth={3} />
      <path d="M40 125 h120" stroke={C} strokeWidth={2} opacity={0.5} />
      <rect x="85" y="60" width="30" height="40" rx="6" {...S} fill={B} />
      <circle cx="100" cy="120" r="12" fill="#e2e8f0" />
      <path d="M100 60 V30" stroke={V} strokeWidth={4} />
    </g>
  ),
  "gas-valve": (
    <g>
      <rect x="55" y="60" width="90" height="80" rx="8" {...S} fill={B} />
      <path d="M20 100 h35 M145 100 h35" stroke={V} strokeWidth={10} strokeLinecap="round" />
      <rect x="85" y="40" width="30" height="22" rx="4" fill="#ef4444" />
    </g>
  ),
};

export function PartArt({ id, className }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="Component illustration">
      <rect x="0" y="0" width="200" height="200" rx="24" fill="#0a1428" />
      {ART[id] ?? null}
    </svg>
  );
}
