import { ask, concept, lesson, match, multi, order, safety, single, tf, widget } from "./dsl";

const T = { skills: ["troubleshooting" as const] };
const R = "2026-10-15";

export const LEVEL8 = [
  lesson({
    id: "l8-service-method",
    levelId: "l8",
    order: 1,
    title: "The Service Call Method",
    summary: "Listen, look, measure, think, then fix. A process that beats guessing every time.",
    minutes: 10,
    objectives: ["Follow an 11-step service process", "Ask useful customer questions", "Avoid 'parts-changing' guesses"],
    skills: ["troubleshooting", "professional"],
    steps: [
      concept("The process", [
        "1. **Hear the complaint** • 2. **Review equipment info** (nameplate, age, refrigerant, metering) • 3. **Ask questions** • 4. **Visual inspection** • 5. **Choose tools** • 6. **Measure** • 7. **Interpret** • 8. **Narrow causes** • 9. **Identify the fault** • 10. **Repair** • 11. **Verify** the system runs correctly.",
        "Skipping steps leads to wrong parts, call-backs and unhappy customers.",
      ]),
      concept("Good questions", [
        "When did it start? Has it ever worked right? Any noises or smells? When was the filter changed? Has anyone worked on it recently? Did a breaker trip? Is there water anywhere?",
        "Customers often hold the key clue — 'it started after the power outage' or 'the yard crew was here yesterday'.",
      ]),
      ask(
        order("l8q-process", "Put the service process in order.", ["Listen to the customer's complaint", "Review equipment information", "Perform a visual inspection", "Take measurements with the right tools", "Identify the fault from evidence", "Make the repair", "Verify proper operation"], "Evidence first, repair second, verification always.", T),
      ),
      ask(
        single("l8q-guess", "A tech replaces a capacitor, then a contactor, then a thermostat before finding a broken wire. What went wrong?", [["a", "Bad luck"], ["b", "Parts were changed on assumptions instead of testing to find the fault", "Correct."], ["c", "Nothing — eventually it got fixed"]], "b", "Every unnecessary part costs the customer money and erodes trust. Measure, confirm, then replace.", { skills: ["troubleshooting", "professional"] }),
      ),
      widget("Run your first service call", "sim-link:sim-dirty-filter", "Head into the Field Simulator and practice the process on a real-world call."),
    ],
    sources: [{ id: "nate-ka" }, { id: "acca-4qm" }],
    revised: R,
  }),

  lesson({
    id: "l8-outdoor-not-running",
    levelId: "l8",
    order: 2,
    title: "Outdoor Unit Not Running",
    summary: "Capacitors, contactors, and missing 24 V — the most common no-cool calls.",
    minutes: 11,
    objectives: ["Check high voltage and control voltage", "Diagnose a failed capacitor", "Diagnose a failed contactor"],
    skills: ["troubleshooting", "electrical"],
    steps: [
      concept("Divide and conquer", [
        "Is there **line voltage** at the disconnect? Is there **24 V at the contactor coil** (thermostat calling)? Is the contactor **pulled in**? Is voltage **passing through** the contacts? Do the motors start?",
        "Each answer cuts the possibilities in half.",
      ]),
      concept("Capacitor failures", [
        "Symptoms: compressor **hums** and trips its internal overload, or fan **doesn't spin** (may start with a push — don't do that by hand). The capacitor may be swollen or leaking, but many failed caps look normal.",
        "Confirm: lock out, discharge, disconnect, measure µF against the rating and tolerance.",
      ], "capacitor"),
      concept("Contactor failures", [
        "**Coil open**: 24 V at the coil but it won't pull in. **Contacts pitted**: pulled in but large voltage drop across contacts or no voltage on the load side.",
        "Also look for **insects or debris** between contacts, and burned wires on the terminals.",
      ], "contactor"),
      ask(
        single("l8q-hum", "Outdoor unit: contactor pulled in, 240 V on the load side, compressor humming, condenser fan not turning. Most likely?", [["a", "Bad thermostat", "The unit is being told to run."], ["b", "Failed dual run capacitor", "Correct — both motors are affected."], ["c", "Dirty filter"]], "b", "Power is reaching both motors, but neither starts properly. A failed dual capacitor (HERM and FAN sections) is the common culprit. Confirm with a µF test after discharging.", { skills: ["troubleshooting", "electrical"] }),
      ),
      ask(
        single("l8q-no-24", "No 24 V at the contactor coil, but 24 V is present at R–C in the air handler. What's next?", [["a", "Replace the contactor"], ["b", "Check the thermostat call (Y), wiring, and series safeties like pressure/float switches", "Correct."], ["c", "Recover the refrigerant"]], "b", "The control signal is lost between the transformer and the coil. Trace Y through the thermostat, low-voltage wire, and any series safeties.", T),
      ),
      safety("Don't spin fans by hand", ["Pushing a fan blade to start a motor with power on is a serious injury risk and hides the real problem. Lock out, test the capacitor and motor, and repair properly."]),
      widget("Practice", "sim-link:sim-bad-capacitor", "Diagnose a humming outdoor unit in the Field Simulator."),
    ],
    sources: [{ id: "nate-ka" }, { id: "nfpa-70e" }, { id: "osha-loto" }],
    revised: R,
  }),

  lesson({
    id: "l8-running-not-cooling",
    levelId: "l8",
    order: 3,
    title: "Running But Not Cooling",
    summary: "Frozen coils, dirty condensers, low charge and airflow — read the temperatures and pressures.",
    minutes: 12,
    objectives: ["Check temperature split and airflow first", "Diagnose a frozen evaporator", "Diagnose dirty condenser and low charge"],
    skills: ["troubleshooting", "refrigeration", "airflow"],
    steps: [
      concept("Start with air", [
        "Measure **return and supply temperatures** (split), **static pressure**, check the **filter** and look at the **coil**. Many 'not cooling' calls are airflow problems.",
      ]),
      concept("Frozen evaporator coil", [
        "Causes: **low airflow** (dirty filter, failed blower, closed registers, dirty coil) or **low charge**. Ice blocks airflow further and makes it worse.",
        "Fix: turn cooling off and run the fan (or let it thaw) — **don't take charge readings on an iced coil**. Then find the cause.",
      ]),
      concept("Dirty condenser & low charge", [
        "**Dirty condenser**: high head pressure, high condensing temperature over ambient, high amps.",
        "**Low charge**: low suction, high superheat, low subcooling — and there's a **leak** somewhere. Find it before adding refrigerant.",
      ]),
      ask(
        match("l8q-noncool-match", "Match the evidence to the likely cause.", [["Ice on suction line, filter caked, high static", "Low airflow → frozen coil"], ["High head pressure, condenser fins packed with debris", "Dirty condenser coil"], ["High superheat, low subcooling, oily spot on the coil", "Refrigerant leak / undercharge"]], "Each pattern points to a different root cause — and a different repair.", { skills: ["troubleshooting"], difficulty: 2 }),
      ),
      ask(tf("l8q-iced-readings", "True or false: You should verify the refrigerant charge while the evaporator coil is still iced.", false, "Ice blocks heat transfer, so readings won't reflect the true charge. Thaw it, restore airflow, then check.", T)),
      widget("Practice", "sim-link:sim-dirty-condenser", "Diagnose a system that runs all day and never catches up."),
    ],
    sources: [{ id: "nate-ka" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l8-indoor-water",
    levelId: "l8",
    order: 4,
    title: "Blower Problems & Water Leaks",
    summary: "No indoor airflow, water around the air handler, and the float switch that shut it all down.",
    minutes: 10,
    objectives: ["Diagnose an indoor blower that won't run", "Find the source of water leaks", "Clear and protect a condensate drain"],
    skills: ["troubleshooting", "airflow"],
    steps: [
      concept("Indoor blower not running", [
        "Check: is the blower being called (G or board output)? Is there voltage at the motor? For PSC: test the **run capacitor** and motor windings. For ECM: follow the manufacturer's diagnostic procedure (low-voltage signal + line voltage).",
        "Also check the blower door switch — it's a safety interlock. Never defeat it.",
      ]),
      concept("Water leaks", [
        "Common causes: **clogged drain or trap** (algae/sludge), a cracked/rusted **drain pan**, disconnected drain line, missing trap, an iced coil melting, or **sweating** uninsulated ducts or suction lines.",
        "A tripped **float switch** shutting down cooling is the system protecting the house — the fix is clearing the drain, not removing the switch.",
      ], undefined, ["Float switch"]),
      ask(
        multi("l8q-water", "Water is on the floor around an air handler. Which could cause this? (Select all.)", [["a", "Clogged condensate drain line"], ["b", "Cracked primary drain pan"], ["c", "Frozen coil melting"], ["d", "A run capacitor rated for 440 V", "Not related."]], ["a", "b", "c"], "Trace the water: drain line, pan, coil, and insulation.", T),
      ),
      ask(
        single("l8q-float", "Cooling stopped and the float switch on the secondary pan is tripped. The best repair is:", [["a", "Remove the float switch"], ["b", "Clear the drain, find out why it backed up, test the float switch", "Correct."], ["c", "Replace the thermostat"]], "b", "The float switch prevented water damage. Clear and flush the drain, verify slope and trap, then confirm the switch resets and works.", { skills: ["troubleshooting", "safety"] }),
      ),
      widget("Practice", "sim-link:sim-clogged-drain", "The ceiling is stained and the AC is off. Find out why."),
    ],
    sources: [{ id: "mfr-iom" }, { id: "acca-4qm" }],
    revised: R,
  }),

  lesson({
    id: "l8-refrigerant-faults",
    levelId: "l8",
    order: 5,
    title: "Refrigerant Faults",
    summary: "Leaks, overcharge, restrictions, high head and low suction — and how to tell them apart.",
    minutes: 12,
    objectives: ["Use SH/SC patterns to separate faults", "Search for leaks methodically", "Follow EPA rules when repairing leaks"],
    skills: ["troubleshooting", "refrigeration"],
    steps: [
      concept("Pattern table", [
        "**Undercharge**: low suction, low head, high SH, low SC.",
        "**Overcharge**: high suction, high head, low SH, high SC.",
        "**Restriction (liquid line/metering)**: low suction, normal-to-low head, high SH, **high SC**. A temperature drop across a filter drier is a clue.",
        "**Low indoor airflow**: low suction, low SH (fixed orifice), normal SC.",
        "**Dirty condenser / condenser fan**: high head, high condensing over ambient.",
        "These are typical patterns. Systems vary — always compare to manufacturer data.",
      ]),
      widget("Pressure detective practice", "pt-calculator", "Calculate superheat and subcooling, then compare to the pattern table."),
      concept("Leak searching", [
        "Look for **oil stains** • use an **electronic leak detector** suited to the refrigerant (A2L-rated for A2L systems) • **bubble solution** to pinpoint • for hard-to-find leaks, recover the charge and use a nitrogen standing test (some techs add trace refrigerant only where permitted).",
        "Common spots: evaporator coils (formicary corrosion), Schrader cores, flare fittings, rubbing lines, service valves.",
      ]),
      safety("Leak repair & the rules", ["Repair leaks rather than repeatedly topping off. EPA Section 608 has specific leak-repair requirements for larger appliances (based on charge size and refrigerant type). Recover before opening the system. Never vent."]),
      ask(
        single("l8q-restrict", "High superheat AND high subcooling, with a 10 °F temperature drop across the filter drier. Diagnosis?", [["a", "Undercharge"], ["b", "Restricted filter drier", "Correct."], ["c", "Overcharge"]], "b", "Liquid is backing up behind a restriction (high SC) and the evaporator is starved (high SH). A noticeable temperature drop across the drier pinpoints it.", { skills: ["troubleshooting", "refrigeration"], difficulty: 3 }),
      ),
      ask(
        multi(
          "l8q-leak-search",
          "You've confirmed an undercharge. Which are appropriate next steps? (Select all.)",
          [
            ["a", "Look for oil stains at coils, fittings and Schrader ports"],
            ["b", "Use a leak detector rated for the system's refrigerant"],
            ["c", "Pinpoint with bubble solution"],
            ["d", "Add refrigerant every spring and skip the leak search", "Repeated top-offs waste refrigerant and money, and may violate leak-repair requirements."],
          ],
          ["a", "b", "c"],
          "Find and fix the leak, then evacuate and charge to the manufacturer's specification.",
          { skills: ["troubleshooting", "refrigeration"] },
        ),
      ),
      widget("Practice", "sim-link:sim-refrigerant-leak", "A slow leak shows up as a warm house. Prove it."),
    ],
    sources: [{ id: "epa-608" }, { id: "mfr-iom" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l8-heating-calls",
    levelId: "l8",
    order: 6,
    title: "No-Heat Calls",
    summary: "Furnaces that won't light, blow cold air, or heat pumps that just won't heat.",
    minutes: 12,
    objectives: ["Use the sequence of operation to locate faults", "Diagnose 'furnace blowing cold air'", "Diagnose a heat pump not heating"],
    skills: ["troubleshooting", "heating"],
    steps: [
      concept("Furnace not igniting", [
        "Watch the sequence. **Where does it stop?** No inducer → board/thermostat/power. Inducer but no glow → pressure switch, vent, condensate trap. Glow but no gas → gas valve, gas supply. Lights then drops → flame sensing.",
        "Read the board's **flash code** before cycling power.",
      ], "furnace-sequence"),
      concept("Furnace blowing cold air", [
        "Check the obvious: thermostat **fan set to ON** (blower runs constantly between heat cycles) • gas supply off • limit tripping (blower runs to cool the heat exchanger) • ignition lockout with the fan still running.",
      ]),
      concept("Heat pump not heating", [
        "Is the outdoor unit running? Is the reversing valve shifting (check O/B configuration, the solenoid coil, and line temperatures)? Is the coil iced solid (defrost problem)? Is the charge correct?",
      ]),
      ask(
        single("l8q-fan-on", "Customer: 'It blows cold air between heating cycles.' The furnace works normally otherwise. First check?", [["a", "Thermostat fan setting (ON vs AUTO)", "Correct — a quick win."], ["b", "Replace the gas valve"], ["c", "Recharge the AC"]], "a", "With fan ON, the blower runs continuously, moving unheated air between cycles. Explain the setting to the customer.", { skills: ["troubleshooting", "heating"] }),
      ),
      ask(
        single("l8q-hp-cold", "A heat pump blows cool air in heat mode and warm air in cool mode. Most likely?", [["a", "Low charge"], ["b", "Thermostat O/B setting doesn't match the equipment", "Correct."], ["c", "Dirty filter"]], "b", "The reversing valve is being energized in the opposite mode. Match the thermostat's O/B configuration to the outdoor unit.", { skills: ["troubleshooting", "heating"] }),
      ),
      widget("Practice", "sim-link:sim-flame-sensor", "A furnace lights and quits. Find out why."),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nfpa-54" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l8-noise-cycling",
    levelId: "l8",
    order: 7,
    title: "Noises, Short Cycling & Thermostats",
    summary: "What that sound means, why it keeps turning on and off, and thermostat gremlins.",
    minutes: 9,
    objectives: ["Interpret common noises", "List causes of short cycling", "Diagnose thermostat problems"],
    skills: ["troubleshooting"],
    steps: [
      concept("Noises", [
        "**Buzzing/humming** at outdoor unit: contactor chatter or a motor that won't start (capacitor). **Squealing**: belt or motor bearing. **Rattling**: loose panels, debris, failing fan motor. **Banging at start-up** (furnace): delayed ignition — a safety concern. **Whoosh + steam** on a heat pump in winter: normal defrost.",
      ]),
      ask(
        match("l8q-noise", "Match the noise to a likely source.", [["Loud bang when the furnace lights", "Delayed ignition"], ["Humming outdoor unit that won't start", "Failed capacitor or stuck compressor"], ["Whoosh and steam from heat pump in winter", "Normal defrost"], ["High-pitched squeal from blower", "Bearing or belt problem"]], "Sounds are clues — follow up with measurement.", T),
      ),
      concept("Short cycling", [
        "Causes: **oversized equipment** • thermostat in a bad location (near a supply register, sunlight, or a lamp) • **safety switch tripping** and resetting (high-pressure, limit) • low charge cycling a low-pressure switch • loose wires.",
      ], undefined, ["Short cycling"]),
      concept("Thermostat problems", ["Dead batteries • wrong configuration • loose/broken wires • no C-wire for a smart thermostat • thermostat mounted on an exterior wall or near a heat source."]),
      ask(
        multi("l8q-shortcycle", "Which can cause short cycling? (Select all.)", [["a", "Thermostat located just above a supply register"], ["b", "Oversized equipment"], ["c", "High-limit tripping from a dirty filter"], ["d", "Correctly sized system with clean filter", "That's the goal."]], ["a", "b", "c"], "Short cycling is a symptom — find which of these is responsible.", T),
      ),
      widget("Practice", "sim-link:sim-thermostat-location", "The AC turns on and off every 3 minutes. Why?"),
    ],
    sources: [{ id: "nate-ka" }, { id: "mfr-iom" }],
    revised: R,
  }),
];

