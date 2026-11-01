import type { Refrigerant } from "../pt";

export type ToolId = "multimeter" | "clamp" | "gauges" | "thermometer" | "manometer" | "leak" | "micron";

export type LocationId = "thermostat" | "indoor" | "filter" | "outdoor" | "panel" | "vents" | "drain" | "attic";

export type PowerReq = "on" | "off" | "any";

export type MeasureDef = {
  id: string;
  tool: ToolId;
  location: LocationId;
  label: string;
  unit: string;
  /** "off" tests (ohms, µF) must be done de-energized; "on" tests read 0 / standing values when off. */
  power: PowerReq;
  /** Requires the capacitor to be discharged first (capacitance tests). */
  needsDischarge?: boolean;
  /** Time cost in simulated minutes. */
  minutes?: number;
};

/** A reading: a number (formatted with the unit) or a text value, plus an optional observation. */
export type Reading = { value: number | string; note?: string };
export type ReadingSpec = number | string | Reading;

export type ProfileId = "cooling" | "gas-heat" | "hp-heat";

export type Profile = {
  id: ProfileId;
  label: string;
  refrigerant?: Refrigerant;
  outdoorF: number;
  locations: { id: LocationId; label: string; icon: string }[];
  measures: MeasureDef[];
  /** Readings with power ON in normal operation. */
  on: Record<string, ReadingSpec>;
  /** Readings with power OFF (anything missing falls back to a sensible zero / standing value). */
  off: Record<string, ReadingSpec>;
  inspect: Partial<Record<LocationId, string>>;
  answers: Record<string, string>;
  repairs: string[];
};

export type Fault = {
  /** cause id from CAUSES */
  cause: string;
  /** Other cause ids that also count as a correct diagnosis of this fault. */
  accept?: string[];
  /** repair id from REPAIRS that resolves this fault */
  repair: string;
  on?: Record<string, ReadingSpec>;
  off?: Record<string, ReadingSpec>;
  inspect?: Partial<Record<LocationId, string>>;
  answers?: Record<string, string>;
};

export type EvidenceGroup = { label: string; any: string[] };

export type Scenario = {
  id: string;
  title: string;
  level: 1 | 2 | 3; // difficulty: 1 beginner, 2 intermediate, 3 advanced
  levelId: string; // curriculum level it belongs to
  profile: ProfileId;
  customer: string;
  complaint: string;
  equipment: { type: string; age: string; refrigerant?: string; metering?: string; tonnage?: string; notes?: string };
  conditions: string;
  faults: Fault[];
  /** Key evidence that should be gathered before repairing (action keys: measure:id, inspect:loc, ask:qid). */
  evidence: EvidenceGroup[];
  /** At least one of these measurements after the final repair counts as verification. */
  verify: string[];
  /** Answer-key explanation and why alternatives are less likely. */
  explanation: string;
  differentials: { cause: string; why: string }[];
  hints: string[];
  parSteps: number;
  pro?: boolean;
  /** Overrides applied while ALL faults are still active (multi-fault interactions). */
  combined?: { on?: Record<string, ReadingSpec> };
};

export type SimAction =
  | { t: "ask"; q: string }
  | { t: "inspect"; loc: LocationId }
  | { t: "measure"; m: string }
  | { t: "power"; on: boolean }
  | { t: "verify-dead" }
  | { t: "discharge" }
  | { t: "hint" }
  | { t: "repair"; r: string }
  | { t: "finish"; causes: string[] };

export type LogEntry = {
  action: SimAction;
  minute: number;
  /** What the student saw. */
  title: string;
  text: string;
  reading?: { label: string; value: string };
  safety?: { severity: "warning" | "critical"; text: string };
  outcome?: "fixed" | "not-fixed" | "blocked";
};
