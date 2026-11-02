/** Component library used by the identification, matching and build games. Each has an SVG illustration keyed by id. */
export type ComponentDef = { id: string; name: string; purpose: string; where: string; category: "refrigeration" | "electrical" | "airflow" | "heating" | "controls" };

export const COMPONENTS: ComponentDef[] = [
  { id: "compressor", name: "Compressor", purpose: "Pumps refrigerant vapor, raising its pressure and temperature", where: "Outdoor unit", category: "refrigeration" },
  { id: "condenser-coil", name: "Condenser coil", purpose: "Rejects heat so refrigerant vapor condenses into liquid", where: "Outdoor unit (cooling)", category: "refrigeration" },
  { id: "evaporator-coil", name: "Evaporator coil", purpose: "Absorbs heat from indoor air as refrigerant boils", where: "On the furnace or in the air handler", category: "refrigeration" },
  { id: "txv", name: "TXV (thermostatic expansion valve)", purpose: "Meters refrigerant into the evaporator to hold steady superheat", where: "Evaporator inlet", category: "refrigeration" },
  { id: "piston", name: "Fixed orifice (piston)", purpose: "Creates a fixed pressure drop into the evaporator", where: "Evaporator inlet", category: "refrigeration" },
  { id: "filter-drier", name: "Filter drier", purpose: "Traps moisture and debris in the liquid line", where: "Liquid line", category: "refrigeration" },
  { id: "accumulator", name: "Suction accumulator", purpose: "Keeps liquid refrigerant from reaching the compressor", where: "Suction line before the compressor", category: "refrigeration" },
  { id: "reversing-valve", name: "Reversing valve", purpose: "Switches a heat pump between heating and cooling", where: "Heat pump outdoor unit", category: "refrigeration" },
  { id: "service-valve", name: "Service valve", purpose: "Isolates refrigerant and provides gauge access", where: "Outdoor unit line connections", category: "refrigeration" },
  { id: "capacitor", name: "Dual run capacitor", purpose: "Provides the phase shift that starts and runs the compressor and fan motor", where: "Outdoor unit control panel", category: "electrical" },
  { id: "contactor", name: "Contactor", purpose: "24 V coil closes contacts that send line voltage to the compressor and fan", where: "Outdoor unit control panel", category: "electrical" },
  { id: "transformer", name: "Control transformer", purpose: "Steps line voltage down to 24 VAC for the control circuit", where: "Furnace or air handler", category: "electrical" },
  { id: "thermostat", name: "Thermostat", purpose: "Senses temperature and calls for heating, cooling or fan", where: "Living space wall", category: "controls" },
  { id: "control-board", name: "Control board", purpose: "Runs the sequence of operation and safety checks", where: "Furnace or air handler", category: "controls" },
  { id: "blower", name: "Blower wheel & motor", purpose: "Moves air across the coil or heat exchanger and through the ducts", where: "Furnace or air handler", category: "airflow" },
  { id: "condenser-fan", name: "Condenser fan motor", purpose: "Pulls outdoor air across the condenser coil", where: "Top of outdoor unit", category: "airflow" },
  { id: "air-filter", name: "Air filter", purpose: "Cleans return air and protects the coil and blower", where: "Return or filter rack", category: "airflow" },
  { id: "hsi", name: "Hot surface igniter", purpose: "Glows hot enough to ignite the gas", where: "Furnace burner area", category: "heating" },
  { id: "flame-sensor", name: "Flame sensor", purpose: "Proves flame using a small DC microamp signal", where: "In the burner flame", category: "heating" },
  { id: "inducer", name: "Inducer (draft) motor", purpose: "Pulls combustion gases through the heat exchanger and out the vent", where: "Furnace vestibule", category: "heating" },
  { id: "pressure-switch", name: "Draft pressure switch", purpose: "Proves the inducer is creating draft before ignition", where: "Furnace vestibule", category: "heating" },
  { id: "limit-switch", name: "High limit switch", purpose: "Opens if the furnace overheats", where: "Furnace heat exchanger area", category: "heating" },
  { id: "float-switch", name: "Condensate float switch", purpose: "Shuts the system down if condensate backs up", where: "Drain pan or drain line", category: "controls" },
  { id: "gas-valve", name: "Gas valve", purpose: "Controls gas flow to the burners when the board energizes it", where: "Furnace burner manifold", category: "heating" },
];

export const componentById = (id: string) => COMPONENTS.find((c) => c.id === id);
