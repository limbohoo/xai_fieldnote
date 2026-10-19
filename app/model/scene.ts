import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FEATURES, LIK, PRIOR, STATES, Z, fin, type Check, type ClipData, type EventRec, type FeatureKey, type Step } from '../case/core';
import { FIDX, LCOL } from '../case/vocab';
import { NODES, STAGE_IDS, childrenOf, type Node } from './nodes';
import { buildVis3D, disposeObj, disposeObj3dCaches, type Mode } from './obj3d';
import { KIND, XAI } from './xai';
import { cueKeys, cueName, featShort, featName, rp, stateShort, type Lang } from './i18n';

/* The model as a stack of 3D objects, bottom to top: one object per stage, each showing the actual tensor of the chosen frame. */
export interface SceneData { lang: Lang; base: ReturnType<typeof import('../case/core').run>['base']; clip: ClipData; out: Step[]; events: EventRec[]; checks: Check[]; fmax: Record<FeatureKey, number> }
export interface SceneState { fi: number; kfi: number; feat: FeatureKey; gl: string; gc: string[]; col: number; ps: Record<string, number> }
export interface View { stage: number; l2: string | null; l3: string | null }
export interface SceneApi { update: (s: SceneState) => void; select: (i: number, fly: boolean) => void; setView: (v: View | null, flyNull?: boolean) => void; overview: () => void; dispose: () => void }

export const GAP = 22;
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
  const priorKeys = Object.keys(PRIOR), cw = 1.2, Z0 = 2.5, DZ = 1.3;
  const heat = (v: number) => new THREE.Color().setHSL(0.62, 0.8, 0.18 + 0.5 * v);
  // one row per table row; only the chosen label's row and the chosen cues' rows are shown.
  // Read front to back: column heads, starting odds, each cue, then the share at the back.
  const rows: { key: string; ms: THREE.Mesh[]; base: THREE.Color[]; label: THREE.Sprite }[] = [];
  const row = (key: string, vals: number[], name: string) => {
    const ms: THREE.Mesh[] = [], base: THREE.Color[] = [];
    vals.forEach((v, c) => { const b = heat(v), m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1, 0.7), std(b.getHex())); m.scale.y = Math.max(0.04, v * 2); m.position.set((c - 2) * cw, -1.5 + m.scale.y / 2, 0); g.add(m); reg(m, c); ms.push(m); base.push(b); });
    const l = makeLabel(name, '#c9d1e0', 0.36); l.sprite.center.set(1, 0.5); l.sprite.material.depthTest = false; l.sprite.renderOrder = 10; g.add(l.sprite);
    rows.push({ key, ms, base, label: l.sprite });
  };
  priorKeys.forEach((k) => row('p:' + k, PRIOR[k], rp(d.lang, k)));
  cueKeys.forEach((k) => row('c:' + k, LIK[k], '× ' + cueName(d.lang, k)));
  const post = STATES.map((_, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1, 0.7), std('#6fe3c1', { emissive: '#6fe3c1', emissiveIntensity: 0.3 })); m.position.set((c - 2) * cw, 0, 0); g.add(m); reg(m, c); return m; });
  const pl = makeLabel(T(d, '= 占比', '= share'), '#6fe3c1', 0.36); pl.sprite.center.set(1, 0.5); pl.sprite.material.depthTest = false; pl.sprite.renderOrder = 10; g.add(pl.sprite);
  // state names in front of the nearest row, so they read as column heads and nothing stands in front of them
  STATES.forEach((s, c) => { const l = makeLabel(stateShort(d.lang, s), '#e6ebf5', 0.34); l.sprite.position.set((c - 2) * cw, -1.5, Z0 + 1.2); g.add(l.sprite); });
  const t3 = makeLabel('', '#6fe3c1', 0.38); t3.sprite.position.set(0, -2.3, Z0 + 1.6); g.add(t3.sprite);
  // tilt the board toward the camera: seen edge-on, the rows (and their names) would stack on top of each other
  g.position.z = -3.5; g.rotation.x = 0.5;
  let last = '';
  return (s) => {
    const sum = PRIOR[s.gl].reduce((a, b) => a + b, 0), p0 = PRIOR[s.gl].map((v) => v / sum), prod = p0.map((p, i) => s.gc.reduce((a, c) => a * LIK[c][i], p)), Z = prod.reduce((a, b) => a + b, 0), pp = prod.map((v) => v / Z);
    const shown = ['p:' + s.gl, ...cueKeys.filter((k) => s.gc.includes(k)).map((k) => 'c:' + k)];
    rows.forEach((r) => {
      const at = shown.indexOf(r.key), z = Z0 - at * DZ;
      r.label.visible = at >= 0; r.label.position.set(-3.6, -1.2, z);
      r.ms.forEach((m, c) => { m.visible = at >= 0; m.position.z = z; const mt = m.material as THREE.MeshStandardMaterial; mt.color.copy(r.base[c]); mt.emissive.set(c === s.col ? '#ffffff' : '#000000'); mt.emissiveIntensity = c === s.col ? 0.45 : 0; });
    });
    const zp = Z0 - shown.length * DZ; pl.sprite.position.set(-3.6, -1.2, zp);
    post.forEach((m, c) => { m.position.z = zp; m.scale.y = Math.max(0.04, pp[c] * 3); m.position.y = -1.5 + m.scale.y / 2; (m.material as THREE.MeshStandardMaterial).emissive.set(c === s.col ? '#ffffff' : '#6fe3c1'); (m.material as THREE.MeshStandardMaterial).emissiveIntensity = c === s.col ? 0.6 : 0.25; });
    const txt = stateShort(d.lang, STATES[s.col]) + ': ' + p0[s.col].toFixed(2) + s.gc.map((c) => ' × ' + LIK[c][s.col].toFixed(2)).join('') + ' = ' + prod[s.col].toFixed(3) + '  →  ' + pp[s.col].toFixed(2);
    if (txt !== last) { t3.set(txt); last = txt; }
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

export function createScene(el: HTMLElement, d: SceneData, onPick: (i: number) => void, onCol: (c: number) => void, onNode: (id: string) => void): SceneApi {
  const W = () => Math.max(1, el.clientWidth), H = () => Math.max(1, el.clientHeight);
  const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(W(), H()); renderer.setClearColor('#05070b'); el.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#05070b', 120, 700);
  scene.add(new THREE.AmbientLight('#ffffff', 0.9)); const sun = new THREE.DirectionalLight('#ffffff', 1.6); sun.position.set(6, 10, 12); scene.add(sun);
  const cam = new THREE.PerspectiveCamera(40, W() / H(), 0.1, 1500);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.maxDistance = 500; ctl.minDistance = 3;

  const colBars: THREE.Mesh[] = [], reg: Reg = (m, c) => { m.userData.col = c; colBars.push(m); };
  const builders: ((g: THREE.Group, d: SceneData, reg: Reg) => Upd)[] = [sDetect, sKeypoints, sSmooth, sFeatures, sBaseline, sSpace, sVote, sGuess, sCheck];
  /* Folding stack: only the selected stage is open; the others fold into thin plates on one spine, so nothing hangs over anything else. */
  const CW = 13, CHH = 10.5, CD = 12, PLATE = 0.5, FOLD = 3;
  const stages = builders.map((b, i) => {
    const g = new THREE.Group(); scene.add(g);
    const content = new THREE.Group(); g.add(content);
    const upd = b(content, d, reg);
    const name = String(i + 1).padStart(2, '0') + '  ' + NAMES[d.lang][i];
    const t = makeLabel(name, '#e6ebf5', 0.8, 5); t.sprite.position.set(0, 4.2, 0); g.add(t.sprite);
    // the folded plate's name sits to its left, like a row in a table of contents
    const side = makeLabel(name, '#aab4c8', 0.55); side.sprite.center.set(1, 0.5); side.sprite.material.depthTest = false; side.sprite.renderOrder = 10; side.sprite.position.set(-CW / 2 - 0.8, 0, 0); g.add(side.sprite);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(CW, 8, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.userData.i = i; g.add(hit);
    // what kind of component this is, shown as a casing: dark and opaque for a black box, clear for a glass box
    const X = XAI[STAGE_IDS[i]], K = KIND[X.kind], black = X.box === 'black';
    const shell = new THREE.Mesh(new THREE.BoxGeometry(CW, CHH, CD), new THREE.MeshBasicMaterial({ color: black ? '#07080c' : K.color, transparent: true, opacity: black ? 0.62 : 0.035, depthWrite: false, side: THREE.DoubleSide }));
    shell.renderOrder = 2; g.add(shell);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), new THREE.LineBasicMaterial({ color: K.color, transparent: true, opacity: 0.85 })); g.add(edges);
    const plate = makeLabel(K.short[d.lang] + (black ? (d.lang === 'en' ? ' · black box' : ' · 黑箱') : (d.lang === 'en' ? ' · glass box' : ' · 白箱')), K.color, 0.55);
    plate.sprite.position.set(0, CHH / 2 + 1.3, 0); g.add(plate.sprite);
    // decision gates: an amber frame on the stream above the stage; shown while the stage is open
    const gates = new THREE.Group(); g.add(gates);
    X.gates.slice(0, 2).forEach((gt, k) => {
      const gg = new THREE.Group(); gg.position.set(0, GAP / 2 + k * 2.6, 0); gates.add(gg);
      const mat = new THREE.MeshStandardMaterial({ color: '#ffb84d', emissive: '#ffb84d', emissiveIntensity: 0.35 });
      [-1.4, 1.4].forEach((px) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.6, 0.16), mat); p.position.set(px, 0, 0); gg.add(p); });
      const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.16, 0.16), mat); top.position.set(0, 0.8, 0); gg.add(top);
      const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), mat); dia.position.set(0, 1.25, 0); gg.add(dia);
      const lb = makeLabel('◆ ' + gt.rule[d.lang], '#ffcf8a', 0.36); lb.sprite.center.set(0, 0.5); lb.sprite.position.set(1.8, 0.2, 0); gg.add(lb.sprite);
    });
    // room the stage needs below and above its centre, open and folded
    const hiOpen = X.gates.length ? GAP / 2 + (Math.min(2, X.gates.length) - 1) * 2.6 + 3 : CHH / 2 + 2.6;
    return { g, upd, content, title: t.sprite, side: side.sprite, hit, shell, edges, plate: plate.sprite, gates, black, hiOpen, y: 0, ty: 0, f: 0, tf: 0 };
  });
  type St = (typeof stages)[number];
  const lo = (st: St, open: boolean) => (open ? CHH / 2 + 1.5 : FOLD / 2), hi = (st: St, open: boolean) => (open ? st.hiOpen : FOLD / 2);
  const layout = (open: number) => { let y = 0; stages.forEach((st, i) => { if (i) y += hi(stages[i - 1], i - 1 === open) + lo(st, i === open); st.ty = y; st.tf = i === open ? 1 : 0; }); };
  const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
  const apply = (st: St) => {
    const f = st.f; st.g.position.y = st.y;
    st.content.visible = f > 0.02; st.content.scale.setScalar(Math.max(1e-3, f));
    // a folded stage is a thin plate; the open stage has no casing, its content stands free like the parts on the right
    [st.shell, st.edges].forEach((m) => { m.scale.set(1, PLATE / CHH, 0.6); m.visible = f < 0.98; });
    (st.shell.material as THREE.MeshBasicMaterial).opacity = (st.black ? 0.62 : 0.2) * (1 - f);
    (st.edges.material as THREE.LineBasicMaterial).opacity = 0.85 * (1 - f);
    st.title.material.opacity = f; st.title.visible = f > 0.02;
    st.side.material.opacity = 1 - f; st.side.visible = f < 0.98;
    st.plate.material.opacity = f; st.plate.visible = f > 0.02;
    st.gates.visible = f > 0.9;
    st.hit.scale.y = lerp(0.3, 1, f);
  };
  // one spine through every stage, and data dots between neighbours
  const spineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]); scene.add(new THREE.Line(spineGeo, new THREE.LineBasicMaterial({ color: '#1d2a4d' })));
  const NP = 10, streams = stages.slice(0, -1).map(() => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(NP * 3), 3)); const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#6c9bff', size: 0.2, transparent: true, opacity: 0.9 })); p.frustumCulled = false; scene.add(p); return geo; });
  const edgeTop = (st: St) => lerp(PLATE / 2, CHH / 2 + 0.2, st.f), edgeBot = (st: St) => lerp(PLATE / 2, CHH / 2 - 0.2, st.f);

  /* level 2 (parts) to the right of the open stage, their level-3 steps below; only the open stage's parts are shown */
  const DX = 11.5, X0 = 16, DY = -9.5;
  interface Obj { node: Node; g: THREE.Group; content: THREE.Group; hit: THREE.Mesh; title: ReturnType<typeof makeLabel>; sig: string; x: number; off: number; stage: number }
  const objs: Obj[] = [];
  let view: View | null = null, last: SceneState | null = null, sel = 0;
  const modeOf = (id: string): Mode => { const cur = view?.l3 ?? view?.l2; return !cur || id === cur ? 'on' : 'path'; };
  const refresh = (o: Obj) => {
    if (!last) return; const m = modeOf(o.node.id), v = o.node.vis({ d, s: last, lang: d.lang, ps: last.ps }), sig = m + JSON.stringify(v);
    if (sig === o.sig) return; o.sig = sig; disposeObj(o.content); o.content.clear(); o.content.add(buildVis3D(v, m));
  };
  const refreshNear = () => objs.forEach((o) => { if (o.stage === sel) refresh(o); });
  const parts = STAGE_IDS.map((sid, i) => {
    const pg = new THREE.Group(); pg.visible = false; scene.add(pg);
    const line = (a: THREE.Vector3, b: THREE.Vector3) => pg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: '#3a4764' })));
    const l2 = childrenOf(sid);
    l2.forEach((n, k) => {
      const x = X0 + k * DX, mk = (node: Node, off: number) => {
        const og = new THREE.Group(); og.position.set(x, off, 0); pg.add(og); const content = new THREE.Group(); og.add(content);
        const title = makeLabel(node.title[d.lang], '#e6ebf5', 0.62); title.sprite.position.set(0, 4.3, 0); og.add(title.sprite);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(10.4, 7.6, 7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.userData.node = node.id; og.add(hit);
        objs.push({ node, g: og, content, hit, title, sig: '', x, off, stage: i });
      };
      mk(n, 0);
      line(new THREE.Vector3(k === 0 ? CW / 2 : x - DX + 5.4, 0, 0), new THREE.Vector3(x - 5.4, 0, 0));
      childrenOf(n.id).forEach((c3, j) => { mk(c3, DY * (j + 1)); line(new THREE.Vector3(x, -4, 0), new THREE.Vector3(x, DY * (j + 1) + 4.8, 0)); });
    });
    if (l2.length) { const h = makeLabel(d.lang === 'en' ? 'PARTS OF THIS STAGE  →   (SMALLEST STEPS BELOW)' : '这一层的部件 →（最小的步骤在下方）', '#6c9bff', 0.9); h.sprite.position.set(X0 + ((l2.length - 1) * DX) / 2, 8, 0); pg.add(h.sprite); }
    return pg;
  });
  const legend = new THREE.Group(); scene.add(legend);
  (Object.keys(KIND) as (keyof typeof KIND)[]).forEach((k, j) => { const l = makeLabel('■ ' + KIND[k].name[d.lang], KIND[k].color, 0.7); l.sprite.center.set(0, 0.5); l.sprite.position.set(X0 - 5, -j * 1.4, 0); legend.add(l.sprite); });
  { const l = makeLabel(d.lang === 'en' ? '◆ amber frame = a judgement is made here' : '◆ 琥珀色闸门 = 这里下判断', '#ffcf8a', 0.7); l.sprite.center.set(0, 0.5); l.sprite.position.set(X0 - 5, -6 * 1.4, 0); legend.add(l.sprite); }
  const maxParts = Math.max(...STAGE_IDS.map((sid) => childrenOf(sid).length));

  const goalPos = new THREE.Vector3(), goalTgt = new THREE.Vector3(); let flying = false, placed = false;
  const fly = (pos: THREE.Vector3, tgt: THREE.Vector3) => { goalPos.copy(pos); goalTgt.copy(tgt); flying = true; };
  const fitDist = (w: number) => (w / 2) / (Math.tan(THREE.MathUtils.degToRad(20)) * Math.min(1.7, cam.aspect));
  const focus = (i: number) => { const y = stages[i].ty; fly(new THREE.Vector3(10, y + 6, fitDist(15) + 8), new THREE.Vector3(0, y + 0.5, 0)); };
  cam.position.set(40, 10, 70); ctl.target.set(30, -3, 0);
  layout(0);
  const api: SceneApi = {
    update: (s) => { last = s; stages.forEach((st) => st.upd(s)); refreshNear(); },
    setView(v, flyNull = true) {
      view = v; refreshNear();
      if (!v) { if (flyNull) focus(sel); return; }
      const id = v.l3 ?? v.l2, ob = objs.find((x) => x.node.id === id);
      if (ob) { const y = stages[ob.stage].ty + ob.off; fly(new THREE.Vector3(ob.x + 5.5, y + 6.2, fitDist(11.5) + 2), new THREE.Vector3(ob.x, y - 0.3, 0)); } else focus(v.stage);
    },
    select(i, f) {
      sel = i; layout(i); parts.forEach((pg, k) => { pg.visible = k === i; });
      // the first placement snaps; later ones fold and unfold
      if (!placed) { placed = true; stages.forEach((st) => { st.y = st.ty; st.f = st.tf; apply(st); }); }
      refreshNear(); if (f) focus(i);
    },
    overview: () => { const top = stages[stages.length - 1].ty; fly(new THREE.Vector3(12, top / 2 + 12, fitDist(X0 + maxParts * DX) + 12), new THREE.Vector3(12, top / 2 - 2, 0)); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { (x as THREE.SpriteMaterial).map?.dispose(); x.dispose(); }); }); renderer.dispose(); disposeObj3dCaches(); renderer.domElement.remove(); },
  };

  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down: [number, number] | null = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; flying = false; });
  cv.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const r = cv.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, cam);
    const sh = ray.intersectObjects(objs.filter((x) => x.stage === sel).map((x) => x.hit), false)[0], st0 = ray.intersectObjects(stages.map((x) => x.hit), false)[0];
    if (sh && (!st0 || sh.distance < st0.distance)) { onNode(sh.object.userData.node as string); return; }
    const bar = ray.intersectObjects(colBars, false)[0];
    if (bar && sel === 7 && !(sh && sh.distance < bar.distance)) { onCol(bar.object.userData.col as number); return; }
    const hit = ray.intersectObjects(stages.map((s) => s.hit), false)[0]; if (hit) onPick(hit.object.userData.i as number);
  });
  const clock = new THREE.Clock(); let raf = 0, prevT = 0, lastRef = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop); const t = clock.getElapsedTime(), dt = Math.min(0.25, t - prevT); prevT = t;
    if (flying) { const k = 1 - Math.exp(-dt * 5); cam.position.lerp(goalPos, k); ctl.target.lerp(goalTgt, k); if (cam.position.distanceTo(goalPos) < 0.05) flying = false; }
    const kf = 1 - Math.exp(-dt * 6);
    stages.forEach((st) => { if (Math.abs(st.ty - st.y) > 1e-3 || Math.abs(st.tf - st.f) > 1e-3) { st.y = lerp(st.y, st.ty, kf); st.f = lerp(st.f, st.tf, kf); apply(st); } });
    parts.forEach((pg, i) => { pg.position.y = stages[i].y; });
    const top = stages[stages.length - 1]; legend.position.y = Math.max(top.y + edgeTop(top) + 10, stages[sel].y + 22);
    const sp = spineGeo.getAttribute('position') as THREE.BufferAttribute; sp.setXYZ(0, 0, stages[0].y, 0); sp.setXYZ(1, 0, top.y, 0); sp.needsUpdate = true;
    streams.forEach((geo, i) => { const a = stages[i].y + edgeTop(stages[i]), b = stages[i + 1].y - edgeBot(stages[i + 1]), p = geo.getAttribute('position') as THREE.BufferAttribute; for (let k = 0; k < NP; k++) { const u = (t * 0.25 + k / NP) % 1; p.setXYZ(k, 0, a + u * Math.max(0, b - a), 0); } p.needsUpdate = true; });
    if (t - lastRef > 0.4) { lastRef = t; refreshNear(); }
    ctl.update(); renderer.render(scene, cam);
  };
  loop();
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); }); ro.observe(el);
  return api;
}
