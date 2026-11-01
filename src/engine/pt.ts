/**
 * Approximate saturation pressure-temperature data (psig at sea level).
 * Values are rounded from published refrigerant PT charts and are for training.
 * Always use the refrigerant manufacturer's PT chart or calibrated digital gauges on real equipment.
 */
export type Refrigerant = "R-410A" | "R-22";

const TABLES: Record<Refrigerant, [number, number][]> = {
  // [°F, psig]
  "R-410A": [
    [-20, 26.4], [-10, 36.9], [0, 48.6], [10, 62.3], [20, 78.3], [30, 96.8], [40, 118.0], [45, 130.7],
    [50, 142.7], [55, 155.7], [60, 170.0], [70, 201.0], [80, 235.9], [90, 274.1], [100, 317.2],
    [105, 340.5], [110, 365.0], [115, 390.9], [120, 418.0], [125, 446.5], [130, 476.0],
  ],
  "R-22": [
    [-20, 10.1], [-10, 16.5], [0, 24.0], [10, 32.8], [20, 43.0], [30, 54.9], [40, 68.5], [45, 76.0],
    [50, 84.0], [60, 101.6], [70, 121.4], [80, 143.6], [90, 168.4], [100, 195.9], [110, 226.4],
    [120, 259.9], [130, 296.8],
  ],
};

export const REFRIGERANTS = Object.keys(TABLES) as Refrigerant[];

function interp(x: number, pts: [number, number][], xi: 0 | 1, yi: 0 | 1): number {
  if (x <= pts[0][xi]) {
    const [a, b] = [pts[0], pts[1]];
    return a[yi] + ((x - a[xi]) * (b[yi] - a[yi])) / (b[xi] - a[xi]);
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (x <= b[xi]) return a[yi] + ((x - a[xi]) * (b[yi] - a[yi])) / (b[xi] - a[xi]);
  }
  const a = pts[pts.length - 2];
  const b = pts[pts.length - 1];
  return b[yi] + ((x - b[xi]) * (b[yi] - a[yi])) / (b[xi] - a[xi]);
}

/** Saturation temperature (°F) for a gauge pressure (psig). */
export function satTemp(ref: Refrigerant, psig: number): number {
  return Math.round(interp(psig, TABLES[ref], 1, 0) * 10) / 10;
}

/** Saturation pressure (psig) for a temperature (°F). */
export function satPressure(ref: Refrigerant, tempF: number): number {
  return Math.round(interp(tempF, TABLES[ref], 0, 1) * 10) / 10;
}

export function superheat(ref: Refrigerant, suctionPsig: number, suctionLineF: number) {
  return Math.round((suctionLineF - satTemp(ref, suctionPsig)) * 10) / 10;
}

export function subcooling(ref: Refrigerant, liquidPsig: number, liquidLineF: number) {
  return Math.round((satTemp(ref, liquidPsig) - liquidLineF) * 10) / 10;
}

export function ptTable(ref: Refrigerant) {
  return TABLES[ref];
}
