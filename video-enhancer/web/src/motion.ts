// Global (camera) motion estimation between consecutive frames on tiny grayscale thumbnails.
// Handheld phone video almost always moves; without alignment the temporal denoiser would see
// "motion" everywhere and switch itself off, which is exactly when low-light grain is worst.

export interface Shift {
  dx: number; // in thumbnail pixels: cur(x) ≈ prev(x + dx)
  dy: number;
  /** true when frames don't match at any shift (scene cut, whip pan): drop history. */
  lost: boolean;
}

function meanOf(a: Float32Array) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

function downsample2(src: Float32Array, w: number, h: number): [Float32Array, number, number] {
  const w2 = w >> 1;
  const h2 = h >> 1;
  const out = new Float32Array(w2 * h2);
  for (let y = 0; y < h2; y++) {
    const r0 = 2 * y * w;
    const r1 = r0 + w;
    for (let x = 0; x < w2; x++) {
      const i = 2 * x;
      out[y * w2 + x] = (src[r0 + i] + src[r0 + i + 1] + src[r1 + i] + src[r1 + i + 1]) * 0.25;
    }
  }
  return [out, w2, h2];
}

/** Mean absolute difference between cur and prev shifted by (dx, dy), over the inner region. */
function sad(cur: Float32Array, prev: Float32Array, w: number, h: number, dx: number, dy: number, margin: number, bias: number) {
  let s = 0;
  let n = 0;
  const step = w * h > 6000 ? 2 : 1;
  for (let y = margin; y < h - margin; y += step) {
    const rc = y * w;
    const rp = (y + dy) * w + dx;
    for (let x = margin; x < w - margin; x += step) {
      s += Math.abs(cur[rc + x] - prev[rp + x] - bias);
      n++;
    }
  }
  return s / Math.max(n, 1);
}

function parabolaOffset(l: number, c: number, r: number) {
  const d = l - 2 * c + r;
  if (d <= 1e-9) return 0;
  return Math.max(-0.5, Math.min(0.5, (0.5 * (l - r)) / d));
}

export function estimateShift(cur: Float32Array, prev: Float32Array, w: number, h: number): Shift {
  const bias = meanOf(cur) - meanOf(prev); // tolerate exposure/brightness changes
  const [c1, w1, h1] = downsample2(cur, w, h);
  const [p1] = downsample2(prev, w, h);

  // Coarse search at half resolution.
  const R1 = Math.max(4, Math.round(w1 * 0.08));
  let best = Infinity;
  let bx = 0;
  let by = 0;
  for (let dy = -R1; dy <= R1; dy++) {
    for (let dx = -R1; dx <= R1; dx++) {
      const v = sad(c1, p1, w1, h1, dx, dy, R1, bias);
      if (v < best) {
        best = v;
        bx = dx;
        by = dy;
      }
    }
  }

  // Refine at full resolution around the coarse result.
  const margin = 2 * R1 + 2;
  let fx = 2 * bx;
  let fy = 2 * by;
  let fb = Infinity;
  const grid = new Map<string, number>();
  const at = (dx: number, dy: number) => {
    const k = `${dx},${dy}`;
    let v = grid.get(k);
    if (v === undefined) {
      v = sad(cur, prev, w, h, dx, dy, margin, bias);
      grid.set(k, v);
    }
    return v;
  };
  for (let dy = fy - 2; dy <= fy + 2; dy++) {
    for (let dx = fx - 2; dx <= fx + 2; dx++) {
      const v = at(dx, dy);
      if (v < fb) {
        fb = v;
        fx = dx;
        fy = dy;
      }
    }
  }
  const zero = at(0, 0);

  // Large residual even at the best alignment: different picture (cut) or too fast to track.
  const atEdge = Math.abs(fx) >= 2 * R1 || Math.abs(fy) >= 2 * R1;
  if (fb > 0.09 || atEdge) return { dx: 0, dy: 0, lost: true };
  // A non-zero shift must clearly beat standing still, otherwise noise causes jitter.
  if ((fx !== 0 || fy !== 0) && fb > zero * 0.97) {
    fx = 0;
    fy = 0;
    fb = zero;
  }

  const sx = parabolaOffset(at(fx - 1, fy), fb, at(fx + 1, fy));
  const sy = parabolaOffset(at(fx, fy - 1), fb, at(fx, fy + 1));
  let dx = fx + sx;
  let dy = fy + sy;
  if (Math.abs(dx) < 0.06) dx = 0;
  if (Math.abs(dy) < 0.06) dy = 0;
  return { dx, dy, lost: false };
}
