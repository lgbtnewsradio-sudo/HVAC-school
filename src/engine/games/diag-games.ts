import { satPressure, satTemp } from "../pt";
import { asArray, between, isRecord, pick, rng, sample, shuffle, type GameDef } from "./core";

// ---------------- D: Find the Fault ----------------
type FaultCase = {
  id: string;
  system: string;
  symptom: string;
  components: { id: string; label: string; test: string; reading: string }[];
  fault: string;
  why: string;
};

const CASES: FaultCase[] = [
  {
    id: "c-cap",
    system: "Condensing unit",
    symptom: "Contactor pulled in; compressor hums and trips on overload; fan doesn't spin.",
    components: [
      { id: "contactor", label: "Contactor", test: "Voltage at load side", reading: "240 V — passing power" },
      { id: "capacitor", label: "Dual run capacitor", test: "Capacitance (locked out, discharged)", reading: "HERM 4 µF / FAN 0.5 µF (rated 45/5)" },
      { id: "compressor", label: "Compressor", test: "Winding resistance", reading: "C–R 0.9, C–S 2.4, S–R 3.3 Ω — normal" },
      { id: "fan", label: "Fan motor", test: "Winding resistance", reading: "Continuity on all windings — normal" },
    ],
    fault: "capacitor",
    why: "Both motors share the dual capacitor, and it's far below rating.",
  },
  {
    id: "c-hps",
    system: "Condensing unit",
    symptom: "Outdoor unit off. Thermostat calling. 24 V present at Y–C at the unit.",
    components: [
      { id: "hps", label: "High-pressure switch", test: "Voltage across switch", reading: "24 V across it — open" },
      { id: "lps", label: "Low-pressure switch", test: "Voltage across switch", reading: "0 V — closed" },
      { id: "coil", label: "Contactor coil", test: "Voltage across coil", reading: "0 V" },
      { id: "fan", label: "Condenser fan motor", test: "Visual + amps on last run", reading: "Seized — blade won't turn by hand (power locked out)" },
    ],
    fault: "fan",
    why: "The high-pressure switch is open because the condenser fan seized and head pressure spiked. The switch is the symptom; the fan is the fault.",
  },
  {
    id: "c-transformer",
    system: "Furnace control circuit",
    symptom: "Thermostat blank. Furnace has 120 V supply. No 24 V anywhere.",
    components: [
      { id: "breaker", label: "Furnace breaker / switch", test: "Voltage at furnace supply", reading: "121 V — good" },
      { id: "fuse", label: "3 A board fuse", test: "Continuity (locked out)", reading: "Continuity — good" },
      { id: "transformer", label: "Transformer", test: "Primary / secondary voltage", reading: "Primary 121 V, secondary 0 V" },
      { id: "tstat", label: "Thermostat", test: "Battery check", reading: "Batteries good, but no 24 V supplied" },
    ],
    fault: "transformer",
    why: "Line voltage reaches the transformer primary, but its secondary produces nothing — an open winding.",
  },
  {
    id: "c-igniter",
    system: "Gas furnace",
    symptom: "Inducer runs, pressure switch closes, no glow, lockout after 3 tries.",
    components: [
      { id: "ps", label: "Pressure switch", test: "Voltage across switch during trial", reading: "0 V — closed" },
      { id: "igniter", label: "Hot surface igniter", test: "Resistance (locked out, unplugged)", reading: "OL" },
      { id: "board", label: "Control board", test: "Igniter output during trial", reading: "120 V output" },
      { id: "fs", label: "Flame sensor", test: "Visual", reading: "Clean" },
    ],
    fault: "igniter",
    why: "The board sends 120 V but the igniter reads open (OL).",
  },
  {
    id: "c-blowercap",
    system: "Furnace blower (PSC)",
    symptom: "Weak airflow; blower motor hot and humming.",
    components: [
      { id: "filter", label: "Air filter", test: "Pressure drop", reading: "0.10 in. w.c. — clean" },
      { id: "motor", label: "Blower motor", test: "Voltage at motor", reading: "120 V" },
      { id: "cap", label: "Blower capacitor", test: "Capacitance (locked out, discharged)", reading: "1.4 µF (rated 10 µF)" },
      { id: "wheel", label: "Blower wheel", test: "Visual", reading: "Clean, spins freely by hand (locked out)" },
    ],
    fault: "cap",
    why: "Voltage is present and the wheel spins freely; the capacitor is far below rating.",
  },
  {
    id: "c-drier",
    system: "AC refrigerant circuit",
    symptom: "High superheat AND high subcooling.",
    components: [
      { id: "charge", label: "Refrigerant charge", test: "SH / SC", reading: "SH 27 °F / SC 19 °F" },
      { id: "drier", label: "Filter drier", test: "Temperature in vs out", reading: "In 96 °F / Out 81 °F" },
      { id: "condenser", label: "Condenser coil", test: "Visual", reading: "Clean" },
      { id: "filter", label: "Air filter", test: "Pressure drop", reading: "0.12 in. w.c." },
    ],
    fault: "drier",
    why: "A 15 °F drop across the drier shows a restriction there.",
  },
  {
    id: "c-flamesensor",
    system: "Gas furnace",
    symptom: "Burners light, then shut off after ~5 seconds. Repeats.",
    components: [
      { id: "igniter", label: "Igniter", test: "Visual during trial", reading: "Glows bright orange" },
      { id: "fs", label: "Flame sensor", test: "Flame current", reading: "0.3 µA" },
      { id: "gas", label: "Gas valve", test: "Manifold pressure", reading: "3.5 in. w.c. — normal" },
      { id: "ps", label: "Pressure switch", test: "Voltage across", reading: "0 V — closed" },
    ],
    fault: "fs",
    why: "Ignition and gas are fine; the flame isn't being proven (0.3 µA).",
  },
  {
    id: "c-float",
    system: "Attic air handler",
    symptom: "No cooling; 24 V at R–C but not at the outdoor Y.",
    components: [
      { id: "tstat", label: "Thermostat", test: "Voltage R–Y at thermostat", reading: "0 V — closed (calling)" },
      { id: "float", label: "Float switch", test: "Voltage across switch", reading: "24 V — open; pan full of water" },
      { id: "wire", label: "Low-voltage wire to condenser", test: "Continuity (locked out)", reading: "Good" },
      { id: "contactor", label: "Contactor coil", test: "Resistance (locked out)", reading: "14 Ω — good" },
    ],
    fault: "float",
    why: "The float switch is open because the drain backed up.",
  },
  {
    id: "c-rv",
    system: "Heat pump (B-type, energized in heat)",
    symptom: "Blows cool air in heat mode. 24 V at reversing valve coil.",
    components: [
      { id: "tstat", label: "Thermostat config", test: "Installer settings", reading: "Set to B — matches equipment" },
      { id: "rvcoil", label: "Reversing valve coil", test: "Resistance (locked out)", reading: "OL" },
      { id: "charge", label: "Refrigerant charge", test: "Pressures", reading: "Consistent with cooling mode operation" },
      { id: "board", label: "Defrost board", test: "Output to RV", reading: "24 V" },
    ],
    fault: "rvcoil",
    why: "Voltage reaches the coil, but it's open, so the valve never shifts.",
  },
  {
    id: "c-contactor",
    system: "Condensing unit",
    symptom: "Contactor pulled in, but compressor and fan not running.",
    components: [
      { id: "line", label: "Disconnect", test: "Line voltage", reading: "241 V" },
      { id: "contacts", label: "Contactor contacts", test: "Voltage across L1–T1 (pulled in)", reading: "238 V across closed contacts" },
      { id: "cap", label: "Capacitor", test: "Capacitance", reading: "44.6 / 4.9 µF — good" },
      { id: "comp", label: "Compressor", test: "Windings", reading: "Normal" },
    ],
    fault: "contacts",
    why: "Closed contacts should drop near 0 V. 238 V across them means they're burned open.",
  },
];

type FtfSecret = { cases: string[]; tests: string[][] };
export const findTheFault: GameDef<{ rounds: { system: string; symptom: string; components: { id: string; label: string; test: string }[] }[]; tokens: number }, FtfSecret, { answers: string[] }> = {
  id: "find-the-fault",
  letter: "D",
  title: "Find the Fault",
  tagline: "Test smart, not everything",
  description: "Each malfunctioning system lets you run up to 3 tests. Use the symptoms to choose wisely, then name the failed part.",
  skills: ["troubleshooting"],
  icon: "Search",
  pro: false,
  start({ seed }) {
    const r = rng(seed);
    const cases = sample(r, CASES, 5);
    return {
      puzzle: { rounds: cases.map((c) => ({ system: c.system, symptom: c.symptom, components: shuffle(r, c.components).map(({ id, label, test }) => ({ id, label, test })) })), tokens: 3 },
      secret: { cases: cases.map((c) => c.id), tests: cases.map(() => []) },
    };
  },
  grade(secret, submission) {
    const answers = isRecord(submission) ? asArray(submission.answers) : [];
    let score = 0;
    const feedback = secret.cases.map((id, i) => {
      const c = CASES.find((x) => x.id === id)!;
      const tests = secret.tests[i] ?? [];
      const ok = answers[i] === c.fault;
      const testedFault = tests.includes(c.fault);
      const pts = ok ? (testedFault ? 3 : 1) : 0;
      score += pts;
      return { title: c.symptom, correct: ok, detail: `${ok ? "Correct" : "Not quite"} — ${c.components.find((x) => x.id === c.fault)!.label}. ${c.why}${ok && !testedFault ? " (You didn't test it before condemning it: 1 point.)" : ""}` };
    });
    return { score, max: secret.cases.length * 3, feedback };
  },
};

export function runFaultTest(secret: FtfSecret, round: number, component: string): string | null {
  const c = CASES.find((x) => x.id === secret.cases[round]);
  if (!c) return null;
  const comp = c.components.find((x) => x.id === component);
  if (!comp) return null;
  const used = secret.tests[round] ?? (secret.tests[round] = []);
  if (!used.includes(component)) {
    if (used.length >= 3) return null;
    used.push(component);
  }
  return comp.reading;
}

// ---------------- E: Pressure Detective ----------------
const PATTERNS = {
  normal: { label: "Normal operation", evap: [40, 45], sh: [8, 12], ctoa: [15, 22], sc: [8, 12], metering: ["TXV", "Fixed orifice"] },
  undercharge: { label: "Undercharge / leak", evap: [28, 34], sh: [22, 32], ctoa: [8, 14], sc: [1, 4], metering: ["TXV", "Fixed orifice"] },
  overcharge: { label: "Overcharge", evap: [45, 50], sh: [2, 6], ctoa: [28, 34], sc: [18, 24], metering: ["Fixed orifice"] },
  restriction: { label: "Liquid line / metering restriction", evap: [24, 32], sh: [22, 30], ctoa: [12, 20], sc: [16, 24], metering: ["TXV"] },
  airflow: { label: "Low indoor airflow", evap: [26, 33], sh: [1, 4], ctoa: [10, 16], sc: [8, 12], metering: ["Fixed orifice"] },
  condenser: { label: "Dirty condenser / poor heat rejection", evap: [46, 50], sh: [7, 11], ctoa: [32, 40], sc: [4, 8], metering: ["TXV", "Fixed orifice"] },
} as const;
type PatternId = keyof typeof PATTERNS;

export function makePressureCase(r: () => number, pattern: PatternId) {
  const P = PATTERNS[pattern];
  const outdoor = Math.round(between(r, 82, 97));
  const ret = Math.round(between(r, 74, 79));
  const evap = between(r, P.evap[0], P.evap[1]);
  const cond = outdoor + between(r, P.ctoa[0], P.ctoa[1]);
  const suction = Math.round(satPressure("R-410A", evap));
  const liquid = Math.round(satPressure("R-410A", cond));
  const suctionLine = Math.round(satTemp("R-410A", suction) + between(r, P.sh[0], P.sh[1]));
  const liquidLine = Math.round(satTemp("R-410A", liquid) - between(r, P.sc[0], P.sc[1]));
  const sh = Math.round((suctionLine - satTemp("R-410A", suction)) * 10) / 10;
  const sc = Math.round((satTemp("R-410A", liquid) - liquidLine) * 10) / 10;
  return { pub: { refrigerant: "R-410A", metering: pick(r, P.metering), outdoor, returnAir: ret, suction, suctionLine, liquid, liquidLine }, answer: { sh, sc, pattern } };
}

type PdSecret = { cases: { sh: number; sc: number; pattern: PatternId }[] };
export const pressureDetective: GameDef<{ cases: ReturnType<typeof makePressureCase>["pub"][]; diagnoses: { id: string; label: string }[] }, PdSecret, { sh: number; sc: number; dx: string }[]> = {
  id: "pressure-detective",
  letter: "E",
  title: "Pressure Detective",
  tagline: "Read the gauges like a pro",
  description: "Get real-looking pressures and line temperatures. Calculate superheat and subcooling with the PT chart, then call the problem.",
  skills: ["refrigeration", "troubleshooting"],
  icon: "Gauge",
  pro: false,
  start({ seed }) {
    const r = rng(seed);
    const ids = shuffle(r, Object.keys(PATTERNS) as PatternId[]).slice(0, 5);
    const cases = ids.map((p) => makePressureCase(r, p));
    return {
      puzzle: { cases: cases.map((c) => c.pub), diagnoses: shuffle(r, Object.entries(PATTERNS).map(([id, p]) => ({ id, label: p.label }))) },
      secret: { cases: cases.map((c) => c.answer) },
    };
  },
  grade(secret, submission) {
    const sub = asArray(submission);
    let score = 0;
    const feedback = secret.cases.map((c, i) => {
      const s = isRecord(sub[i]) ? sub[i] : {};
      const shOk = Math.abs(Number(s.sh) - c.sh) <= 2;
      const scOk = Math.abs(Number(s.sc) - c.sc) <= 2;
      const dxOk = s.dx === c.pattern;
      score += (shOk ? 1 : 0) + (scOk ? 1 : 0) + (dxOk ? 2 : 0);
      return {
        title: `Case ${i + 1}: ${PATTERNS[c.pattern].label}`,
        correct: shOk && scOk && dxOk,
        detail: `Superheat ${c.sh} °F ${shOk ? "✓" : "✗"} · Subcooling ${c.sc} °F ${scOk ? "✓" : "✗"} · Diagnosis ${dxOk ? "✓" : "✗"}. Typical pattern — confirm with airflow checks and manufacturer data on real equipment.`,
      };
    });
    return { score, max: secret.cases.length * 4, feedback };
  },
};

// ---------------- H: Repair Shop ----------------
const PARTS: Record<string, { label: string; price: number }> = {
  cap: { label: "Dual run capacitor 45/5 µF 440 V", price: 38 },
  contactor: { label: "Contactor, 1-pole 30 A, 24 V coil", price: 32 },
  fanmotor: { label: "Condenser fan motor 1/4 hp", price: 145 },
  igniter: { label: "Hot surface igniter", price: 48 },
  flamesensor: { label: "Flame sensor", price: 22 },
  blowercap: { label: "Blower run capacitor 10 µF 370 V", price: 18 },
  fuse: { label: "3 A automotive-style fuse", price: 2 },
  tstatwire: { label: "18/5 thermostat wire (repair section)", price: 12 },
  board: { label: "Furnace control board", price: 210 },
  compressor: { label: "Compressor", price: 1150 },
  transformer: { label: "40 VA transformer", price: 28 },
  drier: { label: "Filter drier", price: 24 },
};

type Ticket = { id: string; customer: string; equipment: string; notes: string[]; parts: string[]; steps: string[] };
const LOCK = "Lock out & tag out the disconnect";
const VERIFY = "Verify zero voltage with a tested meter";
const DISCHARGE = "Discharge capacitor(s) and confirm 0 V";
const LABEL = "Photograph / label the wiring";
const RESTORE = "Restore power and verify operation (amps, temps)";

const TICKETS: Ticket[] = [
  { id: "t-cap", customer: "Hall residence", equipment: "3-ton AC, 8 yrs", notes: ["Compressor hums, trips on overload", "Fan won't start", "Capacitor tested 3 µF HERM / 0.4 µF FAN (rated 45/5)"], parts: ["cap"], steps: [LOCK, VERIFY, DISCHARGE, LABEL, "Install capacitor with matching µF and ≥ voltage rating", RESTORE] },
  { id: "t-contactor", customer: "Nguyen residence", equipment: "2.5-ton AC, 12 yrs", notes: ["24 V at coil, contactor doesn't pull in", "Coil reads OL (locked out)"], parts: ["contactor"], steps: [LOCK, VERIFY, DISCHARGE, LABEL, "Install contactor with matching coil voltage and amp rating", RESTORE] },
  { id: "t-fan", customer: "Ortiz residence", equipment: "4-ton AC, 10 yrs", notes: ["Fan doesn't run, high-pressure switch tripping", "Fan capacitor 4.9 µF (rated 5) — good", "Fan motor windings open (OL)"], parts: ["fanmotor"], steps: [LOCK, VERIFY, DISCHARGE, LABEL, "Install fan motor matching hp, rpm, rotation & voltage", RESTORE] },
  { id: "t-igniter", customer: "Brooks residence", equipment: "80% gas furnace, 11 yrs", notes: ["Sequence reaches ignition, no glow", "Board outputs 120 V to igniter", "Igniter reads OL"], parts: ["igniter"], steps: [LOCK, "Close the furnace gas valve", VERIFY, "Install igniter without touching the element", "Open gas, restore power and watch a full ignition sequence"] },
  { id: "t-flame", customer: "Patel residence", equipment: "80% gas furnace, 7 yrs", notes: ["Lights then drops after 5 s", "Flame current 0.3 µA", "Sensor rod coated"], parts: [], steps: [LOCK, "Close the furnace gas valve", VERIFY, "Remove and gently clean the flame sensor; check ground", "Open gas, restore power and verify flame current"] },
  { id: "t-blowercap", customer: "Kim residence", equipment: "Furnace with PSC blower, 13 yrs", notes: ["Blower slow, hot, humming", "120 V at motor", "Blower cap 1.4 µF (rated 10)"], parts: ["blowercap"], steps: [LOCK, VERIFY, DISCHARGE, "Install capacitor with matching µF and ≥ voltage rating", RESTORE] },
  { id: "t-fuse", customer: "Davis residence", equipment: "Furnace + AC, 6 yrs", notes: ["3 A board fuse blown", "Thermostat wire at the condenser chewed through and shorted Y to C", "Fuse blows again when cooling starts"], parts: ["fuse", "tstatwire"], steps: [LOCK, VERIFY, "Repair the damaged thermostat wire and protect it", "Replace the 3 A fuse", RESTORE] },
  { id: "t-transformer", customer: "Reyes residence", equipment: "Air handler, 9 yrs", notes: ["No 24 V", "Primary 240 V, secondary 0 V", "No shorts found on the low-voltage circuit"], parts: ["transformer"], steps: [LOCK, VERIFY, LABEL, "Install a transformer with matching primary voltage and VA rating", RESTORE] },
];

type RsSecret = { tickets: string[] };
type RsSub = { tickets: { parts: string[]; steps: string[] }[] };
export const repairShop: GameDef<{ tickets: { customer: string; equipment: string; notes: string[]; steps: string[] }[]; parts: { id: string; label: string; price: number }[] }, RsSecret, RsSub> = {
  id: "repair-shop",
  letter: "H",
  title: "Repair Shop",
  tagline: "Right part. Right order. No upsell.",
  description: "Work repair tickets: choose only the parts the evidence supports, then put the repair procedure in a safe order.",
  skills: ["troubleshooting", "safety", "professional"],
  icon: "Wrench",
  pro: true,
  start({ seed }) {
    const r = rng(seed);
    const tickets = sample(r, TICKETS, 3);
    return {
      puzzle: {
        tickets: tickets.map((t) => ({ customer: t.customer, equipment: t.equipment, notes: t.notes, steps: shuffle(r, t.steps) })),
        parts: Object.entries(PARTS).map(([id, p]) => ({ id, ...p })),
      },
      secret: { tickets: tickets.map((t) => t.id) },
    };
  },
  grade(secret, submission) {
    const sub = isRecord(submission) ? asArray(submission.tickets) : [];
    let score = 0;
    const feedback = secret.tickets.map((id, i) => {
      const t = TICKETS.find((x) => x.id === id)!;
      const s = isRecord(sub[i]) ? sub[i] : {};
      const parts = asArray(s.parts).map(String);
      const steps = asArray(s.steps).map(String);
      const needed = new Set(t.parts);
      const extras = parts.filter((p) => !needed.has(p));
      const missing = t.parts.filter((p) => !parts.includes(p));
      // A ticket only counts once a full procedure was submitted (blank tickets earn nothing).
      const attempted = steps.length === t.steps.length;
      const partPts = attempted && missing.length === 0 ? 3 : 0;
      const extraPts = attempted && extras.length === 0 ? 1 : 0;
      const inPlace = steps.length === t.steps.length ? steps.filter((st, k) => st === t.steps[k]).length : 0;
      const orderPts = Math.round((3 * inPlace) / t.steps.length);
      const safeFirst = steps[0] === LOCK;
      score += partPts + extraPts + orderPts;
      const upsell = extras.reduce((sum, p) => sum + (PARTS[p]?.price ?? 0), 0);
      return {
        title: `${t.customer} — ${t.equipment}`,
        correct: partPts === 3 && extraPts === 1 && orderPts === 3,
        detail: [
          missing.length ? `Missing part: ${missing.map((p) => PARTS[p].label).join(", ")}.` : t.parts.length ? "Correct parts." : "Correct: no parts needed.",
          extras.length ? `Unneeded parts cost the customer $${upsell}.` : "",
          `Procedure: ${inPlace}/${t.steps.length} steps in place.`,
          safeFirst ? "" : "Always start by locking out the power.",
          `Correct order: ${t.steps.join(" → ")}.`,
        ]
          .filter(Boolean)
          .join(" "),
      };
    });
    return { score, max: secret.tickets.length * 7, feedback };
  },
};
