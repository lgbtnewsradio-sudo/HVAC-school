import { ask, concept, example, lesson, match, multi, order, safety, single, tf, widget } from "./dsl";

const I = { skills: ["installation" as const] };
const IS = { skills: ["installation" as const, "safety" as const] };
const R = "2026-10-15";

const CODE_NOTE =
  "Real installations must follow the manufacturer's installation instructions, the codes adopted where you work (mechanical, electrical, fuel gas, refrigerant safety), and local permitting and inspection requirements.";

export const LEVEL7 = [
  lesson({
    id: "l7-evaluation-sizing",
    levelId: "l7",
    order: 1,
    title: "Jobsite Evaluation & Sizing",
    summary: "Load calcs (Manual J), equipment selection (Manual S), and what to inspect before you quote.",
    minutes: 10,
    objectives: ["List jobsite evaluation items", "Explain Manual J and Manual S", "Know why matched systems matter"],
    skills: ["installation", "professional"],
    steps: [
      concept("Walk the job first", [
        "Check: existing ductwork condition and size • electrical service and circuit capacity • indoor/outdoor locations and clearances • condensate disposal • venting (for furnaces) • access for service • local code/permit requirements.",
        CODE_NOTE,
      ]),
      concept("Load calculation & selection", [
        "**ACCA Manual J** estimates each room's heat gain and loss from construction, windows, orientation, insulation, infiltration and local design temperatures.",
        "**ACCA Manual S** uses that load and the manufacturer's expanded performance data to select equipment with the right sensible and latent capacity.",
        "**Manual D** then designs or verifies the ducts. Rules of thumb like '500 sq ft per ton' are not a substitute.",
      ], undefined, ["Load calculation"]),
      concept("Matched systems", ["Indoor coil, outdoor unit and furnace/air handler should be a **rated, matched combination** (check the manufacturer's data or the AHRI directory). Mismatches can miss efficiency ratings and void warranties."]),
      ask(match("l7q-manuals", "Match the ACCA manual to its purpose.", [["Manual J", "Load calculation"], ["Manual S", "Equipment selection"], ["Manual D", "Duct design"]], "J → S → D: calculate the load, select equipment, design the ducts.", I)),
      ask(
        multi("l7q-eval", "What should be evaluated before quoting a replacement? (Select all.)", [["a", "Ductwork size and condition"], ["b", "Electrical supply and breaker/wire sizing"], ["c", "Condensate disposal path"], ["d", "Local permit requirements"], ["e", "Only the old unit's tonnage", "The old size may have been wrong."]], ["a", "b", "c", "d"], "A good evaluation prevents surprises and call-backs.", I),
      ),
    ],
    sources: [{ id: "acca-j" }, { id: "acca-s" }, { id: "acca-d" }, { id: "acca-qi" }],
    revised: R,
  }),

  lesson({
    id: "l7-placement-lineset",
    levelId: "l7",
    order: 2,
    title: "Placement & Line Sets",
    summary: "Pads, clearances, line set sizing and routing — the first things inspectors look at.",
    minutes: 10,
    objectives: ["Place indoor and outdoor units correctly", "Size and route a line set", "Avoid common placement mistakes"],
    skills: ["installation"],
    steps: [
      concept("Outdoor unit", [
        "Level pad or approved stand • manufacturer-specified **clearances** for airflow and service • away from dryer vents and roof runoff • a **disconnect within sight** of the unit (per the electrical code).",
        "Heat pumps need elevation above expected snow and a path for defrost water to drain.",
      ]),
      concept("Indoor unit", ["Level (or pitched toward the drain per instructions) • service access • **secondary drain pan** or float switch where required (e.g., attics, above finished ceilings) • proper return air sizing."]),
      concept("Line sets", [
        "Use the line sizes the manufacturer specifies for the length and lift. Long runs may need different sizes, **additional charge**, or oil-return considerations.",
        "Route without kinks, support properly, **insulate the suction line** fully, and protect lines where they pass through walls. Keep ends **capped** until connected to keep moisture and debris out.",
      ], undefined, ["Line set"]),
      ask(
        single("l7q-lineset-size", "Where do you get the correct line set size for a 45-foot run?", [["a", "Same as the old line set, always"], ["b", "The manufacturer's installation instructions for that model, length and lift", "Correct."], ["c", "The biggest copper on the truck"]], "b", "Line sizing affects velocity, oil return and capacity. Follow the manufacturer's table; reusing an old line set requires verifying size, condition and compatibility.", I),
      ),
      ask(tf("l7q-cap-ends", "True or false: Line set ends should stay capped until they're ready to be connected.", true, "Open copper collects moisture and debris that evacuation can't fully remove.", I)),
      widget("Installation inspection", "component-explorer", "Explore a correct installation before you try the Installation Challenge game."),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nec" }, { id: "acca-qi" }],
    revised: R,
    scope: "equipment-specific",
  }),

  lesson({
    id: "l7-brazing",
    levelId: "l7",
    order: 3,
    title: "Brazing & Nitrogen Purging",
    summary: "Clean, fit, flow nitrogen, heat the joint — and keep the fire watch.",
    minutes: 11,
    objectives: ["Prepare a joint for brazing", "Explain why nitrogen flows during brazing", "Apply hot-work fire safety"],
    skills: ["installation", "safety"],
    steps: [
      concept("Why nitrogen?", [
        "Heating copper in air forms **copper oxide scale** inside the pipe. That scale flakes off and can plug metering devices, filter driers and screens.",
        "Flowing a **low flow of dry nitrogen** through the piping while brazing displaces oxygen and prevents the scale. Use a nitrogen **regulator** (and flowmeter) — never connect a nitrogen cylinder without one.",
      ], "brazing-nitrogen", ["Nitrogen purge", "Brazing"]),
      concept("The steps", [
        "Cut square with a tubing cutter → ream/deburr → clean the joint → fit (proper insertion depth) → start nitrogen flow → protect valves and nearby components with heat-sink paste/wet rags → heat evenly → apply filler (e.g., BCuP phosphorus-copper alloys for copper-to-copper) → let cool, then stop nitrogen.",
        "Service valves usually need wet-rag or heat-sink protection — follow the manufacturer's instructions.",
      ]),
      ask(
        order("l7q-braze", "Put the brazing steps in order.", ["Cut and deburr the tubing", "Clean and fit the joint", "Start a low flow of dry nitrogen", "Heat the joint evenly and apply filler", "Allow to cool, then stop nitrogen"], "Prep, purge, braze, cool.", I),
      ),
      safety("Hot-work safety", [
        "Wear safety glasses/shade lenses and gloves. Clear combustibles or shield them. Keep a **fire extinguisher** at hand and maintain a fire watch after brazing. Follow your employer's **hot-work permit** procedure.",
        "**Never** braze on a system that contains refrigerant — recover first. Heated refrigerant can decompose into toxic byproducts, and A2L refrigerants are mildly flammable.",
        "**Never** use oxygen or compressed air to purge or pressurize refrigerant piping.",
      ]),
      ask(
        single("l7q-oxygen", "Which gas is used to purge and pressure test refrigerant piping?", [["a", "Oxygen", "Oxygen with oil can explode."], ["b", "Dry nitrogen", "Correct."], ["c", "Compressed shop air", "Contains moisture and oxygen."]], "b", "Dry nitrogen is inert, dry and safe for this use — always through a regulator.", IS),
      ),
    ],
    sources: [{ id: "osha-hotwork" }, { id: "mfr-iom" }, { id: "acca-qi" }],
    revised: R,
  }),

  lesson({
    id: "l7-pressure-evac",
    levelId: "l7",
    order: 4,
    title: "Pressure Testing & Evacuation",
    summary: "Prove it's tight with nitrogen, then pull a deep vacuum and prove it's dry with a decay test.",
    minutes: 12,
    objectives: ["Pressure test with nitrogen safely", "Evacuate to a micron target", "Interpret a vacuum decay test"],
    skills: ["installation", "refrigeration"],
    steps: [
      concept("Standing pressure test", [
        "Pressurize the line set and indoor coil with dry nitrogen **through a regulator** to the test pressure the **manufacturer specifies** (never above the lowest-rated component). Hold and watch for a drop; soap-bubble the joints.",
        "Temperature changes move pressure a little, so note the ambient temperature.",
      ]),
      concept("Evacuation", [
        "A **vacuum pump** removes air and moisture. A **micron gauge** — not the manifold compound gauge — tells you how deep the vacuum is.",
        "Industry practice targets **500 microns or lower** unless the manufacturer specifies otherwise. Large-diameter hoses and removing Schrader cores (with a core tool) speed it up dramatically.",
      ], "evacuation", ["Evacuation", "Micron gauge"]),
      concept("Decay test", [
        "Isolate the pump and watch the micron gauge:",
        "• **Holds near the target** (small rise that levels off) → tight and dry.",
        "• **Rises and levels off at a higher value** → moisture still boiling off; keep evacuating.",
        "• **Rises steadily without leveling** → a **leak**.",
      ], "evacuation"),
      widget("Evacuation simulator", "evacuation-sim", "Run the pump, isolate it, and read the decay curve."),
      ask(
        match("l7q-decay", "Match the decay-test result to the meaning.", [["Small rise, then stable below the limit", "System is tight and dry"], ["Rises then levels off well above target", "Moisture remains"], ["Climbs steadily toward atmosphere", "Leak"]], "The shape of the curve after isolation tells you what's wrong.", { skills: ["installation", "refrigeration"], difficulty: 2 }),
      ),
      ask(
        single("l7q-micron-gauge", "Why use a micron gauge instead of the manifold low-side gauge to judge evacuation?", [["a", "Manifold gauges can't resolve deep vacuum in microns", "Correct."], ["b", "Micron gauges measure refrigerant charge"], ["c", "It's only for show"]], "a", "A compound gauge's 30 inHg vacuum scale is far too coarse — 500 microns is less than 0.02 inHg away from a perfect vacuum.", I),
      ),
    ],
    sources: [{ id: "mfr-iom" }, { id: "acca-qi" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l7-electrical-condensate",
    levelId: "l7",
    order: 5,
    title: "Electrical, Thermostat & Condensate",
    summary: "Wire size from MCA, breaker from MOCP, thermostat wire done right, drains that never back up.",
    minutes: 10,
    objectives: ["Use MCA and MOCP from the nameplate", "Wire a thermostat correctly", "Install a trapped, sloped condensate drain"],
    skills: ["installation", "electrical"],
    steps: [
      concept("Nameplate electrical data", [
        "**MCA** (minimum circuit ampacity) sizes the **wire**. **MOCP** (maximum overcurrent protection) is the **largest** breaker or fuse allowed. Breaker size must not exceed MOCP.",
        "Install a disconnect per code, use proper whip/conduit, and torque terminals to spec. Electrical work must meet the electrical code and local licensing rules.",
      ], undefined, ["MCA", "MOCP"]),
      ask(
        single("l7q-mocp", "Nameplate: MCA 19.6 A, MOCP 30 A. Which is correct?", [["a", "Install a 40 A breaker for extra headroom", "Exceeds MOCP — not allowed."], ["b", "Size wire for at least 19.6 A and use a breaker no larger than 30 A", "Correct."], ["c", "Size the wire for 30 A minimum"]], "b", "Wire ampacity ≥ MCA; overcurrent device ≤ MOCP. Follow the electrical code for conductor selection.", { skills: ["installation", "electrical"], difficulty: 2 }),
      ),
      concept("Thermostat wiring", ["Run enough conductors for the system (plus spares), land R, C, Y, G, W, O/B per the equipment diagram, and configure the thermostat for the equipment type (heat pump, O vs B, stages, fuel)."], "thermostat-wiring"),
      widget("Wire the thermostat", "thermostat-sim", "Configure a heat pump thermostat and confirm each call works."),
      concept("Condensate", [
        "Slope the drain line toward the drain (commonly at least 1/8 inch per foot — check code/manufacturer) • install a **trap** where the manufacturer requires it (draw-through coils typically need one) • provide a cleanout/vent • add a **float switch** or secondary pan where needed.",
      ], undefined, ["Condensate", "Float switch"]),
      ask(tf("l7q-trap", "True or false: Many draw-through evaporator coils need a trap so the blower doesn't pull air up the drain and stop it from draining.", true, "Negative pressure in the coil box can hold water in the pan without a properly sized trap.", I)),
    ],
    sources: [{ id: "nec" }, { id: "mfr-iom" }, { id: "acca-qi" }],
    revised: R,
  }),

  lesson({
    id: "l7-startup-commissioning",
    levelId: "l7",
    order: 6,
    title: "Startup & Commissioning",
    summary: "Release the charge, verify charge and airflow, test every mode, and document it.",
    minutes: 12,
    objectives: ["Follow a startup checklist", "Verify performance against manufacturer data", "Document the commissioning"],
    skills: ["installation", "refrigeration", "professional"],
    steps: [
      concept("Startup", [
        "After a good evacuation: open service valves per instructions → verify line voltage and control voltage → set blower airflow → start in cooling (or heating) → let it stabilize.",
        "Weigh in any additional charge for line length, then verify with **subcooling (TXV/EEV)** or **superheat (fixed orifice)** per the manufacturer.",
      ]),
      concept("Commissioning checklist", [
        "Measure and record: line voltage, amps vs nameplate, static pressure, airflow, superheat, subcooling, temperature split/rise, gas pressure and combustion (if gas), condensate drainage, safety device operation, thermostat in every mode.",
        "Leave the customer with the documentation, filter info and how to use the thermostat. Register the warranty.",
        CODE_NOTE,
      ], undefined, ["Commissioning"]),
      ask(
        order("l7q-install-flow", "Put these installation phases in order.", ["Load calculation & equipment selection", "Set equipment and run line set", "Braze with nitrogen purge", "Pressure test with nitrogen", "Evacuate and decay test", "Release charge and start up", "Verify charge, airflow and document"], "Every phase proves the one before it.", { skills: ["installation"], difficulty: 2 }),
      ),
      ask(
        multi("l7q-commission", "Which readings belong on a commissioning report? (Select all.)", [["a", "Static pressure and airflow"], ["b", "Superheat and subcooling"], ["c", "Voltage and amperage"], ["d", "Customer's favorite color", "Not quite."]], ["a", "b", "c"], "Documented readings prove the system was installed to specification and give a baseline for future service.", I),
      ),
      example("On the job", ["Six months later, a call-back for weak cooling. Because you recorded 0.52 in. w.c. static and 10 °F subcooling at startup, you see right away that static is now 0.88 — the customer's new filter is the restrictive kind. Documentation pays."]),
    ],
    sources: [{ id: "acca-qi" }, { id: "mfr-iom" }],
    revised: R,
  }),
];
