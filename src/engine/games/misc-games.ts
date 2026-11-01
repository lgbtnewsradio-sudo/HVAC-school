import { BASE_CURRICULUM } from "@/content";
import { gradeQuestion, toPublicQuestion, type PublicQuestion, type Response } from "../grading";
import { asArray, isRecord, rng, sample, shuffle, type GameDef } from "./core";

// ---------------- F: HVAC Crossword ----------------
const WORDS: [string, string][] = [
  ["COMPRESSOR", "Pumps refrigerant vapor and raises its pressure"],
  ["CONDENSER", "Coil where hot vapor gives up heat and turns to liquid"],
  ["EVAPORATOR", "Indoor coil where refrigerant boils and absorbs heat"],
  ["SUPERHEAT", "Vapor temperature above its saturation temperature"],
  ["SUBCOOLING", "Liquid temperature below its saturation temperature"],
  ["CAPACITOR", "Stores charge and helps single-phase motors start and run"],
  ["CONTACTOR", "24 V coil switch that powers the compressor"],
  ["THERMOSTAT", "Calls for heating, cooling or fan"],
  ["ACCUMULATOR", "Suction-line tank that protects the compressor from liquid"],
  ["MICRON", "Unit used to measure deep vacuum"],
  ["BRAZING", "Joining copper with filler metal above 840 °F"],
  ["NITROGEN", "Inert gas flowed while brazing and used for pressure tests"],
  ["RECOVERY", "Removing refrigerant into an approved cylinder"],
  ["DAMPER", "Plate that adjusts airflow in a duct"],
  ["PLENUM", "Box-like duct attached to the equipment"],
  ["REGISTER", "Supply outlet with an adjustable damper"],
  ["TRANSFORMER", "Steps line voltage down to 24 volts"],
  ["INDUCER", "Furnace draft motor"],
  ["DEFROST", "Heat pump mode that melts ice off the outdoor coil"],
  ["LATENT", "Heat that changes state without changing temperature"],
  ["SENSIBLE", "Heat you can measure with a thermometer"],
  ["HUMIDITY", "Water vapor in the air"],
  ["PISTON", "Fixed orifice metering device"],
  ["BLOWER", "Indoor fan that moves air through the ducts"],
  ["FILTER", "Cleans return air and protects the coil"],
  ["AMPS", "Unit of electrical current"],
  ["OHMS", "Unit of resistance"],
  ["VOLTAGE", "Electrical pressure"],
  ["TON", "12,000 BTU per hour of cooling"],
  ["BTU", "Heat to raise 1 lb of water by 1 °F"],
  ["CFM", "Airflow volume per minute"],
  ["IGNITER", "Hot surface part that lights the gas"],
  ["LIMIT", "Furnace safety that opens on overheating"],
  ["DRAIN", "Carries condensate away"],
];

type Placed = { word: string; clue: string; row: number; col: number; dir: "across" | "down" };

export function buildCrossword(seed: number, count = 10, size = 15): Placed[] {
  const r = rng(seed);
  const words = shuffle(r, WORDS).sort((a, b) => b[0].length - a[0].length).slice(0, 20);
  const grid = new Map<string, string>();
  const placed: Placed[] = [];
  const key = (row: number, col: number) => `${row},${col}`;
  const fits = (w: string, row: number, col: number, dir: "across" | "down") => {
    const dr = dir === "down" ? 1 : 0;
    const dc = dir === "across" ? 1 : 0;
    if (row < 0 || col < 0 || row + dr * (w.length - 1) >= size || col + dc * (w.length - 1) >= size) return false;
    if (grid.has(key(row - dr, col - dc)) || grid.has(key(row + dr * w.length, col + dc * w.length))) return false;
    let crosses = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = row + dr * i;
      const cc = col + dc * i;
      const cur = grid.get(key(rr, cc));
      if (cur) {
        if (cur !== w[i]) return false;
        crosses++;
      } else if (grid.has(key(rr + dc, cc + dr)) || grid.has(key(rr - dc, cc - dr))) return false;
    }
    return placed.length === 0 || crosses > 0 ? crosses + 1 : false;
  };
  const put = (w: string, clue: string, row: number, col: number, dir: "across" | "down") => {
    for (let i = 0; i < w.length; i++) grid.set(key(row + (dir === "down" ? i : 0), col + (dir === "across" ? i : 0)), w[i]);
    placed.push({ word: w, clue, row, col, dir });
  };
  const [first, ...rest] = words;
  put(first[0], first[1], Math.floor(size / 2), Math.floor((size - first[0].length) / 2), "across");
  for (const [w, clue] of rest) {
    if (placed.length >= count) break;
    let best: { row: number; col: number; dir: "across" | "down"; s: number } | null = null;
    for (const p of placed)
      for (let i = 0; i < p.word.length; i++)
        for (let j = 0; j < w.length; j++) {
          if (p.word[i] !== w[j]) continue;
          const dir = p.dir === "across" ? "down" : "across";
          const row = p.dir === "across" ? p.row - j : p.row + i;
          const col = p.dir === "across" ? p.col + i : p.col - j;
          const s = fits(w, row, col, dir);
          if (s && (!best || s > best.s)) best = { row, col, dir, s };
        }
    if (best) put(w, clue, best.row, best.col, best.dir);
  }
  return placed;
}

type CwSecret = { words: Placed[] };
export const crossword: GameDef<{ size: number; cells: string[]; entries: { n: number; row: number; col: number; dir: "across" | "down"; length: number; clue: string }[] }, CwSecret, Record<string, string>> = {
  id: "crossword",
  letter: "F",
  title: "HVAC Crossword",
  tagline: "Vocabulary, crossword-style",
  description: "A fresh crossword built from HVAC terms every time you play.",
  skills: ["fundamentals"],
  icon: "Grid3x3",
  pro: false,
  start({ seed }) {
    const words = buildCrossword(seed);
    const cells = new Set<string>();
    for (const w of words) for (let i = 0; i < w.word.length; i++) cells.add(`${w.row + (w.dir === "down" ? i : 0)},${w.col + (w.dir === "across" ? i : 0)}`);
    const starts = [...new Set(words.map((w) => `${w.row},${w.col}`))].sort((a, b) => {
      const [ar, ac] = a.split(",").map(Number);
      const [br, bc] = b.split(",").map(Number);
      return ar - br || ac - bc;
    });
    const entries = words.map((w) => ({ n: starts.indexOf(`${w.row},${w.col}`) + 1, row: w.row, col: w.col, dir: w.dir, length: w.word.length, clue: w.clue }));
    return { puzzle: { size: 15, cells: [...cells], entries }, secret: { words } };
  },
  grade(secret, submission) {
    const sub = isRecord(submission) ? submission : {};
    const feedback = secret.words.map((w) => {
      let ok = true;
      for (let i = 0; i < w.word.length; i++) {
        const k = `${w.row + (w.dir === "down" ? i : 0)},${w.col + (w.dir === "across" ? i : 0)}`;
        if (String(sub[k] ?? "").toUpperCase() !== w.word[i]) ok = false;
      }
      return { title: w.clue, correct: ok, detail: w.word };
    });
    return { score: feedback.filter((f) => f.correct).length, max: secret.words.length, feedback };
  },
};

// ---------------- I: Installation Challenge ----------------
const INSTALL_STEPS = [
  "Perform a load calculation and select matched equipment",
  "Set the outdoor unit level with required clearances",
  "Run and support the line set; keep ends capped",
  "Braze joints while flowing dry nitrogen",
  "Pressure test with nitrogen and check for leaks",
  "Evacuate and perform a vacuum decay test",
  "Open service valves and start up the system",
  "Verify charge, airflow and safeties; document results",
];

const INSPECTION = [
  { id: "trap", label: "Condensate drain has no trap on a draw-through coil", mistake: true },
  { id: "disconnect", label: "Service disconnect mounted within sight of the unit", mistake: false },
  { id: "kink", label: "Suction line kinked behind the unit", mistake: true },
  { id: "insul", label: "Suction line fully insulated", mistake: false },
  { id: "clear", label: "Unit installed 4 inches from a wall where the manual requires 12", mistake: true },
  { id: "pad", label: "Level pad with vibration isolation", mistake: false },
  { id: "breaker", label: "40 A breaker on a unit with MOCP 30 A", mistake: true },
  { id: "float", label: "Float switch installed in the attic secondary pan", mistake: false },
  { id: "dryer", label: "Dryer vent blows directly at the condenser coil", mistake: true },
  { id: "caps", label: "Service valve caps reinstalled and snug", mistake: false },
];

const DECISIONS = [
  { id: "evac", prompt: "Before releasing the charge, evacuate to:", options: ["500 microns or lower (or the manufacturer's spec) and pass a decay test", "Whatever the compound gauge calls '30 inches'", "Just run the pump for 15 minutes"], answer: 0 },
  { id: "purge", prompt: "While brazing the line set you should:", options: ["Flow low-pressure dry nitrogen through the piping", "Flow refrigerant through the piping", "Leave the service valves open to atmosphere"], answer: 0 },
  { id: "breaker", prompt: "Nameplate: MCA 21 A, MOCP 35 A. The breaker must be:", options: ["No larger than 35 A (wire sized for at least 21 A)", "50 A for safety margin", "15 A"], answer: 0 },
  { id: "charge", prompt: "This TXV system has a 35 ft line set. To set the charge:", options: ["Adjust for line length per instructions, then verify subcooling to the nameplate target", "Use superheat only", "Add refrigerant until the suction line sweats"], answer: 0 },
];

type IcSecret = { decisionsOrder: string[]; optionMaps: number[][] };
type IcSub = { steps: string[]; mistakes: string[]; decisions: number[] };
export const installationChallenge: GameDef<{ steps: string[]; inspection: { id: string; label: string }[]; decisions: { id: string; prompt: string; options: string[] }[] }, IcSecret, IcSub> = {
  id: "installation-challenge",
  letter: "I",
  title: "Installation Challenge",
  tagline: "Plan it, inspect it, commission it",
  description: "Sequence a full split-system install, spot the mistakes in a finished job, and make the critical calls.",
  skills: ["installation", "safety"],
  icon: "HardHat",
  pro: true,
  start({ seed }) {
    const r = rng(seed);
    const decisions = DECISIONS.map((d) => {
      const order = shuffle(r, d.options.map((_, i) => i));
      return { d, order };
    });
    return {
      puzzle: {
        steps: shuffle(r, INSTALL_STEPS),
        inspection: shuffle(r, INSPECTION).map(({ id, label }) => ({ id, label })),
        decisions: decisions.map(({ d, order }) => ({ id: d.id, prompt: d.prompt, options: order.map((i) => d.options[i]) })),
      },
      secret: { decisionsOrder: DECISIONS.map((d) => d.id), optionMaps: decisions.map((x) => x.order) },
    };
  },
  grade(secret, submission) {
    const sub: Record<string, unknown> = isRecord(submission) ? submission : {};
    const steps = asArray(sub.steps).map(String);
    const inPlace = steps.length === INSTALL_STEPS.length ? steps.filter((s, i) => s === INSTALL_STEPS[i]).length : 0;
    const marked = new Set(asArray(sub.mistakes).map(String));
    const truth = INSPECTION.filter((x) => x.mistake);
    const found = truth.filter((x) => marked.has(x.id)).length;
    const falseFlags = INSPECTION.filter((x) => !x.mistake && marked.has(x.id)).length;
    const inspectPts = Math.max(0, found - falseFlags);
    const decisions = asArray(sub.decisions);
    const decisionFb = DECISIONS.map((d, i) => {
      const chosenDisplayIdx = Number(decisions[i]);
      const original = secret.optionMaps[i]?.[chosenDisplayIdx];
      const ok = original === d.answer;
      return { title: d.prompt, correct: ok, detail: d.options[d.answer] };
    });
    const decisionPts = decisionFb.filter((f) => f.correct).length * 2;
    return {
      score: inPlace + inspectPts + decisionPts,
      max: INSTALL_STEPS.length + truth.length + DECISIONS.length * 2,
      feedback: [
        { title: "Installation sequence", correct: inPlace === INSTALL_STEPS.length, detail: `${inPlace}/${INSTALL_STEPS.length} in place. Correct order: ${INSTALL_STEPS.join(" → ")}` },
        { title: "Inspection", correct: found === truth.length && falseFlags === 0, detail: `Found ${found}/${truth.length} mistakes${falseFlags ? `, ${falseFlags} correct item(s) flagged by mistake` : ""}. Mistakes were: ${truth.map((t) => t.label).join("; ")}.` },
        ...decisionFb,
      ],
      summary: "Real installations must follow manufacturer instructions, applicable codes and local permitting requirements.",
    };
  },
};

// ---------------- K: Speed Round ----------------
type SrSecret = { ids: string[] };
export const speedRound: GameDef<{ questions: PublicQuestion[]; seconds: number }, SrSecret, { id: string; response: Response }[]> = {
  id: "speed-round",
  letter: "K",
  title: "Speed Round",
  tagline: "60 seconds. Go.",
  description: "Rapid-fire terminology and concept questions from the levels you've unlocked. The clock runs on the server.",
  skills: ["fundamentals"],
  icon: "Timer",
  pro: false,
  timeLimit: 60,
  start({ seed, unlockedLevels }) {
    const r = rng(seed);
    const pool = BASE_CURRICULUM.lessons
      .filter((l) => unlockedLevels.includes(l.levelId))
      .flatMap((l) => l.steps.flatMap((s) => (s.kind === "question" && (s.question.type === "single" || s.question.type === "truefalse") && s.question.difficulty <= 2 ? [s.question] : [])));
    const qs = sample(r, pool, Math.min(25, pool.length));
    return { puzzle: { questions: qs.map((q) => toPublicQuestion(q, seed)), seconds: 60 }, secret: { ids: qs.map((q) => q.id) } };
  },
  grade(secret, submission, elapsedMs) {
    const late = elapsedMs > 75_000;
    const subs = asArray(submission).filter(isRecord);
    const seen = new Set<string>();
    const feedback: { title: string; correct: boolean; detail: string }[] = [];
    let score = 0;
    for (const s of subs) {
      const id = String(s.id);
      if (!secret.ids.includes(id) || seen.has(id)) continue;
      seen.add(id);
      const q = BASE_CURRICULUM.questions.get(id)!;
      const g = gradeQuestion(q, s.response as Response);
      if (g.correct && !late) score++;
      feedback.push({ title: q.prompt, correct: g.correct, detail: g.correctAnswer });
    }
    return { score, max: Math.min(secret.ids.length, 15), feedback, summary: late ? "Time expired before submission — no points this round." : `${score} correct in 60 seconds.` };
  },
};

// ---------------- L: Mystery Service Call ----------------
type MNode = { id: string; text: string; choices: { text: string; next: string; clue?: string; unsafe?: string; good?: boolean }[]; end?: { options: { id: string; text: string; correct: boolean; why: string }[] } };
type Mystery = { id: string; title: string; intro: string; nodes: MNode[] };

const MYSTERIES: Mystery[] = [
  {
    id: "m-ice",
    title: "The Icy Suction Line",
    intro: "Mid-July. A homeowner says the AC 'kind of works' and there's ice on the pipe outside.",
    nodes: [
      { id: "start", text: "You arrive. The outdoor unit is running and the suction line at the service valve is covered in frost.", choices: [
        { text: "Ask about the filter and recent changes", next: "ask", clue: "Filter 'changed in spring' — they have three cats.", good: true },
        { text: "Hook up gauges and start adding refrigerant", next: "addref", unsafe: "Adding refrigerant to an iced system without diagnosis can overcharge it — and charge readings on an iced coil are meaningless." },
        { text: "Go inside and look at the indoor unit", next: "indoor", good: true },
      ] },
      { id: "ask", text: "The homeowner shrugs: 'We change the filter every spring.' It's July and there are three cats.", choices: [{ text: "Check the filter", next: "filter", good: true }, { text: "Check the outdoor coil", next: "outdoorcoil" }] },
      { id: "indoor", text: "The indoor coil is iced over. Airflow at the registers is weak.", choices: [{ text: "Check the filter", next: "filter", good: true }, { text: "Measure static pressure", next: "static", good: true, clue: "TESP 1.1 in. w.c." }] },
      { id: "addref", text: "The gauges show low suction pressure. You add 2 lb. Suction comes up a bit — but the coil stays iced and now head pressure is climbing.", choices: [{ text: "Stop and look at airflow", next: "indoor" }] },
      { id: "outdoorcoil", text: "The condenser coil is reasonably clean. That's not it.", choices: [{ text: "Go inside", next: "indoor" }] },
      { id: "static", text: "Total external static is 1.1 in. w.c. — more than double the 0.5 rating.", choices: [{ text: "Check the filter", next: "filter", good: true }] },
      { id: "filter", text: "The filter is a mat of fur and dust, bowed inward.", choices: [{ text: "Make your diagnosis", next: "end" }] },
      { id: "end", text: "What's the root cause and the right fix?", choices: [], end: { options: [
        { id: "a", text: "Low airflow from a clogged filter — replace filter, thaw coil, then verify charge", correct: true, why: "Airflow evidence (static, weak registers, filthy filter) explains the ice. Charge can only be judged after thawing." },
        { id: "b", text: "Low refrigerant — add more until the ice melts", correct: false, why: "There's no evidence of a leak yet; the airflow restriction fully explains the ice." },
        { id: "c", text: "Bad compressor", correct: false, why: "The compressor is running and pumping." },
      ] } },
    ],
  },
  {
    id: "m-breaker",
    title: "The Midnight Breaker",
    intro: "A family says the AC breaker trips 'every night around midnight'.",
    nodes: [
      { id: "start", text: "Daytime: the system runs fine while you're there.", choices: [
        { text: "Ask exactly when and how it trips", next: "ask", clue: "Trips ~10 min after the AC starts on the night setback schedule; neighbors had a power surge last week.", good: true },
        { text: "Replace the breaker", next: "breaker", unsafe: "Replacing parts without evidence — and breakers usually trip for a reason." },
        { text: "Inspect the outdoor unit", next: "outdoor", good: true, clue: "Discolored, loose T1 connection" },
      ] },
      { id: "ask", text: "It trips about 10 minutes after the AC kicks on when the thermostat drops to 68 at night.", choices: [{ text: "Inspect the outdoor unit", next: "outdoor", good: true, clue: "Discolored, loose T1 connection" }] },
      { id: "breaker", text: "You replace the breaker. That night it trips again. The customer is annoyed.", choices: [{ text: "Go back and inspect properly", next: "outdoor" }] },
      { id: "outdoor", text: "In the outdoor unit you find a heat-discolored wire on the contactor's T1 lug and a loose terminal screw.", choices: [
        { text: "Lock out, verify zero voltage, then torque-check every connection", next: "loto", good: true, clue: "Windings and ground normal" },
        { text: "Tighten it with the power on to save time", next: "live", unsafe: "Working on energized line-voltage terminals risks shock and arc flash." },
      ] },
      { id: "live", text: "The screwdriver slips and arcs across L1–L2. You're lucky you were wearing gloves. Never again.", choices: [{ text: "Lock out and continue", next: "loto" }] },
      { id: "loto", text: "With power locked out: the T1 lug is pitted; the wire end is oxidized. Compressor windings and ground test normal.", choices: [{ text: "Make your diagnosis", next: "end" }] },
      { id: "end", text: "What's causing the trips?", choices: [], end: { options: [
        { id: "a", text: "A loose, overheating connection at the contactor — replace the contactor and the damaged wire end, then verify amps", correct: true, why: "Heat-discolored, loose connections cause resistance heating and nuisance trips under load; windings and ground test fine." },
        { id: "b", text: "Grounded compressor", correct: false, why: "Ground test was normal." },
        { id: "c", text: "Bad thermostat schedule", correct: false, why: "The schedule only explains WHEN it starts, not why the breaker trips." },
      ] } },
    ],
  },
  {
    id: "m-co",
    title: "The Headache House",
    intro: "Winter. A customer says the furnace 'works', but everyone in the family gets headaches at home and feels better at work.",
    nodes: [
      { id: "start", text: "This could be serious. What's your first move?", choices: [
        { text: "Check for carbon monoxide in the living space with a calibrated CO meter", next: "co", clue: "Ambient CO reading elevated near the furnace closet", good: true },
        { text: "Tell them it's probably the flu", next: "flu", unsafe: "Flu-like symptoms that improve away from home are a classic CO warning sign." },
        { text: "Start a routine tune-up", next: "tune" },
      ] },
      { id: "flu", text: "You leave. Two days later the family's CO alarm (newly installed) goes off. Never dismiss these symptoms.", choices: [{ text: "Go back and test", next: "co" }] },
      { id: "tune", text: "While you work, your personal CO monitor alarms near the furnace.", choices: [{ text: "Follow emergency procedure", next: "co" }] },
      { id: "co", text: "Elevated CO near the furnace. You follow your company's emergency procedure: get people out, ventilate, shut down the appliance.", choices: [
        { text: "Inspect the venting", next: "vent", good: true, clue: "Separated vent connector + blocked vent cap" },
        { text: "Restart the furnace and see if it clears", next: "restart", unsafe: "Re-running an appliance suspected of producing CO with occupants inside endangers lives." },
      ] },
      { id: "restart", text: "Not acceptable. The appliance stays off until the cause is found and corrected.", choices: [{ text: "Inspect the venting", next: "vent" }] },
      { id: "vent", text: "The vent connector has separated at a joint in the attic, and the cap is partially blocked by a bird nest.", choices: [{ text: "Make your diagnosis", next: "end" }] },
      { id: "end", text: "What's the cause and the correct action?", choices: [], end: { options: [
        { id: "a", text: "Venting failure — keep the appliance off, repair the vent per code and manufacturer instructions, verify with combustion analysis and CO testing, recommend CO alarms", correct: true, why: "A separated connector and blocked cap can spill flue gases into the home." },
        { id: "b", text: "Dirty filter", correct: false, why: "A filter doesn't produce CO." },
        { id: "c", text: "Thermostat issue", correct: false, why: "The thermostat doesn't affect combustion products." },
      ] } },
    ],
  },
];

type MySecret = { id: string; path: string[]; done: boolean };
export const mysteryCall: GameDef<{ id: string; title: string; intro: string; node: { id: string; text: string; choices: { text: string }[]; end?: { options: { id: string; text: string }[] } } }, MySecret, { ending: string }> = {
  id: "mystery-call",
  letter: "L",
  title: "The Mystery Service Call",
  tagline: "Follow the clues. Make the call.",
  description: "A branching story: every choice reveals clues — or consequences. Reach the right conclusion safely.",
  skills: ["troubleshooting", "safety"],
  icon: "BookOpen",
  pro: false,
  start({ seed }) {
    const m = MYSTERIES[seed % MYSTERIES.length];
    return { puzzle: { id: m.id, title: m.title, intro: m.intro, node: publicNode(m, "start") }, secret: { id: m.id, path: ["start"], done: false } };
  },
  grade(secret, submission) {
    const m = MYSTERIES.find((x) => x.id === secret.id)!;
    const end = m.nodes.find((n) => n.id === "end")!.end!;
    const reachedEnd = secret.path.at(-1) === "end";
    const choice = isRecord(submission) ? end.options.find((o) => o.id === submission.ending) : undefined;
    const clues: string[] = [];
    const unsafe: string[] = [];
    let good = 0;
    for (let i = 0; i < secret.path.length - 1; i++) {
      const node = m.nodes.find((n) => n.id === secret.path[i])!;
      const ch = node.choices.find((c) => c.next === secret.path[i + 1]);
      if (ch?.clue) clues.push(ch.clue);
      if (ch?.unsafe) unsafe.push(ch.unsafe);
      if (ch?.good) good++;
    }
    const correct = reachedEnd && !!choice?.correct;
    const score = Math.max(0, (correct ? 6 : 0) + Math.min(good, 3) - unsafe.length * 3);
    return {
      score,
      max: 9,
      feedback: [
        { title: "Conclusion", correct, detail: choice ? `${choice.text}. ${choice.why}` : "No conclusion reached." },
        { title: "Clues gathered", correct: clues.length >= 2, detail: clues.join(" · ") || "None" },
        ...unsafe.map((u) => ({ title: "Unsafe or costly choice", correct: false, detail: u })),
      ],
    };
  },
};

function publicNode(m: Mystery, id: string) {
  const n = m.nodes.find((x) => x.id === id)!;
  return { id: n.id, text: n.text, choices: n.choices.map((c) => ({ text: c.text })), end: n.end ? { options: n.end.options.map(({ id, text }) => ({ id, text })) } : undefined };
}

/** Advance a mystery by choice index; returns the next public node plus the consequence of that choice. */
export function advanceMystery(secret: MySecret, choiceIndex: number) {
  const m = MYSTERIES.find((x) => x.id === secret.id)!;
  const cur = m.nodes.find((n) => n.id === secret.path.at(-1))!;
  const ch = cur.choices[choiceIndex];
  if (!ch) return null;
  secret.path.push(ch.next);
  return { node: publicNode(m, ch.next), clue: ch.clue ?? null, warning: ch.unsafe ?? null };
}
