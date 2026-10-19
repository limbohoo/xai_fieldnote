/*
 * The catpose rules in TypeScript, ported line for line from the Python program
 * (ml/catpose/features.py, reactions.py, interpret.py, faithfulness.py), so the case lab runs
 * the real logic in the browser. Checked against the program's own per-frame output:
 * 1065 of 1066 frames identical; the other frame sits on a threshold and differs by stored rounding.
 */

export const FEATURES = ['ear_height', 'ear_angle', 'eye_aperture', 'muzzle_ratio', 'head_drop', 'activity'] as const;
export type FeatureKey = (typeof FEATURES)[number];
export type Reaction = 'calibrating' | 'unknown' | 'resting' | 'active' | 'alert' | 'ears_back' | 'freeze';
export type ZMap = Partial<Record<FeatureKey, number>>;
export type Pt = [number, number];

export const MODEL_ERROR: Record<FeatureKey, number> = {
  ear_height: 0.031, ear_angle: 3.0, eye_aperture: 0.056, muzzle_ratio: 0.105, head_drop: 0.1, activity: 0.1,
};
export const Z = { EAR_H: 1.5, AUX: 2.0, ACTIVE: 2.0, STILL: -1.0, EAR_CO: 0.5, EAR_H_STAY: 1.0, ACTIVE_STAY: 1.5, STILL_STAY: -0.5 };

export const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export interface Frame {
  t: number;
  box?: [number, number, number, number] | null;
  sm?: (number | null)[];
  raw?: (number | null)[];
  pose?: string;
  kp?: 1;
  fp?: Pt[];
  fc?: number[];
  bp?: Pt[];
  bc?: number[];
}
export interface ClipData { fps: number; calib_frames: number; size: [number, number]; frames: Frame[] }

// ---------- baseline: median and 1.4826 * MAD of the first `calib` frames that had any feature ----------
function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
export interface Baseline { med: Partial<Record<FeatureKey, number>>; scale: Partial<Record<FeatureKey, number>>; doneAt: number }
export function baseline(frames: Frame[], calib: number, minFrames = 60): Baseline {
  const buf: Record<string, number[]> = {};
  FEATURES.forEach((k) => (buf[k] = []));
  let n = 0;
  for (let i = 0; i < frames.length; i++) {
    const raw = frames[i].raw;
    if (!raw) continue;
    let seen = false;
    FEATURES.forEach((k, j) => {
      const v = raw[j];
      if (fin(v)) { buf[k].push(v); if (buf[k].length > calib) buf[k].shift(); seen = true; }
    });
    if (seen) n++;
    if (n >= calib) {
      const med: Baseline['med'] = {}, scale: Baseline['scale'] = {};
      FEATURES.forEach((k) => {
        if (buf[k].length >= minFrames) {
          const m = median(buf[k]);
          med[k] = m;
          scale[k] = Math.max(1.4826 * median(buf[k].map((x) => Math.abs(x - m))), MODEL_ERROR[k]) + 1e-6;
        }
      });
      return { med, scale, doneAt: i };
    }
  }
  return { med: {}, scale: {}, doneAt: frames.length };
}
export function zOf(b: Baseline, k: FeatureKey, v: number | null | undefined): number {
  const m = b.med[k], s = b.scale[k];
  return m === undefined || s === undefined || !fin(v) ? NaN : (v - m) / s;
}

// ---------- reactions.classify ----------
export interface Driver { feature: FeatureKey; z: number; test: '<=' | '>='; bar: number }
export interface Classified { key: Reaction; drivers: Driver[] }
const drv = (feature: FeatureKey, z: number, test: '<=' | '>=', bar: number): Driver => ({ feature, z, test, bar });

export function classify(z: ZMap, calibrating: boolean, prev: string): Classified {
  if (calibrating) return { key: 'calibrating', drivers: [] };
  const eh = z.ear_height, ea = z.ear_angle, ey = z.eye_aperture, ac = z.activity;
  const haveFace = fin(eh) || fin(ea) || fin(ey);
  if (!haveFace && !fin(ac)) return { key: 'unknown', drivers: [] };
  const backBar = prev === 'ears_back' || prev === 'freeze' ? Z.EAR_H_STAY : Z.EAR_H;
  const upBar = prev === 'alert' ? Z.EAR_H_STAY : Z.EAR_H;
  const activeBar = prev === 'active' ? Z.ACTIVE_STAY : Z.ACTIVE;
  const stillBar = prev === 'freeze' ? Z.STILL_STAY : Z.STILL;
  const back: Driver[] = [];
  if (fin(eh) && eh <= -backBar) back.push(drv('ear_height', eh, '<=', -backBar));
  if (fin(ea) && ea >= Z.AUX && (back.length > 0 || (fin(eh) && eh <= -Z.EAR_CO))) {
    back.push(drv('ear_angle', ea, '>=', Z.AUX));
    if (!back.some((d) => d.feature === 'ear_height')) back.push(drv('ear_height', eh as number, '<=', -Z.EAR_CO));
  }
  const alert: Driver[] = [];
  if (fin(eh) && eh >= upBar) {
    alert.push(drv('ear_height', eh, '>=', upBar));
    if (fin(ey) && ey >= Z.AUX) alert.push(drv('eye_aperture', ey, '>=', Z.AUX));
  }
  const still = fin(ac) && ac <= stillBar, active = fin(ac) && ac >= activeBar;
  if (back.length && still) return { key: 'freeze', drivers: [...back, drv('activity', ac as number, '<=', stillBar)] };
  if (back.length) return { key: 'ears_back', drivers: back };
  if (alert.length && !active) return { key: 'alert', drivers: alert };
  if (active) return { key: 'active', drivers: [drv('activity', ac as number, '>=', activeBar)] };
  return { key: 'resting', drivers: [] };
}

// ---------- reactions.ReactionCoder: time-window majority ----------
export function makeCoder(holdS = 0.3, majority = 0.6) {
  let cur: Classified = { key: 'calibrating', drivers: [] };
  const win: { t: number; key: Reaction }[] = [];
  return {
    update(z: ZMap, calibrating: boolean, t: number) {
      const r = classify(z, calibrating, cur.key);
      win.push({ t, key: r.key });
      while (win.length && win[0].t < t - holdS) win.shift();
      if (r.key === cur.key) { cur = r; return { label: cur.key, raw: r.key, drivers: cur.drivers }; }
      const share = win.filter((w) => w.key === r.key).length / win.length;
      if (share >= majority && t - win[0].t >= 0.5 * holdS) cur = r;
      return { label: cur.key, raw: r.key, drivers: cur.drivers };
    },
  };
}

export interface Step { t: number; z: ZMap; label: Reaction; raw: Reaction; calibrating: boolean; drivers: Driver[] }
export function run(frames: Frame[], calib: number): { base: Baseline; out: Step[] } {
  const base = baseline(frames, calib);
  const coder = makeCoder();
  const out = frames.map((f, i) => {
    // the frame where calibration finishes already counts as done (python flips `collecting` inside update)
    const calibrating = !(i >= base.doneAt && base.doneAt < frames.length);
    const z: ZMap = {};
    if (f.sm) FEATURES.forEach((k, j) => { z[k] = calibrating ? NaN : zOf(base, k, f.sm![j]); });
    const r = f.sm ? coder.update(z, calibrating, f.t) : coder.update({}, calibrating, f.t);
    return { t: f.t, z, label: r.label, raw: r.raw, calibrating, drivers: r.drivers };
  });
  return { base, out };
}

// ---------- features.face_features / head_pose from the 48 face keypoints ----------
const EAR_L = [22, 23, 24, 25, 26], EAR_R = [27, 28, 29, 30, 31], TIP_L = 24, TIP_R = 29, BASE_L = [22, 26], BASE_R = [27, 31];
export const EYE_L = [4, 5, 6, 7], EYE_R = [8, 9, 10, 11];
const MUZZLE = [32, 35], CHIN = [0, 2], NOSE = [12, 13];
export { EAR_L, EAR_R, TIP_L, TIP_R, BASE_L, BASE_R, MUZZLE };

const mean = (pts: Pt[], idx: number[]): Pt => [idx.reduce((s, i) => s + pts[i][0], 0) / idx.length, idx.reduce((s, i) => s + pts[i][1], 0) / idx.length];
const sub2 = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const norm2 = (a: Pt) => Math.hypot(a[0], a[1]);
const okc = (conf: number[] | undefined, idx: number[], m: number) => !conf || idx.every((i) => conf[i] >= m);

export interface Geo { el: Pt; er: Pt; mid: Pt; d: number; up: Pt; xhat: Pt }
export interface FaceFeats { ear_height: number; ear_angle: number; eye_aperture: number; muzzle_ratio: number; geo: Geo | null }
export function faceFeatures(pts: Pt[], conf: number[] | undefined, minConf: number): FaceFeats {
  const out: FaceFeats = { ear_height: NaN, ear_angle: NaN, eye_aperture: NaN, muzzle_ratio: NaN, geo: null };
  if (!okc(conf, [...EYE_L, ...EYE_R, ...CHIN, ...NOSE], minConf)) return out;
  const el = mean(pts, EYE_L), er = mean(pts, EYE_R), d = norm2(sub2(er, el));
  if (d < 1e-3) return out;
  const xhat: Pt = [(er[0] - el[0]) / d, (er[1] - el[1]) / d];
  let up: Pt = [xhat[1], -xhat[0]];
  const mid: Pt = [(el[0] + er[0]) / 2, (el[1] + er[1]) / 2];
  if (dot(sub2(mean(pts, CHIN), mid), up) > 0) up = [-up[0], -up[1]];
  out.geo = { el, er, mid, d, up, xhat };
  if (okc(conf, [TIP_L, TIP_R], minConf)) out.ear_height = (dot(sub2(pts[TIP_L], mid), up) + dot(sub2(pts[TIP_R], mid), up)) / 2 / d;
  if (okc(conf, [...EAR_L, ...EAR_R], minConf)) {
    const angs = ([[TIP_L, BASE_L, -1], [TIP_R, BASE_R, 1]] as [number, number[], number][]).map(([tip, base, side]) => {
      const axis = sub2(pts[tip], mean(pts, base));
      return (Math.atan2(dot(axis, xhat) * side, dot(axis, up)) * 180) / Math.PI;
    });
    out.ear_angle = (angs[0] + angs[1]) / 2;
  }
  const w = [EYE_L, EYE_R].map((e) => norm2(sub2(pts[e[0]], pts[e[1]])));
  if (Math.min(w[0], w[1]) > 1e-3) out.eye_aperture = [EYE_L, EYE_R].reduce((s, e, i) => s + norm2(sub2(pts[e[2]], pts[e[3]])) / w[i], 0) / 2;
  if (okc(conf, MUZZLE, minConf)) out.muzzle_ratio = norm2(sub2(pts[MUZZLE[0]], pts[MUZZLE[1]])) / d;
  return out;
}

// ---------- interpret: naive Bayes over five candidate states ----------
export const STATES = ['tense', 'curious', 'playful', 'attentive', 'calm'] as const;
export type State = (typeof STATES)[number];
export const PRIOR: Record<string, number[]> = {
  ears_back: [0.4, 0.15, 0.05, 0.3, 0.1], freeze: [0.45, 0.05, 0.2, 0.25, 0.05],
  alert: [0.15, 0.5, 0.05, 0.25, 0.05], active: [0.15, 0.3, 0.4, 0.05, 0.1],
};
export const LIK: Record<string, number[]> = {
  moves_away: [0.6, 0.2, 0.1, 0.1, 0.05], flees: [0.55, 0.08, 0.1, 0.04, 0.02],
  approaches: [0.05, 0.5, 0.5, 0.2, 0.1], plays: [0.05, 0.2, 0.7, 0.05, 0.05],
  settles: [0.15, 0.3, 0.2, 0.5, 0.6], stays_still: [0.5, 0.2, 0.3, 0.4, 0.3],
  robot_before: [0.3, 0.5, 0.6, 0.4, 0.2],
};
const FACE_BASED: Record<string, true> = { ears_back: true, freeze: true, alert: true };
const norm = (a: number[]) => { const s = a.reduce((x, y) => x + y, 0); return a.map((v) => v / s); };
export type Band = '高' | '中' | '低';
export interface Guess { top: State; second: State; p1: number; p2: number; band: Band; show: boolean; post: number[] }
export function guess(reaction: string, cues: string[], faceVisible: number): Guess | null {
  const prior = PRIOR[reaction];
  if (!prior) return null;
  let post = norm([...prior]);
  cues.forEach((c) => { if (LIK[c]) post = norm(post.map((p, i) => p * LIK[c][i])); });
  const order = post.map((_, i) => i).sort((a, b) => post[b] - post[a]);
  const p1 = post[order[0]], p2 = post[order[1]];
  let band: Band;
  if (FACE_BASED[reaction] && faceVisible < 0.3) band = '低';
  else if (p1 >= 0.6 && p1 - p2 >= 0.3) band = '高';
  else if (p1 >= 0.45 && p1 - p2 >= 0.15) band = '中';
  else band = '低';
  if (band === '高' && faceVisible < 0.3) band = '中';
  return { top: STATES[order[0]], second: STATES[order[1]], p1, p2, band, show: band !== '低', post };
}

// ---------- faithfulness: counterfactual checks on a recorded event ----------
export interface EventRec {
  start_s: number; end_s?: number | null; triggers?: ('sound' | 'motion')[]; notes?: string[]; reaction: Reaction; z: ZMap; prev_reaction: string; drivers: Driver[]; changes: [FeatureKey, number][];
  interp: { top: State; band: Band; cues: string[]; face_visible: number } | null;
}
export const USED: FeatureKey[] = ['ear_height', 'ear_angle', 'eye_aperture', 'activity'];
export function zEvent(e: EventRec, usual: Partial<Record<FeatureKey, boolean>> = {}): ZMap {
  const z: ZMap = {};
  USED.forEach((k) => { if (e.z[k] !== undefined) z[k] = usual[k] ? 0 : e.z[k]; });
  return z;
}
export interface Check {
  cited: FeatureKey[]; roles: Partial<Record<FeatureKey, 'main' | 'support'>>; alone: Partial<Record<FeatureKey, Reaction>>;
  reproduces: boolean; allUsual: Reaction; names: boolean; hidden: boolean; guessOk: boolean; pass: boolean; oldMissed: boolean;
}
export function checkEvent(e: EventRec): Check {
  const cited = [...new Set(e.drivers.map((d) => d.feature))];
  const roles: Check['roles'] = {}, alone: Check['alone'] = {};
  const reproduces = classify(zEvent(e), false, e.prev_reaction).key === e.reaction;
  cited.forEach((k) => {
    const nk = classify(zEvent(e, { [k]: true }), false, e.prev_reaction).key;
    alone[k] = nk; roles[k] = nk !== e.reaction ? 'main' : 'support';
  });
  const all: Partial<Record<FeatureKey, boolean>> = {};
  cited.forEach((k) => (all[k] = true));
  const allUsual = classify(zEvent(e, all), false, e.prev_reaction).key;
  const names = cited.length > 0 && allUsual !== e.reaction;
  const rest: Partial<Record<FeatureKey, boolean>> = {};
  USED.forEach((k) => { if (!cited.includes(k)) rest[k] = true; });
  const hidden = classify(zEvent(e, rest), false, e.prev_reaction).key !== e.reaction;
  const g = e.interp ? guess(e.reaction, e.interp.cues, e.interp.face_visible) : null;
  const guessOk = !e.interp || (!!g && g.top === e.interp.top && g.band === e.interp.band);
  const main = cited.filter((k) => roles[k] === 'main');
  const shown = (e.changes || []).map((c) => c[0]);
  return {
    cited, roles, alone, reproduces, allUsual, names, hidden, guessOk,
    pass: reproduces && names && !hidden && guessOk,
    oldMissed: main.length > 0 && !main.some((k) => shown.includes(k)),
  };
}
