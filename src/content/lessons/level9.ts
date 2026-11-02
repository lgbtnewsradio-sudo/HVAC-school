import { ask, concept, example, lesson, multi, numeric, order, safety, single, tf, widget } from "./dsl";

const AD = { skills: ["troubleshooting" as const], difficulty: 3 };
const R = "2026-10-15";

export const LEVEL9 = [
  lesson({
    id: "l9-performance-analysis",
    levelId: "l9",
    order: 1,
    title: "System Performance Analysis",
    summary: "Condensing over ambient, evaporator TD and temperature split — the full picture beyond SH/SC.",
    minutes: 12,
    objectives: ["Calculate condensing temperature over ambient", "Calculate evaporator temperature difference", "Combine readings into one diagnosis"],
    skills: ["troubleshooting", "refrigeration"],
    pro: true,
    steps: [
      concept("Two more numbers", [
        "**Condensing temperature over ambient (CTOA)** = condenser saturation temp − outdoor air temp. Many systems run roughly **15–30 °F** over ambient — higher-efficiency units tend toward the low end. A big CTOA suggests heat-rejection problems (dirty coil, fan, overcharge, non-condensables).",
        "**Evaporator TD (design temperature difference)** = return air temp − evaporator saturation temp. Often around **35 °F** at typical conditions. A large TD points to low airflow over the coil; a small TD can point to excess airflow or low load.",
        "These are guidelines — use the manufacturer's performance data when available.",
      ]),
      ask(numeric("l9q-ctoa", "Liquid line pressure gives a condensing saturation of 118 °F. Outdoor air is 90 °F. What is the CTOA?", 28, 0, "°F", "118 − 90 = 28 °F over ambient.", AD)),
      ask(numeric("l9q-evaptd", "Return air is 76 °F and evaporator saturation is 32 °F. What is the evaporator TD?", 44, 0, "°F", "76 − 32 = 44 °F — higher than typical, suggesting low airflow across the coil.", AD)),
      concept("Putting it together", [
        "Read **everything**: suction & liquid pressure, SH, SC, CTOA, evaporator TD, temperature split, static pressure, amps vs nameplate. Faults leave fingerprints across several readings.",
        "Example: low suction + low SH + high evaporator TD + high static → **airflow**, not charge.",
      ]),
      widget("Pressure Detective", "pt-calculator", "Work the numbers on a full set of readings."),
      ask(
        single("l9q-combined", "Suction low, SH 3 °F (fixed orifice), SC normal, evaporator TD 45 °F, static 0.95 in. w.c. Diagnosis?", [["a", "Undercharge", "Undercharge gives high SH."], ["b", "Low indoor airflow", "Correct."], ["c", "Overcharge", "SC would be high."]], "b", "Every airflow indicator agrees: high static, large evaporator TD and low superheat. Fix airflow, then re-evaluate charge.", AD),
      ),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nate-ka" }, { id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l9-compressor-motor",
    levelId: "l9",
    order: 2,
    title: "Compressor & Motor Diagnostics",
    summary: "Amps vs RLA, winding tests, grounded compressors, internal overloads and failing motors.",
    minutes: 13,
    objectives: ["Interpret amp draw against nameplate", "Identify open, shorted and grounded windings", "Recognize an open internal overload"],
    skills: ["troubleshooting", "electrical"],
    pro: true,
    steps: [
      concept("Amp draw", [
        "**RLA** is a design rating, not the expected running current. Normal running amps are typically **below RLA** and vary with load. **LRA** is the stall/starting current.",
        "High amps: high head pressure, low voltage, mechanical problems. Very low amps with high suction and low head can indicate a compressor that isn't pumping (inefficient compressor).",
      ], undefined, ["RLA", "LRA"]),
      concept("Winding tests (power off)", [
        "**Open winding**: OL between two terminals. **Shorted winding**: much lower than expected resistance. **Grounded**: low resistance from a terminal to the compressor shell.",
        "**Open internal overload**: C–R and C–S read OL while S–R reads normal — the compressor is often just **hot**. Let it cool (can take hours) and find out why it overheated before condemning it.",
        "A **megohmmeter** tests insulation resistance more reliably than a standard ohmmeter. Follow the meter and compressor manufacturer's procedures.",
      ], "compressor-terminals"),
      ask(
        single("l9q-overload", "Power off: C–R = OL, C–S = OL, S–R = 3.2 Ω. Compressor dome is very hot. Most likely?", [["a", "Grounded compressor"], ["b", "Open internal overload — compressor overheated", "Correct."], ["c", "Shorted run winding"]], "b", "S–R continuity shows the windings are intact; the open is at common, where the internal overload sits. Let it cool and investigate the cause (capacitor, voltage, charge, airflow).", AD),
      ),
      ask(
        single("l9q-ground", "The breaker trips instantly when the compressor starts. Power off, you measure 2 Ω from the C terminal to the copper suction line. Verdict?", [["a", "Normal"], ["b", "Grounded compressor — do not re-energize", "Correct."], ["c", "Weak capacitor"]], "b", "Windings should show very high resistance to ground. A low reading means a winding is shorted to the shell — a shock and fire hazard. Replacement requires recovery and, after a burnout, cleanup per manufacturer guidance (acid test, filter driers).", { skills: ["troubleshooting", "electrical", "safety"], difficulty: 3 }),
      ),
      safety("Burned-out compressor", ["A compressor burnout can leave acidic oil in the system. Avoid skin contact with oil, wear gloves and eye protection, and follow the manufacturer's cleanup procedure."]),
      ask(tf("l9q-rla", "True or false: A compressor drawing exactly its nameplate RLA under normal conditions is expected.", false, "RLA is a rating used for design/protection; typical running amps are lower. Compare against manufacturer performance data at current conditions.", AD)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nate-ka" }, { id: "nfpa-70e" }],
    revised: R,
  }),

  lesson({
    id: "l9-inverter-communicating",
    levelId: "l9",
    order: 3,
    title: "Inverters, EEVs & Communicating Systems",
    summary: "Variable-speed equipment: different rules, different tools, same physics.",
    minutes: 12,
    objectives: ["Explain inverter-driven compressors", "Apply inverter safety (DC bus capacitors)", "Use fault codes and service modes"],
    skills: ["troubleshooting", "electrical"],
    pro: true,
    steps: [
      concept("How inverter equipment differs", [
        "An **inverter drive** converts AC to DC and back to variable-frequency AC to run the compressor at variable speed. **EEVs** are positioned by the board.",
        "Charge and performance checks often require a **service/charge mode** that locks the compressor at a fixed speed. Use the manufacturer's procedure and data — generic targets may not apply.",
        "**Communicating systems** exchange data between thermostat, indoor and outdoor units over a data bus. Diagnostics rely on fault codes and service menus.",
      ], undefined, ["Inverter", "EEV", "Communicating system"]),
      safety("DC bus capacitors", ["Inverter boards contain large capacitors that can hold **hazardous DC voltage for minutes after power is removed**. Wait the manufacturer-specified time, then verify DC voltage is gone before touching the board."]),
      ask(
        single("l9q-inverter-charge", "How should you verify charge on an inverter heat pump?", [["a", "Use generic 10 °F subcooling at any compressor speed"], ["b", "Put the system in the manufacturer's charge/service mode and use its charging data", "Correct."], ["c", "Feel the suction line"]], "b", "Variable speed changes pressures continuously. Manufacturers provide a fixed-speed test mode and charging chart.", AD),
      ),
      ask(tf("l9q-dc-bus", "True or false: Inverter boards may hold dangerous voltage after the disconnect is turned off.", true, "DC bus capacitors store energy. Wait, then verify with a meter.", { skills: ["electrical", "safety"], difficulty: 2 })),
      example("On the job", ["A communicating system shows 'outdoor comm lost'. Before condemning boards: check data wire connections and polarity, wire type, and voltage at the terminals per the diagnostic chart."]),
    ],
    sources: [{ id: "mfr-iom", note: "Inverter procedures are model-specific" }, { id: "nfpa-70e" }],
    revised: R,
    scope: "equipment-specific",
  }),

  lesson({
    id: "l9-zoning-controls",
    levelId: "l9",
    order: 4,
    title: "Zoning & Advanced Controls",
    summary: "Zone dampers, bypass, staging, dual fuel — and the problems they create when set up wrong.",
    minutes: 10,
    objectives: ["Explain how zoning works", "Diagnose a zoning airflow problem", "Describe dual-fuel switchover"],
    skills: ["troubleshooting", "airflow"],
    pro: true,
    steps: [
      concept("Zoning", [
        "A **zone panel** reads multiple thermostats and drives **motorized dampers**. When only one small zone calls, the duct system shrinks — static rises and airflow drops unless the system is designed for it (variable-speed equipment, proper zone sizing, or relief strategies).",
        "Symptoms of poor zoning: noise, frozen coils, limit trips when a single zone calls.",
      ], undefined, ["Zoning"]),
      concept("Staging & dual fuel", [
        "Two-stage and variable-capacity systems run low most of the time and step up for high loads.",
        "**Dual fuel** pairs a heat pump with a gas furnace; the control switches to the furnace below a set outdoor temperature (economic or comfort balance point). Heat pump and furnace normally should not run together unless the equipment is designed for it (the coil sits above the furnace).",
      ]),
      ask(
        single("l9q-zone-freeze", "The coil freezes only when the small bonus-room zone calls alone. Likely cause?", [["a", "Undercharge"], ["b", "Too little airflow when only one small zone's dampers are open", "Correct."], ["c", "Thermostat batteries"]], "b", "With one small zone open, the system can't move its design airflow. Review zone sizing, minimum airflow settings, staging, and relief design.", AD),
      ),
      ask(tf("l9q-dual-fuel", "True or false: In a typical dual-fuel system the heat pump and furnace run simultaneously in heating.", false, "Running the furnace with the heat pump compressor on puts the indoor coil (now the condenser) downstream of the furnace heat, causing very high head pressure. Controls lock one out.", AD)),
    ],
    sources: [{ id: "acca-d" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l9-intermittent-multifault",
    levelId: "l9",
    order: 5,
    title: "Intermittent & Multi-Fault Problems",
    summary: "When there's more than one thing wrong, or the problem won't show itself while you're there.",
    minutes: 12,
    objectives: ["Approach intermittent faults", "Recognize multiple simultaneous faults", "Verify all faults are resolved"],
    skills: ["troubleshooting"],
    pro: true,
    steps: [
      concept("Intermittent faults", [
        "Gather history: **when** does it happen (hot afternoons, after rain, first start of the day)? Check board **fault history**. Wiggle-test connections (power off), inspect for **loose or burned terminals**, and consider data loggers for temperatures/pressures.",
        "Recreate conditions safely: e.g., restrict condenser airflow briefly while monitoring head pressure to test a high-pressure switch — only within the manufacturer's limits.",
      ]),
      concept("Multiple faults", [
        "Real systems often have **more than one** problem: a weak capacitor **and** a dirty condenser; low charge **and** a dirty filter. Fixing one may hide or change the symptoms of the other.",
        "After any repair, **re-measure everything**. If the readings still don't add up, keep going.",
      ]),
      ask(
        order("l9q-multi-order", "Order the approach for a system with a dirty filter AND suspected low charge.", ["Replace the filter and verify airflow/static", "Let the system stabilize", "Re-measure superheat and subcooling", "If still undercharged, leak search and repair", "Evacuate, weigh in charge and verify"], "Always fix airflow before judging charge.", AD),
      ),
      ask(
        multi("l9q-intermittent", "Good tools/approaches for intermittent problems include… (Select all.)", [["a", "Board fault history"], ["b", "Data logging temperatures/pressures"], ["c", "Inspecting for loose or heat-discolored connections"], ["d", "Replacing the control board first", "Guessing is expensive."]], ["a", "b", "c"], "Evidence-gathering tools catch faults that don't show up while you're on site.", AD),
      ),
      widget("Multi-fault service call", "sim-link:sim-multi-fault", "Two things are wrong. Find both."),
    ],
    sources: [{ id: "nate-ka" }, { id: "mfr-iom" }],
    revised: R,
  }),
];

