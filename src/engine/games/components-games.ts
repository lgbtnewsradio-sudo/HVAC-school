import { COMPONENTS, componentById } from "@/content/components";
import { asArray, isRecord, rng, sample, shuffle, type GameDef } from "./core";

// ---------------- A: Name That Part ----------------
type NtpRound = { image: string; names: { id: string; text: string }[]; purposes: { id: string; text: string }[] };
type NtpSecret = { rounds: { id: string }[] };

export const nameThatPart: GameDef<{ rounds: NtpRound[] }, NtpSecret, { name: string; purpose: string }[]> = {
  id: "name-that-part",
  letter: "A",
  title: "Name That Part",
  tagline: "Identify it. Explain it.",
  description: "See an illustration, name the component, then pick what it does. Two points per part.",
  skills: ["components"],
  icon: "ScanSearch",
  pro: false,
  start({ seed }) {
    const r = rng(seed);
    const chosen = sample(r, COMPONENTS, 8);
    const rounds = chosen.map((c) => {
      const others = shuffle(r, COMPONENTS.filter((x) => x.id !== c.id));
      const sameCat = others.filter((x) => x.category === c.category);
      const decoyNames = [...sameCat, ...others].filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
      const decoyPurposes = shuffle(r, others).slice(0, 2);
      return {
        image: c.id,
        names: shuffle(r, [c, ...decoyNames]).map((x) => ({ id: x.id, text: x.name })),
        purposes: shuffle(r, [c, ...decoyPurposes]).map((x) => ({ id: x.id, text: x.purpose })),
      };
    });
    return { puzzle: { rounds }, secret: { rounds: chosen.map((c) => ({ id: c.id })) } };
  },
  grade(secret, submission) {
    const sub = asArray(submission);
    const feedback = secret.rounds.map((round, i) => {
      const s = isRecord(sub[i]) ? sub[i] : {};
      const c = componentById(round.id)!;
      const nameOk = s.name === round.id;
      const purposeOk = s.purpose === round.id;
      return {
        title: c.name,
        correct: nameOk && purposeOk,
        detail: `${nameOk ? "✓ Name" : "✗ Name"} · ${purposeOk ? "✓ Purpose" : "✗ Purpose"} — ${c.purpose}. Found: ${c.where}.`,
        pts: (nameOk ? 1 : 0) + (purposeOk ? 1 : 0),
      };
    });
    return { score: feedback.reduce((t, f) => t + f.pts, 0), max: secret.rounds.length * 2, feedback: feedback.map(({ pts: _pts, ...f }) => f) };
  },
};

// ---------------- B: Build the System ----------------
type Slot = { id: string; x: number; y: number; hint: string };
type Layout = { id: string; title: string; brief: string; slots: Slot[]; answer: Record<string, string[]>; parts: string[] };

const LAYOUTS: Layout[] = [
  {
    id: "ac-split",
    title: "Split-system air conditioner",
    brief: "Place each component in the refrigeration circuit. Follow the arrows: refrigerant flows clockwise from the compressor.",
    slots: [
      { id: "s1", x: 78, y: 70, hint: "Outdoor unit — pumps vapor" },
      { id: "s2", x: 78, y: 22, hint: "Outdoor unit — rejects heat" },
      { id: "s3", x: 50, y: 14, hint: "Liquid line" },
      { id: "s4", x: 22, y: 22, hint: "Evaporator inlet" },
      { id: "s5", x: 22, y: 70, hint: "Indoor — absorbs heat" },
    ],
    answer: { s1: ["compressor"], s2: ["condenser-coil"], s3: ["filter-drier"], s4: ["txv", "piston"], s5: ["evaporator-coil"] },
    parts: ["compressor", "condenser-coil", "filter-drier", "txv", "evaporator-coil", "flame-sensor", "inducer", "reversing-valve"],
  },
  {
    id: "heat-pump",
    title: "Heat pump (cooling mode)",
    brief: "Build a heat pump circuit. Two extra components protect the compressor and let it reverse.",
    slots: [
      { id: "s1", x: 78, y: 78, hint: "Pumps vapor" },
      { id: "s2", x: 92, y: 50, hint: "Directs discharge gas" },
      { id: "s3", x: 78, y: 18, hint: "Outdoor coil" },
      { id: "s4", x: 50, y: 10, hint: "Liquid line" },
      { id: "s5", x: 22, y: 18, hint: "Indoor metering" },
      { id: "s6", x: 22, y: 78, hint: "Indoor coil" },
      { id: "s7", x: 50, y: 88, hint: "Suction line before compressor" },
    ],
    answer: { s1: ["compressor"], s2: ["reversing-valve"], s3: ["condenser-coil"], s4: ["filter-drier"], s5: ["txv", "piston"], s6: ["evaporator-coil"], s7: ["accumulator"] },
    parts: ["compressor", "reversing-valve", "condenser-coil", "filter-drier", "txv", "evaporator-coil", "accumulator", "hsi", "limit-switch"],
  },
];

export const buildTheSystem: GameDef<{ layout: Omit<Layout, "answer">; parts: { id: string; name: string }[] }, { layout: string }, Record<string, string>> = {
  id: "build-the-system",
  letter: "B",
  title: "Build the System",
  tagline: "Assemble a working refrigeration circuit",
  description: "Drag (or tap) components into the right positions. Decoy parts don't belong anywhere.",
  skills: ["components", "refrigeration"],
  icon: "Puzzle",
  pro: false,
  start({ seed }) {
    const layout = LAYOUTS[seed % LAYOUTS.length];
    const parts = shuffle(rng(seed), layout.parts).map((id) => ({ id, name: componentById(id)!.name }));
    const { answer: _a, ...pub } = layout;
    return { puzzle: { layout: pub, parts }, secret: { layout: layout.id } };
  },
  grade(secret, submission) {
    const layout = LAYOUTS.find((l) => l.id === secret.layout)!;
    const sub = isRecord(submission) ? submission : {};
    const feedback = layout.slots.map((slot) => {
      const placed = typeof sub[slot.id] === "string" ? (sub[slot.id] as string) : "";
      const ok = layout.answer[slot.id].includes(placed);
      const right = layout.answer[slot.id].map((id) => componentById(id)!.name).join(" or ");
      return { title: slot.hint, correct: ok, detail: ok ? `${right} ✓ — ${componentById(placed)!.purpose}.` : `Needed: ${right}. ${placed ? `You placed: ${componentById(placed)?.name ?? "?"}.` : "Left empty."}` };
    });
    return { score: feedback.filter((f) => f.correct).length, max: layout.slots.length, feedback };
  },
};

// ---------------- G: Match the Component ----------------
type MatchSecret = { ids: string[]; mode: "picture" | "function" };
export const matchTheComponent: GameDef<{ mode: "picture" | "function"; left: { id: string; text: string; image?: string }[]; right: { id: string; text: string }[] }, MatchSecret, Record<string, string>> = {
  id: "match-the-component",
  letter: "G",
  title: "Match the Component",
  tagline: "Pictures, names and functions",
  description: "Match each component to its name or its job. Alternate rounds use pictures or functions.",
  skills: ["components"],
  icon: "Link",
  pro: false,
  start({ seed }) {
    const r = rng(seed);
    const mode = seed % 2 === 0 ? "picture" : "function";
    const chosen = sample(r, COMPONENTS, 6);
    const left = chosen.map((c) => (mode === "picture" ? { id: c.id, text: "", image: c.id } : { id: c.id, text: c.name }));
    const right = shuffle(r, chosen).map((c) => ({ id: c.id, text: mode === "picture" ? c.name : c.purpose }));
    return { puzzle: { mode, left, right }, secret: { ids: chosen.map((c) => c.id), mode } };
  },
  grade(secret, submission) {
    const sub = isRecord(submission) ? submission : {};
    const feedback = secret.ids.map((id) => {
      const c = componentById(id)!;
      const ok = sub[id] === id;
      return { title: c.name, correct: ok, detail: ok ? c.purpose : `Correct match: ${secret.mode === "picture" ? c.name : c.purpose}` };
    });
    return { score: feedback.filter((f) => f.correct).length, max: secret.ids.length, feedback };
  },
};
