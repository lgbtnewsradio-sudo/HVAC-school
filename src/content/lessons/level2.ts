import { ask, concept, example, lesson, match, multi, order, safety, single, tf, widget } from "./dsl";

const C = { skills: ["components" as const] };
const R = "2026-10-15";

export const LEVEL2 = [
  lesson({
    id: "l2-compressor-condenser",
    levelId: "l2",
    order: 1,
    title: "Compressor & Condenser",
    summary: "The outdoor unit's heavy hitters: the pump that moves refrigerant and the coil that dumps heat.",
    minutes: 8,
    objectives: ["Explain the compressor's job", "Name common compressor types", "Explain what the condenser coil and fan do"],
    skills: ["components", "refrigeration"],
    steps: [
      concept("Compressor: the heart", [
        "The **compressor** pulls in low-pressure refrigerant **vapor** and squeezes it into high-pressure, high-temperature vapor. That pressure difference is what keeps refrigerant moving.",
        "Residential compressors are usually **scroll** (two interleaved spirals) or **reciprocating** (pistons). Newer high-efficiency units may use variable-speed **inverter-driven** compressors (often rotary or scroll).",
        "Compressors are designed to pump **vapor only**. Liquid entering the compressor ('slugging' / floodback) can damage it.",
      ], "comp-scroll", ["Compressor"]),
      concept("Condenser coil & fan", [
        "Hot discharge vapor flows into the **condenser coil**. The **condenser fan** pulls outdoor air across the fins, the vapor gives up heat, and it **condenses into liquid**.",
        "A dirty condenser coil or a dead condenser fan means heat can't get out — pressures and temperatures climb (high head pressure).",
      ], "split-system", ["Condenser"]),
      ask(
        single(
          "l2q-comp-job",
          "What does the compressor take in and what does it discharge?",
          [
            ["a", "Takes in high-pressure liquid; discharges low-pressure vapor"],
            ["b", "Takes in low-pressure vapor; discharges high-pressure, high-temperature vapor", "Correct."],
            ["c", "Takes in air; discharges refrigerant"],
          ],
          "b",
          "The compressor raises vapor pressure (and temperature) so the refrigerant can reject heat in the condenser.",
          C,
        ),
      ),
      ask(tf("l2q-slug", "True or false: It's fine for liquid refrigerant to enter a compressor in large amounts.", false, "Compressors pump vapor. Liquid floodback can wash oil off bearings and damage valves or scrolls.", C)),
      ask(
        single(
          "l2q-dirty-cond",
          "A condenser coil is packed with cottonwood fluff. What do you expect?",
          [
            ["a", "Lower than normal head pressure"],
            ["b", "Higher than normal head pressure", "Yes — heat can't leave, so condensing pressure rises."],
            ["c", "No change at all"],
          ],
          "b",
          "Restricted condenser airflow reduces heat rejection, raising condensing temperature and pressure, increasing amp draw and reducing capacity.",
          C,
        ),
      ),
    ],
    sources: [{ id: "esco-608" }, { id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l2-evap-metering",
    levelId: "l2",
    order: 2,
    title: "Evaporator & Metering Devices",
    summary: "Where the cold happens: the evaporator coil, and the valves and pistons that feed it.",
    minutes: 9,
    objectives: ["Explain what the evaporator does", "Compare piston, TXV, and EEV metering devices", "Know where the metering device sits"],
    skills: ["components", "refrigeration"],
    steps: [
      concept("Evaporator coil", [
        "Indoors, the **evaporator coil** is where low-pressure liquid refrigerant **boils** into vapor. Boiling absorbs heat from the house air blowing across it.",
        "The coil also pulls moisture out of the air, which drips into the **drain pan**.",
      ], "split-system", ["Evaporator"]),
      concept("Metering devices", [
        "Just before the evaporator sits the **metering device**. It creates the big pressure drop from the high side to the low side and controls how much refrigerant enters the coil.",
        "**Fixed orifice (piston)** — a precise hole; simple, no adjustment.",
        "**TXV (thermostatic expansion valve)** — a sensing bulb strapped to the suction line lets it open or close to hold steady **superheat**.",
        "**EEV (electronic expansion valve)** — a stepper motor positions the valve based on sensors and a control board; common on variable-speed equipment.",
      ], "txv", ["Metering device", "TXV", "Piston", "EEV"]),
      ask(
        match(
          "l2q-metering-match",
          "Match each metering device to how it works.",
          [
            ["Piston / fixed orifice", "Fixed hole — flow isn't adjustable"],
            ["TXV", "Sensing bulb adjusts the valve to hold superheat"],
            ["EEV", "Control board drives a stepper motor"],
          ],
          "All three create the pressure drop; they differ in how (or whether) they adjust flow to the load.",
          C,
        ),
      ),
      ask(
        single(
          "l2q-metering-loc",
          "Where is the metering device located in a cooling system?",
          [
            ["a", "Between the compressor and the condenser"],
            ["b", "Between the condenser (liquid line) and the evaporator", "Correct."],
            ["c", "In the suction line at the compressor"],
          ],
          "b",
          "It sits at the evaporator inlet, at the end of the liquid line — the dividing point between high side and low side.",
          C,
        ),
      ),
      ask(tf("l2q-txv-bulb", "True or false: A TXV's sensing bulb must be in good thermal contact with the suction line and insulated to work correctly.", true, "A loose or uninsulated bulb senses the wrong temperature and the valve will mis-feed the coil. Follow the manufacturer's bulb-mounting instructions.", C)),
    ],
    sources: [{ id: "esco-608" }, { id: "mfr-iom" }],
    revised: R,
  }),

  lesson({
    id: "l2-motors-caps",
    levelId: "l2",
    order: 3,
    title: "Motors & Capacitors",
    summary: "Blower motors, fan motors, PSC vs ECM — and the capacitors that keep them spinning.",
    minutes: 9,
    objectives: ["Tell PSC from ECM motors", "Explain what a run capacitor does", "Read a dual capacitor's terminals"],
    skills: ["components", "electrical"],
    steps: [
      concept("Motors everywhere", [
        "A typical split system has three motors: the **compressor motor**, the **condenser fan motor**, and the **indoor blower motor**. Furnaces add an **inducer (draft) motor**.",
        "**PSC** (permanent split capacitor) motors are simple single-phase motors that need a run capacitor.",
        "**ECM** (electronically commutated) motors are efficient DC motors with built-in electronics and programmable airflow. They don't use a run capacitor.",
      ], undefined, ["PSC motor", "ECM", "Blower"]),
      concept("Run capacitors", [
        "A **run capacitor** creates a phase shift that gives a single-phase motor's start winding a 'push', so it starts and runs efficiently.",
        "Rated in **microfarads (µF or MFD)** with a tolerance like ±5% or ±6%, and a voltage rating (e.g., 370 or 440 VAC). Replace with the same µF and an equal or higher voltage rating.",
        "A **dual run capacitor** serves the compressor and fan: terminals are **C** (common), **HERM** (compressor), and **FAN**.",
      ], "capacitor", ["Capacitor"]),
      ask(
        match(
          "l2q-dualcap",
          "Match each dual-capacitor terminal to what connects there.",
          [
            ["HERM", "Compressor (hermetic) start winding circuit"],
            ["FAN", "Condenser fan motor"],
            ["C", "Common — shared by both"],
          ],
          "HERM serves the compressor, FAN serves the condenser fan motor, and C is common to both sections.",
          C,
        ),
      ),
      ask(
        single(
          "l2q-cap-replace",
          "You're replacing a 45/5 µF 440 V dual run capacitor. Which replacement is acceptable?",
          [
            ["a", "45/5 µF, 370 V", "Lower voltage rating — not acceptable."],
            ["b", "45/5 µF, 440 V", "Matches µF and voltage."],
            ["c", "35/5 µF, 440 V", "Wrong capacitance for the compressor."],
          ],
          "b",
          "Match the microfarad rating; the voltage rating must be equal to or higher than the original.",
          C,
        ),
      ),
      safety("Capacitors bite", [
        "A capacitor can hold a **dangerous charge after the power is off**. After de-energizing and verifying zero voltage, discharge it with a rated discharge tool or resistor and confirm 0 V across the terminals before handling. Never short terminals with a screwdriver.",
      ]),
      ask(tf("l2q-ecm-cap", "True or false: ECM blower motors use a run capacitor just like PSC motors.", false, "ECMs are electronically commutated DC motors with built-in electronics — no run capacitor.", C)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "osha-electrical" }],
    revised: R,
  }),

  lesson({
    id: "l2-controls",
    levelId: "l2",
    order: 4,
    title: "Contactors, Relays, Transformers & Boards",
    summary: "The switches and brains that turn 24 volts of 'please' into 240 volts of 'go'.",
    minutes: 9,
    objectives: ["Explain how a contactor works", "Describe the transformer's role", "Know what a control board does"],
    skills: ["components", "electrical"],
    steps: [
      concept("Transformer", [
        "The **transformer** steps line voltage (120 V or 240 V) down to **24 VAC** for the control circuit. Residential units are commonly rated **40 VA**.",
        "Its secondary feeds the thermostat's **R** and **C**. Many boards protect it with a small fuse (often 3 or 5 A).",
      ], undefined, ["Transformer"]),
      concept("Contactor", [
        "The **contactor** is a heavy-duty switch in the outdoor unit. When the thermostat sends 24 V to its **coil**, a magnet pulls the contacts closed and **line voltage** flows to the compressor and condenser fan.",
        "Contacts can become **pitted or burned**, causing voltage drop, overheating, or failure to pass power. Ants and debris can also keep contacts from closing.",
      ], "contactor", ["Contactor"]),
      concept("Relays & control boards", [
        "A **relay** is a smaller version of a contactor — a low-power coil switching another circuit (e.g., a fan relay).",
        "A **control board** runs the sequence of operation: timing delays, ignition sequence, safety checks and fault codes (blinking LEDs).",
      ], undefined, ["Relay", "Control board"]),
      ask(
        order(
          "l2q-contactor-seq",
          "Put the outdoor-unit start-up in order.",
          [
            "Thermostat closes R to Y",
            "24 V reaches the contactor coil",
            "Contactor contacts close",
            "Line voltage reaches compressor and condenser fan",
          ],
          "Low-voltage control energizes the coil; the coil closes the high-voltage contacts.",
          C,
        ),
      ),
      ask(
        single(
          "l2q-contactor-24",
          "You measure 24 V across the contactor coil, but the contactor isn't pulled in. What's most likely?",
          [
            ["a", "The thermostat is bad", "The thermostat already did its job — 24 V is at the coil."],
            ["b", "The contactor coil has failed (open) or the contactor is mechanically stuck", "Right — the signal is there, the part isn't responding."],
            ["c", "The compressor is bad"],
          ],
          "b",
          "If the coil has rated voltage and the contactor won't close, the contactor itself is the problem. Confirm with power off: measure coil resistance (an open coil reads OL).",
          C,
        ),
      ),
      ask(tf("l2q-transformer", "True or false: Residential control circuits commonly run on 24 volts AC.", true, "A step-down transformer provides 24 VAC for thermostats, relays, contactor coils and gas valves.", C)),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nate-ka" }],
    revised: R,
  }),

  lesson({
    id: "l2-refrigerant-parts",
    levelId: "l2",
    order: 5,
    title: "Line Components: Driers, Accumulators & Valves",
    summary: "Filter driers, accumulators, reversing valves and service valves — the parts along the pipes.",
    minutes: 8,
    objectives: ["Explain filter drier and accumulator jobs", "Know where a reversing valve is used", "Identify service valves"],
    skills: ["components", "refrigeration"],
    steps: [
      concept("Along the refrigerant lines", [
        "**Filter drier** — in the liquid line; desiccant absorbs moisture and a screen catches debris. Replaced whenever the system is opened for repair (follow manufacturer guidance).",
        "**Accumulator** — in the suction line before the compressor, mostly on heat pumps; it traps liquid so only vapor reaches the compressor.",
        "**Reversing valve** — heat pumps only; redirects hot discharge gas to switch heating/cooling. Its solenoid coil is energized by **O** (in cooling, on most brands) or **B** (in heating, on some brands).",
        "**Service valves** — on the outdoor unit; let a tech isolate the charge and connect gauges through Schrader ports.",
      ], "heat-pump", ["Filter drier", "Accumulator", "Reversing valve"]),
      ask(
        match(
          "l2q-line-match",
          "Match the component to its job.",
          [
            ["Filter drier", "Removes moisture and debris from liquid refrigerant"],
            ["Accumulator", "Keeps liquid refrigerant from reaching the compressor"],
            ["Reversing valve", "Switches a heat pump between heating and cooling"],
            ["Service valve", "Isolates refrigerant and provides gauge access"],
          ],
          "Each protects or controls a specific part of the circuit.",
          C,
        ),
      ),
      ask(
        single(
          "l2q-ob",
          "On many heat pumps the reversing valve is energized in cooling by which terminal?",
          [
            ["a", "W"],
            ["b", "O", "Right — but some brands use B (energized in heat). Always check the equipment."],
            ["c", "G"],
          ],
          "b",
          "Most manufacturers energize the reversing valve in cooling (O). Some (historically Rheem/Ruud) energize in heating (B). The thermostat setup must match the equipment.",
          C,
        ),
      ),
      example("On the job", ["A heat pump that blows cold air in winter and warm air in summer? Classic sign the thermostat's O/B setting doesn't match the outdoor unit."]),
    ],
    sources: [{ id: "mfr-iom" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l2-safeties",
    levelId: "l2",
    order: 6,
    title: "Safeties, Ignition, Drains & Filters",
    summary: "Pressure switches, limits, flame sensors, igniters, condensate drains and air filters.",
    minutes: 10,
    objectives: ["Explain what safety switches protect", "Describe flame sensors and igniters", "Explain condensate drain and filter roles"],
    skills: ["components", "heating", "safety"],
    steps: [
      concept("Safety switches", [
        "**High-pressure switch** — opens if head pressure gets dangerously high (e.g., dead condenser fan).",
        "**Low-pressure switch** — opens on low suction pressure (e.g., loss of charge).",
        "**Limit switch** — in furnaces and heat strips; opens if the heat exchanger gets too hot (often from poor airflow).",
        "**Rollout switch** — opens if flames roll out of the burner area — a serious warning sign.",
        "**Draft pressure switch** — proves the furnace inducer is venting properly before ignition.",
      ], undefined, ["Pressure switch", "Limit switch", "Rollout switch"]),
      safety("Never jump out a safety", [
        "Safety switches exist to prevent fires, carbon monoxide exposure, and equipment destruction. A tripped safety is a **symptom** — find out **why** it opened. Never bypass or jumper a safety to keep a system running.",
      ]),
      concept("Ignition & flame proving", [
        "Most modern gas furnaces use a **hot surface igniter** (glowing ceramic) or a **spark igniter**.",
        "A **flame sensor** rod sits in the flame. Through **flame rectification**, a tiny DC current (microamps) proves flame is present. No proof → the board shuts the gas valve within seconds.",
      ], "furnace", ["Hot surface igniter", "Flame sensor"]),
      concept("Condensate & filters", [
        "The **condensate drain** carries water from the coil's drain pan. A **trap** and proper slope keep it flowing. A **float switch** shuts the system down if water backs up.",
        "**Air filters** protect the coil and blower. A clogged filter cuts airflow — which can freeze an evaporator coil or trip a furnace limit.",
      ], undefined, ["Condensate", "Float switch"]),
      ask(
        match(
          "l2q-safety-match",
          "Match each safety to the problem it reacts to.",
          [
            ["High-pressure switch", "Excessive head pressure"],
            ["Limit switch", "Furnace overheating"],
            ["Flame sensor", "No flame detected"],
            ["Float switch", "Condensate backing up"],
          ],
          "Each safety watches for one dangerous condition and interrupts operation when it happens.",
          { skills: ["components", "safety"] },
        ),
      ),
      ask(
        multi(
          "l2q-filter",
          "A severely clogged air filter can cause which problems? (Select all that apply.)",
          [
            ["a", "Frozen evaporator coil in cooling"],
            ["b", "Furnace tripping on high limit"],
            ["c", "Reduced airflow and comfort"],
            ["d", "Higher refrigerant charge", "Filters don't change the amount of refrigerant."],
          ],
          ["a", "b", "c"],
          "Low airflow starves the coil of heat (it freezes) and overheats furnace heat exchangers (limit trips).",
          C,
        ),
      ),
      widget("Identify the parts", "component-explorer", "Tap through a furnace and air handler to find each safety device."),
    ],
    sources: [{ id: "mfr-iom" }, { id: "nfpa-54" }, { id: "cpsc-co" }],
    revised: R,
  }),
];
