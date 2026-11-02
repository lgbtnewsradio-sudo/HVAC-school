"use client";
import type { ReactNode } from "react";

/**
 * Illustrated, accessible SVG diagrams referenced by lesson steps (step.visual).
 * Colors: hot/high side = orange/red, cold/low side = blue, electrical = yellow.
 */

const HOT = "#fb923c";
const HOTTER = "#f87171";
const COLD = "#38bdf8";
const COLDER = "#7dd3fc";
const VOLT = "#facc15";
const LINE = "#94a3b8";
const BOX = "#12203d";
const EDGE = "#3d5285";

function Frame({ title, children, vb = "0 0 400 240" }: { title: string; children: ReactNode; vb?: string }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-white/10 bg-ink-900/70 p-2">
      <svg viewBox={vb} role="img" aria-label={title} className="h-auto w-full" style={{ fontFamily: "var(--font-sans)" }}>
        <title>{title}</title>
        {children}
      </svg>
    </figure>
  );
}

const T = ({ x, y, children, size = 11, fill = "#cbd5e1", anchor = "middle", weight = 500 }: { x: number; y: number; children: ReactNode; size?: number; fill?: string; anchor?: "start" | "middle" | "end"; weight?: number }) => (
  <text x={x} y={y} fontSize={size} fill={fill} textAnchor={anchor} fontWeight={weight}>
    {children}
  </text>
);

const Pipe = ({ d, color, animate = true, w = 5 }: { d: string; color: string; animate?: boolean; w?: number }) => (
  <g>
    <path d={d} stroke={color} strokeOpacity={0.25} strokeWidth={w + 4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={animate ? "8 4" : undefined} className={animate ? "animate-flow" : undefined} />
  </g>
);

const Coil = ({ x, y, w, h, color, label, sub }: { x: number; y: number; w: number; h: number; color: string; label: string; sub?: string }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={10} fill={BOX} stroke={color} strokeWidth={2} />
    {Array.from({ length: Math.floor(w / 10) - 1 }, (_, i) => (
      <line key={i} x1={x + 10 + i * 10} y1={y + 8} x2={x + 10 + i * 10} y2={y + h - 8} stroke={color} strokeOpacity={0.35} />
    ))}
    <path d={`M${x + 8} ${y + h / 2} q 8 -12 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0`} stroke={color} strokeWidth={2} fill="none" />
    <T x={x + w / 2} y={y - 8} fill="#fff" weight={700}>
      {label}
    </T>
    {sub && (
      <T x={x + w / 2} y={y + h + 16} size={10} fill="#94a3b8">
        {sub}
      </T>
    )}
  </g>
);

export function RefrigerationCycle({ highlight, playing = true, onSelect }: { highlight?: string; playing?: boolean; onSelect?: (id: string) => void }) {
  const hl = (id: string) => (highlight === id ? 1 : highlight ? 0.45 : 1);
  const click = (id: string) => (onSelect ? { onClick: () => onSelect(id), style: { cursor: "pointer" }, role: "button", tabIndex: 0, "aria-label": id, onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onSelect(id) } : {});
  return (
    <Frame title="The refrigeration cycle: compressor, condenser, metering device and evaporator">
      <rect x="200" y="0" width="200" height="240" fill="#f97316" fillOpacity="0.04" />
      <rect x="0" y="0" width="200" height="240" fill="#0ea5e9" fillOpacity="0.05" />
      <T x={100} y={232} size={10} fill="#7dd3fc">INDOOR · LOW SIDE</T>
      <T x={300} y={232} size={10} fill="#fdba74">OUTDOOR · HIGH SIDE</T>
      <Pipe d="M320 170 L340 170 L340 78" color={HOTTER} animate={playing} />
      <Pipe d="M300 50 L200 50 L120 50" color={HOT} animate={playing} />
      <Pipe d="M70 51 L22 51 L22 157 L30 157" color={COLDER} animate={playing} />
      <Pipe d="M140 157 L230 157 L230 196 L285 196" color={COLD} animate={playing} />
      <g opacity={hl("condenser")} {...click("condenser")}>
        <Coil x={260} y={40} w={110} h={34} color={HOT} label="Condenser" sub="vapor → liquid · rejects heat" />
      </g>
      <g opacity={hl("metering")} {...click("metering")}>
        <rect x={70} y={38} width={50} height={26} rx={6} fill={BOX} stroke={COLDER} strokeWidth={2} />
        <path d="M80 51 h10 l6 -6 v12 l-6 -6 M100 51 h12" stroke={COLDER} strokeWidth={2} fill="none" />
        <T x={95} y={30} fill="#fff" weight={700}>Metering device</T>
        <T x={95} y={78} size={10} fill="#94a3b8">pressure drop</T>
      </g>
      <g opacity={hl("evaporator")} {...click("evaporator")}>
        <Coil x={30} y={140} w={110} h={34} color={COLD} label="Evaporator" sub="liquid → vapor · absorbs heat" />
      </g>
      <g opacity={hl("compressor")} {...click("compressor")}>
        <rect x={285} y={150} width={56} height={62} rx={18} fill={BOX} stroke={HOTTER} strokeWidth={2} />
        <path d="M298 181 a15 15 0 1 1 30 0 a8 8 0 1 1 -16 0" stroke={HOTTER} strokeWidth={2} fill="none" />
        <T x={313} y={144} fill="#fff" weight={700}>Compressor</T>
      </g>
      <T x={355} y={130} size={9} fill="#fca5a5" anchor="start">hot gas</T>
      <T x={200} y={42} size={9} fill="#fdba74">high-pressure liquid</T>
      <T x={30} y={105} size={9} fill="#bae6fd" anchor="start">cold mix</T>
      <T x={150} y={150} size={9} fill="#7dd3fc" anchor="start">suction vapor</T>
    </Frame>
  );
}

export function SplitSystem() {
  return (
    <Frame title="A split system: indoor furnace with coil, outdoor condensing unit, line set and thermostat">
      <path d="M20 90 L140 30 L260 90 V215 H20 Z" fill="#0e1a33" stroke={EDGE} strokeWidth={2} />
      <line x1="0" y1="215" x2="400" y2="215" stroke={EDGE} strokeWidth={2} />
      <rect x="70" y="120" width="56" height="88" rx="6" fill={BOX} stroke={LINE} />
      <rect x="70" y="120" width="56" height="26" rx="6" fill="#0c2340" stroke={COLD} />
      <T x={98} y={137} size={9} fill="#7dd3fc">coil</T>
      <T x={98} y={180} size={9}>furnace /</T>
      <T x={98} y={192} size={9}>air handler</T>
      <path d="M98 120 V100 H220" stroke={LINE} strokeWidth={8} strokeOpacity={0.5} fill="none" />
      <T x={196} y={94} size={9} fill="#94a3b8">supply duct</T>
      <rect x="200" y="140" width="16" height="24" rx="3" fill={BOX} stroke={VOLT} />
      <T x={208} y={178} size={9} fill="#fde68a">thermostat</T>
      <Pipe d="M126 160 H300" color={COLD} w={4} />
      <Pipe d="M126 174 H300" color={HOT} w={3} />
      <T x={225} y={198} size={9} fill="#94a3b8">line set (suction + liquid)</T>
      <rect x="300" y="135" width="80" height="78" rx="8" fill={BOX} stroke={HOT} strokeWidth={2} />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={308 + i * 12} y1={146} x2={308 + i * 12} y2={205} stroke={HOT} strokeOpacity={0.35} />
      ))}
      <circle cx="340" cy="174" r="18" fill="none" stroke={LINE} strokeWidth={2} />
      <path d="M340 156 L346 174 L340 192 L334 174 Z" fill={LINE} opacity={0.6} />
      <T x={340} y={128} fill="#fff" weight={700}>Outdoor unit</T>
      <T x={98} y={112} fill="#fff" weight={700}>Indoor unit</T>
    </Frame>
  );
}

export function HeatFlow() {
  return (
    <Frame title="Heat flows from hot to cold">
      <rect x="30" y="70" width="120" height="100" rx="16" fill="#3b1d10" stroke={HOT} strokeWidth={2} />
      <T x={90} y={115} size={20} fill={HOT} weight={800}>HOT</T>
      <T x={90} y={138} size={11} fill="#fdba74">95 °F outdoors</T>
      <rect x="250" y="70" width="120" height="100" rx="16" fill="#0c2340" stroke={COLD} strokeWidth={2} />
      <T x={310} y={115} size={20} fill={COLD} weight={800}>COLD</T>
      <T x={310} y={138} size={11} fill="#7dd3fc">40 °F coil</T>
      {[95, 120, 145].map((y) => (
        <g key={y}>
          <path d={`M160 ${y} H235`} stroke={HOT} strokeWidth={3} strokeDasharray="8 5" className="animate-flow" />
          <path d={`M232 ${y - 6} l8 6 -8 6`} fill="none" stroke={HOT} strokeWidth={3} />
        </g>
      ))}
      <T x={200} y={200} size={13} fill="#e2e8f0" weight={700}>Heat moves from hot → cold, never the reverse on its own</T>
    </Frame>
  );
}

export function PtRelationship() {
  const pts = [
    [40, 200], [90, 185], [140, 160], [190, 130], [240, 95], [290, 60], [350, 25],
  ];
  return (
    <Frame title="Pressure and boiling temperature rise together">
      <line x1="40" y1="210" x2="370" y2="210" stroke={LINE} />
      <line x1="40" y1="210" x2="40" y2="15" stroke={LINE} />
      <T x={205} y={232} size={11}>Pressure →</T>
      <T x={22} y={110} size={11} anchor="middle">Temp</T>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="url(#ptg)" strokeWidth={4} strokeLinecap="round" />
      <defs>
        <linearGradient id="ptg" x1="0" x2="1">
          <stop offset="0" stopColor={COLD} />
          <stop offset="1" stopColor={HOT} />
        </linearGradient>
      </defs>
      <circle cx="90" cy="185" r="6" fill={COLD} />
      <T x={100} y={178} anchor="start" size={10} fill="#7dd3fc">Evaporator: low pressure → boils ~40 °F</T>
      <circle cx="290" cy="60" r="6" fill={HOT} />
      <T x={280} y={50} anchor="end" size={10} fill="#fdba74">Condenser: high pressure → condenses ~110 °F</T>
    </Frame>
  );
}

export function LatentHeat() {
  return (
    <Frame title="Temperature versus heat added: plateaus are latent heat">
      <line x1="40" y1="210" x2="370" y2="210" stroke={LINE} />
      <line x1="40" y1="210" x2="40" y2="15" stroke={LINE} />
      <T x={205} y={232} size={11}>Heat added (BTU) →</T>
      <polyline points="40,200 80,160 170,160 210,90 340,90 370,40" fill="none" stroke={HOT} strokeWidth={4} strokeLinejoin="round" />
      <T x={125} y={150} size={10} fill="#7dd3fc">melting (latent)</T>
      <T x={275} y={80} size={10} fill="#fdba74">boiling at 212 °F (latent)</T>
      <T x={78} y={195} size={10} anchor="start">sensible</T>
      <T x={195} y={135} size={10} anchor="end">sensible</T>
    </Frame>
  );
}

export function Furnace() {
  return (
    <Frame title="Cutaway of an induced-draft gas furnace with an evaporator coil on top">
      <rect x="120" y="10" width="160" height="40" rx="6" fill="#0c2340" stroke={COLD} />
      <T x={200} y={35} size={11} fill="#7dd3fc">Evaporator coil (cooling)</T>
      <rect x="120" y="50" width="160" height="180" rx="6" fill={BOX} stroke={LINE} />
      <path d="M140 70 h120 v60 h-120 z" fill="none" stroke={HOT} strokeWidth={2} />
      <T x={200} y={104} size={10} fill="#fdba74">Heat exchanger</T>
      <g>
        {[150, 175, 200, 225, 250].map((x) => (
          <path key={x} d={`M${x} 150 q-6 -14 0 -22 q6 8 0 22`} fill={HOT} opacity={0.8} />
        ))}
      </g>
      <T x={200} y={164} size={10}>Burners · igniter · flame sensor</T>
      <circle cx="200" cy="200" r="20" fill="none" stroke={COLD} strokeWidth={2} />
      <T x={200} y={204} size={9} fill="#7dd3fc">blower</T>
      <rect x="282" y="80" width="40" height="30" rx="6" fill={BOX} stroke={LINE} />
      <T x={302} y={99} size={9}>inducer</T>
      <path d="M322 95 h30 V10" stroke={LINE} strokeWidth={6} fill="none" opacity={0.6} />
      <T x={360} y={50} size={9} anchor="start">vent</T>
      <rect x="70" y="140" width="46" height="34" rx="5" fill={BOX} stroke={VOLT} />
      <T x={93} y={161} size={9} fill="#fde68a">board</T>
      <T x={60} y={215} size={9} anchor="start" fill="#94a3b8">return air + filter →</T>
    </Frame>
  );
}

export function HeatPump() {
  return (
    <Frame title="Heat pump in heating mode: the reversing valve sends hot gas indoors">
      <Coil x={30} y={40} w={120} h={34} color={HOT} label="Indoor coil (condenser in heat)" />
      <Coil x={250} y={40} w={120} h={34} color={COLD} label="Outdoor coil (evaporator in heat)" />
      <rect x="170" y="150" width="60" height="44" rx="8" fill={BOX} stroke={VOLT} strokeWidth={2} />
      <T x={200} y={176} size={10} fill="#fde68a">Reversing</T>
      <T x={200} y={188} size={10} fill="#fde68a">valve</T>
      <rect x="180" y="205" width="40" height="28" rx="10" fill={BOX} stroke={HOTTER} />
      <T x={200} y={223} size={9}>comp</T>
      <Pipe d="M190 205 V194" color={HOTTER} w={4} />
      <Pipe d="M175 160 H90 V74" color={HOTTER} w={4} />
      <Pipe d="M225 160 H310 V74" color={COLD} w={4} />
      <Pipe d="M150 57 H250" color={HOT} w={3} />
      <T x={200} y={50} size={9} fill="#94a3b8">metering / liquid line</T>
      <rect x="240" y="200" width="44" height="26" rx="6" fill={BOX} stroke={COLD} />
      <T x={262} y={217} size={9} fill="#7dd3fc">accum.</T>
    </Frame>
  );
}

export function PackageUnit() {
  return (
    <Frame title="A package unit: all components in one outdoor cabinet">
      <rect x="60" y="60" width="280" height="120" rx="10" fill={BOX} stroke={LINE} strokeWidth={2} />
      <rect x="75" y="75" width="80" height="90" rx="6" fill="#0c2340" stroke={COLD} />
      <T x={115} y={125} size={10} fill="#7dd3fc">evaporator + blower</T>
      <rect x="165" y="75" width="70" height="90" rx="6" fill="#2a1508" stroke={HOT} />
      <T x={200} y={125} size={10} fill="#fdba74">gas heat (optional)</T>
      <rect x="245" y="75" width="80" height="90" rx="6" fill="#2a1508" stroke={HOT} />
      <T x={285} y={125} size={10} fill="#fdba74">compressor + condenser</T>
      <path d="M100 180 V215 M130 180 V215" stroke={LINE} strokeWidth={10} opacity={0.5} />
      <T x={115} y={232} size={10}>supply & return ducts into the building</T>
      <T x={200} y={45} fill="#fff" weight={700}>Package unit (rooftop or slab)</T>
    </Frame>
  );
}

export function ThermostatWiring() {
  const rows: [string, string, string][] = [
    ["R", "#ef4444", "24 V hot"],
    ["C", "#3b82f6", "common"],
    ["Y", "#eab308", "cool / compressor"],
    ["G", "#22c55e", "fan"],
    ["W", "#f8fafc", "heat"],
    ["O/B", "#f97316", "reversing valve"],
  ];
  return (
    <Frame title="Thermostat terminals and their usual jobs">
      <rect x="30" y="20" width="110" height="200" rx="14" fill={BOX} stroke={VOLT} strokeWidth={2} />
      <T x={85} y={44} fill="#fff" weight={700}>Thermostat</T>
      <rect x="260" y="20" width="110" height="200" rx="10" fill={BOX} stroke={LINE} strokeWidth={2} />
      <T x={315} y={44} fill="#fff" weight={700}>Control board</T>
      {rows.map(([t, c, label], i) => {
        const y = 70 + i * 26;
        return (
          <g key={t}>
            <circle cx="120" cy={y} r="7" fill={c} />
            <T x={100} y={y + 4} anchor="end" weight={700}>
              {t}
            </T>
            <path d={`M127 ${y} C190 ${y} 210 ${y} 273 ${y}`} stroke={c} strokeWidth={3} fill="none" />
            <circle cx="280" cy={y} r="7" fill={c} />
            <T x={295} y={y + 4} anchor="start" size={10}>
              {label}
            </T>
          </g>
        );
      })}
    </Frame>
  );
}

export function OhmsTriangle() {
  return (
    <Frame title="Ohm's law triangle: V equals I times R">
      <path d="M200 20 L330 210 H70 Z" fill={BOX} stroke={VOLT} strokeWidth={3} />
      <line x1="115" y1="140" x2="285" y2="140" stroke={VOLT} strokeWidth={2} />
      <line x1="200" y1="140" x2="200" y2="210" stroke={VOLT} strokeWidth={2} />
      <T x={200} y={110} size={34} fill={VOLT} weight={800}>V</T>
      <T x={150} y={190} size={30} fill="#fff" weight={800}>I</T>
      <T x={250} y={190} size={30} fill="#fff" weight={800}>R</T>
      <T x={350} y={60} size={11} anchor="end">V = I × R</T>
      <T x={350} y={78} size={11} anchor="end">I = V ÷ R</T>
      <T x={350} y={96} size={11} anchor="end">R = V ÷ I</T>
      <T x={50} y={60} size={11} anchor="start">P = V × I</T>
    </Frame>
  );
}

export function SeriesParallel() {
  return (
    <Frame title="Series circuit (one path) versus parallel circuit (separate paths)">
      <T x={100} y={22} fill="#fff" weight={700}>Series — safeties</T>
      <rect x="30" y="40" width="140" height="150" rx="8" fill="none" stroke={VOLT} strokeWidth={2} />
      {[60, 100, 140].map((x, i) => (
        <g key={x}>
          <rect x={x - 12} y={32} width={24} height={16} rx={3} fill={BOX} stroke={VOLT} />
          <T x={x} y={44} size={8}>{["LPS", "HPS", "FS"][i]}</T>
        </g>
      ))}
      <circle cx="100" cy="190" r="14" fill={BOX} stroke={VOLT} strokeWidth={2} />
      <T x={100} y={194} size={9}>coil</T>
      <T x={100} y={222} size={10} fill="#94a3b8">any switch opens → all stop</T>
      <T x={300} y={22} fill="#fff" weight={700}>Parallel — loads</T>
      <line x1="230" y1="40" x2="230" y2="200" stroke={VOLT} strokeWidth={2} />
      <line x1="370" y1="40" x2="370" y2="200" stroke={VOLT} strokeWidth={2} />
      {[70, 120, 170].map((y, i) => (
        <g key={y}>
          <line x1="230" y1={y} x2="370" y2={y} stroke={VOLT} strokeWidth={2} />
          <circle cx="300" cy={y} r="14" fill={BOX} stroke={VOLT} strokeWidth={2} />
          <T x={300} y={y + 4} size={8}>{["comp", "fan", "blower"][i]}</T>
        </g>
      ))}
      <T x={300} y={222} size={10} fill="#94a3b8">each load gets full voltage</T>
    </Frame>
  );
}

export function CapacitorDiagram() {
  return (
    <Frame title="Dual run capacitor with C, HERM and FAN terminals">
      <rect x="140" y="40" width="120" height="160" rx="22" fill={BOX} stroke={LINE} strokeWidth={2} />
      <ellipse cx="200" cy="44" rx="60" ry="14" fill="#1b2c50" stroke={LINE} strokeWidth={2} />
      {[
        [170, "HERM", HOTTER],
        [200, "C", VOLT],
        [230, "FAN", COLD],
      ].map(([x, l, c]) => (
        <g key={l as string}>
          <rect x={(x as number) - 9} y={30} width={18} height={14} rx={3} fill={c as string} />
          <T x={x as number} y={22} size={10} weight={700} fill={c as string}>
            {l as string}
          </T>
        </g>
      ))}
      <T x={200} y={110} size={14} weight={800} fill="#fff">45 + 5 µF</T>
      <T x={200} y={130} size={11}>±6% · 440 VAC</T>
      <T x={200} y={225} size={10} fill="#fde68a">⚠ Discharge and verify 0 V before handling</T>
    </Frame>
  );
}

export function ContactorDiagram() {
  return (
    <Frame title="Contactor: a 24 V coil pulls in contacts that switch line voltage">
      <rect x="120" y="30" width="160" height="180" rx="10" fill={BOX} stroke={LINE} strokeWidth={2} />
      {[160, 240].map((x, i) => (
        <g key={x}>
          <rect x={x - 14} y={42} width={28} height={18} rx={3} fill="#1b2c50" stroke={HOT} />
          <T x={x} y={55} size={10} fill="#fdba74">{`L${i + 1}`}</T>
          <rect x={x - 14} y={180} width={28} height={18} rx={3} fill="#1b2c50" stroke={HOT} />
          <T x={x} y={193} size={10} fill="#fdba74">{`T${i + 1}`}</T>
          <line x1={x} y1={64} x2={x} y2={100} stroke={HOT} strokeWidth={3} />
          <line x1={x} y1={140} x2={x} y2={176} stroke={HOT} strokeWidth={3} />
        </g>
      ))}
      <rect x="140" y="102" width="120" height="36" rx="6" fill="#1b2c50" stroke={VOLT} strokeWidth={2} />
      <T x={200} y={125} size={11} fill="#fde68a">24 V coil</T>
      <T x={60} y={60} size={10} anchor="middle">line in</T>
      <T x={60} y={190} size={10} anchor="middle">to loads</T>
      <T x={340} y={120} size={10} anchor="middle">thermostat Y</T>
    </Frame>
  );
}

export function CompressorTerminals() {
  return (
    <Frame title="Compressor terminals C, S and R with typical winding resistance">
      <circle cx="200" cy="120" r="90" fill={BOX} stroke={LINE} strokeWidth={2} />
      {[
        [200, 75, "C"],
        [160, 150, "S"],
        [240, 150, "R"],
      ].map(([x, y, l]) => (
        <g key={l as string}>
          <circle cx={x as number} cy={y as number} r="15" fill="#1b2c50" stroke={VOLT} strokeWidth={2} />
          <T x={x as number} y={(y as number) + 5} size={14} weight={800} fill={VOLT}>
            {l as string}
          </T>
        </g>
      ))}
      <T x={160} y={108} size={10} anchor="end">C–S 2.4 Ω</T>
      <T x={240} y={108} size={10} anchor="start">C–R 0.9 Ω</T>
      <T x={200} y={178} size={10}>S–R 3.3 Ω (= sum)</T>
      <T x={200} y={228} size={10} fill="#94a3b8">Power off. Also test each terminal to ground.</T>
    </Frame>
  );
}

export function HouseAirflow() {
  return (
    <Frame title="Airflow through a house: supply ducts to rooms, returns back to the unit">
      <path d="M20 80 L200 20 L380 80 V220 H20 Z" fill="#0e1a33" stroke={EDGE} strokeWidth={2} />
      <line x1="200" y1="80" x2="200" y2="220" stroke={EDGE} />
      <line x1="20" y1="150" x2="380" y2="150" stroke={EDGE} />
      <rect x="180" y="170" width="40" height="46" rx="5" fill={BOX} stroke={LINE} />
      <T x={200} y={198} size={9}>unit</T>
      <path d="M200 170 V120 H80 V100 M200 120 H320 V100" stroke={COLD} strokeWidth={6} fill="none" strokeOpacity={0.6} />
      {[80, 320].map((x) => (
        <g key={x}>
          <path d={`M${x} 98 v-10`} stroke={COLD} strokeWidth={3} strokeDasharray="4 3" className="animate-flow" />
          <T x={x} y={84} size={9} fill="#7dd3fc">supply register</T>
        </g>
      ))}
      <path d="M100 205 H180" stroke={HOT} strokeWidth={6} strokeOpacity={0.5} />
      <T x={100} y={198} size={9} fill="#fdba74">return grille</T>
      <path d="M140 205 h-20" stroke={HOT} strokeWidth={3} strokeDasharray="4 3" className="animate-flow" />
    </Frame>
  );
}

export function StaticPressureDiagram() {
  return (
    <Frame title="Measuring total external static pressure across the blower cabinet">
      <rect x="160" y="70" width="80" height="110" rx="8" fill={BOX} stroke={LINE} strokeWidth={2} />
      <T x={200} y={130} size={10}>blower</T>
      <rect x="40" y="105" width="120" height="40" fill="#1b2c50" stroke={EDGE} />
      <T x={100} y={130} size={10}>return</T>
      <rect x="240" y="105" width="120" height="40" fill="#1b2c50" stroke={EDGE} />
      <T x={300} y={130} size={10}>supply</T>
      <circle cx="140" cy="105" r="4" fill={VOLT} />
      <circle cx="260" cy="105" r="4" fill={VOLT} />
      <path d="M140 101 V40 H180 M260 101 V40 H220" stroke={VOLT} fill="none" />
      <rect x="175" y="22" width="50" height="30" rx="6" fill={BOX} stroke={VOLT} />
      <T x={200} y={42} size={10} fill="#fde68a">0.80″</T>
      <T x={140} y={168} size={10} fill="#7dd3fc">−0.45 in. w.c.</T>
      <T x={260} y={168} size={10} fill="#fdba74">+0.35 in. w.c.</T>
      <T x={200} y={215} size={11} fill="#e2e8f0">TESP = 0.35 + 0.45 = 0.80 in. w.c.</T>
    </Frame>
  );
}

export function FurnaceSequenceDiagram() {
  const steps = ["Call for heat", "Inducer on", "Pressure switch", "Igniter", "Gas valve", "Flame proven", "Blower on"];
  return (
    <Frame title="Furnace sequence of operation" vb="0 0 400 120">
      {steps.map((s, i) => (
        <g key={s}>
          <circle cx={30 + i * 57} cy={50} r={16} fill={BOX} stroke={i < 4 ? COLD : HOT} strokeWidth={2} />
          <T x={30 + i * 57} y={55} size={12} weight={800} fill="#fff">
            {i + 1}
          </T>
          <T x={30 + i * 57} y={88} size={8.5}>
            {s}
          </T>
          {i < steps.length - 1 && <line x1={47 + i * 57} y1={50} x2={70 + i * 57} y2={50} stroke={LINE} strokeWidth={2} />}
        </g>
      ))}
    </Frame>
  );
}

export function DefrostDiagram() {
  return (
    <Frame title="Heat pump defrost: reversing valve shifts, outdoor fan stops, aux heat tempers indoor air">
      <Coil x={40} y={70} w={130} h={50} color={COLDER} label="Outdoor coil" sub="frost blocks airflow" />
      {Array.from({ length: 10 }, (_, i) => (
        <circle key={i} cx={52 + i * 12} cy={80 + (i % 3) * 14} r={3} fill="#e0f2fe" />
      ))}
      <path d="M200 95 h40" stroke={LINE} strokeWidth={3} />
      <path d="M236 89 l8 6 -8 6" fill="none" stroke={LINE} strokeWidth={3} />
      <rect x="260" y="40" width="120" height="150" rx="10" fill={BOX} stroke={HOT} strokeWidth={2} />
      <T x={320} y={64} weight={700} fill="#fff">In defrost</T>
      <T x={320} y={90} size={10} fill="#fdba74">Reversing valve → cooling</T>
      <T x={320} y={112} size={10}>Outdoor fan OFF</T>
      <T x={320} y={134} size={10} fill="#fde68a">Aux heat ON</T>
      <T x={320} y={156} size={10}>Ends on coil temp</T>
      <T x={320} y={172} size={10}>or max time</T>
    </Frame>
  );
}

export function BrazingDiagram() {
  return (
    <Frame title="Brazing with a nitrogen purge: cylinder, regulator, flowmeter, and the joint">
      <rect x="20" y="60" width="44" height="150" rx="20" fill="#1b2c50" stroke={LINE} strokeWidth={2} />
      <T x={42} y={140} size={10}>N₂</T>
      <rect x="28" y="40" width="28" height="22" rx="4" fill={BOX} stroke={VOLT} />
      <T x={42} y={32} size={9} fill="#fde68a">regulator</T>
      <path d="M56 50 H130 V120 H330" stroke={COLD} strokeWidth={4} fill="none" strokeDasharray="6 4" className="animate-flow" />
      <rect x="120" y="70" width="20" height="40" rx="4" fill={BOX} stroke={COLD} />
      <T x={150} y={92} size={9} anchor="start" fill="#7dd3fc">flowmeter (low flow)</T>
      <circle cx="250" cy="120" r="10" fill="none" stroke={HOT} strokeWidth={3} />
      <path d="M250 100 q-14 -20 0 -36 q14 16 0 36" fill={HOT} opacity={0.9} />
      <T x={250} y={150} size={10} fill="#fdba74">joint being brazed</T>
      <T x={330} y={110} size={9} anchor="end">open end vents purge</T>
      <T x={200} y={210} size={11} fill="#e2e8f0">Nitrogen displaces oxygen → no copper oxide scale inside the pipe</T>
    </Frame>
  );
}

export function EvacuationDiagram() {
  return (
    <Frame title="Vacuum decay test: tight and dry, moisture, and leak curves">
      <line x1="50" y1="200" x2="370" y2="200" stroke={LINE} />
      <line x1="50" y1="200" x2="50" y2="20" stroke={LINE} />
      <T x={210} y={225} size={10}>Time after isolating the pump →</T>
      <T x={30} y={110} size={10}>µ</T>
      <polyline points="50,185 120,178 370,176" fill="none" stroke={"#4ade80"} strokeWidth={3} />
      <T x={365} y={170} size={10} anchor="end" fill="#86efac">tight & dry</T>
      <polyline points="50,185 110,140 170,118 370,112" fill="none" stroke={VOLT} strokeWidth={3} />
      <T x={365} y={105} size={10} anchor="end" fill="#fde68a">moisture — levels off high</T>
      <polyline points="50,185 370,30" fill="none" stroke={HOTTER} strokeWidth={3} />
      <T x={300} y={40} size={10} anchor="end" fill="#fca5a5">leak — keeps rising</T>
      <line x1="50" y1="170" x2="370" y2="170" stroke={LINE} strokeDasharray="4 4" opacity={0.5} />
      <T x={56} y={165} size={9} anchor="start" fill="#94a3b8">target (e.g., 500 µ)</T>
    </Frame>
  );
}

export function LadderSchematic() {
  const rung = (y: number, parts: string[], load: string) => (
    <g key={y}>
      <line x1="40" y1={y} x2="360" y2={y} stroke={VOLT} strokeWidth={1.5} />
      {parts.map((p, i) => (
        <g key={p}>
          <rect x={70 + i * 70} y={y - 9} width={48} height={18} rx={3} fill={BOX} stroke={VOLT} />
          <T x={94 + i * 70} y={y + 4} size={9}>
            {p}
          </T>
        </g>
      ))}
      <circle cx="320" cy={y} r="13" fill={BOX} stroke={HOT} strokeWidth={2} />
      <T x={320} y={y + 4} size={9} fill="#fdba74">
        {load}
      </T>
    </g>
  );
  return (
    <Frame title="Ladder diagram of a 24 volt control circuit">
      <line x1="40" y1="20" x2="40" y2="220" stroke={VOLT} strokeWidth={3} />
      <line x1="360" y1="20" x2="360" y2="220" stroke={VOLT} strokeWidth={3} />
      <T x={40} y={14} size={10} fill="#fde68a">R</T>
      <T x={360} y={14} size={10} fill="#fde68a">C</T>
      {rung(60, ["Tstat Y", "LPS", "HPS"], "CC")}
      {rung(120, ["Tstat G"], "fan")}
      {rung(180, ["Tstat W", "limit"], "heat")}
    </Frame>
  );
}

export function SuperheatSubcooling() {
  return (
    <Frame title="Where superheat and subcooling happen in the coils">
      <rect x="30" y="40" width="160" height="40" rx="8" fill="#0c2340" stroke={COLD} strokeWidth={2} />
      <rect x="30" y="40" width="120" height="40" rx="8" fill={COLD} fillOpacity={0.2} />
      <T x={90} y={65} size={10} fill="#7dd3fc">boiling at 40 °F</T>
      <T x={170} y={65} size={10} fill="#fff">+SH</T>
      <T x={110} y={30} fill="#fff" weight={700}>Evaporator</T>
      <T x={110} y={100} size={10}>Superheat = 50 °F line − 40 °F sat = 10 °F</T>
      <rect x="210" y="140" width="160" height="40" rx="8" fill="#2a1508" stroke={HOT} strokeWidth={2} />
      <rect x="250" y="140" width="120" height="40" rx="8" fill={HOT} fillOpacity={0.2} />
      <T x={230} y={165} size={10} fill="#fff">SC</T>
      <T x={310} y={165} size={10} fill="#fdba74">condensing at 110 °F</T>
      <T x={290} y={130} fill="#fff" weight={700}>Condenser</T>
      <T x={290} y={200} size={10}>Subcooling = 110 °F sat − 100 °F line = 10 °F</T>
    </Frame>
  );
}

export function TxvDiagram() {
  return (
    <Frame title="Thermostatic expansion valve with sensing bulb on the suction line">
      <Pipe d="M20 120 H150" color={HOT} w={5} />
      <rect x="150" y="95" width="60" height="50" rx="8" fill={BOX} stroke={COLDER} strokeWidth={2} />
      <path d="M165 105 q15 15 30 0" stroke={COLDER} fill="none" strokeWidth={2} />
      <T x={180} y={88} fill="#fff" weight={700}>TXV</T>
      <Pipe d="M210 120 H300" color={COLDER} w={5} />
      <Coil x={300} y={100} w={80} h={40} color={COLD} label="Evap" />
      <Pipe d="M340 140 V200 H120" color={COLD} w={5} />
      <rect x="180" y="190" width="40" height="18" rx="6" fill={BOX} stroke={VOLT} />
      <T x={200} y={225} size={10} fill="#fde68a">sensing bulb (strapped & insulated)</T>
      <path d="M200 190 C200 170 190 160 180 145" stroke={VOLT} fill="none" strokeDasharray="3 3" />
    </Frame>
  );
}

export function ScrollCompressor() {
  return (
    <Frame title="Scroll compressor: one fixed and one orbiting spiral squeeze vapor toward the center">
      <circle cx="200" cy="120" r="95" fill={BOX} stroke={LINE} strokeWidth={2} />
      <path d="M200 120 m0 -10 a10 10 0 1 1 -1 0 m1 -15 a25 25 0 1 1 -2 0 m2 -15 a40 40 0 1 1 -3 0 m3 -15 a55 55 0 1 1 -4 0" stroke={COLD} strokeWidth={4} fill="none" />
      <path d="M205 125 m0 -8 a12 12 0 1 0 1 0 m-1 -15 a27 27 0 1 0 2 0 m-2 -15 a42 42 0 1 0 3 0" stroke={HOT} strokeWidth={4} fill="none" opacity={0.8} />
      <T x={200} y={232} size={10}>Low-pressure vapor enters at the edge → discharged hot at the center</T>
    </Frame>
  );
}

export function HvacOverview() {
  const items: [string, string, string][] = [
    ["H", "Heating", HOT],
    ["V", "Ventilation", "#4ade80"],
    ["AC", "Air Conditioning", COLD],
  ];
  return (
    <Frame title="HVAC: heating, ventilation and air conditioning" vb="0 0 400 140">
      {items.map(([k, label, c], i) => (
        <g key={k}>
          <rect x={20 + i * 128} y={20} width={110} height={100} rx={18} fill={BOX} stroke={c} strokeWidth={2} />
          <T x={75 + i * 128} y={72} size={30} weight={800} fill={c}>
            {k}
          </T>
          <T x={75 + i * 128} y={100} size={11}>
            {label}
          </T>
        </g>
      ))}
    </Frame>
  );
}

const MAP: Record<string, () => ReactNode> = {
  "refrigeration-cycle": () => <RefrigerationCycle />,
  "split-system": () => <SplitSystem />,
  "heat-flow": () => <HeatFlow />,
  "pt-relationship": () => <PtRelationship />,
  "latent-heat": () => <LatentHeat />,
  furnace: () => <Furnace />,
  "heat-pump": () => <HeatPump />,
  "package-unit": () => <PackageUnit />,
  "thermostat-wiring": () => <ThermostatWiring />,
  "ohms-triangle": () => <OhmsTriangle />,
  "series-parallel": () => <SeriesParallel />,
  capacitor: () => <CapacitorDiagram />,
  contactor: () => <ContactorDiagram />,
  "compressor-terminals": () => <CompressorTerminals />,
  "house-airflow": () => <HouseAirflow />,
  "static-pressure": () => <StaticPressureDiagram />,
  "furnace-sequence": () => <FurnaceSequenceDiagram />,
  defrost: () => <DefrostDiagram />,
  "brazing-nitrogen": () => <BrazingDiagram />,
  evacuation: () => <EvacuationDiagram />,
  "ladder-schematic": () => <LadderSchematic />,
  "superheat-subcooling": () => <SuperheatSubcooling />,
  txv: () => <TxvDiagram />,
  "comp-scroll": () => <ScrollCompressor />,
  "hvac-overview": () => <HvacOverview />,
};

export const DIAGRAM_KEYS = Object.keys(MAP);

export function Diagram({ name }: { name: string }) {
  const D = MAP[name];
  return D ? <>{D()}</> : null;
}
