/** User-facing enhancement controls. All values are 0..1 unless noted. */
export interface EnhanceParams {
  /** Overall target brightness. */
  brightness: number;
  /** How strongly dark regions are lifted relative to bright ones (local tone mapping). */
  shadows: number;
  /** Frame-to-frame (temporal) noise reduction. The big win for low-light video. */
  temporalDenoise: number;
  /** Within-frame noise reduction (mostly color blotches). */
  spatialDenoise: number;
  /** Automatic white balance strength (removes orange/green casts). */
  colorFix: number;
  /** Saturation, 0..2 (1 = unchanged). */
  saturation: number;
  /** Detail sharpening. */
  sharpen: number;
  /** Black level: deepens noisy, washed-out blacks. */
  blackPoint: number;
  /** Midtone contrast. */
  contrast: number;
}

export const DEFAULT_PARAMS: EnhanceParams = {
  brightness: 0.55,
  shadows: 0.6,
  temporalDenoise: 0.7,
  spatialDenoise: 0.5,
  colorFix: 0.5,
  saturation: 1.1,
  sharpen: 0.4,
  blackPoint: 0.3,
  contrast: 0.35,
};

export interface ParamSpec {
  key: keyof EnhanceParams;
  label: string;
  min: number;
  max: number;
  help: string;
}

export const PARAM_SPECS: ParamSpec[] = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 1, help: 'Overall exposure target' },
  { key: 'shadows', label: 'Shadow lift', min: 0, max: 1, help: 'Brighten dark areas more than bright ones' },
  { key: 'temporalDenoise', label: 'Grain removal', min: 0, max: 1, help: 'Averages noise away across frames' },
  { key: 'spatialDenoise', label: 'Color noise', min: 0, max: 1, help: 'Cleans blotchy color speckles' },
  { key: 'colorFix', label: 'Color fix', min: 0, max: 1, help: 'Auto white balance' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 2, help: 'Color intensity' },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 1, help: 'Restore fine detail' },
  { key: 'blackPoint', label: 'Black depth', min: 0, max: 1, help: 'Deepen washed-out blacks' },
  { key: 'contrast', label: 'Contrast', min: 0, max: 1, help: 'Midtone punch' },
];

export function clampParams(p: Partial<EnhanceParams>): EnhanceParams {
  const out = { ...DEFAULT_PARAMS };
  for (const spec of PARAM_SPECS) {
    const v = p[spec.key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[spec.key] = Math.min(spec.max, Math.max(spec.min, v));
    }
  }
  return out;
}
