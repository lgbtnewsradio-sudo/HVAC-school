import { ask, concept, example, lesson, match, multi, numeric, order, safety, single, tf, widget } from "./dsl";

const E = { skills: ["electrical" as const] };
const ES = { skills: ["electrical" as const, "safety" as const] };
const R = "2026-10-15";

export const LEVEL4 = [
  lesson({
    id: "l4-electric-safety",
    levelId: "l4",
    order: 1,
    title: "Electrical Safety First",
    summary: "Shock, arc flash, capacitors and lockout/tagout. The lesson that keeps you alive.",
    minutes: 9,
    objectives: ["Describe shock and arc-flash hazards", "List the lockout/tagout steps", "Explain 'test before touch'"],
    skills: ["electrical", "safety"],
    steps: [
      safety("Why this comes first", [
        "Residential HVAC equipment runs on **120 V and 240 V** — enough to kill. Currents well under one amp through the chest can be fatal.",
        "**Arc flash** — an explosive electrical discharge — can cause severe burns even without contact. Short circuits from dropped tools or loose meter leads can trigger it.",
      ]),
      concept("Lockout / Tagout (LOTO)", [
        "Before working on equipment: **notify** others → **shut off** at the disconnect/breaker → **lock and tag** the disconnecting means → **verify zero energy** with a properly rated meter that you've confirmed works on a known live source (live-dead-live).",
        "Also control **stored energy**: discharge capacitors, and remember refrigerant pressure is stored energy too.",
      ], undefined, ["Lockout/tagout"]),
      ask(
        order("l4q-loto", "Put the lockout/tagout steps in order.", ["Notify affected people", "Shut off the equipment and open the disconnect", "Apply your lock and tag", "Discharge stored energy (capacitors)", "Verify zero voltage with a tested meter"], "Notify, isolate, lock/tag, release stored energy, then verify before touching anything.", ES),
      ),
      concept("Test before touch", [
        "A switch in the 'off' position doesn't guarantee the circuit is dead: back-fed circuits, a wrong breaker, or a second power source can all fool you.",
        "Use a meter rated for the job (CAT III is typical for HVAC disconnects and panels), in good condition, with intact leads.",
      ]),
      safety("Live testing is for qualified techs", [
        "Some diagnostics (like checking voltage or amps on running equipment) require energized testing. That's only for **qualified, trained** people using proper PPE and procedures per **NFPA 70E** and their employer. In this academy, you practice live measurements in the simulator — not on real equipment.",
      ]),
      ask(
        single(
          "l4q-cap-discharge",
          "You've locked out the condensing unit. What must you do before touching the run capacitor?",
          [
            ["a", "Nothing — power is off"],
            ["b", "Verify zero voltage, then discharge the capacitor with a proper tool and confirm 0 V", "Correct."],
            ["c", "Tap the terminals with a screwdriver", "That's dangerous: it can arc, damage the capacitor and injure you."],
          ],
          "b",
          "Capacitors store charge after power is removed. Use a discharge tool/resistor and verify 0 V across all terminals.",
          ES,
        ),
      ),
      ask(tf("l4q-livedead", "True or false: 'Live-dead-live' means testing your meter on a known live source, testing the circuit, then testing the known source again.", true, "This proves the meter was working when it told you the circuit was dead.", ES)),
    ],
    sources: [{ id: "osha-loto" }, { id: "nfpa-70e" }, { id: "osha-electrical" }],
    revised: R,
  }),

  lesson({
    id: "l4-vir",
    levelId: "l4",
    order: 2,
    title: "Volts, Amps & Ohms",
    summary: "Electrical pressure, flow and resistance — plus AC vs DC.",
    minutes: 8,
    objectives: ["Define voltage, current and resistance", "Compare AC and DC", "Describe residential single-phase power"],
    skills: ["electrical"],
    steps: [
      concept("Water-pipe analogy", [
        "**Voltage (V)** is electrical **pressure**. **Current (amps, A)** is the **flow**. **Resistance (ohms, Ω)** is the **restriction**.",
        "More pressure pushes more flow; more restriction reduces it.",
      ], "ohms-triangle", ["Voltage", "Amperage", "Resistance"]),
      concept("AC vs DC", [
        "**DC** flows one direction (batteries, ECM electronics, flame-sensor microamps).",
        "**AC** reverses direction — **60 times per second (60 Hz)** in North America. Homes get AC power.",
      ]),
      concept("Residential power", [
        "Most US homes have **120/240 V single-phase** service: two hot legs (L1, L2) and a neutral. Hot-to-neutral = 120 V. Hot-to-hot = 240 V.",
        "Condensing units typically use **240 V** (L1–L2). Furnaces and many air handlers' blowers are often 120 V; air handlers with heat strips are typically 240 V.",
      ]),
      ask(
        match("l4q-units", "Match the quantity to its unit.", [["Voltage", "Volts (V)"], ["Current", "Amps (A)"], ["Resistance", "Ohms (Ω)"], ["Power", "Watts (W)"]], "These four units show up on every nameplate and meter.", E),
      ),
      ask(
        single("l4q-240", "Where do you measure 240 V in a typical residential condensing unit's disconnect?", [["a", "L1 to ground"], ["b", "L1 to L2", "Correct."], ["c", "L1 to neutral"]], "b", "240 V single-phase is measured hot-to-hot (L1 to L2). Each leg to ground reads about 120 V.", E),
      ),
      ask(tf("l4q-ac-hz", "True or false: North American AC power alternates at 60 Hz.", true, "60 cycles per second. Much of the rest of the world uses 50 Hz.", E)),
    ],
    sources: [{ id: "nec" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l4-ohms-law",
    levelId: "l4",
    order: 3,
    title: "Ohm's Law & Watts",
    summary: "V = I × R and P = V × I. The math you'll use on every electrical call.",
    minutes: 10,
    objectives: ["Solve Ohm's law for V, I or R", "Calculate watts", "Convert watts to BTU/h"],
    skills: ["electrical"],
    steps: [
      concept("The triangle", [
        "**V = I × R**. Cover the value you want: **I = V ÷ R**, **R = V ÷ I**.",
        "**Power (watts) = V × I** for resistive loads like heat strips. (Motors also have a power factor, so V × A for a motor is 'apparent power'.)",
        "Heat strips: **1 watt ≈ 3.412 BTU/h**. A 10 kW strip heater ≈ 34,120 BTU/h.",
      ], "ohms-triangle", ["Ohm's law", "Watt"]),
      widget("Ohm's law playground", "ohms-law", "Adjust voltage and resistance and watch the current and power change."),
      ask(numeric("l4q-ohm-i", "A heat strip element measures 24 Ω and is supplied with 240 V. How many amps will it draw?", 10, 0, "A", "I = V ÷ R = 240 ÷ 24 = 10 A.", E)),
      ask(numeric("l4q-watts", "That same element: 240 V × 10 A = how many watts?", 2400, 0, "W", "P = V × I = 2,400 W (2.4 kW).", E)),
      ask(numeric("l4q-btu", "Roughly how many BTU/h does a 5 kW heat strip produce? (Use 3.412 BTU/h per watt; round to the nearest 100.)", 17100, 100, "BTU/h", "5,000 W × 3.412 ≈ 17,060 → about 17,100 BTU/h.", E)),
      example("On the job", ["A 240 V heat strip draws 0 A. With power OFF, you measure the element: OL (open). Ohm's law says infinite resistance = no current — the element or its limit is open."]),
    ],
    sources: [{ id: "nate-ka" }, { id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l4-circuits",
    levelId: "l4",
    order: 4,
    title: "Series & Parallel Circuits",
    summary: "Why safeties are wired in series and loads in parallel.",
    minutes: 9,
    objectives: ["Describe series and parallel circuits", "Explain why safeties are wired in series", "Recognize opens and shorts"],
    skills: ["electrical"],
    steps: [
      concept("Series", [
        "In a **series** circuit, current has **one path**. If any switch in the string opens, **everything stops**.",
        "That's why **safety switches are wired in series** with the control they protect: any one safety opening (high-pressure switch, limit, float switch) breaks the circuit.",
        "Voltage divides across series loads; current is the same everywhere.",
      ], "series-parallel"),
      concept("Parallel", [
        "In a **parallel** circuit, each load has **its own path** across the full voltage. One load failing doesn't stop the others.",
        "Household **loads** (blower, condenser fan, compressor) are connected in parallel so each gets full voltage.",
      ], "series-parallel"),
      widget("Flip the switches", "series-parallel", "Open and close switches to see what happens in each circuit."),
      ask(
        single("l4q-series-safety", "Why are the high-pressure switch, low-pressure switch and contactor coil wired in series?", [["a", "So any open safety stops the compressor", "Correct."], ["b", "To double the voltage"], ["c", "Because parallel wiring is illegal"]], "a", "In series, every switch must be closed for current to reach the coil. One open safety de-energizes the contactor.", E),
      ),
      concept("Opens and shorts", [
        "An **open** is a break — no current flows. Across an open switch in a live circuit, you'll measure the **full supply voltage**.",
        "A **short** is an unintended low-resistance path — current spikes and breakers/fuses blow.",
      ], undefined, ["Open circuit", "Short circuit"]),
      ask(
        single(
          "l4q-open-volt",
          "In a live 24 V series circuit, you measure 24 V across a closed-looking pressure switch. What does that tell you?",
          [["a", "The switch is open", "Right — full voltage across a switch means it's open."], ["b", "The switch is closed and fine"], ["c", "The transformer is dead"]],
          "a",
          "Across a closed switch, voltage drop is ~0 V. Measuring full supply voltage across it means it's open (and is where the circuit is broken).",
          { skills: ["electrical", "troubleshooting"], difficulty: 2 },
        ),
      ),
      ask(tf("l4q-parallel", "True or false: In a parallel circuit, every branch receives the same voltage.", true, "Each branch is connected directly across the supply.", E)),
    ],
    sources: [{ id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l4-schematics",
    levelId: "l4",
    order: 5,
    title: "Schematics & Wiring Diagrams",
    summary: "Ladder diagrams show how it works; wiring diagrams show where the wires go.",
    minutes: 10,
    objectives: ["Tell a ladder schematic from a pictorial wiring diagram", "Read common symbols", "Trace a control circuit"],
    skills: ["electrical"],
    steps: [
      concept("Two kinds of drawings", [
        "A **ladder (schematic) diagram** shows the circuit's **logic**: power rails on each side, each 'rung' a path with switches and one load. It's the best tool for troubleshooting.",
        "A **pictorial/wiring diagram** shows the **physical layout**: where each wire lands, wire colors, and terminal positions.",
        "Every unit has a diagram on the panel. **Use the diagram for that unit** — models differ.",
      ], "ladder-schematic"),
      ask(
        match(
          "l4q-symbols",
          "Match the schematic symbol description to the component.",
          [
            ["Circle with a letter (e.g., 'CC')", "Coil (relay/contactor coil)"],
            ["Two parallel lines", "Normally open contacts"],
            ["Two parallel lines with a slash", "Normally closed contacts"],
            ["Zig-zag line", "Resistor / heating element"],
          ],
          "Symbol conventions vary slightly by manufacturer; check the legend on the diagram.",
          E,
        ),
      ),
      concept("Tracing a circuit", [
        "Start at the power source, follow the path through each switch to the load, and back to the other side. Ask: **what has to be closed for this load to run?**",
        "Example: R → thermostat Y → low-pressure switch → high-pressure switch → contactor coil → C.",
      ], "ladder-schematic"),
      ask(
        order("l4q-trace", "Trace the 24 V cooling control circuit from R back to C.", ["Transformer R", "Thermostat (R closed to Y)", "Low-pressure switch", "High-pressure switch", "Contactor coil", "Transformer C (common)"], "One series path: any open switch stops the contactor.", { skills: ["electrical"], difficulty: 2 }),
      ),
      ask(tf("l4q-ladder-one-load", "True or false: Good ladder-diagram practice puts only one load on each rung, with switches before it.", true, "One load per rung makes the circuit easy to read and troubleshoot.", E)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l4-multimeter",
    levelId: "l4",
    order: 6,
    title: "Using a Multimeter",
    summary: "Volts, ohms, continuity, capacitance and amps — the right setting for each test.",
    minutes: 12,
    objectives: ["Pick the correct meter function", "Know which tests need power off", "Interpret OL, 0 Ω and capacitance readings"],
    skills: ["electrical", "troubleshooting"],
    steps: [
      concept("The core functions", [
        "**AC volts (V~)** — measure supply and control voltages. Circuit energized. Leads in parallel (across) the points.",
        "**Ohms (Ω) / continuity** — measure resistance or confirm a path. **Power OFF** and the component isolated. 'OL' means open/over-limit.",
        "**Capacitance (µF)** — test capacitors. **Power OFF**, capacitor discharged and a lead removed.",
        "**Amps** — use a **clamp meter** around **one** conductor while the load runs.",
        "**DC microamps (µA)** — flame-sensor current, in series with the sensor wire (per manufacturer procedure).",
      ], undefined, ["Multimeter", "Clamp meter", "Continuity"]),
      widget("Virtual multimeter trainer", "multimeter-trainer", "Choose the meter function and probe points. Get it wrong and the trainer tells you why."),
      ask(
        match(
          "l4q-meter-match",
          "Match the test to the correct meter setup.",
          [
            ["Check line voltage at the disconnect", "AC volts, power on"],
            ["Check a fuse for continuity", "Ohms/continuity, power off"],
            ["Check compressor running current", "Clamp around one conductor, unit running"],
            ["Check a run capacitor", "Capacitance, power off and discharged"],
          ],
          "Resistance and capacitance tests are done de-energized; voltage and amperage tests require the circuit to be live (qualified personnel only).",
          ES,
        ),
      ),
      ask(
        single(
          "l4q-clamp-both",
          "You clamp around BOTH wires feeding a motor and read nearly 0 A. Why?",
          [["a", "The motor is off"], ["b", "The currents in the two conductors cancel out", "Correct — clamp one conductor only."], ["c", "The meter is broken"]],
          "b",
          "A clamp meter reads the net magnetic field. Supply and return currents are equal and opposite, so they cancel.",
          E,
        ),
      ),
      ask(
        single(
          "l4q-cap-test",
          "A run capacitor is labeled 40 µF ±6%. It measures 33.5 µF. Verdict?",
          [["a", "Good — within tolerance"], ["b", "Weak — below the 37.6 µF minimum, replace it", "Correct."], ["c", "Overcharged"]],
          "b",
          "40 × 0.94 = 37.6 µF minimum. 33.5 µF is out of tolerance, so the capacitor is weak.",
          { skills: ["electrical", "troubleshooting"], difficulty: 2 },
        ),
      ),
      concept("Compressor windings", [
        "Single-phase compressors have three terminals: **C** (common), **S** (start), **R** (run). With power off, measure ohms between each pair.",
        "The **highest** reading is S–R, and **S–R ≈ C–S + C–R**. C–R is usually the lowest.",
        "Also check each terminal to the copper/ground: you should see very high resistance. A low reading to ground indicates a **grounded compressor** — don't re-energize it.",
      ], "compressor-terminals"),
      ask(numeric("l4q-windings", "Compressor windings: C–R = 0.8 Ω, C–S = 2.6 Ω. What should S–R read, approximately?", 3.4, 0.1, "Ω", "S–R ≈ C–R + C–S = 0.8 + 2.6 = 3.4 Ω.", { skills: ["electrical"], difficulty: 2 })),
    ],
    sources: [{ id: "nfpa-70e" }, { id: "mfr-iom" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l4-troubleshooting",
    levelId: "l4",
    order: 7,
    title: "Electrical Troubleshooting Method",
    summary: "Follow the voltage: a repeatable way to find where a circuit is broken.",
    minutes: 10,
    objectives: ["Apply a step-by-step voltage trace", "Use voltage drop to find opens", "Confirm with de-energized tests"],
    skills: ["electrical", "troubleshooting"],
    steps: [
      concept("Follow the voltage", [
        "1. **Verify the supply**: correct voltage at the source (disconnect, transformer secondary).",
        "2. **Verify the load is being told to run**: is the control voltage present at the load?",
        "3. **Find where voltage stops**: measure from a known reference (e.g., C for 24 V) to each point along the path. The open is between the last point with voltage and the first without.",
        "4. **De-energize and confirm** the suspected part with an ohms test before replacing it.",
      ], "ladder-schematic"),
      example("Example", [
        "No cooling. 24 V between R and C at the air handler ✔. 24 V at Y at the outdoor unit referenced to C ✔. Measure across the high-pressure switch: 24 V → it's **open**. Now ask **why** it's open: dirty condenser? Failed condenser fan? Don't just replace the switch.",
      ]),
      ask(
        order("l4q-method", "Put the troubleshooting steps in order.", ["Verify supply voltage at the source", "Check whether the load is receiving its signal", "Trace voltage to find where it stops", "Lock out and confirm the faulty part with an ohms test", "Repair and verify operation"], "Supply → signal → trace → confirm de-energized → repair → verify.", { skills: ["electrical", "troubleshooting"] }),
      ),
      ask(
        multi(
          "l4q-why-hps",
          "The high-pressure switch keeps opening. What should you investigate? (Select all.)",
          [["a", "Dirty condenser coil"], ["b", "Condenser fan not running"], ["c", "Overcharge or non-condensables"], ["d", "Jumpering out the switch to see if it runs", "Never bypass a safety."]],
          ["a", "b", "c"],
          "A high-pressure switch opens because head pressure is high. Find the cause of high head pressure.",
          { skills: ["electrical", "troubleshooting", "safety"], difficulty: 2 },
        ),
      ),
      widget("Practice: Electrical Detective", "multimeter-trainer", "Use the meter to find where the circuit is open."),
    ],
    sources: [{ id: "nate-ka" }, { id: "nfpa-70e" }],
    revised: R,
  }),
];
