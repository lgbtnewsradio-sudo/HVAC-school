import type { SourceDef } from "./types";

/**
 * Reference library cited by lessons. These are the authorities the content is
 * written against; students are pointed to them for the authoritative version.
 * No affiliation with or endorsement by any of these organizations is implied.
 */
export const SOURCES: Record<string, SourceDef> = {
  "epa-608": {
    id: "epa-608",
    title: "Section 608 Technician Certification & Refrigerant Management Requirements",
    publisher: "U.S. Environmental Protection Agency",
    url: "https://www.epa.gov/section608",
    kind: "regulation",
  },
  "epa-aim": {
    id: "epa-aim",
    title: "AIM Act — Technology Transitions (HFC phasedown)",
    publisher: "U.S. Environmental Protection Agency",
    url: "https://www.epa.gov/climate-hfcs-reduction",
    kind: "regulation",
  },
  "osha-loto": {
    id: "osha-loto",
    title: "29 CFR 1910.147 — The Control of Hazardous Energy (Lockout/Tagout)",
    publisher: "Occupational Safety and Health Administration",
    url: "https://www.osha.gov/control-hazardous-energy",
    kind: "safety",
  },
  "osha-electrical": {
    id: "osha-electrical",
    title: "Electrical Safety (29 CFR 1910 Subpart S)",
    publisher: "Occupational Safety and Health Administration",
    url: "https://www.osha.gov/electrical",
    kind: "safety",
  },
  "osha-ladders": {
    id: "osha-ladders",
    title: "Ladder Safety and Fall Protection",
    publisher: "Occupational Safety and Health Administration",
    url: "https://www.osha.gov/ladders",
    kind: "safety",
  },
  "osha-hotwork": {
    id: "osha-hotwork",
    title: "Welding, Cutting, and Brazing (29 CFR 1910 Subpart Q)",
    publisher: "Occupational Safety and Health Administration",
    url: "https://www.osha.gov/welding-cutting-brazing",
    kind: "safety",
  },
  "nfpa-70e": {
    id: "nfpa-70e",
    title: "NFPA 70E — Standard for Electrical Safety in the Workplace",
    publisher: "National Fire Protection Association",
    url: "https://www.nfpa.org/70E",
    kind: "standard",
  },
  "cpsc-co": {
    id: "cpsc-co",
    title: "Carbon Monoxide Safety",
    publisher: "U.S. Consumer Product Safety Commission",
    url: "https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Carbon-Monoxide-Information-Center",
    kind: "safety",
  },
  "acca-j": {
    id: "acca-j",
    title: "Manual J — Residential Load Calculation",
    publisher: "Air Conditioning Contractors of America (ACCA)",
    url: "https://www.acca.org/standards/technical-manuals/manual-j",
    kind: "standard",
  },
  "acca-s": {
    id: "acca-s",
    title: "Manual S — Residential Equipment Selection",
    publisher: "Air Conditioning Contractors of America (ACCA)",
    url: "https://www.acca.org/standards/technical-manuals/manual-s",
    kind: "standard",
  },
  "acca-d": {
    id: "acca-d",
    title: "Manual D — Residential Duct Systems",
    publisher: "Air Conditioning Contractors of America (ACCA)",
    url: "https://www.acca.org/standards/technical-manuals/manual-d",
    kind: "standard",
  },
  "acca-qi": {
    id: "acca-qi",
    title: "ANSI/ACCA 5 QI — HVAC Quality Installation Specification",
    publisher: "Air Conditioning Contractors of America (ACCA)",
    url: "https://www.acca.org/standards/quality",
    kind: "standard",
  },
  "acca-4qm": {
    id: "acca-4qm",
    title: "ANSI/ACCA 4 QM — Maintenance of Residential HVAC Systems",
    publisher: "Air Conditioning Contractors of America (ACCA)",
    url: "https://www.acca.org/standards/quality",
    kind: "standard",
  },
  "ashrae-fund": {
    id: "ashrae-fund",
    title: "ASHRAE Handbook — Fundamentals",
    publisher: "ASHRAE",
    url: "https://www.ashrae.org/technical-resources/ashrae-handbook",
    kind: "standard",
  },
  "ashrae-15-34": {
    id: "ashrae-15-34",
    title: "ASHRAE Standards 15 & 34 — Refrigeration Safety and Refrigerant Classification",
    publisher: "ASHRAE",
    url: "https://www.ashrae.org/technical-resources/bookstore/standards-15-34",
    kind: "standard",
  },
  "nate-ka": {
    id: "nate-ka",
    title: "NATE Knowledge Areas of Technician Expertise (KATEs)",
    publisher: "North American Technician Excellence",
    url: "https://natex.org",
    kind: "training",
  },
  "hvac-excellence": {
    id: "hvac-excellence",
    title: "HVAC Excellence Employment Ready & Professional Level Exams — Competency Areas",
    publisher: "HVAC Excellence / ESCO Group",
    url: "https://www.hvacexcellence.org",
    kind: "training",
  },
  "esco-608": {
    id: "esco-608",
    title: "EPA Section 608 Preparatory Manual",
    publisher: "ESCO Institute",
    url: "https://www.escogroup.org",
    kind: "training",
  },
  "nfpa-54": {
    id: "nfpa-54",
    title: "NFPA 54 / ANSI Z223.1 — National Fuel Gas Code",
    publisher: "National Fire Protection Association",
    url: "https://www.nfpa.org/54",
    kind: "standard",
  },
  "nec": {
    id: "nec",
    title: "NFPA 70 — National Electrical Code (Article 440: Air-Conditioning and Refrigerating Equipment)",
    publisher: "National Fire Protection Association",
    url: "https://www.nfpa.org/70",
    kind: "standard",
  },
  "doe-efficiency": {
    id: "doe-efficiency",
    title: "Residential Central Air Conditioners and Heat Pumps — Energy Conservation Standards (SEER2/HSPF2)",
    publisher: "U.S. Department of Energy",
    url: "https://www.energy.gov/eere/buildings/appliance-and-equipment-standards-program",
    kind: "regulation",
  },
  "mfr-iom": {
    id: "mfr-iom",
    title: "Manufacturer Installation, Operation & Maintenance (IOM) Instructions",
    publisher: "Equipment manufacturer (model-specific)",
    kind: "manual",
    url: undefined,
  },
  "energy-star": {
    id: "energy-star",
    title: "ENERGY STAR — Heating & Cooling Guidance",
    publisher: "U.S. EPA / DOE ENERGY STAR",
    url: "https://www.energystar.gov/products/heating_cooling",
    kind: "training",
  },
};

export const CONTENT_REVISED = "2026-10-15";
