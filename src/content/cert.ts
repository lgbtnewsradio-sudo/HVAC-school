import { multi, numeric, single, tf } from "./lessons/dsl";
import type { QuestionInput } from "./types";

const C = { skills: ["certification" as const] };
const CS = { skills: ["certification" as const, "safety" as const] };

export type CertTrack = {
  id: string;
  title: string;
  short: string;
  description: string;
  /** Exams draw `questionCount` random questions from these banks. */
  banks: string[];
  questionCount: number;
  minutes: number;
  passMark: number;
  pro: boolean;
  disclaimer: string;
};

const NOT_OFFICIAL =
  "Practice only. Completing this practice exam is not an official certification. HVAC Academy is not affiliated with or endorsed by the EPA, NATE, HVAC Excellence, ESCO Group or any certifying organization.";

export const CERT_TRACKS: CertTrack[] = [
  {
    id: "epa-core",
    title: "EPA Section 608 — Core",
    short: "608 Core",
    description: "Ozone depletion, the Clean Air Act, the Montreal Protocol, recovery/recycle/reclaim, cylinders, dehydration and safety.",
    banks: ["epa-core"],
    questionCount: 20,
    minutes: 25,
    passMark: 72,
    pro: false,
    disclaimer: NOT_OFFICIAL + " The official EPA 608 exam must be taken through an EPA-approved certifying organization.",
  },
  {
    id: "epa-type1",
    title: "EPA Section 608 — Type I (Small Appliances)",
    short: "608 Type I",
    description: "Small appliances with 5 lb or less of refrigerant: recovery requirements and techniques.",
    banks: ["epa-type1"],
    questionCount: 10,
    minutes: 15,
    passMark: 72,
    pro: false,
    disclaimer: NOT_OFFICIAL,
  },
  {
    id: "epa-type2",
    title: "EPA Section 608 — Type II (High Pressure)",
    short: "608 Type II",
    description: "High-pressure appliances: leak repair, evacuation levels, recovery and charging.",
    banks: ["epa-type2"],
    questionCount: 12,
    minutes: 15,
    passMark: 72,
    pro: true,
    disclaimer: NOT_OFFICIAL,
  },
  {
    id: "epa-type3",
    title: "EPA Section 608 — Type III (Low Pressure)",
    short: "608 Type III",
    description: "Low-pressure chillers: purge units, rupture discs, leak testing and recovery.",
    banks: ["epa-type3"],
    questionCount: 10,
    minutes: 15,
    passMark: 72,
    pro: true,
    disclaimer: NOT_OFFICIAL,
  },
  {
    id: "nate-core",
    title: "NATE Knowledge Areas — Practice",
    short: "NATE-style",
    description: "Practice across core knowledge areas commonly covered for HVAC technicians: safety, tools, heat transfer, electrical, AC, heat pumps and gas heating.",
    banks: ["nate"],
    questionCount: 15,
    minutes: 25,
    passMark: 70,
    pro: true,
    disclaimer: NOT_OFFICIAL,
  },
  {
    id: "hvac-excellence",
    title: "HVAC Excellence-Style Employment Ready Practice",
    short: "Employment Ready",
    description: "Entry-level competency practice: electrical, refrigeration, airflow and heating fundamentals.",
    banks: ["hvacx"],
    questionCount: 12,
    minutes: 20,
    passMark: 70,
    pro: true,
    disclaimer: NOT_OFFICIAL,
  },
  {
    id: "apprentice",
    title: "Apprenticeship Readiness",
    short: "Apprentice",
    description: "Trade math, tools, safety and basic mechanical aptitude for apprenticeship applicants.",
    banks: ["apprentice"],
    questionCount: 12,
    minutes: 15,
    passMark: 70,
    pro: false,
    disclaimer: "Practice only — apprenticeship entry requirements vary by program.",
  },
];

export const CERT_BANKS: Record<string, QuestionInput[]> = {
  "epa-core": [
    single("ce-ozone", "Which part of a CFC molecule is primarily responsible for stratospheric ozone depletion?", [["a", "Fluorine"], ["b", "Chlorine"], ["c", "Carbon"], ["d", "Hydrogen"]], "b", "Chlorine released in the stratosphere destroys ozone molecules catalytically — one chlorine atom can destroy many ozone molecules.", C),
    single("ce-odp-rank", "Rank by ozone depletion potential: which group is LOWEST?", [["a", "CFCs"], ["b", "HCFCs"], ["c", "HFCs"]], "c", "HFCs contain no chlorine and have zero ODP (though many have high global warming potential). CFCs are highest, HCFCs lower.", C),
    single("ce-montreal", "The Montreal Protocol is:", [["a", "A US state law"], ["b", "An international agreement to phase out ozone-depleting substances"], ["c", "A refrigerant brand"]], "b", "The 1987 Montreal Protocol is the international treaty that phases out production of ozone-depleting substances.", C),
    tf("ce-venting", "It is illegal to knowingly vent CFC, HCFC and HFC refrigerants during maintenance, service, repair or disposal of appliances.", true, "Clean Air Act Section 608 prohibits knowing venting of ODS (since July 1, 1992) and their substitutes such as HFCs (since November 15, 1995), with de minimis exceptions.", C),
    single("ce-uv", "Stratospheric ozone protects life on Earth by absorbing:", [["a", "Infrared radiation"], ["b", "Harmful ultraviolet (UV) radiation"], ["c", "Carbon dioxide"]], "b", "Ozone absorbs UV-B radiation linked to skin cancer, cataracts and crop damage.", C),
    match3(),
    single("ce-cyl-color", "An approved refrigerant recovery cylinder is typically identified by:", [["a", "Red body"], ["b", "Gray body with a yellow top/shoulder"], ["c", "Green body"], ["d", "White body with a blue top"]], "b", "Recovery cylinders are gray with yellow tops and are DOT-approved for refillable use.", C),
    single("ce-80pct", "Recovery cylinders should not be filled beyond what percentage of their capacity (by weight of liquid)?", [["a", "50%"], ["b", "80%"], ["c", "95%"], ["d", "100%"]], "b", "Leave room for liquid expansion. Overfilled cylinders can rupture hydrostatically as temperature rises.", CS),
    tf("ce-heat-cyl", "It is acceptable to heat a refrigerant cylinder with an open flame to speed up charging.", false, "Never use open flame. Excessive heat can rupture the cylinder. Cylinders shouldn't be heated above about 125 °F.", CS),
    single("ce-nitrogen", "When pressurizing a system with nitrogen for leak testing, you must use:", [["a", "A pressure regulator and relief valve"], ["b", "An oxygen cylinder"], ["c", "No special equipment"]], "a", "Nitrogen cylinders are at very high pressure; a regulator (and relief valve) prevents dangerously over-pressurizing the system.", CS),
    single("ce-oxygen", "Which gas must NEVER be used to pressurize a refrigeration system?", [["a", "Nitrogen"], ["b", "Oxygen"], ["c", "Dry nitrogen with trace refrigerant (where permitted)"]], "b", "Oxygen mixed with compressor oil can explode.", CS),
    single("ce-dehydrate", "The main purpose of dehydration (evacuation) is to remove:", [["a", "Oil"], ["b", "Air and moisture"], ["c", "Refrigerant"]], "b", "Moisture combines with refrigerant and oil to form acids and sludge; air raises head pressure.", C),
    single("ce-vacuum-level", "Which instrument best measures a deep vacuum during dehydration?", [["a", "Compound gauge"], ["b", "Micron gauge"], ["c", "Thermometer"]], "b", "A micron gauge resolves the deep vacuum levels needed to confirm dehydration.", C),
    single("ce-reclaim", "Refrigerant reprocessed to AHRI Standard 700 purity by a certified reclaimer has been:", [["a", "Recovered"], ["b", "Recycled"], ["c", "Reclaimed"]], "c", "Recover = remove and store. Recycle = clean for reuse (typically on site). Reclaim = reprocess to new-product specifications, verified by analysis.", C),
    single("ce-recycle", "Cleaning refrigerant for reuse by oil separation and filter-drier passes is called:", [["a", "Recycling"], ["b", "Reclaiming"], ["c", "Venting"]], "a", "Recycling reduces contaminants but doesn't certify the refrigerant to new-product purity like reclaiming does.", C),
    tf("ce-sales", "Sale of most refrigerants for use in appliances is restricted to EPA Section 608 (or 609, for motor vehicle AC) certified technicians.", true, "EPA restricts sales of ODS and most substitute refrigerants to certified technicians (with specific exceptions such as small cans of certain MVAC refrigerant).", C),
    single("ce-frostbite", "The primary personal hazard when handling liquid refrigerant is:", [["a", "Frostbite and eye injury"], ["b", "Sunburn"], ["c", "Static shock"]], "a", "Liquid refrigerant flashes and can freeze skin and eyes instantly. Wear gloves and safety glasses.", CS),
    single("ce-asphyx", "In a confined space, a large refrigerant leak is dangerous because refrigerant vapor:", [["a", "Is lighter than air and rises away"], ["b", "Is heavier than air and can displace oxygen"], ["c", "Is always toxic in small amounts"]], "b", "Most refrigerant vapors are heavier than air and can cause asphyxiation in low areas. Ventilate and use oxygen monitoring where required.", CS),
    single("ce-phosgene", "Exposing some refrigerants to open flame or very hot surfaces can produce:", [["a", "Pure water"], ["b", "Toxic decomposition products (e.g., phosgene, hydrofluoric acid)"], ["c", "Oxygen"]], "b", "Halogenated refrigerants decompose into toxic, corrosive gases when heated. Recover refrigerant before brazing.", CS),
    single("ce-penalty", "Violating the Clean Air Act refrigerant regulations can result in:", [["a", "A warning letter only"], ["b", "Substantial fines per day per violation, and potential criminal penalties"], ["c", "No consequences"]], "b", "EPA can assess civil penalties (adjusted annually for inflation) per day per violation; knowing violations may be criminal. Rewards are offered for information leading to penalties.", C),
    single("ce-de-minimis", "Which is considered a 'de minimis' release (not a violation) when good practices are followed?", [["a", "Opening a valve to dump the charge"], ["b", "Small releases when connecting/disconnecting hoses while following required practices"], ["c", "Purging a line set with refrigerant"]], "b", "Minimal releases during good-faith recovery/recycling and hose connections are de minimis; using refrigerant to purge lines is not.", C),
    tf("ce-gwp", "HFC refrigerants such as R-410A have zero ozone depletion potential but can have high global warming potential.", true, "That's why the AIM Act phases down HFC production and transitions new equipment to lower-GWP refrigerants.", C),
  ],
  "epa-type1": [
    single("t1-def", "Under EPA rules, a 'small appliance' is a product that is fully manufactured, charged, and hermetically sealed in a factory with:", [["a", "5 pounds or less of refrigerant"], ["b", "50 pounds or less"], ["c", "Any amount"]], "a", "Small appliances (Type I) contain 5 lb or less — e.g., refrigerators, window ACs, dehumidifiers, vending machines.", C),
    single("t1-90", "Recovery equipment manufactured after November 15, 1993, used on a small appliance with an OPERATING compressor must recover what percentage of the refrigerant?", [["a", "80%"], ["b", "90%"], ["c", "50%"]], "b", "90% with an operating compressor, 80% with a non-operating compressor — or achieve a 4 in. Hg vacuum.", C),
    single("t1-80", "With a NON-operating compressor, post-1993 recovery equipment must recover:", [["a", "80% of the charge"], ["b", "90%"], ["c", "100%"]], "a", "80% with a non-operating compressor (or 4 in. Hg vacuum).", C),
    single("t1-4hg", "Alternatively, post-1993 recovery equipment may meet requirements by pulling a vacuum of:", [["a", "4 inches of mercury"], ["b", "25 mm Hg absolute"], ["c", "0 psig"]], "a", "4 in. Hg vacuum is the alternative standard for small appliances.", C),
    single("t1-passive", "System-dependent (passive) recovery on a small appliance with a non-operating compressor can be helped by:", [["a", "Heating and tapping the compressor to release refrigerant from the oil"], ["b", "Venting the high side"], ["c", "Adding nitrogen"]], "a", "Warming the compressor (e.g., heat lamp/gun, not open flame) and tapping it helps free refrigerant from the oil.", C),
    single("t1-piercing", "Solderless piercing-type access valves:", [["a", "Are permanent and never leak"], ["b", "Tend to leak over time and should be removed after service (or not left on)"], ["c", "Are illegal"]], "b", "Piercing valves are convenient for recovery but can leak; they shouldn't be left installed long term.", C),
    tf("t1-sealed", "Before recovering from a small appliance, a technician should check what refrigerant is in it, since some systems use substitutes or flammable refrigerants (e.g., hydrocarbons).", true, "Check the nameplate/labels. Hydrocarbon refrigerants (e.g., R-600a, R-290) require specific procedures.", CS),
    single("t1-cert", "Type I certification allows technicians to service:", [["a", "Small appliances"], ["b", "Low-pressure chillers"], ["c", "All appliances"]], "a", "Type I covers small appliances only. Universal = Core + Types I, II and III.", C),
    single("t1-mvac", "Motor vehicle air conditioning (MVAC) systems are covered under:", [["a", "Section 608 Type I"], ["b", "Section 609"], ["c", "Section 608 Type III"]], "b", "MVAC is regulated under Clean Air Act Section 609, not 608.", C),
    tf("t1-both-sides", "When using a system-dependent recovery process on a small appliance with a non-operating compressor, accessing both the high and low sides helps achieve required recovery.", true, "Installing access on both sides speeds and improves recovery when the compressor can't run.", C),
  ],
  "epa-type2": [
    single("t2-def", "Type II certification covers:", [["a", "Small appliances"], ["b", "High-pressure and very-high-pressure appliances (e.g., R-22, R-410A systems), except small appliances and MVAC"], ["c", "Low-pressure chillers"]], "b", "Type II: high-pressure (e.g., residential split systems) and very high pressure appliances.", C),
    single("t2-leak-comfort", "For comfort-cooling appliances containing 50 lb or more of ozone-depleting refrigerant, leaks must be repaired when the leak rate exceeds:", [["a", "5%"], ["b", "10%"], ["c", "20%"], ["d", "30%"]], "b", "Under the current Section 608 leak-repair rules for ODS appliances: comfort cooling 10%, commercial refrigeration 20%, industrial process refrigeration 30%.", C),
    single("t2-leak-commercial", "The leak-rate threshold for commercial refrigeration appliances (50 lb or more of ODS refrigerant) is:", [["a", "10%"], ["b", "20%"], ["c", "35%"]], "b", "Commercial refrigeration: 20%. Industrial process refrigeration: 30%.", C),
    single("t2-evac-lt200", "Using recovery equipment made after Nov. 15, 1993, a high-pressure appliance (e.g., R-22) with LESS than 200 lb of refrigerant must be evacuated to:", [["a", "0 in. Hg (0 psig)"], ["b", "10 in. Hg vacuum"], ["c", "25 mm Hg absolute"]], "a", "For HCFC-22 appliances under 200 lb: 0 in. Hg. 200 lb or more: 10 in. Hg (post-1993 equipment).", C),
    single("t2-evac-ge200", "Same equipment, but the appliance holds 200 lb or MORE of R-22. Required evacuation level?", [["a", "0 in. Hg"], ["b", "10 in. Hg vacuum"], ["c", "29.9 in. Hg"]], "b", "10 in. Hg for 200 lb or more with post-1993 recovery equipment.", C),
    single("t2-liquid-first", "To speed recovery from a large system, the technician should first:", [["a", "Recover vapor only"], ["b", "Remove as much liquid as possible first"], ["c", "Heat the receiver with a torch"]], "b", "Liquid recovery moves far more refrigerant quickly; then recover the remaining vapor.", C),
    single("t2-nitrogen-leak", "A recommended way to leak-test a system that has lost its entire charge:", [["a", "Pressurize with dry nitrogen (through a regulator) and test with bubbles/ultrasonic"], ["b", "Fill with oxygen"], ["c", "Run the compressor in a vacuum"]], "a", "Nitrogen is safe and inexpensive. Some techs add a trace of the system's refrigerant where allowed for electronic detection.", C),
    single("t2-noncond", "A recovery cylinder with high pressure above the PT value for its temperature most likely contains:", [["a", "Non-condensables (air)"], ["b", "Pure refrigerant"], ["c", "Oil"]], "a", "If pressure exceeds saturation pressure at the cylinder's temperature, non-condensable gases are present.", C),
    tf("t2-sys-dep", "System-dependent (passive) recovery equipment may not be used on appliances with more than 15 lb of refrigerant.", true, "Self-contained recovery equipment is required above 15 lb.", C),
    single("t2-moisture-sign", "A sight glass/moisture indicator changing color suggests:", [["a", "Moisture in the system"], ["b", "Correct charge"], ["c", "Low voltage"]], "a", "Moisture indicators change color when moisture is present — replace the filter drier and evacuate thoroughly.", C),
    single("t2-charge-blend", "When charging a near-azeotropic or zeotropic blend (e.g., R-410A), refrigerant should leave the cylinder as:", [["a", "Liquid"], ["b", "Vapor"]], "a", "Charging as liquid prevents fractionation. Meter it into the system so liquid doesn't enter the compressor.", C),
    single("t2-receiver", "Before disposing of an appliance with an R-410A charge, a technician must:", [["a", "Recover the refrigerant"], ["b", "Vent it outdoors"], ["c", "Cut the lines"]], "a", "Recovery is required prior to disposal (and documentation requirements may apply to the final disposer).", C),
  ],
  "epa-type3": [
    single("t3-def", "Type III certification covers:", [["a", "Low-pressure appliances such as centrifugal chillers using R-123 or R-11"], ["b", "Window AC units"], ["c", "Car AC"]], "a", "Low-pressure refrigerants have boiling points above about 50 °F at atmospheric pressure, so these systems run in a vacuum on the low side.", C),
    single("t3-air-in", "Because low-pressure systems operate below atmospheric pressure, leaks usually let:", [["a", "Refrigerant escape only"], ["b", "Air and moisture into the system"], ["c", "Oil out"]], "b", "Air and moisture are drawn in; a purge unit removes the non-condensables.", C),
    single("t3-purge", "The device that removes non-condensables from a low-pressure chiller is:", [["a", "A purge unit"], ["b", "A filter drier"], ["c", "A rupture disc"]], "a", "High-efficiency purge units minimize refrigerant loss while removing air.", C),
    single("t3-rupture", "The rupture disc on a low-pressure chiller evaporator typically relieves at:", [["a", "15 psig"], ["b", "150 psig"], ["c", "400 psig"]], "a", "Rupture discs are commonly set at 15 psig on low-pressure chillers.", C),
    single("t3-leaktest", "To leak test a low-pressure chiller, pressure may be raised (e.g., with controlled hot water or heating blankets) to no more than:", [["a", "10 psig"], ["b", "100 psig"], ["c", "300 psig"]], "a", "Staying below the 15 psig rupture disc, 10 psig is the commonly cited maximum.", C),
    single("t3-evac", "Post-1993 recovery equipment on low-pressure appliances must evacuate to:", [["a", "25 mm Hg absolute"], ["b", "0 psig"], ["c", "4 in. Hg"]], "a", "25 mm Hg absolute (≈29 in. Hg vacuum) for low-pressure appliances with post-1993 equipment.", C),
    single("t3-water", "During refrigerant recovery from a chiller, water should be circulated through the tubes to:", [["a", "Prevent tubes from freezing"], ["b", "Speed corrosion"], ["c", "Cool the compressor motor"]], "a", "Removing refrigerant drops the evaporator pressure and temperature, risking frozen and ruptured tubes.", C),
    single("t3-liquid-first", "Recovering from a low-pressure chiller typically starts with:", [["a", "Liquid removal, then vapor"], ["b", "Venting the vapor"], ["c", "Charging nitrogen"]], "a", "Liquid first (it's most of the charge), then vapor.", C),
    tf("t3-charge-vapor", "When charging a low-pressure chiller from a deep vacuum, vapor should be introduced first to avoid freezing the water in the tubes.", true, "Introduce vapor until the evaporator saturation temperature is above the freezing point of water, then charge liquid.", C),
    single("t3-mmhg", "Moisture from a leaking water tube in a chiller is a concern because it:", [["a", "Mixes with refrigerant and oil to form acids"], ["b", "Improves efficiency"], ["c", "Has no effect"]], "a", "Water in a refrigeration system causes acids, corrosion and sludge.", C),
  ],
  nate: [
    single("n-heat-flow", "Heat always flows from:", [["a", "Cold to hot"], ["b", "Hot to cold"], ["c", "Low pressure to high pressure"]], "b", "The second law of thermodynamics: heat flows from higher to lower temperature.", C),
    numeric("n-tons", "How many BTU/h is a 2.5-ton system?", 30000, 0, "BTU/h", "2.5 × 12,000 = 30,000 BTU/h.", C),
    single("n-sh-fixed", "Fixed-orifice systems are charged by:", [["a", "Subcooling"], ["b", "Superheat using the manufacturer's chart"], ["c", "Sight glass only"]], "b", "Fixed metering devices use target superheat based on indoor wet bulb and outdoor dry bulb.", C),
    single("n-sc-txv", "TXV systems are charged by:", [["a", "Subcooling"], ["b", "Superheat"], ["c", "Amp draw"]], "a", "The TXV controls superheat, so subcooling to the manufacturer's target indicates charge.", C),
    single("n-cap-tol", "A 7.5 µF ±6% capacitor reading 6.9 µF is:", [["a", "Within tolerance"], ["b", "Below tolerance (min ≈ 7.05 µF)"], ["c", "Over tolerance"]], "b", "7.5 × 0.94 = 7.05 µF minimum.", C),
    single("n-hp-defrost", "During heat pump defrost, the outdoor fan:", [["a", "Runs at high speed"], ["b", "Is off"], ["c", "Runs in reverse"]], "b", "Stopping the outdoor fan lets hot gas warm the coil quickly.", C),
    single("n-furnace-ps", "In an induced-draft furnace, the pressure switch proves:", [["a", "Gas pressure"], ["b", "The inducer is creating draft through the heat exchanger and vent"], ["c", "Refrigerant pressure"]], "b", "Draft must be proven before ignition is allowed.", C),
    single("n-temp-rise", "To verify gas furnace airflow, compare the measured temperature rise to:", [["a", "The nameplate temperature-rise range"], ["b", "Outdoor temperature"], ["c", "The thermostat setpoint"]], "a", "Rise outside the nameplate range indicates an airflow problem (or firing rate issue).", C),
    single("n-tesp", "Total external static pressure is measured in:", [["a", "psig"], ["b", "Inches of water column"], ["c", "Microns"]], "b", "Duct pressures are tiny; in. w.c. is the standard unit.", C),
    single("n-loto", "Before replacing a contactor, a technician must:", [["a", "Lock out/tag out and verify zero voltage"], ["b", "Turn the thermostat off only"], ["c", "Work quickly"]], "a", "The thermostat doesn't remove line voltage from the contactor. Lock out the disconnect and verify.", CS),
    single("n-windings", "On a single-phase compressor, the highest resistance reading is between:", [["a", "C and R"], ["b", "C and S"], ["c", "S and R"]], "c", "S–R is the sum of both windings.", C),
    single("n-flame-rect", "Flame rectification produces:", [["a", "AC voltage"], ["b", "A small DC microamp current"], ["c", "Static pressure"]], "b", "The flame conducts current preferentially in one direction, producing a DC signal the board reads.", C),
    single("n-ctoa", "A high condensing temperature over ambient suggests:", [["a", "Good condenser performance"], ["b", "Poor heat rejection: dirty condenser, fan issue, overcharge or non-condensables"], ["c", "Low indoor airflow"]], "b", "CTOA rises when the condenser can't reject heat.", C),
    multi("n-frozen", "Common causes of a frozen evaporator coil include… (Select all.)", [["a", "Dirty filter"], ["b", "Low charge"], ["c", "Failed blower motor"], ["d", "Dirty condenser coil"]], ["a", "b", "c"], "Low airflow and low charge both drop coil temperature below freezing. A dirty condenser raises pressures.", C),
    single("n-a2l", "Equipment using A2L refrigerants requires:", [["a", "No special considerations"], ["b", "Tools, leak detection and procedures rated for mildly flammable refrigerants, plus manufacturer and code requirements"], ["c", "Oxygen purging"]], "b", "A2Ls are mildly flammable; follow updated standards, codes and manufacturer instructions.", CS),
    single("n-acca", "Which ACCA manual covers residential load calculation?", [["a", "Manual D"], ["b", "Manual J"], ["c", "Manual S"]], "b", "J = load, S = selection, D = ducts.", C),
  ],
  hvacx: [
    numeric("hx-ohms", "Using Ohm's law, a 120 V circuit with a 30 Ω load draws how many amps?", 4, 0, "A", "I = V/R = 120/30 = 4 A.", C),
    single("hx-series", "In a series circuit, if one component opens:", [["a", "Only that component stops"], ["b", "The entire circuit stops"], ["c", "Voltage increases everywhere"]], "b", "Series circuits have one path.", C),
    single("hx-transformer", "A typical residential HVAC control transformer secondary supplies:", [["a", "12 VDC"], ["b", "24 VAC"], ["c", "120 VAC"]], "b", "24 VAC is the standard control voltage.", C),
    single("hx-cycle", "The component that changes refrigerant from a high-pressure liquid to a low-pressure liquid/vapor mix is:", [["a", "Compressor"], ["b", "Metering device"], ["c", "Condenser"]], "b", "The metering device creates the pressure drop.", C),
    single("hx-latent", "Removing moisture from air is an example of:", [["a", "Sensible heat removal"], ["b", "Latent heat removal"], ["c", "Radiation"]], "b", "Condensing water vapor removes latent heat.", C),
    single("hx-psia", "0 psig at sea level equals approximately:", [["a", "0 psia"], ["b", "14.7 psia"], ["c", "29.92 psia"]], "b", "Atmospheric pressure at sea level ≈ 14.7 psia.", C),
    single("hx-capacitor", "A run capacitor replacement must have:", [["a", "The same µF rating and an equal or higher voltage rating"], ["b", "Any µF rating"], ["c", "A lower voltage rating"]], "a", "Match µF; voltage rating can be equal or higher.", C),
    single("hx-filter-drier", "The filter drier is located in the:", [["a", "Suction line"], ["b", "Liquid line"], ["c", "Discharge line"]], "b", "Liquid line driers are standard in residential AC (suction-line driers are used for cleanup after burnouts).", C),
    single("hx-cfm", "CFM equals:", [["a", "Velocity (FPM) × area (ft²)"], ["b", "Static pressure × area"], ["c", "Temperature × velocity"]], "a", "The fundamental airflow equation.", C),
    single("hx-hsi", "A hot surface igniter that reads OL (power off) is:", [["a", "Good"], ["b", "Open — replace it"], ["c", "Shorted"]], "b", "OL means no continuity.", C),
    single("hx-co", "Carbon monoxide is produced by:", [["a", "Complete combustion"], ["b", "Incomplete combustion"], ["c", "Refrigerant leaks"]], "b", "Insufficient air, poor burner condition or venting problems cause incomplete combustion.", CS),
    single("hx-superheat", "Superheat is calculated as:", [["a", "Liquid line temp − condensing saturation temp"], ["b", "Suction line temp − evaporator saturation temp"], ["c", "Supply air − return air"]], "b", "Actual vapor temperature minus saturation temperature.", C),
  ],
  apprentice: [
    numeric("ap-fraction", "Add 3/4 inch + 5/8 inch. Answer as a decimal inch (to 3 decimals).", 1.375, 0.001, "in", "3/4 = 6/8; 6/8 + 5/8 = 11/8 = 1.375 in.", C),
    numeric("ap-area", "What is the area in square feet of a 20 × 10 inch return grille opening? (Round to 2 decimals.)", 1.39, 0.01, "ft²", "20 × 10 = 200 in² ÷ 144 = 1.39 ft².", C),
    numeric("ap-percent", "A 30 A breaker is 125% of what current?", 24, 0, "A", "30 ÷ 1.25 = 24 A.", C),
    single("ap-tubing-cutter", "The correct tool for cutting copper refrigerant tubing cleanly is a:", [["a", "Hacksaw"], ["b", "Tubing cutter"], ["c", "Tin snips"]], "b", "Tubing cutters make square, burr-minimal cuts without filings; ream afterward.", C),
    single("ap-ppe", "The PPE you should wear at all times on a job site is:", [["a", "Safety glasses"], ["b", "A welding helmet"], ["c", "Rain gear"]], "a", "Eye protection is the baseline; add gloves, hearing and respiratory protection as tasks require.", CS),
    single("ap-ladder", "The safe setup ratio for an extension ladder is about:", [["a", "1:1"], ["b", "4:1 (1 ft out for every 4 ft up)"], ["c", "10:1"]], "b", "Set the base about 1 ft away for every 4 ft of working height.", CS),
    numeric("ap-temp-convert", "Convert 35 °C to °F.", 95, 0, "°F", "°F = (°C × 9/5) + 32 = 63 + 32 = 95 °F.", C),
    single("ap-level", "To verify an outdoor condensing unit pad is flat, use a:", [["a", "Torpedo or carpenter's level"], ["b", "Multimeter"], ["c", "Manometer"]], "a", "A level confirms the unit sits level per manufacturer requirements.", C),
    single("ap-gear", "If the larger gear in a pair turns once, the smaller gear (half the teeth) turns:", [["a", "Half a turn"], ["b", "Once"], ["c", "Twice"]], "c", "Gear ratio 2:1 — the smaller gear turns twice as fast.", C),
    single("ap-lift", "The proper way to lift a heavy box is to:", [["a", "Bend at the waist, legs straight"], ["b", "Bend your knees, keep your back straight, lift with your legs, keep the load close"], ["c", "Twist while lifting"]], "b", "Proper lifting technique prevents back injuries — get help or equipment for heavy units.", CS),
    single("ap-wire-color", "In US residential wiring, the equipment grounding conductor is normally:", [["a", "Black"], ["b", "Green or bare copper"], ["c", "White"]], "b", "Green or bare = equipment ground. White = neutral (grounded conductor).", C),
    numeric("ap-pipe-length", "You need four pieces of pipe, each 2 ft 9 in long. Total length in inches?", 132, 0, "in", "2 ft 9 in = 33 in; 33 × 4 = 132 in (11 ft).", C),
  ],
};

function match3(): QuestionInput {
  return {
    id: "ce-rrr-match",
    type: "match",
    prompt: "Match each term to its definition.",
    pairs: [
      { id: "ce-rrr-0", left: "Recover", right: "Remove refrigerant and store it in an external container" },
      { id: "ce-rrr-1", left: "Recycle", right: "Clean refrigerant for reuse by oil separation and filtering" },
      { id: "ce-rrr-2", left: "Reclaim", right: "Reprocess to AHRI 700 purity, verified by chemical analysis" },
    ],
    explanation: "These three terms have specific regulatory meanings under Section 608.",
    skills: ["certification"],
  };
}
