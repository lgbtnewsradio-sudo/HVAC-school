import { ask, concept, example, lesson, match, multi, numeric, order, safety, single, tf, widget } from "./dsl";

const F = { skills: ["fundamentals" as const] };
const R = "2026-10-15";

export const LEVEL1 = [
  lesson({
    id: "l1-what-is-hvac",
    levelId: "l1",
    order: 1,
    title: "What HVAC Really Does",
    summary: "HVAC doesn't make cold — it moves heat. Learn the four jobs every system does.",
    minutes: 6,
    objectives: ["Explain what H, V, and AC stand for", "Describe cooling as heat removal", "Name the four comfort factors"],
    skills: ["fundamentals"],
    steps: [
      concept(
        "Four letters, one goal: comfort",
        [
          "**HVAC** stands for **Heating, Ventilation, and Air Conditioning**. Together these systems control how warm, how humid, how fresh and how well-mixed the air in a building is.",
          "A technician's job is to keep those systems doing that job **safely and efficiently**.",
        ],
        "hvac-overview",
        ["HVAC"],
      ),
      concept(
        "Cooling = moving heat out",
        [
          "Here's the idea that unlocks everything: an air conditioner doesn't create cold. **It picks up heat from inside your house and carries it outside.**",
          "Heat naturally flows from warmer things to cooler things. An AC uses a [[refrigerant]] to pick heat up indoors and dump it outdoors — even when it's hotter outside.",
        ],
        "heat-flow",
        ["Heat", "Refrigerant"],
      ),
      ask(
        single(
          "l1q-cooling-def",
          "What is an air conditioner actually doing when it cools a room?",
          [
            ["a", "Creating cold air and blowing it in", "There's no such thing as 'making cold' — cold is just less heat."],
            ["b", "Removing heat from the room and moving it outside", "Exactly. Cooling is heat removal."],
            ["c", "Mixing outdoor air with indoor air"],
            ["d", "Adding moisture to the air"],
          ],
          "b",
          "Cold is simply the absence of heat. An AC absorbs heat indoors at the evaporator coil and rejects it outdoors at the condenser coil.",
          F,
        ),
      ),
      concept("The four comfort factors", [
        "People feel comfortable when four things are right: **temperature**, **humidity** (moisture in the air), **air movement**, and **air quality** (filtration and fresh air).",
        "That's why a system can be 'cold' but still feel clammy — humidity matters as much as temperature.",
      ]),
      example("On the job", [
        "A customer says: \"It's 74 on the thermostat but it feels sticky.\" A good tech thinks about **humidity** and **airflow**, not just temperature. Sometimes the fix is a blower speed or a system that's oversized and short-cycles before it can dry the air.",
      ]),
      ask(
        multi(
          "l1q-comfort-factors",
          "Select ALL of the factors that affect human comfort indoors.",
          [
            ["a", "Temperature"],
            ["b", "Humidity"],
            ["c", "Air movement"],
            ["d", "Air quality / filtration"],
            ["e", "The brand of the equipment", "Brand doesn't change how air feels."],
          ],
          ["a", "b", "c", "d"],
          "Temperature, humidity, air movement and air quality all affect comfort. HVAC systems manage all four.",
          F,
        ),
      ),
      ask(
        tf("l1q-ventilation", "True or false: The 'V' in HVAC — ventilation — is about bringing in fresh air and removing stale air.", true, "Ventilation exchanges or dilutes indoor air to control odors, moisture and pollutants.", F),
      ),
    ],
    sources: [{ id: "ashrae-fund" }, { id: "energy-star" }],
    revised: R,
  }),

  lesson({
    id: "l1-heat-transfer",
    levelId: "l1",
    order: 2,
    title: "Heat & How It Moves",
    summary: "Heat flows hot → cold by conduction, convection and radiation. Sensible vs latent heat.",
    minutes: 8,
    objectives: ["Name the three methods of heat transfer", "Tell sensible heat from latent heat", "Define a BTU"],
    skills: ["fundamentals"],
    steps: [
      concept(
        "Heat always flows downhill",
        ["Heat moves from **higher temperature to lower temperature**, never the other way on its own. The bigger the temperature difference, the faster heat moves.", "Your AC's coils work because they're kept colder (indoors) or hotter (outdoors) than the air passing over them."],
        "heat-flow",
      ),
      concept(
        "Three ways heat travels",
        [
          "**Conduction** — through direct contact (a hot pan handle).",
          "**Convection** — carried by moving air or water (a blower pushing air across a coil).",
          "**Radiation** — infrared energy through space (sun on a roof).",
        ],
        undefined,
        ["Conduction", "Convection", "Radiation"],
      ),
      ask(
        match(
          "l1q-transfer-match",
          "Match each example to the way heat is moving.",
          [
            ["Refrigerant pulling heat through the copper tube wall", "Conduction"],
            ["Blower pushing warm room air across the evaporator coil", "Convection"],
            ["Sun heating an attic roof deck", "Radiation"],
          ],
          "Conduction is through solids in contact, convection is carried by moving fluid (air), and radiation needs no contact.",
          F,
        ),
      ),
      concept(
        "Sensible vs latent heat",
        [
          "**Sensible heat** changes temperature — you can 'sense' it with a thermometer.",
          "**Latent heat** changes state (ice → water → steam) **without changing temperature**. It takes a LOT of energy: boiling water stays at 212 °F at sea level no matter how high the flame, until it's all steam.",
          "Refrigeration systems exploit latent heat: boiling refrigerant absorbs huge amounts of heat at a steady temperature.",
        ],
        "latent-heat",
        ["Sensible heat", "Latent heat"],
      ),
      concept("Measuring heat: the BTU", ["One **BTU** (British Thermal Unit) is the heat needed to raise **1 pound of water by 1 °F**.", "Equipment capacity is rated in **BTU per hour**. A typical home furnace might be rated 60,000–100,000 BTU/h input."], undefined, ["BTU"]),
      ask(
        numeric(
          "l1q-btu-water",
          "How many BTUs does it take to heat 10 lb of water from 60 °F to 70 °F (sensible heat only)?",
          100,
          0,
          "BTU",
          "BTU = weight × temperature change = 10 lb × 10 °F = 100 BTU.",
          { ...F, hint: "1 BTU raises 1 lb of water by 1 °F." },
        ),
      ),
      ask(
        single(
          "l1q-latent",
          "A pot of water is boiling at 212 °F. You turn the burner higher. What happens to the water temperature?",
          [
            ["a", "It rises above 212 °F"],
            ["b", "It stays at 212 °F — the extra heat boils water faster", "Right: the extra energy is latent heat of vaporization."],
            ["c", "It drops"],
          ],
          "b",
          "During a change of state, added heat goes into changing state (latent heat), not raising temperature. Same pressure, same boiling temperature.",
          F,
        ),
      ),
    ],
    sources: [{ id: "ashrae-fund" }],
    revised: R,
  }),

  lesson({
    id: "l1-pressure-temp",
    levelId: "l1",
    order: 3,
    title: "Pressure Changes Boiling Point",
    summary: "Change the pressure and you change the boiling point — the secret behind every AC.",
    minutes: 8,
    objectives: ["Explain psig vs psia", "Describe how pressure changes boiling point", "Connect this to the refrigeration cycle"],
    skills: ["fundamentals", "refrigeration"],
    steps: [
      concept(
        "What pressure means",
        [
          "Pressure is force pushing on an area. Refrigerant gauges read **psig** — pounds per square inch **above** the atmosphere around us.",
          "Atmospheric pressure at sea level is about **14.7 psi**. So 0 psig = 14.7 psia (absolute).",
        ],
        undefined,
        ["psig", "psia", "Pressure"],
      ),
      concept(
        "Pressure controls boiling",
        [
          "Water boils at **212 °F at sea level**. In Denver (lower atmospheric pressure) it boils around 202 °F. In a pressure cooker it boils hotter, near 250 °F.",
          "**Raise pressure → higher boiling point. Lower pressure → lower boiling point.** Refrigerants follow the same rule, just at very different temperatures.",
        ],
        "pt-relationship",
      ),
      ask(
        single(
          "l1q-pressure-boil",
          "If you LOWER the pressure on a liquid, its boiling temperature…",
          [
            ["a", "goes up"],
            ["b", "goes down", "Correct — that's how an evaporator gets cold."],
            ["c", "stays the same"],
          ],
          "b",
          "Lower pressure = lower boiling point. The metering device drops refrigerant pressure so it boils cold inside the evaporator.",
          F,
        ),
      ),
      concept("Why this matters for AC", [
        "An AC keeps refrigerant at **low pressure indoors**, so it boils at about 40 °F and soaks up heat from 75 °F room air.",
        "Then the compressor **raises the pressure** so the refrigerant condenses at about 110–120 °F outdoors — hotter than a 95 °F day — and dumps the heat.",
        "Same refrigerant, two pressures, two boiling points. That's the whole trick.",
      ], "refrigeration-cycle"),
      ask(tf("l1q-psig", "True or false: A gauge reading of 0 psig means there is no air pressure at all.", false, "0 psig means equal to atmospheric pressure (≈14.7 psia at sea level). A perfect vacuum is 0 psia.", F)),
      ask(
        numeric("l1q-psia", "A gauge reads 100 psig at sea level. What is the absolute pressure (psia)? Round to the nearest whole number.", 115, 1, "psia", "psia = psig + 14.7 ≈ 114.7 ≈ 115 psia.", F),
      ),
    ],
    sources: [{ id: "ashrae-fund" }, { id: "esco-608" }],
    revised: R,
  }),

  lesson({
    id: "l1-btu-tons",
    levelId: "l1",
    order: 4,
    title: "BTUs, Tons & Sizing",
    summary: "A 'ton' of cooling is 12,000 BTU/h. Learn why size matters.",
    minutes: 7,
    objectives: ["Convert tons to BTU/h", "Explain why oversizing is a problem", "Know that load calculations size equipment"],
    skills: ["fundamentals"],
    steps: [
      concept(
        "Where 'ton' comes from",
        [
          "One **ton of refrigeration = 12,000 BTU/h**. It's the rate of cooling you'd get from melting one ton of ice over 24 hours (288,000 BTU ÷ 24).",
          "Residential systems usually range from **1.5 to 5 tons**. A '3-ton' unit is rated around 36,000 BTU/h of cooling.",
        ],
        undefined,
        ["Ton of refrigeration"],
      ),
      widget("Try it: tonnage converter", "tonnage-calc", "Slide to convert between tons and BTU/h."),
      ask(numeric("l1q-tons", "A system is rated 48,000 BTU/h. How many tons is it?", 4, 0, "tons", "48,000 ÷ 12,000 = 4 tons.", F)),
      concept("Bigger is NOT better", [
        "An **oversized** AC cools the air quickly and shuts off before it removes enough moisture. Result: cold-and-clammy rooms, more on/off cycles ([[short cycling]]), and more wear.",
        "An **undersized** unit runs constantly and can't keep up on the hottest days.",
        "Equipment should be sized from a room-by-room **load calculation** (ACCA Manual J), not by square-foot rules of thumb or by matching the old unit.",
      ], undefined, ["Load calculation", "Short cycling"]),
      ask(
        single(
          "l1q-oversize",
          "What is a common symptom of an oversized air conditioner?",
          [
            ["a", "Runs constantly and never shuts off", "That's more typical of undersizing or a performance problem."],
            ["b", "Short cycles and leaves the house cool but humid", "Right."],
            ["c", "Uses no electricity"],
          ],
          "b",
          "Oversized units satisfy the thermostat too fast, so they don't run long enough to dehumidify, and they cycle frequently.",
          F,
        ),
      ),
      ask(tf("l1q-sizing-rule", "True or false: The professional way to size a new system is to install the same size as the old one.", false, "The old unit may have been sized wrong, and the house may have changed (windows, insulation). Use a load calculation such as ACCA Manual J.", F)),
    ],
    sources: [{ id: "acca-j" }, { id: "acca-s" }, { id: "energy-star" }],
    revised: R,
  }),

  lesson({
    id: "l1-air-humidity",
    levelId: "l1",
    order: 5,
    title: "Airflow & Humidity Basics",
    summary: "Air carries the heat; moisture changes how it feels. Meet CFM, RH and dew point.",
    minutes: 8,
    objectives: ["Define CFM", "Explain relative humidity and dew point", "Explain why coils sweat"],
    skills: ["fundamentals", "airflow"],
    steps: [
      concept("Air is the delivery truck", [
        "The refrigerant moves heat between the coils, but **air** carries heat to and from the coil. No airflow, no heat transfer.",
        "We measure airflow in **CFM** — cubic feet per minute. A common starting point is roughly **400 CFM per ton** of cooling, but the manufacturer's data and the home's needs set the real target.",
      ], "house-airflow", ["CFM"]),
      concept("Humidity, RH, and dew point", [
        "**Relative humidity (RH)** compares the moisture in the air with the most it could hold at that temperature. Warm air can hold more water than cold air.",
        "Cool air enough and it reaches its **dew point** — moisture condenses out. That's why a cold drink sweats.",
        "Your evaporator coil runs well below the room's dew point, so it pulls water out of the air. That water is **condensate**, and it has to be drained away.",
      ], undefined, ["Relative humidity", "Dew point", "Condensate"]),
      ask(
        single(
          "l1q-condensate",
          "Why does water drip from the indoor coil of an air conditioner?",
          [
            ["a", "The refrigerant is leaking out as water"],
            ["b", "The coil is colder than the air's dew point, so moisture condenses on it", "Yes — that's dehumidification."],
            ["c", "The filter is wet"],
          ],
          "b",
          "Air passing over a coil below its dew point gives up moisture, which drains as condensate. Refrigerant is not water.",
          F,
        ),
      ),
      ask(tf("l1q-rh", "True or false: If you cool air without adding or removing moisture, its relative humidity goes up.", true, "Cooler air can hold less moisture, so the same amount of water is a higher percentage of the maximum.", F)),
      ask(
        single(
          "l1q-cfm-ton",
          "A common rule-of-thumb starting point for cooling airflow is about how many CFM per ton?",
          [
            ["a", "40"],
            ["b", "400"],
            ["c", "4,000"],
          ],
          "b",
          "About 400 CFM/ton is the classic nominal value (often 350–450). Always verify against manufacturer data and conditions — humid climates often use lower airflow for better moisture removal.",
          F,
        ),
      ),
    ],
    sources: [{ id: "ashrae-fund" }, { id: "acca-d" }],
    revised: R,
  }),

  lesson({
    id: "l1-system-types",
    levelId: "l1",
    order: 6,
    title: "Meet the System Types",
    summary: "Split systems, package units, heat pumps, furnaces and air handlers — what goes where.",
    minutes: 10,
    objectives: ["Identify split vs package systems", "Explain what a heat pump does differently", "Tell a furnace from an air handler"],
    skills: ["fundamentals", "components"],
    steps: [
      concept("Split system", [
        "The most common US home setup. An **outdoor unit** (compressor + condenser coil + fan) connects to an **indoor unit** (furnace or air handler with an evaporator coil) through a copper [[line set]].",
      ], "split-system", ["Split system", "Line set"]),
      widget("Explore a split system", "component-explorer", "Tap each part to see what it does."),
      concept("Package unit", ["Everything in **one cabinet** outdoors — on a slab or roof — with ducts running into the building. Common in the Southwest, mobile homes and light commercial.", "Gas/electric packages ('gas packs') have both a furnace section and AC in the same box."], "package-unit", ["Package unit"]),
      concept("Heat pump", [
        "A **heat pump** is an air conditioner that can run **in reverse**. A [[reversing valve]] flips the flow so the outdoor coil absorbs heat from outside air and the indoor coil releases it into the house.",
        "It moves heat rather than making it, so in mild weather it can deliver more heat energy than the electricity it uses.",
      ], "heat-pump", ["Heat pump", "Reversing valve"]),
      concept("Furnace vs air handler", [
        "A **furnace** makes heat — by burning gas/oil, or with electric elements — and has a blower to move air. A cooling coil usually sits on top of it.",
        "An **air handler** is a blower cabinet with the evaporator coil inside, often paired with a heat pump and optional electric **heat strips**.",
      ], "furnace", ["Furnace", "Air handler"]),
      ask(
        match(
          "l1q-systems-match",
          "Match each system to its description.",
          [
            ["Split system", "Outdoor condensing unit + indoor coil connected by a line set"],
            ["Package unit", "All components in one outdoor cabinet"],
            ["Heat pump", "Reverses the refrigeration cycle to heat or cool"],
            ["Air handler", "Indoor blower cabinet with coil and optional heat strips"],
          ],
          "These four layouts cover most residential equipment you'll see in the field.",
          F,
        ),
      ),
      ask(
        single(
          "l1q-heatpump",
          "What component lets a heat pump switch between heating and cooling?",
          [
            ["a", "Contactor"],
            ["b", "Reversing valve"],
            ["c", "Filter drier"],
            ["d", "Flame sensor"],
          ],
          "b",
          "The reversing (four-way) valve redirects compressor discharge gas to either the outdoor coil (cooling) or the indoor coil (heating).",
          F,
        ),
      ),
    ],
    sources: [{ id: "ashrae-fund" }, { id: "energy-star" }],
    revised: R,
  }),

  lesson({
    id: "l1-thermostats-terms",
    levelId: "l1",
    order: 7,
    title: "Thermostats & Shop Talk",
    summary: "How a thermostat calls for heat, cool and fan — plus the words techs use every day.",
    minutes: 8,
    objectives: ["Describe what a thermostat does", "Recognize the common thermostat terminals", "Use basic HVAC vocabulary"],
    skills: ["fundamentals", "electrical"],
    steps: [
      concept("The thermostat is a switch", [
        "Most residential thermostats are switches on a **24-volt** control circuit. When it wants cooling, it connects **R** (24 V power) to **Y** (compressor) and **G** (fan).",
        "Common terminals: **R** = 24 V power, **C** = common, **Y** = cooling/compressor, **G** = indoor fan, **W** = heat, **O/B** = heat pump reversing valve.",
      ], "thermostat-wiring", ["Thermostat"]),
      widget("Thermostat simulator", "thermostat-sim", "Pick a mode and setpoint. Watch which terminals the thermostat energizes."),
      ask(
        match(
          "l1q-tstat-terms",
          "Match each thermostat terminal to its usual job.",
          [
            ["R", "24 V power from the transformer"],
            ["Y", "Calls the compressor (cooling)"],
            ["G", "Calls the indoor blower"],
            ["W", "Calls heat"],
            ["C", "Common — completes the 24 V circuit"],
          ],
          "These are conventional assignments. Always confirm against the equipment's wiring diagram, especially on heat pumps and communicating systems.",
          F,
        ),
      ),
      ask(
        single(
          "l1q-cool-call",
          "In cooling mode with the fan on AUTO, which terminals does a conventional thermostat connect to R?",
          [
            ["a", "W only"],
            ["b", "Y and G"],
            ["c", "C only"],
          ],
          "b",
          "A cooling call energizes Y (compressor via the outdoor contactor) and G (indoor blower).",
          F,
        ),
      ),
      ask(
        order(
          "l1q-call-order",
          "Put a simple cooling call in order.",
          [
            "Room temperature rises above setpoint",
            "Thermostat connects R to Y and G",
            "Outdoor contactor pulls in and indoor blower starts",
            "Room temperature reaches setpoint and the call ends",
          ],
          "Thermostat senses, closes the circuit, the equipment responds, and the call ends when satisfied.",
          F,
        ),
      ),
      safety("Low voltage isn't 'no voltage'", [
        "The thermostat side is 24 V, but the same equipment has 120 V or 240 V circuits a few inches away. Treat every cabinet as energized until you've turned off power and **verified** it's off with a meter.",
      ]),
    ],
    sources: [{ id: "mfr-iom", note: "Terminal designations follow common convention; verify with each wiring diagram." }, { id: "nate-ka" }],
    revised: R,
  }),
];
