import { CAUSES, PROFILES, QUESTIONS, REPAIRS, TOOL_LABELS } from "./catalog";
import type { LogEntry, MeasureDef, Profile, Reading, ReadingSpec, Scenario, SimAction } from "./types";
import { satTemp } from "../pt";

/**
 * Field-simulator engine. Pure and deterministic: the server stores only the
 * action log and rebuilds state by replaying it, so the client can never see
 * the hidden fault or tamper with the score.
 */

const PROFILE_CAUSES: Record<string, string[]> = {
  cooling: [
    "dirty-filter", "frozen-coil-airflow", "bad-run-cap", "bad-contactor", "dirty-condenser", "cond-fan-motor", "low-charge-leak",
    "overcharge", "restriction-drier", "clogged-drain", "blower-cap", "tstat-batteries", "tstat-location", "lv-fuse", "grounded-compressor", "bad-compressor",
  ],
  "gas-heat": ["dirty-filter", "bad-igniter", "dirty-flame-sensor", "pressure-switch", "limit-airflow", "blower-cap", "tstat-fan-on", "tstat-batteries", "gas-off"],
  "hp-heat": ["dirty-filter", "rv-coil", "defrost-sensor", "tstat-ob", "low-charge-leak", "bad-run-cap", "bad-contactor", "bad-compressor", "cond-fan-motor"],
};

export type SimState = {
  power: boolean;
  verifiedDead: boolean;
  capDischarged: boolean;
  minute: number;
  resolved: boolean[];
  repairs: { r: string; correct: boolean; faultIndex: number | null; minute: number }[];
  collected: string[];
  evidenceBeforeFirstRepair: string[] | null;
  warnings: string[];
  criticals: string[];
  hintsUsed: number;
  infoSteps: number;
  verifiedAfterFix: boolean;
  finished: boolean;
  finalCauses: string[] | null;
  log: LogEntry[];
};

export function initialState(s: Scenario): SimState {
  return {
    power: true,
    verifiedDead: false,
    capDischarged: false,
    minute: 0,
    resolved: s.faults.map(() => false),
    repairs: [],
    collected: [],
    evidenceBeforeFirstRepair: null,
    warnings: [],
    criticals: [],
    hintsUsed: 0,
    infoSteps: 0,
    verifiedAfterFix: false,
    finished: false,
    finalCauses: null,
    log: [],
  };
}

function norm(spec: ReadingSpec | undefined): Reading | undefined {
  if (spec === undefined) return undefined;
  if (typeof spec === "object") return spec;
  return { value: spec };
}

function measureDef(p: Profile, id: string): MeasureDef | undefined {
  return p.measures.find((m) => m.id === id);
}

/** Compute what a measurement shows given power state and which faults are still active. */
export function readingFor(s: Scenario, st: SimState, id: string): Reading {
  const p = PROFILES[s.profile];
  const def = measureDef(p, id)!;
  const active = s.faults.filter((_, i) => !st.resolved[i]);
  if (st.power) {
    let r = norm(p.on[id]);
    for (const f of active) r = norm(f.on?.[id]) ?? r;
    if (active.length === s.faults.length && s.faults.length > 1) r = norm(s.combined?.on?.[id]) ?? r;
    return r ?? { value: "—" };
  }
  if (def.power === "on") return { value: 0, note: def.tool === "manometer" ? "Blower is off — no airflow." : "Equipment is de-energized." };
  let r = norm(p.off[id]) ?? norm(p.on[id]);
  for (const f of active) r = norm(f.off?.[id]) ?? r;
  return r ?? { value: "—" };
}

function fmt(r: Reading, unit: string): string {
  return typeof r.value === "number" ? `${r.value}${unit ? " " + unit : ""}` : r.value;
}

function ptNote(s: Scenario, id: string, r: Reading): string | undefined {
  const ref = PROFILES[s.profile].refrigerant;
  if (!ref || typeof r.value !== "number") return undefined;
  if (id === "p.suction" || id === "p.liquid") return `Gauge saturation: ${satTemp(ref, r.value)} °F (${ref})`;
  return undefined;
}

function inspectText(s: Scenario, st: SimState, loc: string): string {
  const p = PROFILES[s.profile];
  let text = p.inspect[loc as keyof typeof p.inspect] ?? "Nothing unusual.";
  s.faults.forEach((f, i) => {
    if (!st.resolved[i] && f.inspect?.[loc as keyof typeof f.inspect]) text = f.inspect[loc as keyof typeof f.inspect]!;
  });
  if (!st.power && loc !== "thermostat" && loc !== "filter" && loc !== "drain" && loc !== "panel") text += " (Equipment is currently locked out.)";
  return text;
}

function answerFor(s: Scenario, q: string): string {
  for (const f of s.faults) if (f.answers?.[q]) return f.answers[q];
  return PROFILES[s.profile].answers[q] ?? "I'm not sure.";
}

function warn(st: SimState, key: string, text: string, entry: LogEntry) {
  if (!st.warnings.includes(key)) st.warnings.push(key);
  entry.safety = { severity: "warning", text };
}
function critical(st: SimState, key: string, text: string, entry: LogEntry) {
  if (!st.criticals.includes(key)) st.criticals.push(key);
  entry.safety = { severity: "critical", text };
}

export class SimError extends Error {}

/** Apply one action. Mutates and returns state. Throws SimError for invalid actions. */
export function step(s: Scenario, st: SimState, a: SimAction, mode: "beginner" | "advanced" = "beginner"): SimState {
  if (st.finished) throw new SimError("This service call is already finished.");
  const p = PROFILES[s.profile];
  const entry: LogEntry = { action: a, minute: st.minute, title: "", text: "" };

  switch (a.t) {
    case "ask": {
      const q = QUESTIONS.find((x) => x.id === a.q);
      if (!q) throw new SimError("Unknown question");
      entry.title = `You asked: “${q.text}”`;
      entry.text = `${s.customer.split(" ")[0]}: “${answerFor(s, a.q)}”`;
      st.minute += 2;
      st.infoSteps++;
      st.collected.push(`ask:${a.q}`);
      break;
    }
    case "inspect": {
      const loc = p.locations.find((l) => l.id === a.loc);
      if (!loc) throw new SimError("Unknown location");
      entry.title = `Inspected: ${loc.label}`;
      entry.text = inspectText(s, st, a.loc);
      st.minute += 3;
      st.infoSteps++;
      st.collected.push(`inspect:${a.loc}`);
      break;
    }
    case "measure": {
      const def = measureDef(p, a.m);
      if (!def) throw new SimError("Unknown measurement");
      const tool = TOOL_LABELS[def.tool]?.label ?? def.tool;
      entry.title = `${tool}: ${def.label}`;
      st.minute += def.minutes ?? 2;
      st.infoSteps++;
      if (def.power === "off" && st.power) {
        critical(st, "meter-live", "You attempted a resistance/capacitance test on energized equipment. That can destroy the meter and cause an arc flash. Lock out and verify zero voltage first.", entry);
        entry.text = "No valid reading — the circuit is energized.";
        entry.outcome = "blocked";
        break;
      }
      if (def.power === "off" && !st.verifiedDead) warn(st, "no-verify", "You worked on the equipment without verifying zero voltage with a tested meter. Always test before touch.", entry);
      if (def.needsDischarge && !st.capDischarged) {
        critical(st, "cap-charged", "You handled a capacitor without discharging it. Capacitors can hold a lethal charge after power is removed.", entry);
      }
      const r = readingFor(s, st, a.m);
      entry.reading = { label: def.label, value: fmt(r, def.unit) };
      entry.text = [r.note, ptNote(s, a.m, r)].filter(Boolean).join(" ");
      st.collected.push(`measure:${a.m}`);
      if (st.power && s.verify.includes(a.m) && st.resolved.every(Boolean) && st.repairs.some((x) => x.correct)) st.verifiedAfterFix = true;
      break;
    }
    case "power": {
      if (a.on === st.power) throw new SimError(a.on ? "Power is already on." : "Equipment is already locked out.");
      st.power = a.on;
      st.verifiedDead = false;
      st.capDischarged = false;
      st.minute += 2;
      entry.title = a.on ? "Removed lock & tag, restored power" : "Opened disconnects, applied lock & tag";
      entry.text = a.on ? "Equipment energized. The system restarts on the thermostat call." : "Equipment de-energized and locked out. Verify zero voltage before touching components.";
      break;
    }
    case "verify-dead": {
      if (st.power) throw new SimError("Lock out the equipment before verifying zero voltage.");
      st.verifiedDead = true;
      st.minute += 2;
      entry.title = "Verified zero voltage (live–dead–live)";
      entry.text = "Meter proven on a known source, 0 V measured on all conductors, meter re-proven. Safe to work.";
      break;
    }
    case "discharge": {
      entry.title = "Discharged capacitors";
      st.minute += 1;
      if (st.power) {
        critical(st, "discharge-live", "You tried to discharge a capacitor on energized equipment. Lock out first.", entry);
        entry.text = "Not performed.";
        entry.outcome = "blocked";
        break;
      }
      if (!st.verifiedDead) warn(st, "no-verify", "You worked on the equipment without verifying zero voltage with a tested meter. Always test before touch.", entry);
      st.capDischarged = true;
      entry.text = "Used a rated discharge tool across each section, then confirmed 0 V across all terminals.";
      break;
    }
    case "hint": {
      if (mode === "advanced") throw new SimError("Hints are off in Advanced mode.");
      const h = s.hints[st.hintsUsed];
      if (!h) throw new SimError("No more hints.");
      st.hintsUsed++;
      entry.title = "Hint";
      entry.text = h;
      break;
    }
    case "repair": {
      const rep = REPAIRS[a.r];
      if (!rep || !p.repairs.includes(a.r)) throw new SimError("Unknown repair");
      entry.title = `Repair: ${rep.label}`;
      if (rep.requiresDeEnergized && st.power) {
        critical(st, "repair-live", "You started a repair on energized equipment. Lock out/tag out and verify zero voltage before working on components.", entry);
        entry.text = "Repair not performed — de-energize first.";
        entry.outcome = "blocked";
        break;
      }
      if (rep.requiresDeEnergized && !st.verifiedDead) warn(st, "no-verify", "You worked on the equipment without verifying zero voltage with a tested meter. Always test before touch.", entry);
      if (st.evidenceBeforeFirstRepair === null) st.evidenceBeforeFirstRepair = [...st.collected];
      const idx = s.faults.findIndex((f, i) => !st.resolved[i] && f.repair === a.r);
      st.minute += rep.minutes;
      if (idx >= 0) {
        st.resolved[idx] = true;
        st.repairs.push({ r: a.r, correct: true, faultIndex: idx, minute: st.minute });
        entry.outcome = "fixed";
        entry.text = `Repair completed ($${rep.cost}). Restore power and verify the system's operation.`;
      } else {
        st.repairs.push({ r: a.r, correct: false, faultIndex: null, minute: st.minute });
        entry.outcome = "not-fixed";
        entry.text = `Part/service billed to the customer: $${rep.cost}. When the system restarts, the original symptoms are unchanged. That was an unnecessary repair.`;
      }
      st.verifiedAfterFix = false;
      break;
    }
    case "finish": {
      const valid = a.causes.filter((c) => CAUSES[c]);
      if (!valid.length) throw new SimError("Select at least one cause.");
      st.finished = true;
      st.finalCauses = valid;
      entry.title = "Submitted diagnosis & closed the ticket";
      entry.text = valid.map((c) => CAUSES[c]).join("; ");
      break;
    }
  }
  st.log.push(entry);
  return st;
}

export function replay(s: Scenario, actions: SimAction[], mode: "beginner" | "advanced" = "beginner"): SimState {
  const st = initialState(s);
  for (const a of actions) step(s, st, a, mode);
  return st;
}

export type SimScore = {
  total: number;
  passed: boolean;
  grade: "A" | "B" | "C" | "D" | "F";
  parts: { key: string; label: string; earned: number; max: number; note: string }[];
  correctCauses: string[];
  missedEvidence: string[];
  customerCost: number;
  unnecessaryCost: number;
  minutes: number;
  explanation: string;
  differentials: { cause: string; why: string }[];
  safetyNotes: string[];
};

const SAFETY_TEXT: Record<string, string> = {
  "meter-live": "Ohms/capacitance test on energized equipment",
  "cap-charged": "Handled an undischarged capacitor",
  "discharge-live": "Tried to discharge a capacitor on live equipment",
  "repair-live": "Started a repair on energized equipment",
  "no-verify": "Didn't verify zero voltage before touching components",
};

export function scoreRun(s: Scenario, st: SimState): SimScore {
  const parts: SimScore["parts"] = [];
  const accepted = s.faults.map((f) => [f.cause, ...(f.accept ?? [])]);
  const chosen = st.finalCauses ?? [];
  const hits = accepted.filter((acc) => acc.some((c) => chosen.includes(c))).length;
  const wrongCauses = chosen.filter((c) => !accepted.some((acc) => acc.includes(c))).length;
  const diag = Math.max(0, Math.round((30 * hits) / s.faults.length - 10 * wrongCauses));
  parts.push({ key: "diagnosis", label: "Diagnosis", earned: diag, max: 30, note: `${hits}/${s.faults.length} fault(s) identified${wrongCauses ? `, ${wrongCauses} incorrect cause(s) listed` : ""}` });

  const fixed = st.resolved.filter(Boolean).length;
  const wrongRepairs = st.repairs.filter((r) => !r.correct).length;
  const rep = Math.max(0, Math.round((20 * fixed) / s.faults.length - 5 * wrongRepairs));
  parts.push({ key: "repair", label: "Repair", earned: rep, max: 20, note: `${fixed}/${s.faults.length} fixed${wrongRepairs ? `, ${wrongRepairs} unnecessary repair(s)` : ""}` });

  const early = new Set(st.evidenceBeforeFirstRepair ?? st.collected);
  const all = new Set(st.collected);
  let ev = 0;
  const missed: string[] = [];
  for (const g of s.evidence) {
    if (g.any.some((k) => early.has(k))) ev += 1;
    else if (g.any.some((k) => all.has(k))) ev += 0.5;
    else missed.push(g.label);
  }
  const evidence = Math.round((20 * ev) / s.evidence.length);
  parts.push({ key: "evidence", label: "Evidence before acting", earned: evidence, max: 20, note: missed.length ? `Missed: ${missed.join("; ")}` : "Gathered the key evidence" });

  const safety = Math.max(0, 15 - 5 * st.warnings.length - 15 * st.criticals.length);
  parts.push({
    key: "safety",
    label: "Safety",
    earned: safety,
    max: 15,
    note: st.warnings.length + st.criticals.length ? [...st.criticals, ...st.warnings].map((k) => SAFETY_TEXT[k]).join("; ") : "No safety issues",
  });

  const verified = st.verifiedAfterFix && st.resolved.every(Boolean) ? 10 : 0;
  parts.push({ key: "verify", label: "Verified the fix", earned: verified, max: 10, note: verified ? "Confirmed operation after repair" : "Didn't verify normal operation with the system running after the repair" });

  const overPar = Math.max(0, st.infoSteps - s.parSteps);
  const eff = Math.max(0, 5 - Math.ceil((overPar / Math.max(1, s.parSteps)) * 5));
  parts.push({ key: "efficiency", label: "Efficiency", earned: eff, max: 5, note: `${st.infoSteps} diagnostic steps (par ${s.parSteps})` });

  let total = parts.reduce((t, p) => t + p.earned, 0) - 3 * st.hintsUsed;
  if (st.criticals.length) total = Math.min(total, 60); // unsafe work can't earn a passing grade
  total = Math.max(0, Math.min(100, total));
  const grade = total >= 90 ? "A" : total >= 80 ? "B" : total >= 70 ? "C" : total >= 60 ? "D" : "F";
  const customerCost = st.repairs.reduce((t, r) => t + REPAIRS[r.r].cost, 0);
  const unnecessaryCost = st.repairs.filter((r) => !r.correct).reduce((t, r) => t + REPAIRS[r.r].cost, 0);
  return {
    total,
    passed: total >= 70,
    grade,
    parts,
    correctCauses: s.faults.map((f) => CAUSES[f.cause]),
    missedEvidence: missed,
    customerCost,
    unnecessaryCost,
    minutes: st.minute,
    explanation: s.explanation,
    differentials: s.differentials,
    safetyNotes: [...st.criticals, ...st.warnings].map((k) => SAFETY_TEXT[k]),
  };
}

/** Everything the browser needs to render the call — never the faults or answer key. */
export function publicScenario(s: Scenario) {
  const p = PROFILES[s.profile];
  return {
    id: s.id,
    title: s.title,
    level: s.level,
    customer: s.customer,
    complaint: s.complaint,
    equipment: s.equipment,
    conditions: s.conditions,
    profile: { id: p.id, label: p.label, refrigerant: p.refrigerant ?? null },
    locations: p.locations,
    measures: p.measures.map((m) => ({ id: m.id, tool: m.tool, location: m.location, label: m.label, power: m.power })),
    tools: [...new Set(p.measures.map((m) => m.tool))].map((t) => ({ id: t, ...TOOL_LABELS[t] })),
    questions: QUESTIONS,
    repairs: p.repairs.map((id) => ({ id, label: REPAIRS[id].label, cost: REPAIRS[id].cost })),
    causes: PROFILE_CAUSES[p.id].map((id) => ({ id, label: CAUSES[id] })),
    hintsAvailable: s.hints.length,
  };
}
export type PublicScenario = ReturnType<typeof publicScenario>;

/** Client-safe view of the running state. */
export function publicState(st: SimState) {
  return {
    power: st.power,
    verifiedDead: st.verifiedDead,
    capDischarged: st.capDischarged,
    minute: st.minute,
    finished: st.finished,
    hintsUsed: st.hintsUsed,
    log: st.log,
    customerCost: st.repairs.reduce((t, r) => t + REPAIRS[r.r].cost, 0),
  };
}
export type PublicSimState = ReturnType<typeof publicState>;
