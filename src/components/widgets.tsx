"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Pause, Play, RotateCcw, Stethoscope } from "lucide-react";
import { RefrigerationCycle, SplitSystem } from "./diagrams";
import { satTemp, REFRIGERANTS, type Refrigerant } from "@/engine/pt";
import { COMPONENTS } from "@/content/components";
import { buttonClass } from "./ui";

const box = "rounded-2xl border border-white/10 bg-ink-900/70 p-4";
const label = "text-xs font-bold uppercase tracking-wider text-slate-400";
const big = "font-display text-3xl font-bold text-white";

function Slider({ name, value, min, max, step = 1, onChange, unit }: { name: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-300">{name}</span>
        <span className="font-mono font-bold text-white">
          {value}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-sky-400" aria-label={name} />
    </label>
  );
}

function Seg<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; ariaLabel: string }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-white/5 p-1" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={clsx("focus-ring flex-1 rounded-lg px-3 py-2 text-sm font-semibold", value === o.v ? "bg-cool-500 text-ink-950" : "text-slate-300 hover:text-white")}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// ---------- Cycle explorer ----------
const CYCLE_INFO: Record<string, { title: string; state: string; text: string }> = {
  compressor: { title: "Compressor", state: "In: cool low-pressure vapor · Out: hot high-pressure vapor", text: "Squeezes the vapor. Pressure and temperature rise so the refrigerant can dump heat outdoors — even on a hot day." },
  condenser: { title: "Condenser", state: "Hot vapor → high-pressure liquid", text: "Outdoor air blows across the coil. The vapor gives up heat (from your house plus the heat of compression) and condenses." },
  metering: { title: "Metering device", state: "High-pressure liquid → low-pressure cold mix", text: "A big pressure drop. Some liquid flashes to vapor, which chills the rest to around 40 °F." },
  evaporator: { title: "Evaporator", state: "Cold liquid/vapor mix → low-pressure vapor", text: "House air blows across the coil. The refrigerant boils, absorbing heat — and the coil pulls moisture out of the air too." },
};
function CycleExplorer() {
  const [playing, setPlaying] = useState(true);
  const [sel, setSel] = useState<string | undefined>();
  const order = ["compressor", "condenser", "metering", "evaporator"];
  const info = sel ? CYCLE_INFO[sel] : null;
  return (
    <div className="space-y-3">
      <RefrigerationCycle playing={playing} highlight={sel} onSelect={(id) => setSel(id)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPlaying(!playing)} className={buttonClass("secondary", "sm")}>
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? "Pause flow" : "Play flow"}
        </button>
        {order.map((o, i) => (
          <button key={o} type="button" onClick={() => setSel(o)} className={buttonClass(sel === o ? "primary" : "ghost", "sm")}>
            {i + 1}. {CYCLE_INFO[o].title}
          </button>
        ))}
      </div>
      <div className={box} aria-live="polite">
        {info ? (
          <>
            <div className="font-semibold text-white">{info.title}</div>
            <div className="mt-1 text-sm font-medium text-cool-300">{info.state}</div>
            <p className="mt-2 text-sm text-slate-300">{info.text}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Tap a component in the diagram (or a button) to see what happens there.</p>
        )}
      </div>
    </div>
  );
}

// ---------- PT calculator ----------
function PtCalculator() {
  const [ref, setRef] = useState<Refrigerant>("R-410A");
  const [suction, setSuction] = useState(118);
  const [sLine, setSLine] = useState(50);
  const [liquid, setLiquid] = useState(365);
  const [lLine, setLLine] = useState(100);
  const evap = satTemp(ref, suction);
  const cond = satTemp(ref, liquid);
  const sh = Math.round((sLine - evap) * 10) / 10;
  const sc = Math.round((cond - lLine) * 10) / 10;
  return (
    <div className="space-y-4">
      <Seg
        ariaLabel="Refrigerant"
        value={ref}
        options={REFRIGERANTS.map((r) => ({ v: r, l: r }))}
        onChange={(r) => {
          setRef(r);
          setSuction(r === "R-22" ? 68 : 118);
          setLiquid(r === "R-22" ? 226 : 365);
        }}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className={clsx(box, "space-y-3")}>
          <div className={label}>Low side → superheat</div>
          <Slider name="Suction pressure" unit="psig" value={suction} min={ref === "R-22" ? 30 : 60} max={ref === "R-22" ? 100 : 180} onChange={setSuction} />
          <Slider name="Suction line temp" unit="°F" value={sLine} min={20} max={80} onChange={setSLine} />
          <div className="flex items-end justify-between">
            <div className="text-sm text-slate-400">Saturation {evap} °F</div>
            <div className={clsx(big, "text-cool-300")}>SH {sh} °F</div>
          </div>
        </div>
        <div className={clsx(box, "space-y-3")}>
          <div className={label}>High side → subcooling</div>
          <Slider name="Liquid line pressure" unit="psig" value={liquid} min={ref === "R-22" ? 150 : 250} max={ref === "R-22" ? 300 : 480} onChange={setLiquid} />
          <Slider name="Liquid line temp" unit="°F" value={lLine} min={70} max={130} onChange={setLLine} />
          <div className="flex items-end justify-between">
            <div className="text-sm text-slate-400">Saturation {cond} °F</div>
            <div className={clsx(big, "text-heat-400")}>SC {sc} °F</div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">Approximate training PT values. Always use the refrigerant manufacturer&apos;s PT chart and the equipment manufacturer&apos;s charging targets.</p>
    </div>
  );
}

// ---------- Ohm's law ----------
function OhmsLaw() {
  const [v, setV] = useState(240);
  const [r, setR] = useState(24);
  const i = Math.round((v / r) * 100) / 100;
  const p = Math.round(v * i);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={clsx(box, "space-y-4")}>
        <Slider name="Voltage (V)" unit="V" value={v} min={12} max={240} onChange={setV} />
        <Slider name="Resistance (R)" unit="Ω" value={r} min={2} max={100} onChange={setR} />
      </div>
      <div className={clsx(box, "grid grid-cols-2 gap-3")}>
        <div>
          <div className={label}>Current I = V ÷ R</div>
          <div className={clsx(big, "text-volt-400")}>{i} A</div>
        </div>
        <div>
          <div className={label}>Power P = V × I</div>
          <div className={big}>{p.toLocaleString()} W</div>
        </div>
        <div className="col-span-2 text-sm text-slate-400">≈ {Math.round(p * 3.412).toLocaleString()} BTU/h if this were a resistive heat strip.</div>
      </div>
    </div>
  );
}

// ---------- Tonnage ----------
function TonnageCalc() {
  const [tons, setTons] = useState(3);
  return (
    <div className={clsx(box, "space-y-4")}>
      <Slider name="System size" unit="tons" value={tons} min={1} max={5} step={0.5} onChange={setTons} />
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className={big}>{(tons * 12000).toLocaleString()} BTU/h</div>
        <div className="text-slate-400">≈ {Math.round(tons * 400).toLocaleString()} CFM at a 400 CFM/ton starting point</div>
      </div>
    </div>
  );
}

// ---------- Airflow ----------
function AirflowCalc() {
  const [w, setW] = useState(12);
  const [h, setH] = useState(8);
  const [fpm, setFpm] = useState(600);
  const [dt, setDt] = useState(20);
  const area = (w * h) / 144;
  const cfm = Math.round(area * fpm);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={clsx(box, "space-y-3")}>
        <Slider name="Duct width" unit="in" value={w} min={4} max={30} onChange={setW} />
        <Slider name="Duct height" unit="in" value={h} min={4} max={20} onChange={setH} />
        <Slider name="Air velocity" unit="FPM" value={fpm} min={200} max={1200} step={25} onChange={setFpm} />
        <Slider name="Temperature difference" unit="°F" value={dt} min={5} max={70} onChange={setDt} />
      </div>
      <div className={clsx(box, "space-y-3")}>
        <div>
          <div className={label}>Area</div>
          <div className="text-xl font-bold text-white">{area.toFixed(2)} ft²</div>
        </div>
        <div>
          <div className={label}>Airflow = FPM × ft²</div>
          <div className={clsx(big, "text-ok-400")}>{cfm.toLocaleString()} CFM</div>
        </div>
        <div>
          <div className={label}>Sensible heat = 1.08 × CFM × ΔT</div>
          <div className="text-xl font-bold text-white">{Math.round(1.08 * cfm * dt).toLocaleString()} BTU/h</div>
        </div>
      </div>
    </div>
  );
}

// ---------- Thermostat simulator ----------
function ThermostatSim() {
  const [mode, setMode] = useState<"off" | "cool" | "heat">("cool");
  const [fan, setFan] = useState<"auto" | "on">("auto");
  const [set, setSet] = useState(72);
  const [room, setRoom] = useState(76);
  const [type, setType] = useState<"conventional" | "heatpump">("conventional");
  const cooling = mode === "cool" && room > set;
  const heating = mode === "heat" && room < set;
  const on = new Set<string>(["R", "C"]);
  if (cooling) ["Y", "G"].forEach((t) => on.add(t));
  if (cooling && type === "heatpump") on.add("O");
  if (heating && type === "conventional") on.add("W");
  if (heating && type === "heatpump") ["Y", "G"].forEach((t) => on.add(t));
  if (heating && type === "heatpump" && set - room >= 3) on.add("W2");
  if (fan === "on") on.add("G");
  const terms = type === "conventional" ? ["R", "C", "Y", "G", "W"] : ["R", "C", "Y", "G", "O", "W2"];
  const meaning: Record<string, string> = { R: "24 V power", C: "common", Y: "compressor", G: "indoor fan", W: "heat", O: "reversing valve (cool)", W2: "aux heat strips" };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Seg ariaLabel="System type" value={type} options={[{ v: "conventional", l: "Furnace + AC" }, { v: "heatpump", l: "Heat pump (O)" }]} onChange={setType} />
        <Seg ariaLabel="Mode" value={mode} options={[{ v: "off", l: "Off" }, { v: "cool", l: "Cool" }, { v: "heat", l: "Heat" }]} onChange={setMode} />
        <Seg ariaLabel="Fan" value={fan} options={[{ v: "auto", l: "Fan Auto" }, { v: "on", l: "Fan On" }]} onChange={setFan} />
      </div>
      <div className={clsx(box, "grid gap-4 md:grid-cols-2")}>
        <div className="space-y-3">
          <Slider name="Setpoint" unit="°F" value={set} min={60} max={85} onChange={setSet} />
          <Slider name="Room temperature" unit="°F" value={room} min={55} max={90} onChange={setRoom} />
          <div className="text-sm text-slate-300">
            Status: <span className="font-semibold text-white">{cooling ? "Calling for cooling" : heating ? (on.has("W2") ? "Calling for heat + aux" : "Calling for heat") : "Satisfied"}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
          {terms.map((t) => (
            <div key={t} className={clsx("rounded-xl border p-2 text-center transition", on.has(t) ? "border-volt-400 bg-volt-400/15" : "border-white/10 opacity-60")}>
              <div className={clsx("text-lg font-extrabold", on.has(t) ? "text-volt-400" : "text-slate-400")}>{t}</div>
              <div className="text-[11px] text-slate-400">{meaning[t]}</div>
              <div className="text-[11px] font-semibold">{t === "R" || t === "C" ? "supply" : on.has(t) ? "24 V ON" : "off"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Component explorer ----------
const HOTSPOTS: { id: string; x: number; y: number }[] = [
  { id: "evaporator-coil", x: 24.5, y: 55 },
  { id: "blower", x: 24.5, y: 80 },
  { id: "thermostat", x: 52, y: 64 },
  { id: "air-filter", x: 13, y: 88 },
  { id: "condenser-coil", x: 80, y: 68 },
  { id: "compressor", x: 85, y: 78 },
  { id: "capacitor", x: 92, y: 60 },
  { id: "contactor", x: 92, y: 85 },
  { id: "service-valve", x: 75, y: 85 },
];
function ComponentExplorer() {
  const [sel, setSel] = useState("evaporator-coil");
  const c = COMPONENTS.find((x) => x.id === sel)!;
  return (
    <div className="space-y-3">
      <div className="relative">
        <SplitSystem />
        {HOTSPOTS.map((h, i) => (
          <button key={h.id} type="button" onClick={() => setSel(h.id)} style={{ left: `${h.x}%`, top: `${h.y}%` }} className={clsx("focus-ring absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-xs font-bold shadow-lg transition", sel === h.id ? "border-white bg-cool-400 text-ink-950" : "animate-pulse border-cool-300 bg-ink-900/90 text-cool-200")} aria-label={COMPONENTS.find((x) => x.id === h.id)!.name}>
            {i + 1}
          </button>
        ))}
      </div>
      <div className={box} aria-live="polite">
        <div className="font-semibold text-white">{c.name}</div>
        <div className="mt-1 text-sm text-slate-300">{c.purpose}.</div>
        <div className="mt-1 text-xs text-slate-500">Location: {c.where}</div>
      </div>
    </div>
  );
}

// ---------- Multimeter trainer ----------
const METER_TASKS = [
  { task: "Check line voltage at the condenser disconnect.", mode: "VAC", power: "on", leads: "L1 to L2", result: "241 VAC — correct supply.", why: "Voltage tests are done on a live circuit with leads across (in parallel with) the points. Qualified techs only, with proper PPE." },
  { task: "Test the run capacitor.", mode: "µF", power: "off", leads: "HERM to C, then FAN to C", result: "44.3 µF / 4.9 µF — within ±6% of 45/5.", why: "Lock out, verify zero voltage, discharge the capacitor, remove a lead, then measure capacitance." },
  { task: "Check a 3 A low-voltage fuse.", mode: "Ω", power: "off", leads: "Across the fuse", result: "0.1 Ω — continuity, the fuse is good.", why: "Continuity/ohms tests are always done de-energized." },
  { task: "Measure compressor running current.", mode: "A", power: "on", leads: "Clamp around the common wire only", result: "13.6 A — below the RLA rating, normal for conditions.", why: "A clamp meter measures current around one conductor while the load runs." },
] as const;
function MultimeterTrainer() {
  const [i, setI] = useState(0);
  const [mode, setMode] = useState<string>("VAC");
  const [power, setPower] = useState<string>("on");
  const [leads, setLeads] = useState<string>("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const t = METER_TASKS[i];
  const leadsOpts = useMemo(() => [...new Set(METER_TASKS.map((x) => x.leads))], []);
  function test() {
    if (t.power === "off" && power === "on") return setMsg({ ok: false, text: "⚠ Unsafe: ohms and capacitance tests on an energized circuit can damage the meter and cause an arc flash. Lock out and verify zero voltage first." });
    if (mode !== t.mode) return setMsg({ ok: false, text: `That meter function won't give a valid reading for this test. Think about what quantity you need to measure.` });
    if (leads !== t.leads) return setMsg({ ok: false, text: "Lead placement isn't right for this measurement." });
    if (t.power === "on" && power === "off") return setMsg({ ok: false, text: "The reading is 0 — this test needs the circuit energized." });
    setMsg({ ok: true, text: `${t.result} ${t.why}` });
  }
  return (
    <div className="space-y-3">
      <div className={box}>
        <div className={label}>Task {i + 1} of {METER_TASKS.length}</div>
        <div className="mt-1 font-semibold text-white">{t.task}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className={clsx(label, "mb-1")}>Meter function</div>
          <Seg ariaLabel="Meter function" value={mode} options={["VAC", "Ω", "µF", "A"].map((v) => ({ v, l: v }))} onChange={setMode} />
        </div>
        <div>
          <div className={clsx(label, "mb-1")}>Equipment power</div>
          <Seg ariaLabel="Power" value={power} options={[{ v: "on", l: "Energized" }, { v: "off", l: "Locked out" }]} onChange={setPower} />
        </div>
        <label className="block">
          <div className={clsx(label, "mb-1")}>Leads / clamp</div>
          <select value={leads} onChange={(e) => setLeads(e.target.value)} className="focus-ring h-11 w-full rounded-xl border border-white/10 bg-ink-800 px-3 text-sm text-white">
            <option value="">Choose…</option>
            {leadsOpts.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={test} className={buttonClass("primary", "md")}>Take reading</button>
        {msg?.ok && i < METER_TASKS.length - 1 && (
          <button type="button" onClick={() => { setI(i + 1); setMsg(null); setLeads(""); }} className={buttonClass("secondary", "md")}>Next task</button>
        )}
      </div>
      {msg && <div className={clsx("rounded-xl border p-3 text-sm", msg.ok ? "border-ok-400/40 bg-ok-500/10 text-green-100" : "border-bad-400/40 bg-bad-500/10 text-red-100")} role="status">{msg.text}</div>}
    </div>
  );
}

// ---------- Series / parallel ----------
function SeriesParallelWidget() {
  const [s, setS] = useState([true, true, true]);
  const [p, setP] = useState([true, true, true]);
  const seriesOn = s.every(Boolean);
  const names = ["Low-pressure switch", "High-pressure switch", "Float switch"];
  const loads = ["Compressor", "Fan", "Blower"];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className={clsx(box, "space-y-2")}>
        <div className={label}>Series (safeties)</div>
        {names.map((n, i) => (
          <label key={n} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
            {n}
            <input type="checkbox" checked={s[i]} onChange={() => setS(s.map((x, j) => (j === i ? !x : x)))} className="h-5 w-5 accent-sky-400" />
          </label>
        ))}
        <div className={clsx("rounded-lg p-3 text-center font-bold", seriesOn ? "bg-ok-500/15 text-ok-400" : "bg-bad-500/15 text-bad-400")}>Contactor coil: {seriesOn ? "ENERGIZED" : "OFF"}</div>
      </div>
      <div className={clsx(box, "space-y-2")}>
        <div className={label}>Parallel (loads)</div>
        {loads.map((n, i) => (
          <label key={n} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
            <span>
              {n} branch: <b className={p[i] ? "text-ok-400" : "text-bad-400"}>{p[i] ? "running" : "open"}</b>
            </span>
            <input type="checkbox" checked={p[i]} onChange={() => setP(p.map((x, j) => (j === i ? !x : x)))} className="h-5 w-5 accent-sky-400" />
          </label>
        ))}
        <div className="text-sm text-slate-400">Opening one branch stops only that load. Every branch still gets full voltage.</div>
      </div>
    </div>
  );
}

// ---------- Static pressure explorer ----------
const FILTERS = { clean: { l: "Clean 1″ pleated", d: 0.12 }, dirty: { l: "Dirty 1″ filter", d: 0.55 }, merv13: { l: "1″ MERV 13", d: 0.3 }, media: { l: "4″ media cabinet", d: 0.08 } };
function StaticExplorer() {
  const [filter, setFilter] = useState<keyof typeof FILTERS>("clean");
  const [ret, setRet] = useState<"proper" | "undersized">("proper");
  const [closed, setClosed] = useState(0);
  const duct = 0.4 + (ret === "undersized" ? 0.25 : 0) + closed * 0.004;
  const tesp = Math.round((duct + FILTERS[filter].d) * 100) / 100;
  const cfm = Math.max(500, Math.min(1250, Math.round(1450 - 470 * tesp)));
  const perTon = Math.round(cfm / 3);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className={clsx(label, "mb-1")}>Filter</div>
          <Seg ariaLabel="Filter" value={filter} options={Object.entries(FILTERS).map(([v, f]) => ({ v: v as keyof typeof FILTERS, l: f.l }))} onChange={setFilter} />
        </div>
        <div>
          <div className={clsx(label, "mb-1")}>Return duct</div>
          <Seg ariaLabel="Return duct" value={ret} options={[{ v: "proper", l: "Properly sized" }, { v: "undersized", l: "Undersized" }]} onChange={setRet} />
        </div>
      </div>
      <div className={box}>
        <Slider name="Supply registers closed" unit="%" value={closed} min={0} max={60} step={10} onChange={setClosed} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <div className={label}>TESP</div>
          <div className={clsx(big, tesp > 0.7 ? "text-bad-400" : tesp > 0.55 ? "text-volt-400" : "text-ok-400")}>{tesp.toFixed(2)}″</div>
          <div className="text-xs text-slate-500">rated 0.50 in. w.c.</div>
        </div>
        <div className={box}>
          <div className={label}>Airflow (3-ton)</div>
          <div className={big}>{cfm} CFM</div>
          <div className="text-xs text-slate-500">{perTon} CFM/ton</div>
        </div>
        <div className={box}>
          <div className={label}>Risk</div>
          <div className="mt-1 text-sm text-slate-200">{perTon < 330 ? "High: coil may freeze in cooling, furnace may trip its limit." : perTon < 370 ? "Elevated: reduced capacity and comfort." : "Healthy airflow."}</div>
        </div>
      </div>
      <p className="text-xs text-slate-500">Simplified PSC blower model for learning. Real airflow comes from the manufacturer&apos;s blower table at measured static pressure.</p>
    </div>
  );
}

// ---------- Furnace sequence ----------
const SEQ = ["Thermostat calls for heat (R–W)", "Board checks limits and that the pressure switch is open", "Inducer starts", "Pressure switch closes (draft proven)", "Igniter heats up", "Gas valve opens — burners light", "Flame sensor proves flame", "Blower starts after delay"];
const FAULTS = {
  none: { l: "No fault", stop: -1, msg: "Normal heating cycle. 🔥" },
  ps: { l: "Blocked vent", stop: 3, msg: "Inducer runs, but the pressure switch never closes. The board won't allow ignition." },
  hsi: { l: "Cracked igniter", stop: 5, msg: "No glow → gas valve opens briefly but nothing lights. Board retries, then locks out." },
  fs: { l: "Dirty flame sensor", stop: 6, msg: "Burners light, but flame isn't proven. Gas valve shuts after a few seconds; repeated retries, then lockout." },
  limit: { l: "Open high limit", stop: 1, msg: "Board sees the limit open — no ignition. It runs the blower to cool down. Find out why it overheated (often airflow)." },
};
function FurnaceSequence() {
  const [fault, setFault] = useState<keyof typeof FAULTS>("none");
  const [step, setStep] = useState(0);
  const f = FAULTS[fault];
  const stopped = f.stop >= 0 && step > f.stop;
  const done = step >= SEQ.length;
  return (
    <div className="space-y-3">
      <Seg ariaLabel="Inject a fault" value={fault} options={Object.entries(FAULTS).map(([v, x]) => ({ v: v as keyof typeof FAULTS, l: x.l }))} onChange={(v) => { setFault(v); setStep(0); }} />
      <ol className="space-y-2">
        {SEQ.map((s, i) => {
          const state = i < step && !(f.stop >= 0 && i >= f.stop) ? "done" : f.stop === i && step > i ? "fail" : i === step && !stopped ? "now" : "todo";
          return (
            <li key={s} className={clsx("flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition", state === "done" && "border-ok-400/40 bg-ok-500/10 text-green-100", state === "fail" && "border-bad-400/50 bg-bad-500/15 text-red-100", state === "now" && "border-cool-400 bg-cool-500/10 text-white", state === "todo" && "border-white/10 text-slate-400")}>
              <span className="font-mono text-xs">{i + 1}</span> {s} {state === "fail" && "✗"}
            </li>
          );
        })}
      </ol>
      <div className="flex gap-2">
        <button type="button" disabled={done || stopped} onClick={() => setStep(step + 1)} className={buttonClass("primary", "md")}>Next step</button>
        <button type="button" onClick={() => setStep(0)} className={buttonClass("ghost", "md")}><RotateCcw size={16} /> Reset</button>
      </div>
      {(stopped || done) && <div className={clsx("rounded-xl border p-3 text-sm", stopped ? "border-bad-400/40 bg-bad-500/10 text-red-100" : "border-ok-400/40 bg-ok-500/10 text-green-100")}>{f.msg}</div>}
    </div>
  );
}

// ---------- Evacuation sim ----------
type EvacKind = "tight" | "moisture" | "leak";
function EvacuationSim() {
  const [kind, setKind] = useState<EvacKind>(() => (["tight", "moisture", "leak"] as const)[Math.floor(Math.random() * 3)]);
  const [phase, setPhase] = useState<"idle" | "pumping" | "isolated">("idle");
  const [t, setT] = useState(0);
  const [pts, setPts] = useState<number[]>([]);
  const [guess, setGuess] = useState<EvacKind | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const micron = pts.at(-1) ?? 760000;
  function start() {
    setPhase("pumping");
    setT(0);
    setPts([]);
    setGuess(null);
    if (timer.current) clearInterval(timer.current);
    let k = 0;
    timer.current = setInterval(() => {
      k++;
      setT(k);
      setPts((p) => [...p, Math.round(Math.max(kind === "leak" ? 900 : kind === "moisture" ? 650 : 380, 760000 * Math.exp(-k / 2.2)))]);
      if (k >= 22) {
        clearInterval(timer.current!);
        setPhase("idle");
      }
    }, 120);
  }
  function isolate() {
    setPhase("isolated");
    const base = pts.at(-1) ?? 400;
    let k = 0;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      k++;
      const v = kind === "tight" ? base + 120 * (1 - Math.exp(-k / 3)) : kind === "moisture" ? base + 1500 * (1 - Math.exp(-k / 4)) : base + 260 * k;
      setPts((p) => [...p, Math.round(v)]);
      if (k >= 20) clearInterval(timer.current!);
    }, 150);
  }
  const max = Math.max(5000, ...pts.slice(22));
  const isoPts = pts.slice(22);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={box}>
          <div className={label}>Micron gauge</div>
          <div className={clsx(big, "font-mono")}>{micron >= 25400 ? `${Math.round(micron / 25400)} inHg*` : micron.toLocaleString()}</div>
          <div className="text-xs text-slate-500">microns {phase === "isolated" ? "· pump isolated" : ""}</div>
        </div>
        <div className={clsx(box, "sm:col-span-2")}>
          <svg viewBox="0 0 200 60" className="h-20 w-full" aria-label="Decay curve after isolation">
            <line x1="0" y1="58" x2="200" y2="58" stroke="#475569" />
            <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={isoPts.map((v, i) => `${i * 10},${58 - (v / max) * 55}`).join(" ")} />
          </svg>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={start} className={buttonClass("primary", "md")} disabled={phase === "pumping"}>Run vacuum pump</button>
        <button type="button" onClick={isolate} className={buttonClass("secondary", "md")} disabled={pts.length < 22 || phase === "isolated"}>Isolate & decay test</button>
      </div>
      {isoPts.length >= 15 && (
        <div className={clsx(box, "space-y-2")}>
          <div className="text-sm font-semibold text-white">What does the decay curve tell you?</div>
          <div className="flex flex-wrap gap-2">
            {(["tight", "moisture", "leak"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setGuess(k)} className={buttonClass(guess === k ? (k === kind ? "success" : "danger") : "secondary", "sm")}>
                {k === "tight" ? "Tight & dry" : k === "moisture" ? "Moisture remaining" : "Leak"}
              </button>
            ))}
          </div>
          {guess && (
            <div className="text-sm text-slate-300">
              {guess === kind ? "Correct! " : "Not quite. "}
              {kind === "tight" ? "A small rise that levels off below the limit means a tight, dry system." : kind === "moisture" ? "It rose and leveled off high: moisture is still boiling off. Keep evacuating (heat and larger hoses help)." : "A steady climb that never levels off is a leak. Find it before charging."}{" "}
              <button type="button" className="font-semibold text-cool-300 underline" onClick={() => { setKind((["tight", "moisture", "leak"] as const)[Math.floor(Math.random() * 3)]); setPts([]); setGuess(null); setPhase("idle"); }}>
                Try another system
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-slate-500">*Above ~25,000 microns the gauge reading is shown in inches of mercury of vacuum for reference. Follow the manufacturer&apos;s evacuation target.</p>
      <span className="sr-only">{t}</span>
    </div>
  );
}

function SimLink({ id }: { id: string }) {
  return (
    <Link href={`/simulator/${id}`} className="focus-ring flex items-center gap-4 rounded-2xl border border-heat-400/30 bg-heat-500/10 p-4 hover:bg-heat-500/15">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-heat-500 text-ink-950">
        <Stethoscope />
      </span>
      <span>
        <span className="block font-semibold text-white">Open this call in the Field Simulator</span>
        <span className="text-sm text-orange-100/80">Investigate, measure, diagnose and repair — scored on your process.</span>
      </span>
    </Link>
  );
}

const WIDGETS: Record<string, () => React.ReactNode> = {
  "cycle-explorer": () => <CycleExplorer />,
  "pt-calculator": () => <PtCalculator />,
  "ohms-law": () => <OhmsLaw />,
  "tonnage-calc": () => <TonnageCalc />,
  "airflow-calc": () => <AirflowCalc />,
  "thermostat-sim": () => <ThermostatSim />,
  "component-explorer": () => <ComponentExplorer />,
  "multimeter-trainer": () => <MultimeterTrainer />,
  "series-parallel": () => <SeriesParallelWidget />,
  "static-explorer": () => <StaticExplorer />,
  "furnace-sequence": () => <FurnaceSequence />,
  "evacuation-sim": () => <EvacuationSim />,
};
export const WIDGET_KEYS = Object.keys(WIDGETS);

export function Widget({ name }: { name: string }) {
  if (name.startsWith("sim-link:")) return <SimLink id={name.slice(9)} />;
  const W = WIDGETS[name];
  return W ? <>{W()}</> : <div className="text-sm text-slate-500">Interactive widget unavailable.</div>;
}

export { CycleExplorer };
