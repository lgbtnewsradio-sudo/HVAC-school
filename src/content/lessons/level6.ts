import { ask, concept, example, lesson, match, multi, numeric, order, safety, single, tf, widget } from "./dsl";

const H = { skills: ["heating" as const] };
const HS = { skills: ["heating" as const, "safety" as const] };
const R = "2026-10-15";

export const LEVEL6 = [
  lesson({
    id: "l6-combustion",
    levelId: "l6",
    order: 1,
    title: "Gas Furnaces & Combustion Safety",
    summary: "Fuel + oxygen + ignition = heat. Get it wrong and you get carbon monoxide.",
    minutes: 10,
    objectives: ["Describe complete vs incomplete combustion", "Explain CO hazards", "Compare 80% and 90%+ furnaces"],
    skills: ["heating", "safety"],
    steps: [
      concept("Combustion basics", [
        "Gas burns when **fuel, oxygen and an ignition source** come together. Complete combustion of natural gas produces mostly **CO₂, water vapor and heat**.",
        "**Incomplete combustion** — not enough air, dirty burners, flame impingement, poor venting — produces **carbon monoxide (CO)**.",
        "The **heat exchanger** keeps combustion gases separate from house air while transferring heat. The **vent** carries flue gases outside.",
      ], "furnace", ["Heat exchanger", "Carbon monoxide"]),
      safety("Carbon monoxide kills", [
        "CO is **colorless and odorless**. Symptoms of exposure — headache, dizziness, nausea, confusion — are easily mistaken for the flu. High levels can kill quickly.",
        "Homes with fuel-burning appliances should have **working CO alarms**. If you suspect CO, get people out, ventilate, and follow your employer's emergency procedure. Combustion analysis is performed by trained techs with calibrated analyzers.",
      ]),
      concept("80% vs 90%+ furnaces", [
        "**AFUE** is the share of fuel energy delivered as heat over a season.",
        "**~80% AFUE** furnaces vent hot flue gas through a metal flue (often B-vent).",
        "**90%+ condensing** furnaces have a secondary heat exchanger that pulls so much heat out the flue gases condense; they vent through plastic pipe (per manufacturer specs) and need a **condensate drain and trap**.",
      ], undefined, ["AFUE"]),
      ask(
        single("l6q-co", "Which condition is most likely to produce carbon monoxide?", [["a", "Complete combustion with proper air"], ["b", "Incomplete combustion from insufficient combustion air or dirty burners", "Correct."], ["c", "Running the AC"]], "b", "CO is a product of incomplete combustion. Proper combustion air, clean burners, correct gas pressure and venting prevent it.", HS),
      ),
      ask(tf("l6q-condensing", "True or false: 90%+ condensing furnaces need a condensate drain.", true, "The secondary heat exchanger condenses water vapor from flue gas, which must be drained (and may require neutralization per local code).", H)),
      ask(
        multi("l6q-co-symptoms", "Which are common symptoms of CO exposure? (Select all.)", [["a", "Headache"], ["b", "Dizziness"], ["c", "Nausea"], ["d", "Improved energy", "No."]], ["a", "b", "c"], "CO symptoms mimic flu. Multiple occupants feeling better when away from home is a red flag.", HS),
      ),
    ],
    sources: [{ id: "nfpa-54" }, { id: "cpsc-co" }, { id: "doe-efficiency" }],
    revised: R,
  }),

  lesson({
    id: "l6-sequence",
    levelId: "l6",
    order: 2,
    title: "Furnace Sequence of Operation",
    summary: "Call for heat → inducer → pressure switch → ignition → flame proven → blower.",
    minutes: 12,
    objectives: ["Recite a typical induced-draft furnace sequence", "Explain what each step proves", "Use the sequence to troubleshoot"],
    skills: ["heating", "troubleshooting"],
    steps: [
      concept("Typical induced-draft sequence (hot surface ignition)", [
        "1. Thermostat closes **R to W** — call for heat.",
        "2. Board checks that limits are closed and the **pressure switch is open** (proves it isn't stuck closed).",
        "3. **Inducer motor** starts and draws air through the heat exchanger.",
        "4. **Pressure switch closes**, proving draft.",
        "5. **Hot surface igniter** heats (often 15–45 seconds, varies by model).",
        "6. **Gas valve** opens; burners light.",
        "7. **Flame sensor** proves flame within a few seconds or the valve closes.",
        "8. After a delay, the **blower** starts.",
        "9. Call ends: gas valve closes, inducer post-purges, blower runs an off-delay.",
        "Timings and retries vary — always check the board's sequence on the furnace diagram.",
      ], "furnace-sequence", ["Sequence of operation"]),
      widget("Step through the sequence", "furnace-sequence", "Advance the furnace through ignition. Inject faults to see where it stops."),
      ask(
        order("l6q-seq", "Put the furnace ignition sequence in order.", ["Thermostat calls for heat (R–W)", "Inducer motor starts", "Pressure switch closes", "Igniter heats up", "Gas valve opens and burners light", "Flame sensor proves flame", "Blower starts after delay"], "Each step proves a condition before the next one is allowed.", { skills: ["heating"], difficulty: 2 }),
      ),
      ask(
        single("l6q-stop-inducer", "The inducer runs but the igniter never glows. Which part of the sequence is the board most likely waiting on?", [["a", "Pressure switch closing", "Correct — no draft proof, no ignition."], ["b", "Blower delay"], ["c", "Flame sensor"]], "a", "The board must see the pressure switch close before energizing the igniter. Check for blocked vent/intake, a cracked hose, a plugged condensate trap, or a failed switch.", { skills: ["heating", "troubleshooting"] }),
      ),
      example("Reading fault codes", ["Most boards blink an LED code (e.g., '3 flashes = pressure switch'). Count the flashes and look them up on the furnace's label — codes are model-specific. Don't power-cycle before reading it, or the code may clear."]),
    ],
    sources: [{ id: "mfr-iom", note: "Sequence timing is model-specific" }, { id: "nate-ka" }],
    revised: R,
    scope: "general",
  }),

  lesson({
    id: "l6-flame-limits",
    levelId: "l6",
    order: 3,
    title: "Flame Sensors, Igniters & Limits",
    summary: "The three parts behind most no-heat calls.",
    minutes: 10,
    objectives: ["Diagnose a dirty flame sensor", "Test a hot surface igniter", "Explain why limits trip"],
    skills: ["heating", "troubleshooting"],
    steps: [
      concept("Flame sensor", [
        "The flame sensor uses **flame rectification** to pass a small **DC microamp** signal. A sensor coated with oxide gives a weak signal.",
        "Classic symptom: burners **light, then shut off after a few seconds**, retry, and eventually **lock out**.",
        "Check microamps per the manufacturer (acceptable ranges vary by model, often a few µA). Clean the rod gently with fine abrasive pad and check the ground path.",
      ], undefined, ["Flame sensor"]),
      concept("Hot surface igniter", [
        "Ceramic HSIs are fragile and wear out. With power off and the igniter disconnected, measure resistance and compare to the manufacturer's range. **OL** = open (cracked) igniter.",
        "Never touch the element with bare fingers — oils shorten its life.",
      ], undefined, ["Hot surface igniter"]),
      concept("Limit switches", [
        "A **high limit** opens if the heat exchanger area overheats — usually from **low airflow**: dirty filter, blocked returns, failed blower or capacitor, closed registers.",
        "Repeated limit trips stress the heat exchanger. Fix the airflow, don't just replace the switch.",
      ], undefined, ["Limit switch"]),
      ask(
        single("l6q-flame-drop", "Burners light for about 5 seconds then shut off; this repeats 3 times and the board locks out. Most likely cause?", [["a", "Bad igniter", "The burners lit, so ignition worked."], ["b", "Dirty or poorly grounded flame sensor", "Correct."], ["c", "Dirty air filter"]], "b", "Ignition succeeded but flame wasn't proven. A weak flame-sensing signal (dirty rod, bad ground, wrong position) is the classic cause.", { skills: ["heating", "troubleshooting"] }),
      ),
      ask(
        single("l6q-limit", "A furnace trips its high limit on long runs. The filter is caked with dust. What's the first fix?", [["a", "Replace the limit switch"], ["b", "Replace the filter and verify airflow and temperature rise", "Correct."], ["c", "Jumper the limit"]], "b", "The limit is doing its job. Restore airflow and confirm the temperature rise is within the nameplate range.", { skills: ["heating", "airflow", "safety"] }),
      ),
      ask(tf("l6q-hsi-ol", "True or false: A hot surface igniter reading OL on an ohmmeter (power off, disconnected) is open and must be replaced.", true, "OL means no continuity — the element is cracked or burned open.", H)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l6-electric-heat",
    levelId: "l6",
    order: 4,
    title: "Electric Furnaces & Heat Strips",
    summary: "Resistance heat: simple, 100% efficient at the point of use, and power hungry.",
    minutes: 8,
    objectives: ["Explain how heat strips work", "Calculate heat strip output", "Name heat strip safeties"],
    skills: ["heating", "electrical"],
    steps: [
      concept("Resistance heat", [
        "Electric heat strips are nichrome resistance elements. Current through resistance makes heat — every watt becomes about **3.412 BTU/h**.",
        "Strips are staged on by **sequencers or relays** so they don't all hit the electrical service at once. Each strip has **limits** and often a **thermal fuse/link**.",
        "The blower must run with strips on, or limits will trip.",
      ], undefined, ["Watt"]),
      ask(numeric("l6q-kw-btu", "A 10 kW heat kit produces roughly how many BTU/h?", 34120, 200, "BTU/h", "10,000 W × 3.412 ≈ 34,120 BTU/h.", { skills: ["heating", "electrical"] })),
      ask(
        single("l6q-strip-amps", "A 5 kW strip at 240 V draws about how much current?", [["a", "2 A"], ["b", "About 21 A", "5,000 ÷ 240 ≈ 20.8 A."], ["c", "120 A"]], "b", "I = P ÷ V = 5,000 ÷ 240 ≈ 20.8 A.", { skills: ["heating", "electrical"] }),
      ),
      safety("High amperage", ["Heat strips draw high current on 240 V circuits. Lock out the air handler disconnect — and note some air handlers have **two** power supplies (one per heat bank). Verify every circuit is dead."]),
    ],
    sources: [{ id: "nec" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l6-heat-pump",
    levelId: "l6",
    order: 5,
    title: "Heat Pump Heating",
    summary: "Moving heat in from cold air — reversing valves, balance points and auxiliary heat.",
    minutes: 10,
    objectives: ["Explain heat pump heating mode", "Define balance point", "Distinguish auxiliary and emergency heat"],
    skills: ["heating", "refrigeration"],
    steps: [
      concept("Heating mode", [
        "In heating, the reversing valve sends hot discharge gas to the **indoor coil**, which becomes the **condenser** (releasing heat indoors). The **outdoor coil** becomes the **evaporator**, absorbing heat from outdoor air.",
        "Even at 20 °F, outdoor air contains heat the refrigerant can absorb, because the refrigerant boils colder than the air.",
      ], "heat-pump"),
      ask(
        single("l6q-hp-condenser", "In heating mode, which coil acts as the condenser?", [["a", "The outdoor coil"], ["b", "The indoor coil", "Correct."], ["c", "Neither"]], "b", "The indoor coil releases heat into the house in heating — that's the condenser's job.", H),
      ),
      concept("Balance point & aux heat", [
        "As it gets colder, a heat pump's capacity drops while the house's heat loss rises. The **balance point** is the outdoor temperature where they're equal.",
        "Below it, **auxiliary heat** (usually electric strips, or a furnace in dual-fuel systems) makes up the difference automatically.",
        "**Emergency heat** is a thermostat mode that **locks out the heat pump** and uses only backup heat — for when the heat pump has failed.",
        "Cold-climate heat pumps maintain much more capacity at low temperatures — check the manufacturer's extended performance data.",
      ], undefined, ["Auxiliary heat", "Emergency heat"]),
      ask(match("l6q-aux-em", "Match the term.", [["Auxiliary heat", "Backup heat that runs along with the heat pump when needed"], ["Emergency heat", "Manual mode: backup heat only, compressor locked out"], ["Balance point", "Outdoor temperature where heat pump capacity equals house heat loss"]], "Understanding these explains many 'my bill is high' and 'aux heat is on' questions.", H)),
      ask(tf("l6q-hp-warm-air", "True or false: Heat pump supply air often feels cooler than a gas furnace's, even when the heat pump is working correctly.", true, "Heat pumps commonly deliver supply air in the 90s °F, versus 120 °F+ from a gas furnace. Customer education helps.", H)),
    ],
    sources: [{ id: "energy-star" }, { id: "doe-efficiency" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l6-defrost",
    levelId: "l6",
    order: 6,
    title: "Defrost Cycles",
    summary: "Why heat pumps steam in winter, and what a normal defrost looks like.",
    minutes: 9,
    objectives: ["Explain why frost forms", "Describe a typical defrost sequence", "Recognize defrost problems"],
    skills: ["heating", "troubleshooting"],
    steps: [
      concept("Why frost forms", [
        "In heating, the outdoor coil runs **below freezing** in cool, damp weather. Moisture from the air freezes on it and blocks airflow.",
      ], "defrost"),
      concept("Typical defrost sequence", [
        "The defrost control (time/temperature or demand-based) decides a defrost is needed, often using a **coil temperature sensor** plus run-time.",
        "During defrost: the **reversing valve shifts to cooling**, the **outdoor fan stops**, and **auxiliary heat** is usually energized to avoid blowing cold air indoors. Hot gas melts the frost.",
        "Defrost ends on coil temperature or a maximum time (commonly around 10 minutes, model-specific). You may hear a 'whoosh' and see **steam** — that's normal.",
      ], "defrost", ["Defrost"]),
      ask(
        multi("l6q-defrost-steps", "During a normal defrost, which happen? (Select all.)", [["a", "Reversing valve shifts to cooling mode"], ["b", "Outdoor fan stops"], ["c", "Auxiliary heat may turn on"], ["d", "Indoor blower turns off permanently", "The blower keeps running; aux heat tempers the air."]], ["a", "b", "c"], "The system temporarily runs in cooling with the outdoor fan off so hot gas melts the frost quickly.", H),
      ),
      ask(
        single("l6q-iced", "A heat pump's outdoor coil is a solid block of ice and has been for days. Which is a likely cause?", [["a", "Normal operation"], ["b", "Failed defrost control/sensor, reversing valve problem, or low charge", "Correct."], ["c", "Dirty indoor filter only"]], "b", "Light frost is normal; a solid block means defrost isn't working (sensor, board, reversing valve) or the system has another problem such as low charge or water dripping onto the unit from a gutter.", { skills: ["heating", "troubleshooting"], difficulty: 2 }),
      ),
      example("On the job", ["Customer calls about 'smoke' from the heat pump. It's steam from a normal defrost. Explaining this saves a call-back — and builds trust."]),
    ],
    sources: [{ id: "mfr-iom", note: "Defrost strategies differ by manufacturer" }, { id: "nate-ka" }],
    revised: R,
  }),
];
