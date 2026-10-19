import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FEATURES, LIK, PRIOR, STATES, Z, fin, type Check, type ClipData, type EventRec, type FeatureKey, type Step } from '../case/core';
import { FIDX, LCOL } from '../case/vocab';
import { cueKeys, cueName, featShort, featName, rp, stateShort, type Lang } from './i18n';

/* The model as a stack of 3D objects, bottom to top: one object per stage, each showing the actual tensor of the chosen frame. */
export interface SceneData { lang: Lang; clip: ClipData; out: Step[]; events: EventRec[]; checks: Check[]; fmax: Record<FeatureKey, number> }
export interface SceneState { fi: number; kfi: number; feat: FeatureKey; gl: string; gc: string[]; col: number }
export interface SceneApi { update: (s: SceneState) => void; select: (i: number, fly: boolean) => void; overview: () => void; dispose: () => void }

export const GAP = 12;
const NAMES: Record<Lang, string[]> = { zh: ['找猫', '标点', '防抖', '量特征', '和平时比', '套规则', '投票', '推测', '检验'], en: ['Detect', 'Keypoints', 'Smooth', 'Features', 'Baseline', 'Rules', 'Vote', 'Guess', 'Check'] };
const FCOL = ['#6c9bff', '#ffb84d', '#4fd08c', '#8a94a6', '#8a94a6', '#ff7a7a'];

function makeLabel(text: string, color = '#e6ebf5', size = 0.7, _wide?: number) {
  // the canvas is sized to the text, so nothing is cut off and nothing is stretched
  const c = document.createElement('canvas'), sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })), H = 128, font = '600 56px "PingFang SC","Helvetica Neue",sans-serif';
  const draw = (t: string) => {
    const m = c.getContext('2d')!; m.font = font;
    c.width = Math.min(4096, Math.ceil(m.measureText(t || ' ').width) + 48); c.height = H;
    const g = c.getContext('2d')!; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(t, c.width / 2, H / 2);
    const old = sp.material.map; sp.material.map = new THREE.CanvasTexture(c); old?.dispose(); sp.material.needsUpdate = true;
    sp.scale.set((size * 1.5 * c.width) / H, size * 1.5, 1);
  };
  draw(text);
  return { sprite: sp, set: draw };
}
const T = (d: SceneData, zh: string, en: string) => (d.lang === 'en' ? en : zh);
const std = (c: string | number | THREE.Color, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.15, ...o });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type Upd = (s: SceneState) => void;
type Reg = (m: THREE.Mesh, col: number) => void;

function sDetect(g: THREE.Group, d: SceneData): Upd {
  const [W, H] = d.clip.size, w = 6.4, h = (w * H) / W;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), std('#262d3b')));
  ['#ff5a5a', '#4fd08c', '#5a8dff'].forEach((c, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.22 })); m.position.z = 0.2 + i * 0.16; g.add(m); });
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 0.8)), new THREE.LineBasicMaterial({ color: '#9db4ff' })); g.add(box);
  const l = makeLabel('H × W × 3', '#9aa5b8', 0.5); l.sprite.position.set(0, -h / 2 - 0.5, 0); g.add(l.sprite);
  return (s) => { const f = d.clip.frames[s.fi]; box.visible = !!f.box; if (f.box) { box.scale.set(f.box[2] * w, f.box[3] * h, 1); box.position.set((f.box[0] + f.box[2] / 2 - 0.5) * w, -(f.box[1] + f.box[3] / 2 - 0.5) * h, 0.4); } };
}

function sKeypoints(g: THREE.Group, d: SceneData): Upd {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), std('#ffffff'), 68);
  inst.setColorAt(0, new THREE.Color('#fff')); g.add(inst);
  const m = new THREE.Matrix4(), c = new THREE.Color(), l = makeLabel(T(d, '脸 48 + 身体 20，每点 (x, y, 把握)', 'face 48 + body 20, each (x, y, conf)'), '#9aa5b8', 0.42, 12); l.sprite.position.set(0, -2.7, 0); g.add(l.sprite);
  return (s) => {
    const f = d.clip.frames[s.kfi], pts = [...(f.fp ?? []), ...(f.bp ?? [])], cf = [...(f.fc ?? []), ...(f.bc ?? [])];
    if (!pts.length) { for (let i = 0; i < 68; i++) { m.makeScale(0, 0, 0); inst.setMatrixAt(i, m); } inst.instanceMatrix.needsUpdate = true; return; }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = Math.min(5.6 / Math.max(1e-6, x1 - x0), 4.4 / Math.max(1e-6, y1 - y0));
    for (let i = 0; i < 68; i++) {
      if (i >= pts.length) { m.makeScale(0, 0, 0); inst.setMatrixAt(i, m); continue; }
      m.compose(new THREE.Vector3((pts[i][0] - (x0 + x1) / 2) * k, -(pts[i][1] - (y0 + y1) / 2) * k, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1).multiplyScalar(0.085 + 0.07 * (cf[i] ?? 0)));
      inst.setMatrixAt(i, m); inst.setColorAt(i, c.set((cf[i] ?? 0) < 0.25 ? '#ff6b6b' : i < (f.fp?.length ?? 0) ? '#6fe3c1' : '#b69cff'));
    }
    inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  };
}

function sSmooth(g: THREE.Group, d: SceneData): Upd {
  const N = 121, mk = (col: string) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)); const ln = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col })); ln.frustumCulled = false; g.add(ln); return geo; };
  const raw = mk('#5b6577'), sm = mk('#6c9bff');
  const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.6, 0.06), std('#161c28')); base.position.z = -0.1; g.add(base);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.03, 3.6, 0.03), new THREE.MeshBasicMaterial({ color: '#fff' })); g.add(mark);
  const l = makeLabel('', '#9aa5b8', 0.46, 8); l.sprite.position.set(0, -2.4, 0); g.add(l.sprite);
  let last = '';
  return (s) => {
    const j = FIDX[s.feat], a = s.fi - 60, n = d.clip.frames.length;
    const at = (k: number, key: 'raw' | 'sm') => { const v = d.clip.frames[clamp(a + k, 0, n - 1)][key]?.[j]; return fin(v) ? v : null; };
    const all: number[] = []; for (let k = 0; k < N; k++) { const r = at(k, 'raw'), q = at(k, 'sm'); if (r !== null) all.push(r); if (q !== null) all.push(q); }
    const lo = Math.min(...all, 0), hi = Math.max(...all, 1e-6);
    [[raw, 'raw'], [sm, 'sm']].forEach(([geo, key]) => { const p = (geo as THREE.BufferGeometry).getAttribute('position') as THREE.BufferAttribute; let prev = lo; for (let k = 0; k < N; k++) { const v = at(k, key as 'raw' | 'sm'); if (v !== null) prev = v; p.setXYZ(k, (k / (N - 1) - 0.5) * 6.2, ((prev - lo) / (hi - lo || 1) - 0.5) * 3.2, 0.05); } p.needsUpdate = true; });
    const t = T(d, '灰：滤波前　蓝：滤波后　特征：', 'grey: raw   blue: filtered   feature: ') + featName(d.lang, FEATURES[j]);
    if (t !== last) { l.set(t); last = t; }
  };
}

function sFeatures(g: THREE.Group, d: SceneData): Upd {
  const bars = FEATURES.map((k, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), std(FCOL[i], { emissive: FCOL[i], emissiveIntensity: i === 3 || i === 4 ? 0 : 0.25 })); m.position.x = (i - 2.5) * 1.1; g.add(m); const l = makeLabel(featShort(d.lang)[i], '#9aa5b8', 0.4, 3); l.sprite.position.set(m.position.x, -2.1, 0); g.add(l.sprite); return m; });
  const l = makeLabel(T(d, '6 个数（灰色两项规则没用到）', '6 numbers (the two grey ones are unused by the rules)'), '#9aa5b8', 0.42, 12); l.sprite.position.set(0, 2.6, 0); g.add(l.sprite);
  return (s) => { const raw = d.clip.frames[s.fi].raw; FEATURES.forEach((k, i) => { const v = raw?.[i], h = fin(v) ? clamp(Math.abs(v) / d.fmax[k], 0, 1) * 3.6 : 0.05; bars[i].scale.y = Math.max(0.05, h); bars[i].position.y = -1.8 + Math.max(0.05, h) / 2; }); };
}

function sBaseline(g: THREE.Group, d: SceneData): Upd {
  const bars = FEATURES.map((k, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), std(FCOL[i])); m.position.x = (i - 2.5) * 1.1; g.add(m); const l = makeLabel(featShort(d.lang)[i], '#9aa5b8', 0.4, 3); l.sprite.position.set(m.position.x, -2.9, 0); g.add(l.sprite); return m; });
  [1.5, -1.5].forEach((t) => { const p = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.02, 1.4), new THREE.MeshBasicMaterial({ color: '#ffb84d', transparent: true, opacity: 0.25 })); p.position.y = t * 0.6; g.add(p); });
  const zero = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.03, 1.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 })); g.add(zero);
  const l = makeLabel(T(d, 'z = (x − 平时) ÷ 正常抖动　　±1.5 是门槛', 'z = (x − usual) / normal wobble     ±1.5 is the threshold'), '#9aa5b8', 0.4, 14); l.sprite.position.set(0, 3.1, 0); g.add(l.sprite);
  return (s) => { const st = d.out[s.fi]; FEATURES.forEach((k, i) => { const z = st.z[k], v = fin(z) ? clamp(z as number, -4, 4) * 0.6 : 0, h = Math.max(0.04, Math.abs(v)); bars[i].scale.y = h; bars[i].position.y = v / 2 + (v < 0 ? 0 : 0); (bars[i].material as THREE.MeshStandardMaterial).color.set(fin(z) ? FCOL[i] : '#3a4254'); }); };
}

function sSpace(g: THREE.Group, d: SceneData): Upd {
  const R = 4, zg = new THREE.Group(); zg.scale.setScalar(0.52); g.add(zg);
  const cl = (v: number) => clamp(v, -R, R);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: string, op: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); zg.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 })); e.position.copy(m.position); zg.add(e);
  };
  box(-R, -Z.EAR_H, -R, Z.STILL, -R, R, LCOL.freeze, 0.14); box(-R, -Z.EAR_H, Z.STILL, R, -R, R, LCOL.ears_back, 0.1);
  box(Z.EAR_H, R, -R, Z.ACTIVE, -R, R, LCOL.alert, 0.12); box(-Z.EAR_H, Z.EAR_H, Z.ACTIVE, R, -R, R, LCOL.active, 0.1);
  [[new THREE.Vector3(-R, 0, 0), new THREE.Vector3(R, 0, 0), '#6c9bff'], [new THREE.Vector3(0, -R, 0), new THREE.Vector3(0, R, 0), '#4fd08c'], [new THREE.Vector3(0, 0, -R), new THREE.Vector3(0, 0, R), '#ffb84d']].forEach(([a, b, c]) => zg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a as THREE.Vector3, b as THREE.Vector3]), new THREE.LineBasicMaterial({ color: c as string }))));
  const pts: number[] = [], col: number[] = [];
  d.out.forEach((s) => { const { ear_height: x, activity: y, ear_angle: z } = s.z; if (s.calibrating || !(fin(x) || fin(y) || fin(z))) return; pts.push(cl(fin(x) ? x : 0), cl(fin(y) ? y : 0), cl(fin(z) ? z : 0)); const c = new THREE.Color(LCOL[s.label]); col.push(c.r, c.g, c.b); });
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  zg.add(new THREE.Points(cg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.75, depthWrite: false })));
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), new THREE.MeshBasicMaterial({ color: '#fff' })); zg.add(dot);
  const TN = 45, tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TN * 3), 3)); const tr = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: '#ffffff' })); tr.frustumCulled = false; zg.add(tr);
  const l = makeLabel(T(d, '耳高 z → 　活动 z ↑ 　耳转 z ↗', 'ear height z →   activity z ↑   ear rotation z ↗'), '#9aa5b8', 0.42, 12); l.sprite.position.set(0, -2.7, 0); g.add(l.sprite);
  const at = (i: number) => { const s = d.out[clamp(i, 0, d.out.length - 1)]; return new THREE.Vector3(cl(fin(s.z.ear_height) ? s.z.ear_height! : 0), cl(fin(s.z.activity) ? s.z.activity! : 0), cl(fin(s.z.ear_angle) ? s.z.ear_angle! : 0)); };
  return (s) => { dot.position.copy(at(s.fi)); (dot.material as THREE.MeshBasicMaterial).color.set(d.out[s.fi].calibrating ? '#8a94a6' : LCOL[d.out[s.fi].label]); const a = tg.getAttribute('position') as THREE.BufferAttribute; for (let k = 0; k < TN; k++) { const q = at(s.fi - (TN - 1 - k)); a.setXYZ(k, q.x, q.y, q.z); } a.needsUpdate = true; g.rotation.y = 0; };
}

function sVote(g: THREE.Group, d: SceneData): Upd {
  const n = Math.round(0.3 * d.clip.fps) + 1, W = 6.4;
  const cubes = Array.from({ length: n }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), std('#444')); m.position.set((i - (n - 1) / 2) * 0.58, 0.9, 0); g.add(m); return m; });
  const t1 = makeLabel(T(d, '① 最近 0.3 秒，每帧的规则结果', '① rule result per frame, last 0.3 s'), '#9aa5b8', 0.4, 12); t1.sprite.position.set(0, 1.7, 0); g.add(t1.sprite);
  // share bar: each label's share of the window; the line marks the 60% needed to switch
  const t2 = makeLabel(T(d, '② 各结果占窗口的比例', '② share of the window'), '#9aa5b8', 0.4, 12); t2.sprite.position.set(0, -0.3, 0); g.add(t2.sprite);
  const segs = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 0.7), std('#444')); m.position.set(0, -1.2, 0); g.add(m); return m; });
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.9), new THREE.MeshBasicMaterial({ color: '#ffffff' })); line.position.set(-W / 2 + 0.6 * W, -1.2, 0); g.add(line);
  const t3 = makeLabel('60%', '#ffffff', 0.42, 2); t3.sprite.position.set(line.position.x, -2.2, 0); g.add(t3.sprite);
  const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), std('#444', { emissiveIntensity: 0.4 })); big.position.set(0, 3.2, 0); g.add(big);
  const l = makeLabel('', '#e6ebf5', 0.55, 6); l.sprite.position.set(0, 4.5, 0); g.add(l.sprite);
  let last = '';
  return (s) => {
    const w = d.out.slice(Math.max(0, s.fi - n + 1), s.fi + 1), cnt = new Map<string, number>();
    cubes.forEach((m, i) => { const st = w[i - (n - w.length)]; (m.material as THREE.MeshStandardMaterial).color.set(st ? LCOL[st.raw] : '#222a38'); if (st) cnt.set(st.raw, (cnt.get(st.raw) ?? 0) + 1); });
    let x = -W / 2; const entries = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    segs.forEach((m, i) => { const e = entries[i]; if (!e) { m.visible = false; return; } m.visible = true; const wd = (e[1] / w.length) * W; m.scale.x = Math.max(0.01, wd); m.position.x = x + wd / 2; x += wd; (m.material as THREE.MeshStandardMaterial).color.set(LCOL[e[0]]); });
    const cur = d.out[s.fi], c = LCOL[cur.label]; (big.material as THREE.MeshStandardMaterial).color.set(c); (big.material as THREE.MeshStandardMaterial).emissive.set(c);
    const txt = T(d, '显示：', 'shown: ') + rp(d.lang, cur.label); if (txt !== last) { l.set(txt); last = txt; }
  };
}

function sGuess(g: THREE.Group, d: SceneData, reg: Reg): Upd {
  const priorKeys = Object.keys(PRIOR), cw = 1.2;
  const heat = (v: number) => new THREE.Color().setHSL(0.62, 0.8, 0.18 + 0.5 * v);
  const bars: { m: THREE.Mesh; col: number; base: THREE.Color; cue?: string; prior?: string }[] = [];
  const bar = (x: number, z: number, v: number, h: number, col: number, extra: { cue?: string; prior?: string }) => {
    const base = heat(v), m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1, 0.55), std(base.getHex())); m.scale.y = Math.max(0.04, v * h); m.position.set(x, -1.5 + m.scale.y / 2, z); g.add(m); reg(m, col); bars.push({ m, col, base, ...extra });
  };
  priorKeys.forEach((k, r) => { PRIOR[k].forEach((v, c) => bar((c - 2) * cw, 0.9 + r * 0.75, v, 2, c, { prior: k })); const l = makeLabel(rp(d.lang, k), '#9aa5b8', 0.3); l.sprite.position.set(-3.9, -1.3, 0.9 + r * 0.75); g.add(l.sprite); });
  cueKeys.forEach((k, r) => { LIK[k].forEach((v, c) => bar((c - 2) * cw, 4.2 + r * 0.75, v, 2, c, { cue: k })); const l = makeLabel(cueName(d.lang, k), '#9aa5b8', 0.3); l.sprite.position.set(-4.2, -1.3, 4.2 + r * 0.75); g.add(l.sprite); });
  const post = STATES.map((s, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1, 0.6), std('#6fe3c1', { emissive: '#6fe3c1', emissiveIntensity: 0.3 })); m.position.set((c - 2) * cw, 0, -1.6); g.add(m); reg(m, c); const l = makeLabel(stateShort(d.lang, s), '#e6ebf5', 0.34); l.sprite.position.set((c - 2) * cw, -2.1, -1.6); g.add(l.sprite); return m; });
  const t2 = makeLabel(T(d, '线索似然 P(线索|状态)　每列是一种状态，点柱子选列', 'cue likelihood P(cue|state)   each column is a state, click a bar to pick it'), '#6c9bff', 0.34); t2.sprite.position.set(0, 2.3, 5.8); g.add(t2.sprite);
  const t3 = makeLabel('', '#6fe3c1', 0.38); t3.sprite.position.set(0, 3.2, -1.6); g.add(t3.sprite);
  const t4 = makeLabel('', '#9aa5b8', 0.34); t4.sprite.position.set(0, 2.3, 1.7); g.add(t4.sprite);
  g.position.z = -3.5;
  let last = '';
  return (s) => {
    const sum = PRIOR[s.gl].reduce((a, b) => a + b, 0), p0 = PRIOR[s.gl].map((v) => v / sum), prod = p0.map((p, i) => s.gc.reduce((a, c) => a * LIK[c][i], p)), Z = prod.reduce((a, b) => a + b, 0), pp = prod.map((v) => v / Z);
    bars.forEach((b) => { const mt = b.m.material as THREE.MeshStandardMaterial, onCol = b.col === s.col, active = b.prior ? b.prior === s.gl : b.cue ? s.gc.includes(b.cue) : false;
      mt.color.copy(b.base); mt.emissive.set(onCol ? '#ffffff' : active ? '#6c9bff' : '#000000'); mt.emissiveIntensity = onCol ? 0.45 : active ? 0.3 : 0; mt.opacity = 1; mt.transparent = false; if (!active && !onCol) { mt.transparent = true; mt.opacity = 0.55; } });
    post.forEach((m, c) => { m.scale.y = Math.max(0.04, pp[c] * 3); m.position.y = -1.5 + m.scale.y / 2; (m.material as THREE.MeshStandardMaterial).emissive.set(c === s.col ? '#ffffff' : '#6fe3c1'); (m.material as THREE.MeshStandardMaterial).emissiveIntensity = c === s.col ? 0.6 : 0.25; });
    const txt = stateShort(d.lang, STATES[s.col]) + ': ' + p0[s.col].toFixed(2) + s.gc.map((c) => ' × ' + LIK[c][s.col].toFixed(2)).join('') + ' = ' + prod[s.col].toFixed(3) + '  →  ' + pp[s.col].toFixed(2);
    if (txt !== last) { t3.set(txt); t4.set(T(d, '标签：', 'label: ') + rp(d.lang, s.gl) + (s.gc.length ? T(d, '　线索：', '   cues: ') + s.gc.map((c) => cueName(d.lang, c)).join(T(d, '、', ', ')) : T(d, '　（还没选线索）', '   (no cue picked)'))); last = txt; }
  };
}

function sCheck(g: THREE.Group, d: SceneData): Upd {
  const U: FeatureKey[] = ['ear_height', 'ear_angle', 'eye_aperture', 'activity'];
  const bars = U.map((k, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.7), std('#555')); m.position.x = (i - 1.5) * 1.5; g.add(m); const l = makeLabel(featShort(d.lang)[[0, 1, 2, 5][i]], '#9aa5b8', 0.38, 3); l.sprite.position.set(m.position.x, -0.15, 0); g.add(l.sprite); return m; });
  const names = [T(d, '① 重跑', '① rerun'), T(d, '② 去掉写的', '② drop cited'), T(d, '③ 去掉没写的', '③ drop uncited'), T(d, '④ 推测', '④ guess')];
  const cubes = names.map((nm, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), std('#444')); m.position.set((i - 1.5) * 1.5, -2.4, 0); g.add(m); const l = makeLabel(nm, '#9aa5b8', 0.36, 4); l.sprite.position.set(m.position.x, -3.3, 0); g.add(l.sprite); return m; });
  const t1 = makeLabel(T(d, '事件里每个特征的 z（亮的 = 写进了理由）', 'z of each feature (bright = cited)'), '#9aa5b8', 0.38, 13); t1.sprite.position.set(0, 2.6, 0); g.add(t1.sprite);
  const l = makeLabel('', '#e6ebf5', 0.5, 9); l.sprite.position.set(0, 3.5, 0); g.add(l.sprite);
  let last = -1;
  return (s) => {
    const t = d.clip.frames[s.fi].t; let best = 0, bd = 1e9; d.events.forEach((e, i) => { const dd = Math.abs((e.start_s + (e.end_s ?? e.start_s)) / 2 - t); if (dd < bd) { bd = dd; best = i; } });
    const c = d.checks[best], e = d.events[best]; if (!c || !e) return;
    U.forEach((k, i) => { const v = e.z[k], h = Math.max(0.06, clamp(Math.abs(v ?? 0), 0, 4) * 0.5), cited = c.cited.includes(k); bars[i].scale.y = h; bars[i].position.y = h / 2 + 0.1; const mt = bars[i].material as THREE.MeshStandardMaterial; mt.color.set(cited ? '#6c9bff' : '#4a5163'); mt.emissive.set(cited ? '#6c9bff' : '#000000'); mt.emissiveIntensity = cited ? 0.35 : 0; });
    [c.reproduces, c.names, !c.hidden, c.guessOk].forEach((ok, i) => { const mt = cubes[i].material as THREE.MeshStandardMaterial; mt.color.set(ok ? '#2fbf71' : '#e5484d'); mt.emissive.set(ok ? '#2fbf71' : '#e5484d'); mt.emissiveIntensity = 0.3; });
    if (best !== last) { l.set(T(d, '最近的事件：', 'nearest event: ') + rp(d.lang, e.reaction) + (c.pass ? T(d, '　四项都通过', '  all pass') : T(d, '　有未通过', '  some fail'))); last = best; }
  };
}

export function createScene(el: HTMLElement, d: SceneData, onPick: (i: number) => void, onCol: (c: number) => void): SceneApi {
  const W = () => Math.max(1, el.clientWidth), H = () => Math.max(1, el.clientHeight);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W(), H()); renderer.setClearColor('#05070b'); el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#05070b', 40, 110);
  scene.add(new THREE.AmbientLight('#ffffff', 0.9)); const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(6, 10, 12); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 300);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.maxDistance = 90; ctl.minDistance = 3;

  const colBars: THREE.Mesh[] = [], reg: Reg = (m, c) => { m.userData.col = c; colBars.push(m); };
  const builders: ((g: THREE.Group, d: SceneData, reg: Reg) => Upd)[] = [sDetect, sKeypoints, sSmooth, sFeatures, sBaseline, sSpace, sVote, sGuess, sCheck];
  const stages = builders.map((b, i) => {
    const g = new THREE.Group(); g.position.y = i * GAP; scene.add(g);
    const content = new THREE.Group(); g.add(content);
    const upd = b(content, d, reg);
    const t = makeLabel(String(i + 1).padStart(2, '0') + '  ' + NAMES[d.lang][i], '#e6ebf5', 0.8, 5); t.sprite.position.set(0, 4.2, 0); g.add(t.sprite);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.userData.i = i; g.add(hit);
    return { g, upd, title: t.sprite, hit };
  });
  // data stream between stages
  const NP = 10, streams = stages.slice(0, -1).map((_, i) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#6c9bff', size: 0.2, transparent: true, opacity: 0.9 })); p.frustumCulled = false; scene.add(p);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, i * GAP + 4.2, 0), new THREE.Vector3(0, (i + 1) * GAP - 4.2, 0)]), new THREE.LineBasicMaterial({ color: '#1d2a4d' }))); return geo; });

  let sel = 0; const goalPos = new THREE.Vector3(), goalTgt = new THREE.Vector3(); let flying = false;
  const fly = (pos: THREE.Vector3, tgt: THREE.Vector3) => { goalPos.copy(pos); goalTgt.copy(tgt); flying = true; };
  const focus = (i: number) => fly(new THREE.Vector3(9, i * GAP + 5, 19), new THREE.Vector3(0, i * GAP + 0.5, 0));
  cam.position.set(9, 5, 19); ctl.target.set(0, 0, 0);
  const api: SceneApi = {
    update: (s) => stages.forEach((st) => st.upd(s)),
    select(i, f) { sel = i; stages.forEach((st, k) => { st.title.material.opacity = k === i ? 1 : 0.45; }); if (f) focus(i); },
    overview: () => fly(new THREE.Vector3(26, 4 * GAP + 8, 52), new THREE.Vector3(0, 4 * GAP, 0)),
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose(); x.dispose(); }); }); renderer.dispose(); renderer.domElement.remove(); },
  };

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down: [number, number] | null = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; flying = false; });
  cv.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, cam);
    const bar = ray.intersectObjects(colBars, false)[0];
    if (bar && sel === 7) { onCol(bar.object.userData.col as number); return; }
    const hit = ray.intersectObjects(stages.map((s) => s.hit), false)[0]; if (hit) onPick(hit.object.userData.i as number);
  });
  const clock = new THREE.Clock(); let raf = 0, prevT = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop); const t = clock.getElapsedTime(), dt = Math.min(0.25, t - prevT); prevT = t;
    if (flying) { const k = 1 - Math.exp(-dt * 5); cam.position.lerp(goalPos, k); ctl.target.lerp(goalTgt, k); if (cam.position.distanceTo(goalPos) < 0.05) flying = false; }
    streams.forEach((geo, i) => { const p = geo.getAttribute('position') as THREE.BufferAttribute; for (let k = 0; k < NP; k++) { const u = (t * 0.25 + k / NP) % 1; p.setXYZ(k, 0, i * GAP + 4.2 + u * (GAP - 8.4), 0); } p.needsUpdate = true; });
    ctl.update(); renderer.render(scene, cam);
  };
  loop();
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(el);
  return api;
}
