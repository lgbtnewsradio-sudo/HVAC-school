import { ask, concept, example, lesson, match, multi, numeric, order, single, tf, widget } from "./dsl";

const A = { skills: ["airflow" as const] };
const R = "2026-10-15";

export const LEVEL5 = [
  lesson({
    id: "l5-cfm-velocity",
    levelId: "l5",
    order: 1,
    title: "CFM, Velocity & Area",
    summary: "CFM = feet per minute × square feet. The most useful airflow formula you'll learn.",
    minutes: 9,
    objectives: ["Calculate CFM from velocity and area", "Convert duct dimensions to square feet", "Know typical airflow targets"],
    skills: ["airflow"],
    steps: [
      concept("The airflow formula", [
        "**CFM = velocity (FPM) × area (ft²)**.",
        "Duct area in square feet: for a rectangle, **width × height in inches ÷ 144**. For a round duct, **π × r² ÷ 144** (r in inches).",
        "Velocity is measured with an anemometer or derived from velocity pressure; area must be the actual free area.",
      ], undefined, ["CFM"]),
      widget("Airflow calculator", "airflow-calc", "Change the duct size and velocity to see CFM."),
      ask(numeric("l5q-cfm-rect", "A 12 × 8 inch duct has an average velocity of 600 FPM. What is the airflow in CFM?", 400, 1, "CFM", "Area = 12 × 8 ÷ 144 = 0.667 ft². CFM = 600 × 0.667 ≈ 400 CFM.", A)),
      ask(numeric("l5q-cfm-ton", "A 3-ton system at a 400 CFM/ton target needs how much airflow?", 1200, 0, "CFM", "3 × 400 = 1,200 CFM. Use the manufacturer's blower tables for the actual setting.", A)),
      concept("Velocity matters too", [
        "Too much velocity at registers causes **noise and drafts**. Too little and air doesn't mix well (stratification).",
        "Duct systems are designed (ACCA Manual D) to deliver the right CFM to each room at an acceptable friction rate and velocity.",
      ]),
    ],
    sources: [{ id: "acca-d" }, { id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l5-static-pressure",
    levelId: "l5",
    order: 2,
    title: "Static Pressure: The Duct's Blood Pressure",
    summary: "Measure total external static pressure and compare it to the blower's rating.",
    minutes: 10,
    objectives: ["Define static pressure and TESP", "Measure TESP correctly", "Interpret high static"],
    skills: ["airflow", "troubleshooting"],
    steps: [
      concept("What static pressure is", [
        "**Static pressure** is the pressure air exerts on the duct walls, measured in **inches of water column (in. w.c.)** with a manometer.",
        "**Total external static pressure (TESP)** is the resistance the blower sees from everything outside the cabinet: ducts, filter, coil (if external), registers.",
        "Many residential air handlers and furnaces are rated for about **0.5 in. w.c.** TESP — check the nameplate and blower tables.",
      ], "static-pressure", ["Static pressure", "Inches of water column"]),
      concept("How to measure TESP", [
        "Measure **return static** (negative) between the filter/return and the blower, and **supply static** (positive) after the blower/coil, per the manufacturer's test locations.",
        "**TESP = supply static + the absolute value of return static.** E.g., +0.30 and −0.40 → TESP = 0.70 in. w.c.",
      ], "static-pressure"),
      ask(numeric("l5q-tesp", "Supply static is +0.35 in. w.c. and return static is −0.45 in. w.c. What is the TESP?", 0.8, 0.01, "in. w.c.", "TESP = 0.35 + 0.45 = 0.80 in. w.c. — well above a typical 0.5 rating.", A)),
      widget("Static pressure explorer", "static-explorer", "Swap filters, close registers and change duct sizes to see what happens to static and airflow."),
      ask(
        single(
          "l5q-high-static",
          "TESP is 0.95 in. w.c. on a furnace rated 0.5 in. w.c. What does that most likely mean?",
          [["a", "Airflow is likely below design — restrictive ducts, filter or coil", "Correct."], ["b", "Airflow is perfect"], ["c", "The furnace is undersized"]],
          "a",
          "High static means the blower is fighting resistance, so it moves less air (PSC) or works harder and louder (ECM). Look at filters, coil, undersized returns and ductwork.",
          { skills: ["airflow", "troubleshooting"] },
        ),
      ),
      ask(tf("l5q-ecm-static", "True or false: An ECM blower can maintain its airflow against any amount of static pressure.", false, "ECMs compensate within limits, but high static raises watt draw and noise, and beyond the motor's range airflow still drops.", A)),
    ],
    sources: [{ id: "acca-qi" }, { id: "mfr-iom" }, { id: "acca-d" }],
    revised: R,
  }),

  lesson({
    id: "l5-distribution",
    levelId: "l5",
    order: 3,
    title: "Supply, Return, Registers & Dampers",
    summary: "How air gets to rooms and back again — and why returns matter as much as supplies.",
    minutes: 8,
    objectives: ["Distinguish supply and return", "Tell registers from grilles", "Use dampers for balancing"],
    skills: ["airflow"],
    steps: [
      concept("The loop", [
        "**Supply** ducts deliver conditioned air to rooms. **Return** ducts bring room air back to the equipment.",
        "Every CFM supplied must come back. Rooms with doors closed and no return path become pressurized and get less airflow.",
      ], "house-airflow", ["Supply air", "Return air"]),
      concept("Registers, grilles & dampers", [
        "A **register** is a supply outlet with a built-in damper. A **grille** has no damper (typical on returns).",
        "**Balancing dampers** in branch ducts let a tech adjust airflow to each room. Use them for balancing — not as on/off switches.",
      ], undefined, ["Register", "Grille", "Damper"]),
      ask(match("l5q-dist-match", "Match each term.", [["Register", "Supply outlet with a damper"], ["Grille", "Opening cover with no damper"], ["Balancing damper", "Adjusts airflow in a branch duct"], ["Plenum", "Box-like duct attached to the equipment"]], "Knowing these parts helps you diagnose room-by-room comfort complaints.", A)),
      ask(
        single(
          "l5q-close-vents",
          "A homeowner closed half the supply registers to 'save energy'. What's the likely effect?",
          [["a", "Lower energy bills with no downside"], ["b", "Higher static pressure, reduced total airflow, possible coil freezing or limit trips", "Correct."], ["c", "More airflow to every room"]],
          "b",
          "Closing registers adds restriction. Total airflow falls and static rises, which can freeze the evaporator or overheat a furnace.",
          A,
        ),
      ),
    ],
    sources: [{ id: "acca-d" }, { id: "energy-star" }],
    revised: R,
  }),

  lesson({
    id: "l5-ducts-leakage",
    levelId: "l5",
    order: 4,
    title: "Duct Sizing & Leakage",
    summary: "Undersized and leaky ducts are the hidden cause of many comfort complaints.",
    minutes: 9,
    objectives: ["Explain why duct size matters", "Describe duct leakage effects", "Know approved sealing methods"],
    skills: ["airflow", "installation"],
    steps: [
      concept("Size matters", [
        "Ducts are sized (ACCA **Manual D**) for the airflow each room needs at the available static pressure. Undersized ducts — especially **returns** — are one of the most common reasons for high static and low airflow.",
        "Flex duct must be pulled tight and supported; kinks and sags add large amounts of resistance.",
      ]),
      concept("Leakage", [
        "Leaky **supply** ducts in an attic dump conditioned air outside the living space. Leaky **returns** can pull in hot, humid, dusty (or even combustion-contaminated) air.",
        "Seal joints with **mastic** or UL 181–listed tapes. Ordinary cloth 'duct tape' fails quickly on ducts.",
        "Duct leakage can be measured with a duct-pressurization test (per local code/program requirements).",
      ], "house-airflow", ["Plenum"]),
      ask(
        multi(
          "l5q-leak-effects",
          "Leaky return ducts in a hot attic can cause which problems? (Select all.)",
          [["a", "Higher return air temperature and humidity"], ["b", "Reduced capacity and comfort"], ["c", "Pulling dust or pollutants into the system"], ["d", "Lower electric bills", "Leaks waste energy."]],
          ["a", "b", "c"],
          "Return leaks draw unconditioned attic air into the system, raising the load and contaminating indoor air.",
          A,
        ),
      ),
      ask(tf("l5q-mastic", "True or false: Mastic or UL 181–listed tape are appropriate for sealing duct joints.", true, "These are rated for duct sealing. Generic cloth duct tape is not a durable duct seal.", A)),
    ],
    sources: [{ id: "acca-d" }, { id: "energy-star" }, { id: "acca-qi" }],
    revised: R,
  }),

  lesson({
    id: "l5-filters-blower",
    levelId: "l5",
    order: 5,
    title: "Filters, Blower Speed & Heat Math",
    summary: "Filter pressure drop, blower taps, and the 1.08 sensible heat formula.",
    minutes: 10,
    objectives: ["Explain filter pressure drop", "Adjust blower speed appropriately", "Use the sensible heat formula"],
    skills: ["airflow"],
    steps: [
      concept("Filters", [
        "Higher-efficiency filters (higher MERV) can catch smaller particles but may add more restriction. A filter's **pressure drop** grows as it loads with dirt.",
        "Measure across the filter with a manometer; compare to the filter manufacturer's data. Bigger filter area (e.g., a 4-inch media cabinet) reduces restriction.",
      ]),
      concept("Blower speed", [
        "**PSC** blowers use speed taps (low, med, high). **ECM** blowers are programmed with taps or settings for target CFM.",
        "Set airflow from the manufacturer's blower table at the measured static pressure. Cooling usually needs more airflow than gas heat; humid climates may use lower airflow for dehumidification.",
      ]),
      concept("Sensible heat formula", [
        "**BTU/h (sensible) = 1.08 × CFM × ΔT** (standard air). Rearranged: **CFM = BTU/h ÷ (1.08 × ΔT)**.",
        "Techs use it to estimate furnace airflow from the temperature rise and the furnace's output.",
      ]),
      ask(numeric("l5q-sensible", "A furnace delivers 64,800 BTU/h of output heat with a 50 °F temperature rise. Estimate the airflow in CFM.", 1200, 10, "CFM", "CFM = 64,800 ÷ (1.08 × 50) = 64,800 ÷ 54 = 1,200 CFM.", { skills: ["airflow", "heating"], difficulty: 2 })),
      ask(
        single("l5q-temp-rise", "A gas furnace's nameplate temperature-rise range is 35–65 °F. You measure 78 °F. What's the likely issue?", [["a", "Too much airflow"], ["b", "Too little airflow", "Correct."], ["c", "Normal operation"]], "b", "A rise above the nameplate range means not enough air is carrying heat away — check filter, blower speed, and ducts. High rise can trip limits and stress the heat exchanger.", { skills: ["airflow", "heating"] }),
      ),
    ],
    sources: [{ id: "ashrae-fund" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l5-airflow-problems",
    levelId: "l5",
    order: 6,
    title: "Diagnosing Airflow Problems",
    summary: "A house walk-through: find restrictions, imbalance and leaks.",
    minutes: 10,
    objectives: ["Diagnose common airflow problems", "Use static readings to locate restrictions", "Balance a simple system"],
    skills: ["airflow", "troubleshooting"],
    steps: [
      concept("Common culprits", [
        "Dirty filters • dirty evaporator coils • undersized/crushed returns • closed or blocked registers • disconnected ducts in attics/crawlspaces • wrong blower speed • failing blower motor or capacitor • dirty blower wheel.",
      ]),
      widget("House airflow simulator", "static-explorer", "Diagnose which restriction is causing the bedroom to be hot."),
      ask(
        single(
          "l5q-drop-location",
          "Return static −0.15 before the filter, −0.55 after the filter (at the blower). What does the 0.40 in. w.c. drop indicate?",
          [["a", "The filter is very restrictive (dirty or too small/high-MERV)", "Correct."], ["b", "The supply ducts are undersized"], ["c", "Normal for every filter"]],
          "a",
          "Pressure drop across a component shows its restriction. A 0.40 in. drop across a filter is high; many filters are selected for ~0.1–0.2 in. w.c. clean.",
          { skills: ["airflow", "troubleshooting"], difficulty: 2 },
        ),
      ),
      ask(
        order("l5q-balance-order", "Order the steps to balance airflow to rooms.", ["Verify total system airflow and static pressure", "Measure airflow at each register", "Compare to design CFM for each room", "Adjust branch balancing dampers", "Re-measure and record"], "Total airflow first, then room-by-room measurement and adjustment.", A),
      ),
      example("On the job", ["Upstairs bedroom is 6 °F warmer. Static is fine. In the attic you find the branch duct disconnected and blowing into the insulation. Reconnect, seal with mastic, support it — problem solved."]),
    ],
    sources: [{ id: "acca-qi" }, { id: "acca-d" }],
    revised: R,
  }),
];
