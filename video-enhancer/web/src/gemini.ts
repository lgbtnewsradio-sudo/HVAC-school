import { PARAM_SPECS, type EnhanceParams, clampParams } from './params';

// Optional "AI auto-tune": sends ONE downscaled still frame (never the video) to Google's Gemini
// API with the user's own key, and asks it to choose enhancement settings for that scene.
// Free keys: https://aistudio.google.com/apikey

const API = 'https://generativelanguage.googleapis.com/v1beta';
const KEY_STORAGE = 'lumafix.geminiKey';
const MODEL_STORAGE = 'lumafix.geminiModel';
const FALLBACK_MODEL = 'models/gemini-2.5-flash';

export function getGeminiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? '';
  } catch {
    return '';
  }
}

export function setGeminiKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
    localStorage.removeItem(MODEL_STORAGE);
  } catch {
    /* storage unavailable (private mode) — key lives only for this session */
  }
}

interface ModelInfo {
  name: string;
  supportedGenerationMethods?: string[];
}

/** Pick the newest general-purpose "flash" model the key can use, so this keeps working as models change. */
async function pickModel(key: string): Promise<string> {
  try {
    const cached = localStorage.getItem(MODEL_STORAGE);
    if (cached) return cached;
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { models?: ModelInfo[] };
    const candidates = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name)
      .filter((n) => /gemini-[\d.]+-flash/.test(n) && !/(lite|image|tts|live|audio|preview-tts|embedding|exp)/.test(n));
    const version = (n: string) => parseFloat(n.match(/gemini-([\d.]+)/)?.[1] ?? '0');
    candidates.sort((a, b) => version(b) - version(a) || a.length - b.length);
    const chosen = candidates[0] ?? FALLBACK_MODEL;
    try {
      localStorage.setItem(MODEL_STORAGE, chosen);
    } catch {
      /* ignore */
    }
    return chosen;
  } catch {
    return FALLBACK_MODEL;
  }
}

function frameToJpegBase64(source: CanvasImageSource, w: number, h: number): string {
  const scale = Math.min(1, 768 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  c.getContext('2d')!.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85).split(',')[1];
}

export interface AutoTuneResult {
  params: EnhanceParams;
  note: string;
  model: string;
}

export async function aiAutoTune(key: string, frame: CanvasImageSource, w: number, h: number, current: EnhanceParams): Promise<AutoTuneResult> {
  const model = await pickModel(key);
  const ranges = PARAM_SPECS.map((s) => `- ${s.key} (${s.min}..${s.max}, now ${current[s.key].toFixed(2)}): ${s.help}`).join('\n');
  const prompt = `You are a professional video colorist. This is a still from a poorly lit phone video that will be processed by a low-light enhancement pipeline with these controls:
${ranges}

Notes: temporalDenoise averages noise across frames (strong values are safe unless there is fast motion). spatialDenoise removes chroma blotches. blackPoint lifts/deepens the black level (raise it when blacks look grey and noisy). brightness is the overall exposure target (0.5 is natural, 0.8+ is very bright). shadows lifts dark regions relative to bright ones (too high looks flat/HDR-ish). colorFix is automatic white balance strength (raise for strong orange/green casts, lower for intentional mood lighting such as candles or concerts).

Look at the scene (lighting type, noise level, color cast, motion blur, faces) and choose values that make it look natural, clean and well exposed, like it was shot in better light — not over-processed. Return JSON only.`;

  const properties: Record<string, { type: string }> = { note: { type: 'STRING' } };
  for (const s of PARAM_SPECS) properties[s.key] = { type: 'NUMBER' };

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ inline_data: { mime_type: 'image/jpeg', data: frameToJpegBase64(frame, w, h) } }, { text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties,
        required: [...PARAM_SPECS.map((s) => s.key), 'note'],
      },
    },
  };

  const res = await fetch(`${API}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      msg = ((await res.json()) as { error?: { message?: string } }).error?.message ?? msg;
    } catch {
      /* ignore */
    }
    if (res.status === 400 || res.status === 403) msg += ' — check that your Gemini API key is correct.';
    throw new Error(`Gemini: ${msg}`);
  }
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/^```(json)?|```$/g, '').trim());
  } catch {
    throw new Error('Gemini returned an unexpected answer. Try again.');
  }
  const note = typeof parsed.note === 'string' ? parsed.note : '';
  return { params: clampParams({ ...current, ...(parsed as Partial<EnhanceParams>) }), note, model: model.replace('models/', '') };
}
