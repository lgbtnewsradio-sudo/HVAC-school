import { ask, concept, example, lesson, match, multi, numeric, order, safety, single, tf, widget } from "./dsl";

const RF = { skills: ["refrigeration" as const] };
const R = "2026-10-15";

export const LEVEL3 = [
  lesson({
    id: "l3-four-stages",
    levelId: "l3",
    order: 1,
    title: "The Four Stages",
    summary: "Compression → condensation → expansion → evaporation. Watch refrigerant make the loop.",
    minutes: 9,
    objectives: ["Name the four stages in order", "Describe what happens to refrigerant in each", "Identify high side vs low side"],
    skills: ["refrigeration"],
    steps: [
      concept("One loop, four jobs", [
        "**1. Compression** — The compressor squeezes low-pressure vapor into **hot, high-pressure vapor**.",
        "**2. Condensation** — In the outdoor coil, the vapor gives off heat and **condenses into a high-pressure liquid**.",
        "**3. Expansion** — The metering device drops the pressure; some liquid flashes to vapor and the mixture gets **very cold**.",
        "**4. Evaporation** — In the indoor coil, the cold liquid **boils**, absorbing heat from house air, and leaves as low-pressure vapor. Back to the compressor.",
      ], "refrigeration-cycle"),
      widget("Watch the cycle", "cycle-explorer", "Press play. Tap any component to pause and see the refrigerant's state there."),
      ask(
        order("l3q-cycle-order", "Starting at the compressor, put the refrigeration cycle in order.", ["Compression", "Condensation", "Expansion (metering device)", "Evaporation"], "Compressor → condenser → metering device → evaporator → back to compressor.", RF),
      ),
      concept("High side and low side", [
        "From the compressor outlet to the metering device is the **high side** — high pressure, high condensing temperature.",
        "From the metering device outlet back to the compressor inlet is the **low side** — low pressure, low boiling temperature.",
        "The compressor and metering device are the two dividing points.",
      ], "refrigeration-cycle"),
      ask(
        multi(
          "l3q-high-side",
          "Which parts are on the HIGH side of a cooling system? (Select all.)",
          [
            ["a", "Condenser coil"],
            ["b", "Liquid line"],
            ["c", "Discharge line"],
            ["d", "Evaporator coil", "Low side."],
            ["e", "Suction line", "Low side."],
          ],
          ["a", "b", "c"],
          "Discharge line, condenser and liquid line are high side. Evaporator and suction line are low side.",
          RF,
        ),
      ),
      ask(
        single(
          "l3q-where-heat-absorbed",
          "Where does the refrigerant absorb heat from the house?",
          [
            ["a", "In the condenser"],
            ["b", "In the evaporator", "Correct."],
            ["c", "In the compressor"],
          ],
          "b",
          "The evaporator absorbs heat as refrigerant boils. The condenser rejects that heat (plus the heat of compression) outdoors.",
          RF,
        ),
      ),
    ],
    sources: [{ id: "esco-608" }, { id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l3-states-flow",
    levelId: "l3",
    order: 2,
    title: "Refrigerant States & Flow",
    summary: "Vapor, liquid, or a mix? Know the refrigerant's state at every point.",
    minutes: 8,
    objectives: ["State refrigerant condition at each point", "Explain flash gas", "Recognize common refrigerants"],
    skills: ["refrigeration"],
    steps: [
      concept("State at each point", [
        "**Suction line** (into compressor): low-pressure, slightly superheated **vapor**.",
        "**Discharge line**: high-pressure, very hot superheated **vapor**.",
        "**Middle of condenser**: saturated **mix** of vapor and liquid.",
        "**Liquid line**: high-pressure, subcooled **liquid**.",
        "**Leaving metering device**: low-pressure **mix**, mostly liquid with some 'flash gas'.",
        "**Middle of evaporator**: saturated boiling **mix**.",
      ], "refrigeration-cycle"),
      ask(
        match(
          "l3q-state-match",
          "Match each location to the refrigerant's state.",
          [
            ["Discharge line", "Hot, high-pressure superheated vapor"],
            ["Liquid line", "High-pressure subcooled liquid"],
            ["Evaporator outlet / suction line", "Low-pressure superheated vapor"],
            ["Evaporator inlet", "Low-pressure liquid/vapor mix"],
          ],
          "Following the state changes is the foundation of all refrigerant diagnostics.",
          RF,
        ),
      ),
      concept("Common refrigerants", [
        "**R-22** (HCFC) — older systems; production and import for servicing ended in the US in 2020, so only recovered/reclaimed or stockpiled supply remains.",
        "**R-410A** (HFC) — the standard for most systems installed roughly 2010–2024.",
        "**R-454B** and **R-32** — lower-GWP **A2L** (mildly flammable) refrigerants used in new equipment under the EPA's AIM Act transition. They require A2L-rated tools and procedures.",
        "Never mix refrigerants, and only use the refrigerant listed on the nameplate.",
      ], undefined, ["Refrigerant", "A2L"]),
      ask(tf("l3q-mix-refrig", "True or false: It's acceptable to top off an R-410A system with a different refrigerant if R-410A is unavailable.", false, "Use only the refrigerant on the nameplate (or a manufacturer-approved replacement after proper conversion procedures). Mixing refrigerants creates unknown blends and contaminates recovery supplies.", RF)),
      ask(
        single(
          "l3q-a2l",
          "R-454B and R-32 are classified A2L. What does that mean?",
          [
            ["a", "Highly toxic and highly flammable"],
            ["b", "Lower toxicity and lower (mild) flammability", "Correct."],
            ["c", "Non-flammable"],
          ],
          "b",
          "ASHRAE 34 class A = lower toxicity; 2L = lower flammability. A2L systems need specific handling, leak detection and tools.",
          { skills: ["refrigeration", "safety"] },
        ),
      ),
    ],
    sources: [{ id: "epa-aim" }, { id: "ashrae-15-34" }, { id: "epa-608" }],
    revised: R,
  }),

  lesson({
    id: "l3-saturation-pt",
    levelId: "l3",
    order: 3,
    title: "Saturation & the PT Chart",
    summary: "When liquid and vapor coexist, pressure tells you temperature. Learn to read a PT chart.",
    minutes: 10,
    objectives: ["Define saturation", "Use a PT chart to find saturation temperature", "Explain why gauges 'read temperature'"],
    skills: ["refrigeration"],
    steps: [
      concept("Saturation: locked together", [
        "When refrigerant is boiling or condensing — liquid and vapor present together — it's **saturated**. At saturation, **each pressure corresponds to exactly one temperature**.",
        "That's why a tech can read a gauge and know the evaporator's boiling temperature without a thermometer. Digital gauges do the PT lookup for you.",
      ], "pt-relationship", ["Saturation", "PT chart"]),
      example("Real numbers (R-410A, approximate)", [
        "118 psig ≈ **40 °F** saturation. 130 psig ≈ 45 °F.",
        "317 psig ≈ **100 °F**. 365 psig ≈ **110 °F**. 418 psig ≈ 120 °F.",
        "Always use the PT chart for the exact refrigerant — R-22 at 68.5 psig is 40 °F, very different from R-410A.",
      ]),
      widget("PT chart calculator", "pt-calculator", "Pick a refrigerant and drag the pressure. See the saturation temperature."),
      ask(numeric("l3q-pt-410", "Using R-410A, what is the saturation temperature at about 118 psig?", 40, 1, "°F", "On an R-410A PT chart, 118 psig ≈ 40 °F.", RF)),
      ask(
        single(
          "l3q-standing",
          "An R-410A system has been off for hours on an 80 °F day. With the system fully off and refrigerant settled, the pressure will be close to…",
          [
            ["a", "The saturation pressure for 80 °F (about 236 psig)", "Right — 'standing pressure' tracks the ambient temperature."],
            ["b", "0 psig"],
            ["c", "118 psig"],
          ],
          "a",
          "With liquid and vapor present at equilibrium, pressure equals the saturation pressure at the surrounding temperature. Standing pressure alone does NOT tell you the charge is correct.",
          RF,
        ),
      ),
      ask(tf("l3q-pt-superheated", "True or false: A PT chart gives the actual temperature of superheated vapor in the suction line.", false, "The PT chart gives saturation temperature only. Actual vapor temperature must be measured with a thermometer — the difference is superheat.", RF)),
    ],
    sources: [{ id: "ashrae-fund", note: "Thermodynamic properties; values rounded" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l3-superheat",
    levelId: "l3",
    order: 4,
    title: "Superheat",
    summary: "How much the vapor warmed after boiling off — your window into the evaporator.",
    minutes: 10,
    objectives: ["Define and calculate superheat", "Explain what high and low superheat suggest", "Know where to measure"],
    skills: ["refrigeration", "troubleshooting"],
    steps: [
      concept("What superheat tells you", [
        "**Superheat = suction line temperature − evaporator saturation temperature.**",
        "Measure suction pressure (convert to saturation temp with the PT chart) and suction line temperature near the outdoor service valve or at the evaporator outlet, per the manufacturer's procedure.",
        "Superheat proves the refrigerant **finished boiling** before leaving the coil — protecting the compressor from liquid.",
      ], "superheat-subcooling", ["Superheat"]),
      example("Work it out", ["Suction pressure 118 psig (R-410A) → 40 °F saturation. Suction line thermometer reads 50 °F. **Superheat = 50 − 40 = 10 °F.**"]),
      ask(numeric("l3q-sh-calc", "R-410A suction pressure is 130 psig (≈45 °F saturation). Suction line temperature is 57 °F. What is the superheat?", 12, 0, "°F", "57 − 45 = 12 °F of superheat.", RF)),
      concept("High vs low superheat", [
        "**High superheat** → the evaporator is **starved**: too little refrigerant feeding it (low charge, restriction, underfeeding metering device), or a very high heat load.",
        "**Low superheat** → the evaporator is **flooded**: too much refrigerant, or **too little heat** reaching it (low airflow, dirty filter, iced coil). Very low superheat risks liquid floodback.",
        "**Fixed-orifice** systems are charged to a **target superheat** from the manufacturer's chart (based on indoor wet bulb and outdoor dry bulb). **TXV/EEV** systems control superheat themselves, so they're charged by **subcooling**.",
      ]),
      ask(
        single(
          "l3q-sh-high",
          "Superheat is 28 °F on a fixed-orifice system where the target is about 10 °F. Which is a likely cause?",
          [
            ["a", "Overcharge", "Overcharge usually lowers superheat."],
            ["b", "Low refrigerant charge (undercharge)", "Yes — a starved evaporator."],
            ["c", "Dirty air filter", "Low airflow typically lowers superheat."],
          ],
          "b",
          "High superheat means the coil isn't getting enough refrigerant — undercharge or a restriction. Confirm with subcooling, pressures and a leak search before adding anything.",
          { skills: ["refrigeration", "troubleshooting"] },
        ),
      ),
      ask(
        single(
          "l3q-sh-low",
          "Superheat is near 0 °F and the suction line is sweating all the way to the compressor. The filter is completely clogged. What's happening?",
          [
            ["a", "Refrigerant isn't fully boiling because too little heat (airflow) reaches the coil", "Correct — liquid may be getting to the compressor."],
            ["b", "The system is undercharged"],
            ["c", "The condenser is dirty"],
          ],
          "a",
          "Low airflow means the coil can't pick up enough heat to boil all the refrigerant. Fix airflow first, then re-check charge.",
          { skills: ["refrigeration", "airflow"] },
        ),
      ),
      widget("Practice superheat", "pt-calculator", "Enter suction pressure and line temperature to compute superheat."),
    ],
    sources: [{ id: "mfr-iom", note: "Target superheat charts are model-specific" }, { id: "esco-608" }],
    revised: R,
    scope: "general",
  }),

  lesson({
    id: "l3-subcooling",
    levelId: "l3",
    order: 5,
    title: "Subcooling",
    summary: "How much the liquid cooled after condensing — your window into the condenser and charge.",
    minutes: 9,
    objectives: ["Define and calculate subcooling", "Interpret high and low subcooling", "Know when subcooling is the charging method"],
    skills: ["refrigeration", "troubleshooting"],
    steps: [
      concept("What subcooling tells you", [
        "**Subcooling = condenser saturation temperature − liquid line temperature.**",
        "Measure liquid line pressure (convert with the PT chart) and liquid line temperature near the liquid service valve.",
        "Subcooling shows how much liquid is 'stacked up' in the condenser. It's the primary charging check for **TXV and EEV** systems — targets are on the nameplate or in the installation instructions (often around 8–12 °F, but **always use the manufacturer's value**).",
      ], "superheat-subcooling", ["Subcooling"]),
      ask(numeric("l3q-sc-calc", "R-410A liquid pressure is 365 psig (≈110 °F saturation). Liquid line temperature is 99 °F. What is the subcooling?", 11, 0, "°F", "110 − 99 = 11 °F of subcooling.", RF)),
      concept("High vs low subcooling", [
        "**Low subcooling** → not enough liquid in the condenser: often **undercharge**.",
        "**High subcooling** → liquid backing up in the condenser: **overcharge**, or a **restriction** downstream (e.g., plugged filter drier or metering device) holding refrigerant back.",
        "Read superheat and subcooling **together**: undercharge = high SH + low SC; restriction = high SH + high SC; overcharge = low SH + high SC.",
      ]),
      ask(
        match(
          "l3q-shsc-match",
          "Match the pattern to the most likely problem.",
          [
            ["High superheat + low subcooling", "Undercharge"],
            ["High superheat + high subcooling", "Restriction in the liquid line / metering device"],
            ["Low superheat + high subcooling", "Overcharge"],
          ],
          "These patterns are a starting point for diagnosis — confirm with airflow checks, pressures, temperature drops across components, and manufacturer data.",
          { skills: ["refrigeration", "troubleshooting"], difficulty: 2 },
        ),
      ),
      ask(tf("l3q-txv-charge", "True or false: TXV systems are generally charged using subcooling.", true, "A TXV holds superheat roughly constant, so superheat doesn't reveal charge well. Subcooling (to the manufacturer target) is used.", RF)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l3-charging",
    levelId: "l3",
    order: 6,
    title: "Charging Fundamentals",
    summary: "Airflow first, then charge — and always by the manufacturer's method. Plus EPA rules.",
    minutes: 10,
    objectives: ["List prerequisites before checking charge", "Describe weigh-in, superheat and subcooling methods", "State the venting prohibition"],
    skills: ["refrigeration", "safety"],
    steps: [
      concept("Before you touch the charge", [
        "Charge readings are only meaningful when the **airflow is right** (clean filter, clean coils, correct blower speed) and the system has run long enough to **stabilize** (commonly 10–15 minutes).",
        "Many 'low charge' calls are really airflow problems. Fix airflow first.",
      ]),
      concept("Charging methods", [
        "**Weigh-in** — after a repair or new install, evacuate, then weigh in the factory charge plus any adjustment for line-set length per the instructions. Most accurate starting point.",
        "**Superheat method** — fixed-orifice systems, using the manufacturer's target superheat chart.",
        "**Subcooling method** — TXV/EEV systems, using the manufacturer's target subcooling.",
        "Blend refrigerants like R-410A and R-454B are charged as **liquid** from the cylinder (metered into the suction side carefully so liquid doesn't reach the compressor), so the blend composition stays correct.",
      ]),
      safety("Refrigerant handling & the law", [
        "Under **Clean Air Act Section 608**, it's **illegal to knowingly vent** ozone-depleting refrigerants and their substitutes (like R-410A) during maintenance, service, repair or disposal. Recover it into approved cylinders.",
        "Only **EPA 608–certified** technicians may open systems and purchase most refrigerants.",
        "Wear safety glasses and gloves: liquid refrigerant can cause frostbite. Don't charge a leaking system repeatedly — find and fix the leak.",
      ]),
      ask(
        order("l3q-charge-order", "Put these steps in the correct order for verifying charge on an operating system.", ["Verify clean filter, coils and correct airflow", "Run the system until it stabilizes", "Measure pressures and line temperatures", "Compare superheat/subcooling to manufacturer targets"], "Airflow first, stabilize, measure, compare to the manufacturer's targets.", { skills: ["refrigeration"] }),
      ),
      ask(
        single(
          "l3q-blend-charge",
          "How should a zeotropic blend such as R-410A be removed from the cylinder when charging?",
          [
            ["a", "As vapor only"],
            ["b", "As liquid, metered carefully into the system", "Correct."],
            ["c", "It doesn't matter"],
          ],
          "b",
          "Blends can fractionate (separate) if drawn as vapor. Draw liquid and meter it in so liquid doesn't slug the compressor.",
          RF,
        ),
      ),
      ask(tf("l3q-venting", "True or false: Venting R-410A to the atmosphere during service is allowed because it doesn't deplete ozone.", false, "Section 608 prohibits knowingly venting substitute refrigerants like HFCs during service, maintenance, repair and disposal (with narrow de minimis exceptions).", { skills: ["refrigeration", "safety"] })),
    ],
    sources: [{ id: "epa-608" }, { id: "mfr-iom" }, { id: "esco-608" }],
    revised: R,
  }),
];
