import { describe, expect, it } from "vitest";
import { SCENARIOS } from "@/engine/sim/scenarios";
import { PROFILES, CAUSES, REPAIRS, QUESTIONS } from "@/engine/sim/catalog";
import { publicScenario, replay, scoreRun, step, initialState, SimError } from "@/engine/sim/engine";
import type { SimAction } from "@/engine/sim/types";

function expertRun(id: string): SimAction[] {
  const s = SCENARIOS.find((x) => x.id === id)!;
  const p = PROFILES[s.profile];
  const live: SimAction[] = [];
  const dead: SimAction[] = [];
  for (const g of s.evidence) {
    const k = g.any[0];
    const [kind, ref] = k.split(":");
    if (kind === "ask") live.push({ t: "ask", q: ref });
    if (kind === "inspect") live.push({ t: "inspect", loc: ref as never });
    if (kind === "measure") (p.measures.find((m) => m.id === ref)!.power === "off" ? dead : live).push({ t: "measure", m: ref });
  }
  const acts: SimAction[] = [...live, { t: "power", on: false }, { t: "verify-dead" }, { t: "discharge" }, ...dead];
  for (const f of s.faults) acts.push({ t: "repair", r: f.repair });
  acts.push({ t: "power", on: true }, { t: "measure", m: s.verify[0] }, { t: "finish", causes: s.faults.map((f) => f.cause) });
  return acts;
}

describe("field simulator scenarios", () => {
  it("has a broad scenario library", () => expect(SCENARIOS.length).toBeGreaterThanOrEqual(15));

  for (const s of SCENARIOS) {
    describe(s.id, () => {
      const p = PROFILES[s.profile];
      it("references valid catalog entries", () => {
        const pub = publicScenario(s);
        for (const f of s.faults) {
          expect(CAUSES[f.cause], f.cause).toBeTruthy();
          expect(p.repairs, f.repair).toContain(f.repair);
          expect(pub.causes.map((c) => c.id), f.cause).toContain(f.cause);
          for (const k of [...Object.keys(f.on ?? {}), ...Object.keys(f.off ?? {})]) expect(p.measures.some((m) => m.id === k), `${s.id}:${k}`).toBe(true);
          for (const q of Object.keys(f.answers ?? {})) expect(QUESTIONS.some((x) => x.id === q)).toBe(true);
        }
        for (const v of s.verify) expect(p.measures.some((m) => m.id === v), v).toBe(true);
        for (const g of s.evidence)
          for (const k of g.any) {
            const [kind, ref] = k.split(":");
            if (kind === "measure") expect(p.measures.some((m) => m.id === ref), k).toBe(true);
            if (kind === "inspect") expect(p.locations.some((l) => l.id === ref), k).toBe(true);
            if (kind === "ask") expect(QUESTIONS.some((q) => q.id === ref), k).toBe(true);
          }
        for (const r of p.repairs) expect(REPAIRS[r]).toBeTruthy();
        expect(JSON.stringify(pub)).not.toContain(s.explanation.slice(0, 30));
      });

      it("an expert, safe, evidence-first run scores an A", () => {
        const st = replay(s, expertRun(s.id));
        const sc = scoreRun(s, st);
        expect(sc.parts.find((x) => x.key === "safety")!.earned, JSON.stringify(sc.parts)).toBe(15);
        expect(sc.total, JSON.stringify(sc.parts)).toBeGreaterThanOrEqual(90);
        expect(sc.passed).toBe(true);
      });

      it("guessing repairs without evidence fails even if it lands on the fix", () => {
        const wrong = p.repairs.find((r) => !s.faults.some((f) => f.repair === r))!;
        const st = replay(s, [{ t: "power", on: false }, { t: "repair", r: wrong }, ...s.faults.map((f) => ({ t: "repair" as const, r: f.repair })), { t: "finish", causes: s.faults.map((f) => f.cause) }]);
        const sc = scoreRun(s, st);
        expect(sc.passed).toBe(false);
        expect(sc.unnecessaryCost).toBeGreaterThan(0);
      });
    });
  }

  it("repairs on live equipment are blocked and cap the score", () => {
    const s = SCENARIOS.find((x) => x.id === "sim-bad-contactor")!;
    const st = replay(s, [{ t: "measure", m: "v.contactor-coil" }, { t: "repair", r: "replace-contactor" }, { t: "finish", causes: ["bad-contactor"] }]);
    expect(st.resolved[0]).toBe(false);
    expect(scoreRun(s, st).total).toBeLessThanOrEqual(60);
  });

  it("blocks resistance tests on live equipment and flags it critical", () => {
    const s = SCENARIOS.find((x) => x.id === "sim-bad-capacitor")!;
    const st = initialState(s);
    step(s, st, { t: "measure", m: "cap.herm" });
    expect(st.criticals).toContain("meter-live");
    expect(st.log.at(-1)!.reading).toBeUndefined();
  });

  it("readings change after the fault is repaired", () => {
    const s = SCENARIOS.find((x) => x.id === "sim-dirty-condenser")!;
    const st = replay(s, [{ t: "measure", m: "p.liquid" }, { t: "power", on: false }, { t: "verify-dead" }, { t: "repair", r: "clean-condenser" }, { t: "power", on: true }, { t: "measure", m: "p.liquid" }]);
    const vals = st.log.filter((l) => l.reading).map((l) => l.reading!.value);
    expect(vals[0]).toBe("480 psig");
    expect(vals[1]).toBe("380 psig");
  });

  it("rejects actions after finishing and hints in advanced mode", () => {
    const s = SCENARIOS[0];
    expect(() => replay(s, [{ t: "hint" }], "advanced")).toThrow(SimError);
    expect(() => replay(s, [{ t: "finish", causes: ["dirty-filter"] }, { t: "ask", q: "q.when" }])).toThrow(SimError);
  });
});
