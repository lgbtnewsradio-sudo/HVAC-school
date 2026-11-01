import { ask, concept, example, lesson, match, multi, order, safety, single, tf } from "./dsl";

const P = { skills: ["professional" as const] };
const PS = { skills: ["professional" as const, "safety" as const] };
const R = "2026-10-15";

export const LEVEL10 = [
  lesson({
    id: "l10-maintenance",
    levelId: "l10",
    order: 1,
    title: "Preventative Maintenance",
    summary: "A maintenance visit that actually prevents breakdowns — not a 'look and leave'.",
    minutes: 10,
    objectives: ["Perform a complete maintenance checklist", "Spot problems before they fail", "Record baseline readings"],
    skills: ["professional", "troubleshooting"],
    pro: true,
    steps: [
      concept("A real maintenance checklist", [
        "**Cooling**: filter, coil condition, condensate drain & trap, float switch test, capacitor µF, contactor condition, electrical connections, amps vs nameplate, static pressure, temperature split, SH/SC as appropriate.",
        "**Heating (gas)**: burners, flame appearance, ignition, flame sensor µA, heat exchanger inspection, venting, gas pressure, combustion analysis, CO check, temperature rise, safeties.",
        "ACCA's **4 QM** standard describes maintenance tasks for residential systems.",
      ]),
      ask(
        multi("l10q-pm", "Which belong in a cooling maintenance visit? (Select all.)", [["a", "Test capacitor µF"], ["b", "Clear and flush the condensate drain"], ["c", "Measure static pressure"], ["d", "Add refrigerant 'just in case'", "Never add refrigerant without a diagnosed need."]], ["a", "b", "c"], "Measure and record — don't add refrigerant without evidence.", P),
      ),
      ask(
        single(
          "l10q-pm-baseline",
          "Why record readings (static, amps, superheat/subcooling, µF) at every maintenance visit?",
          [
            ["a", "To build a baseline so changes over time reveal developing problems", "Correct."],
            ["b", "Only because the paperwork requires it"],
            ["c", "To justify adding refrigerant"],
          ],
          "a",
          "Trends — a capacitor slowly losing µF, static creeping up — let you fix things before they fail.",
          P,
        ),
      ),
      example("On the job", ["A capacitor rated 45 µF tests at 41 µF (below a ±6% tolerance minimum of 42.3). It still runs, but it's out of spec — recommend replacement, show the reading, let the customer decide."]),
    ],
    sources: [{ id: "acca-4qm" }, { id: "nfpa-54" }],
    revised: R,
  }),

  lesson({
    id: "l10-customer-docs",
    levelId: "l10",
    order: 2,
    title: "Customer Communication & Documentation",
    summary: "Explain clearly, recommend honestly, write it down.",
    minutes: 9,
    objectives: ["Explain findings in plain language", "Write a complete service ticket", "Present options without pressure"],
    skills: ["professional"],
    pro: true,
    steps: [
      concept("Communicating findings", [
        "Lead with what you **found** and **what it means for them** — comfort, safety, cost. Show photos and readings. Avoid jargon or explain it.",
        "Present **options** (repair now, monitor, replace) with honest pros and cons. Let the customer choose.",
      ]),
      concept("Documentation", [
        "A good ticket includes: complaint, equipment data (model/serial), what you inspected, **readings**, diagnosis, work performed, parts used, refrigerant recovered/added (as required by regulations and company policy), and recommendations.",
        "Good records protect you, your company and the customer — and make the next visit faster.",
      ]),
      ask(
        multi("l10q-ticket", "A complete service ticket includes… (Select all.)", [["a", "Measured readings"], ["b", "Diagnosis and work performed"], ["c", "Refrigerant added/recovered"], ["d", "Recommendations"], ["e", "Guesses you didn't verify", "Document facts."]], ["a", "b", "c", "d"], "Facts, measurements, and actions — so anyone can understand what happened.", P),
      ),
      ask(
        single("l10q-pressure", "A customer has a 15-year-old system with a failed $200 part. What's the professional approach?", [["a", "Tell them they must replace the system"], ["b", "Explain the repair cost, the system's condition, and replacement considerations; let them decide", "Correct."], ["c", "Fix it without telling them anything"]], "b", "Honest options build long-term trust and repeat customers.", P),
      ),
    ],
    sources: [{ id: "acca-4qm" }, { id: "epa-608" }],
    revised: R,
  }),

  lesson({
    id: "l10-estimating-replacement",
    levelId: "l10",
    order: 3,
    title: "Estimating & Replacement Decisions",
    summary: "Repair vs replace, efficiency upgrades, and quoting a job you can stand behind.",
    minutes: 10,
    objectives: ["Weigh repair vs replace", "Explain SEER2, HSPF2 and AFUE", "Build a fair estimate"],
    skills: ["professional"],
    pro: true,
    steps: [
      concept("Repair or replace?", [
        "Consider: age and condition • cost of the repair vs the system's remaining life • refrigerant availability (e.g., R-22 is no longer produced) • efficiency and operating cost • comfort problems the old system never solved • safety (e.g., a cracked heat exchanger).",
      ]),
      concept("Efficiency ratings", [
        "**SEER2** — cooling efficiency. **HSPF2** — heat pump heating efficiency. **AFUE** — furnace fuel efficiency. Minimum standards are set by the US DOE and vary by region.",
        "Real-world efficiency also depends on installation quality: airflow, duct leakage and correct charge.",
      ], undefined, ["SEER2", "HSPF2", "AFUE"]),
      ask(match("l10q-ratings", "Match the rating to what it measures.", [["SEER2", "Seasonal cooling efficiency"], ["HSPF2", "Heat pump heating efficiency"], ["AFUE", "Furnace annual fuel efficiency"]], "Higher numbers mean more efficient for all three.", P)),
      concept("Estimating", ["Include equipment, materials, labor hours, permits, disposal/recovery, and warranty. Quote in writing with clear scope. Don't low-ball a job by skipping load calculations, evacuation or commissioning."]),
      ask(tf("l10q-r22", "True or false: R-22 availability and cost is a fair factor in a repair-vs-replace conversation.", true, "New R-22 hasn't been produced or imported in the US since 2020; service relies on reclaimed/stockpiled supply.", P)),
    ],
    sources: [{ id: "doe-efficiency" }, { id: "epa-608" }, { id: "energy-star" }],
    revised: R,
  }),

  lesson({
    id: "l10-jobsite-safety",
    levelId: "l10",
    order: 4,
    title: "Jobsite Safety, Codes & Standards",
    summary: "PPE, ladders, rooftops, attics and the codes that govern the work.",
    minutes: 11,
    objectives: ["Select appropriate PPE", "Apply ladder and roof safety", "Know which codes apply"],
    skills: ["professional", "safety"],
    pro: true,
    steps: [
      safety("PPE", ["Safety glasses always • gloves (cut-resistant, and insulated for refrigerant/brazing as needed) • hearing protection • respirator in dusty attics or around mold/insulation • electrical PPE per NFPA 70E when live testing is required."]),
      safety("Ladders, roofs & attics", [
        "Inspect ladders before use; maintain **three points of contact**; set extension ladders at about a **4:1** angle and extend **3 feet above** the landing. Fall protection is required at heights specified by OSHA for the work setting.",
        "In attics: step only on framing, watch for nails and heat exhaustion, and know where wiring runs. Hydrate and take breaks in extreme heat.",
      ]),
      concept("Codes & standards", [
        "Work is governed by the **codes adopted locally** — typically a mechanical code, electrical code (NEC-based), fuel gas code, plus refrigerant safety standards (ASHRAE 15/34) and manufacturer instructions. Permits and inspections are required for many installations.",
        "Codes vary by jurisdiction and edition. Always check what applies where you work.",
      ]),
      ask(
        multi("l10q-ladder", "Which are correct ladder practices? (Select all.)", [["a", "Three points of contact"], ["b", "Extend 3 ft above the roof edge"], ["c", "About 4:1 setup angle"], ["d", "Stand on the top rung for extra reach", "Never."]], ["a", "b", "c"], "OSHA ladder guidance helps prevent the most common trade injury: falls.", PS),
      ),
      ask(
        single("l10q-codes", "Which takes precedence when a manufacturer's instructions are stricter than the minimum code?", [["a", "Ignore the instructions; meet the code minimum"], ["b", "Follow both — meet the code and the manufacturer's (stricter) instructions", "Correct."], ["c", "Whatever is faster"]], "b", "Codes typically require installation per the listing and manufacturer's instructions, in addition to code minimums.", PS),
      ),
    ],
    sources: [{ id: "osha-ladders" }, { id: "nfpa-70e" }, { id: "nec" }, { id: "ashrae-15-34" }],
    revised: R,
  }),

  lesson({
    id: "l10-ethics",
    levelId: "l10",
    order: 5,
    title: "Professional Ethics",
    summary: "Honesty, licensing, refrigerant stewardship and doing the right thing when no one's watching.",
    minutes: 8,
    objectives: ["Apply ethical principles on service calls", "Understand licensing and certification obligations", "Handle mistakes professionally"],
    skills: ["professional"],
    pro: true,
    steps: [
      concept("What professionals do", [
        "Recommend only what's needed • never fake readings or invent problems • work within your license and certification • follow refrigerant laws • leave the site clean and safe • own your mistakes and make them right.",
      ]),
      ask(
        order("l10q-mistake", "You discover you mis-wired a thermostat yesterday. Order the professional response.", ["Contact the customer promptly", "Return and correct the wiring", "Verify every mode works", "Document what happened and what was fixed"], "Own it, fix it, verify it, document it.", P),
      ),
      ask(
        single("l10q-ethics", "A supervisor asks you to tell a customer their system needs refrigerant when your readings show the charge is correct. What do you do?", [["a", "Do it — the supervisor said so"], ["b", "Report your actual readings honestly and decline to misrepresent them", "Correct."], ["c", "Add refrigerant anyway"]], "b", "Misrepresenting repairs is dishonest, can be illegal, and adding refrigerant to a correctly charged system harms it.", P),
      ),
      example("Your reputation", ["Most techs who build loyal customer lists do it the same way: clear explanations, fair prices, and showing the evidence. That's what this whole academy trains you to do."]),
    ],
    sources: [{ id: "epa-608" }, { id: "nate-ka" }],
    revised: R,
  }),
];

