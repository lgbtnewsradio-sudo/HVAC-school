import { asArray, isRecord, rng, sample, shuffle, type GameDef } from "./core";

// ---------------- C: Wire It Right ----------------
type Terminal = { id: string; label: string; device: string };
type Device = { id: string; label: string; x: number; y: number };
type WiringPuzzle = {
  id: string;
  title: string;
  brief: string;
  devices: Device[];
  terminals: Terminal[];
  /** Each net = terminals that must be electrically connected together (and to nothing else). */
  nets: { name: string; terminals: string[] }[];
};

const T = (device: string, id: string, label: string): Terminal => ({ id: `${device}.${id}`, label, device });

const WIRING: WiringPuzzle[] = [
  {
    id: "tstat-ac",
    title: "Thermostat → furnace → condenser",
    brief: "Wire a conventional heat/cool thermostat to the furnace board, and the board's Y and C to the condenser's contactor coil.",
    devices: [
      { id: "tstat", label: "Thermostat", x: 12, y: 50 },
      { id: "board", label: "Furnace control board", x: 50, y: 50 },
      { id: "cc", label: "Condenser contactor coil", x: 88, y: 50 },
    ],
    terminals: [
      T("tstat", "R", "R"), T("tstat", "C", "C"), T("tstat", "Y", "Y"), T("tstat", "G", "G"), T("tstat", "W", "W"),
      T("board", "R", "R"), T("board", "C", "C"), T("board", "Y", "Y"), T("board", "G", "G"), T("board", "W", "W"),
      T("cc", "1", "Coil A"), T("cc", "2", "Coil B"),
    ],
    nets: [
      { name: "R — 24 V hot", terminals: ["tstat.R", "board.R"] },
      { name: "G — fan", terminals: ["tstat.G", "board.G"] },
      { name: "W — heat", terminals: ["tstat.W", "board.W"] },
      { name: "Y — cooling call to contactor", terminals: ["tstat.Y", "board.Y", "cc.1"] },
      { name: "C — common to thermostat and contactor", terminals: ["tstat.C", "board.C", "cc.2"] },
    ],
  },
  {
    id: "condenser-hv",
    title: "Condensing unit high voltage",
    brief: "Wire line voltage through the contactor to the compressor and PSC fan motor, using a dual run capacitor. (Typical layout — always follow the unit's diagram.)",
    devices: [
      { id: "line", label: "Disconnect (240 V)", x: 10, y: 20 },
      { id: "k", label: "Contactor", x: 35, y: 20 },
      { id: "cap", label: "Dual run capacitor", x: 60, y: 75 },
      { id: "comp", label: "Compressor", x: 88, y: 25 },
      { id: "fan", label: "Condenser fan motor", x: 88, y: 78 },
    ],
    terminals: [
      T("line", "L1", "L1"), T("line", "L2", "L2"),
      T("k", "L1", "Line 1"), T("k", "L2", "Line 2"), T("k", "T1", "Load T1"), T("k", "T2", "Load T2"),
      T("cap", "C", "C"), T("cap", "HERM", "HERM"), T("cap", "FAN", "FAN"),
      T("comp", "C", "C (common)"), T("comp", "S", "S (start)"), T("comp", "R", "R (run)"),
      T("fan", "COM", "Common"), T("fan", "RUN", "Run"), T("fan", "START", "Start (cap)"),
    ],
    nets: [
      { name: "L1 to contactor", terminals: ["line.L1", "k.L1"] },
      { name: "L2 to contactor", terminals: ["line.L2", "k.L2"] },
      { name: "T1 → compressor C & fan common", terminals: ["k.T1", "comp.C", "fan.COM"] },
      { name: "T2 → capacitor C, compressor R & fan run", terminals: ["k.T2", "cap.C", "comp.R", "fan.RUN"] },
      { name: "HERM → compressor S", terminals: ["cap.HERM", "comp.S"] },
      { name: "FAN → fan start winding", terminals: ["cap.FAN", "fan.START"] },
    ],
  },
  {
    id: "tstat-hp",
    title: "Heat pump thermostat",
    brief: "Wire a heat pump thermostat (O-type, energized in cooling) to the air handler board and the outdoor unit (contactor coil and reversing valve).",
    devices: [
      { id: "tstat", label: "Heat pump thermostat", x: 12, y: 50 },
      { id: "ah", label: "Air handler board", x: 50, y: 50 },
      { id: "od", label: "Outdoor unit (Y, O, C)", x: 88, y: 50 },
    ],
    terminals: [
      T("tstat", "R", "R"), T("tstat", "C", "C"), T("tstat", "Y", "Y"), T("tstat", "G", "G"), T("tstat", "O", "O"), T("tstat", "W2", "W2/AUX"),
      T("ah", "R", "R"), T("ah", "C", "C"), T("ah", "Y", "Y"), T("ah", "G", "G"), T("ah", "O", "O"), T("ah", "W2", "W2"),
      T("od", "Y", "Y (contactor)"), T("od", "O", "O (reversing valve)"), T("od", "C", "C"),
    ],
    nets: [
      { name: "R", terminals: ["tstat.R", "ah.R"] },
      { name: "G", terminals: ["tstat.G", "ah.G"] },
      { name: "W2 — auxiliary heat", terminals: ["tstat.W2", "ah.W2"] },
      { name: "Y — compressor", terminals: ["tstat.Y", "ah.Y", "od.Y"] },
      { name: "O — reversing valve", terminals: ["tstat.O", "ah.O", "od.O"] },
      { name: "C — common", terminals: ["tstat.C", "ah.C", "od.C"] },
    ],
  },
];

/** Group terminals into electrically-connected components from a wire list. */
export function connectedGroups(terminals: string[], wires: [string, string][]): Map<string, string> {
  const parent = new Map(terminals.map((t) => [t, t]));
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const [a, b] of wires) if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b));
  return new Map(terminals.map((t) => [t, find(t)]));
}

export function gradeWiring(p: WiringPuzzle, wires: [string, string][]) {
  const ids = p.terminals.map((t) => t.id);
  const group = connectedGroups(ids, wires);
  const netOf = new Map<string, number>();
  p.nets.forEach((n, i) => n.terminals.forEach((t) => netOf.set(t, i)));
  return p.nets.map((n, i) => {
    const roots = new Set(n.terminals.map((t) => group.get(t)));
    const complete = roots.size === 1;
    const root = group.get(n.terminals[0]);
    const shorted = ids.filter((t) => group.get(t) === root && netOf.get(t) !== i && netOf.has(t)).map((t) => p.terminals.find((x) => x.id === t)!);
    const stray = ids.filter((t) => group.get(t) === root && !netOf.has(t));
    const correct = complete && shorted.length === 0 && stray.length === 0;
    return {
      title: n.name,
      correct,
      detail: correct
        ? "Connected correctly."
        : !complete
          ? `Incomplete: ${n.terminals.map((t) => p.terminals.find((x) => x.id === t)!.label).join(" + ")} must all be connected.`
          : `Wrong connection — this circuit is tied to ${shorted.map((t) => `${t.device} ${t.label}`).join(", ")}. On real equipment that's a short or a misoperation.`,
    };
  });
}

export const wireItRight: GameDef<{ puzzle: Omit<WiringPuzzle, "nets">; netCount: number }, { id: string }, [string, string][]> = {
  id: "wire-it-right",
  letter: "C",
  title: "Wire It Right",
  tagline: "Land every wire on the right terminal",
  description: "Tap a terminal, then another, to run a wire. Build every circuit without shorts.",
  skills: ["electrical"],
  icon: "Cable",
  pro: false,
  start({ seed }) {
    const p = WIRING[seed % WIRING.length];
    const { nets, ...pub } = p;
    return { puzzle: { puzzle: { ...pub, terminals: shuffle(rng(seed), pub.terminals).sort((a, b) => a.device.localeCompare(b.device)) }, netCount: nets.length }, secret: { id: p.id } };
  },
  grade(secret, submission) {
    const p = WIRING.find((w) => w.id === secret.id)!;
    const wires = asArray(submission)
      .filter((w): w is [string, string] => Array.isArray(w) && w.length === 2 && typeof w[0] === "string" && typeof w[1] === "string")
      .slice(0, 60);
    const feedback = gradeWiring(p, wires);
    return { score: feedback.filter((f) => f.correct).length, max: p.nets.length, feedback };
  },
};

// ---------------- J: Electrical Detective ----------------
type Circuit = { id: string; title: string; supply: number; points: { id: string; label: string }[]; elements: { id: string; label: string; from: string; to: string; kind: "switch" | "load" }[] };

const CIRCUITS: Circuit[] = [
  {
    id: "cool-24",
    title: "24 V cooling control circuit",
    supply: 24,
    points: [
      { id: "R", label: "R (transformer)" },
      { id: "Y", label: "Y (after thermostat)" },
      { id: "P1", label: "After low-pressure switch" },
      { id: "P2", label: "After high-pressure switch" },
      { id: "P3", label: "After float switch" },
      { id: "C", label: "C (common)" },
    ],
    elements: [
      { id: "tstat", label: "Thermostat (calling)", from: "R", to: "Y", kind: "switch" },
      { id: "lps", label: "Low-pressure switch", from: "Y", to: "P1", kind: "switch" },
      { id: "hps", label: "High-pressure switch", from: "P1", to: "P2", kind: "switch" },
      { id: "float", label: "Float switch", from: "P2", to: "P3", kind: "switch" },
      { id: "coil", label: "Contactor coil", from: "P3", to: "C", kind: "load" },
    ],
  },
  {
    id: "heat-24",
    title: "24 V furnace safety circuit",
    supply: 24,
    points: [
      { id: "R", label: "R (transformer)" },
      { id: "A", label: "After door switch" },
      { id: "B", label: "After high limit" },
      { id: "D", label: "After rollout switch" },
      { id: "E", label: "After pressure switch" },
      { id: "C", label: "C (common)" },
    ],
    elements: [
      { id: "door", label: "Blower door switch", from: "R", to: "A", kind: "switch" },
      { id: "limit", label: "High limit", from: "A", to: "B", kind: "switch" },
      { id: "rollout", label: "Rollout switch", from: "B", to: "D", kind: "switch" },
      { id: "ps", label: "Pressure switch", from: "D", to: "E", kind: "switch" },
      { id: "gv", label: "Gas valve", from: "E", to: "C", kind: "load" },
    ],
  },
];

/** Potential at each point (relative to C) for a series string with at most one open element. */
export function potentials(c: Circuit, openId: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  const openIdx = openId ? c.elements.findIndex((e) => e.id === openId) : -1;
  c.elements.forEach((e, i) => {
    // Upstream of the open: at supply potential. Downstream: pulled to common through the load.
    if (!(e.from in out)) out[e.from] = openIdx < 0 || i <= openIdx ? c.supply : 0;
    if (openIdx >= 0) out[e.to] = i < openIdx ? c.supply : 0;
    else out[e.to] = e.kind === "load" ? 0 : c.supply;
  });
  out.C = 0;
  return out;
}

export type DetectiveSecret = { rounds: { circuit: string; open: string }[]; probes: number[] };
type DetectiveSub = { rounds: { answer: string }[] };

export const electricalDetective: GameDef<{ rounds: { circuit: Omit<Circuit, "supply"> & { supply: number }; symptom: string }[] }, DetectiveSecret, DetectiveSub> = {
  id: "electrical-detective",
  letter: "J",
  title: "Electrical Detective",
  tagline: "Follow the voltage to the open",
  description: "Place virtual meter leads on test points in a live (simulated) circuit. Find the open component in as few readings as possible.",
  skills: ["electrical", "troubleshooting"],
  icon: "Zap",
  pro: false,
  start({ seed }) {
    const r = rng(seed);
    const rounds = Array.from({ length: 4 }, (_, i) => {
      const c = CIRCUITS[(seed + i) % CIRCUITS.length];
      const switches = c.elements.filter((e) => e.kind === "switch" && e.id !== "tstat");
      return { circuit: c.id, open: sample(r, switches, 1)[0].id };
    });
    return {
      puzzle: {
        rounds: rounds.map((rd) => {
          const c = CIRCUITS.find((x) => x.id === rd.circuit)!;
          return { circuit: c, symptom: c.id === "cool-24" ? "Thermostat is calling for cooling, but the contactor won't pull in." : "Call for heat: the gas valve never opens." };
        }),
      },
      secret: { rounds, probes: rounds.map(() => 0) },
    };
  },
  grade(secret, submission) {
    const sub = isRecord(submission) ? asArray(submission.rounds) : [];
    let score = 0;
    const feedback = secret.rounds.map((rd, i) => {
      const s = isRecord(sub[i]) ? sub[i] : {};
      const c = CIRCUITS.find((x) => x.id === rd.circuit)!;
      const probes = secret.probes?.[i] ?? 0;
      const ok = s.answer === rd.open;
      const pts = ok && probes > 0 ? (probes <= 3 ? 3 : probes <= 5 ? 2 : 1) : 0;
      score += pts;
      const el = c.elements.find((e) => e.id === rd.open)!;
      return { title: c.title, correct: ok, detail: `${ok ? "Found it" : "Missed"}: the ${el.label} was open — full supply voltage appears across it. ${probes ? `${probes} reading(s) taken.` : "No readings taken — guessing earns no points."}` };
    });
    return { score, max: secret.rounds.length * 3, feedback };
  },
};

/** Server-side meter reading for the detective game. Counts the probe in the secret state. */
export function detectiveReading(secret: DetectiveSecret, round: number, a: string, b: string): number | null {
  const rd = secret.rounds[round];
  if (!rd) return null;
  secret.probes[round] = (secret.probes[round] ?? 0) + 1;
  const c = CIRCUITS.find((x) => x.id === rd.circuit)!;
  const v = potentials(c, rd.open);
  if (!(a in v) || !(b in v)) return null;
  return Math.round(Math.abs(v[a] - v[b]) * 10) / 10;
}

export { WIRING, CIRCUITS };
