/* Turns a plain description (Vis) into a real 3D object: bars become columns, tables become matrices of bars, curves become ribbons, and so on. */
import * as THREE from 'three';
import type { Vis } from './vis';

export type Mode = 'on' | 'path' | 'dim';
const BOX = new THREE.BoxGeometry(1, 1, 1), SPH = new THREE.SphereGeometry(1, 16, 12), CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 12), OCT = new THREE.OctahedronGeometry(1);
const BG = new THREE.Color('#05070b');
const FONT = '"PingFang SC","Helvetica Neue",sans-serif';

const mats = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, mode: Mode, glow = 0) {
  const key = `${color}|${mode}|${glow}`; let m = mats.get(key);
  if (!m) { const c = new THREE.Color(color); if (mode === 'dim') c.lerp(BG, 0.55); else if (mode === 'path') c.lerp(BG, 0.15); m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.12, emissive: glow && mode !== 'dim' ? color : '#000000', emissiveIntensity: glow }); mats.set(key, m); }
  return m;
}
const plain = new Map<string, THREE.MeshBasicMaterial>();
function basic(color: string, opacity: number, mode: Mode) {
  const key = `${color}|${opacity}|${mode}`; let m = plain.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: mode === 'dim' ? opacity * 0.45 : opacity, side: THREE.DoubleSide, depthWrite: false }); plain.set(key, m); }
  return m;
}

/* labels: one cached texture per distinct text, so redrawing every frame stays cheap */
interface Lab { mat: THREE.SpriteMaterial; aspect: number }
const labs = new Map<string, Lab>();
function labelFor(text: string, color: string): Lab {
  const key = text + '|' + color; let l = labs.get(key);
  if (l) { labs.delete(key); labs.set(key, l); return l; }
  const c = document.createElement('canvas'), H = 128, m = c.getContext('2d')!; m.font = `600 56px ${FONT}`;
  c.width = Math.min(4096, Math.ceil(m.measureText(text || ' ').width) + 40); c.height = H;
  const g = c.getContext('2d')!; g.font = `600 56px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(text, c.width / 2, H / 2);
  l = { mat: new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }), aspect: c.width / H };
  labs.set(key, l);
  if (labs.size > 700) { const old = labs.keys().next().value as string; const o = labs.get(old)!; o.mat.map?.dispose(); o.mat.dispose(); labs.delete(old); }
  return l;
}
export function disposeObj3dCaches() { labs.forEach((l) => { l.mat.map?.dispose(); l.mat.dispose(); }); labs.clear(); mats.forEach((m) => m.dispose()); mats.clear(); plain.forEach((m) => m.dispose()); plain.clear(); }
export function disposeObj(g: THREE.Group) { (g.userData.ownInst as THREE.InstancedMesh[] | undefined)?.forEach((x) => x.dispose()); (g.userData.own as THREE.BufferGeometry[] | undefined)?.forEach((x) => x.dispose()); (g.userData.ownMat as THREE.Material[] | undefined)?.forEach((x) => x.dispose()); }

type Anchor = 'c' | 'l' | 'r';
function lab(g: THREE.Group, text: string, x: number, y: number, z: number, o: { color?: string; size?: number; anchor?: Anchor; mode?: Mode } = {}) {
  const l = labelFor(text, o.mode === 'dim' ? '#5d6679' : (o.color ?? '#e6ebf5')), size = (o.size ?? 0.4) * 1.5, s = new THREE.Sprite(l.mat);
  s.scale.set(size * l.aspect, size, 1); s.center.set(o.anchor === 'l' ? 0 : o.anchor === 'r' ? 1 : 0.5, 0.5); s.position.set(x, y, z);
  g.add(s); return s;
}
const wrapLines = (text: string, maxUnits: number) => { const out: string[] = []; let cur = '', w = 0; for (const ch of text) { const u = /[⺀-鿿＀-￯]/.test(ch) ? 2 : 1; if (w + u > maxUnits && cur) { out.push(cur); cur = ''; w = 0; } cur += ch; w += u; } if (cur) out.push(cur); return out; };
const caption = (g: THREE.Group, text: string | undefined, y: number, mode: Mode) => { if (text) wrapLines(text, 50).forEach((ln, i) => lab(g, ln, 0, y - i * 0.55, 0, { color: '#9aa5b8', size: 0.3, mode })); };
const box = (g: THREE.Group, x: number, y: number, z: number, sx: number, sy: number, sz: number, color: string, mode: Mode, glow = 0) => { const m = new THREE.Mesh(BOX, mat(color, mode, glow)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
const own = (g: THREE.Group, geo: THREE.BufferGeometry) => { g.userData.own = [...(g.userData.own ?? []), geo]; return geo; };
const ownMat = <T extends THREE.Material>(g: THREE.Group, m: T) => { g.userData.ownMat = [...(g.userData.ownMat ?? []), m]; return m; };
const heatCol = (v: number) => new THREE.Color().setHSL(0.62, 0.75, 0.2 + 0.5 * Math.min(1, Math.max(0, v))).getStyle();

function ribbon(g: THREE.Group, arr: (number | null)[], X: (i: number) => number, Y: (v: number) => number, z: number, color: string, mode: Mode, w = 0.16) {
  let seg: number[] = [];
  const flush = () => { if (seg.length > 1) {
    const pos: number[] = [], wall: number[] = [];
    seg.forEach((i) => { const x = X(i), y = Y(arr[i] as number); pos.push(x, y, z - w, x, y, z + w); wall.push(x, y, z, x, -2.2, z); });
    const idx: number[] = []; for (let k = 0; k < seg.length - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = own(g, new THREE.BufferGeometry()); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    g.add(new THREE.Mesh(geo, ownMat(g, new THREE.MeshBasicMaterial({ color: mode === 'dim' ? '#3a4764' : color, side: THREE.DoubleSide }))));
    const wg = own(g, new THREE.BufferGeometry()); wg.setAttribute('position', new THREE.Float32BufferAttribute(wall, 3)); wg.setIndex(idx);
    g.add(new THREE.Mesh(wg, ownMat(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: mode === 'dim' ? 0.05 : 0.16, side: THREE.DoubleSide, depthWrite: false }))));
  } seg = []; };
  arr.forEach((v, i) => { if (typeof v === 'number' && Number.isFinite(v)) seg.push(i); else flush(); }); flush();
}

export function buildVis3D(v: Vis, mode: Mode): THREE.Group {
  const g = new THREE.Group();
  if (v.t === 'frame') {
    const w = 6.6, h = Math.min(4.2, w / v.aspect), ww = h * v.aspect;
    box(g, 0, 0.2, 0, ww, h, 0.18, '#262d3b', mode);
    ['#ff5a5a', '#4fd08c', '#5a8dff'].forEach((c, i) => { const m = new THREE.Mesh(BOX, basic(c, 0.2, mode)); m.scale.set(ww, h, 0.04); m.position.set(0, 0.2, 0.25 + i * 0.16); g.add(m); });
    if (v.box) {
      const bx = new THREE.Mesh(BOX, basic('#6c9bff', 0.22, mode)); bx.scale.set(v.box[2] * ww, v.box[3] * h, 0.9); bx.position.set((v.box[0] + v.box[2] / 2 - 0.5) * ww, 0.2 - (v.box[1] + v.box[3] / 2 - 0.5) * h, 0.4); g.add(bx);
      const e = new THREE.LineSegments(own(g, new THREE.EdgesGeometry(BOX)), ownMat(g, new THREE.LineBasicMaterial({ color: '#9db4ff' }))); e.scale.copy(bx.scale); e.position.copy(bx.position); g.add(e);
    } else lab(g, v.none ?? '', 0, 0.2, 0.9, { color: '#ff7a7a', size: 0.5, mode });
    caption(g, v.note, -2.8, mode);
  } else if (v.t === 'grid') {
    const n = v.n, cell = 6.4 / n, mx = Math.max(...v.vals, 1e-6), off = (n - 1) / 2;
    v.vals.forEach((val, k) => { const h = Math.max(0.05, (val / mx) * 2.6); box(g, ((k % n) - off) * cell, -1.4 + h / 2, (Math.floor(k / n) - off) * cell, cell * 0.9, h, cell * 0.9, heatCol(val / mx), mode); });
    (v.marks ?? []).forEach((m) => {
      const x = (m.x - off) * cell, z = (m.y - off) * cell;
      if (m.shape === 'sq') { const e = new THREE.LineSegments(own(g, new THREE.EdgesGeometry(BOX)), ownMat(g, new THREE.LineBasicMaterial({ color: m.color }))); e.scale.set(cell * 1.1, 3.2, cell * 1.1); e.position.set(x, -0.1, z); g.add(e); }
      else { const s = new THREE.Mesh(m.shape === 'x' ? OCT : SPH, mat(m.color, mode, 0.6)); s.scale.setScalar(m.shape === 'x' ? 0.22 : 0.2); s.position.set(x, 1.55 + (m.shape === 'x' ? 0.35 : 0), z); g.add(s); }
    });
    caption(g, v.caption, -2.3, mode);
  } else if (v.t === 'bars') {
    const n = v.items.length, step = Math.min(0.95, 4.6 / Math.max(1, n)), lo = v.lo ?? 0, hi = v.hi ?? Math.max(1e-9, ...v.items.map((i) => Math.abs(i.v))), L = 6.2, x0 = -1.9;
    const X = (val: number) => x0 + ((val - lo) / (hi - lo || 1)) * L, zero = X(lo < 0 ? 0 : lo);
    box(g, x0 + L / 2, -1.1, 0, L + 0.2, 0.05, n * step + 0.3, '#1b2336', mode);
    v.items.forEach((it, k) => {
      const z = -((n - 1) / 2) * step + k * step, end = X(it.v), len = Math.max(0.04, Math.abs(end - zero));
      box(g, (end + zero) / 2, -0.8, z, len, 0.55, step * 0.62, it.color ?? (it.hi ? '#6c9bff' : '#4a6bd0'), mode, it.hi ? 0.3 : 0);
      lab(g, it.label, x0 - 0.25, -0.8, z + 0.05, { anchor: 'r', size: 0.3, color: it.hi ? '#fff' : '#aab4c8', mode });
      lab(g, it.note ?? it.v.toFixed(2), Math.max(end, zero) + 0.25, -0.8, z + 0.05, { anchor: 'l', size: 0.3, mode });
    });
    (v.lines ?? []).forEach((l) => { box(g, X(l.v), -0.4, 0, 0.04, 1.5, n * step + 0.3, l.color ?? '#ffb84d', mode, 0.5); lab(g, l.label, X(l.v), 0.6, 0, { color: l.color ?? '#ffb84d', size: 0.3, mode }); });
    caption(g, v.caption, -2.5, mode);
  } else if (v.t === 'eq') {
    const n = v.lines.length, step = Math.min(1.0, 5.2 / Math.max(1, n));
    v.lines.forEach((l, k) => { const y = ((n - 1) / 2) * step - k * step; box(g, -4.7, y, 0, 0.08, step * 0.6, 0.08, l.color ?? '#3a4764', mode, 0.4); lab(g, l.text, -4.4, y, 0, { anchor: 'l', color: l.color ?? '#e6ebf5', size: 0.42 * ((l.size ?? 34) / 34), mode }); });
  } else if (v.t === 'series') {
    const all = [...v.a, ...(v.b ?? [])].filter((x): x is number => typeof x === 'number' && Number.isFinite(x)), extra = (v.lines ?? []).map((l) => l.v);
    const lo = Math.min(...all, ...extra), hi = Math.max(...all, ...extra), Y = (val: number) => -2 + ((val - lo) / (hi - lo || 1)) * 4.2, X = (i: number) => -4.4 + (i / Math.max(1, v.a.length - 1)) * 8.8;
    box(g, 0, -2.25, 0, 9.2, 0.06, 1.8, '#1b2336', mode);
    if (v.shade) { const m = new THREE.Mesh(BOX, basic('#6c9bff', 0.12, mode)); m.scale.set(Math.max(0.05, X(v.shade[1]) - X(v.shade[0])), 4.4, 1.7); m.position.set((X(v.shade[0]) + X(v.shade[1])) / 2, -0.1, 0); g.add(m); }
    ribbon(g, v.a, X, Y, v.b ? -0.4 : 0, v.b ? '#5b6577' : '#6c9bff', mode); if (v.b) ribbon(g, v.b, X, Y, 0.4, '#6c9bff', mode);
    (v.lines ?? []).forEach((l) => { box(g, 0, Y(l.v), 0, 9, 0.03, 1.7, l.color ?? '#ffb84d', mode, 0.5); lab(g, l.label, 4.5, Y(l.v) + 0.3, 0, { anchor: 'r', color: l.color ?? '#ffb84d', size: 0.28, mode }); });
    if (v.mark !== undefined) box(g, X(v.mark), 0, 0, 0.05, 4.4, 1.8, '#ffffff', mode, 0.8);
    if (v.la) lab(g, v.la, -4.4, 2.5, 0, { anchor: 'l', color: v.b ? '#8a94a6' : '#6c9bff', size: 0.3, mode }); if (v.lb) lab(g, v.lb, 0.2, 2.5, 0, { anchor: 'l', color: '#6c9bff', size: 0.3, mode });
    caption(g, v.caption, -2.9, mode);
  } else if (v.t === 'strip') {
    const rows = v.rows.length;
    v.rows.forEach((r, k) => { const z = (k - (rows - 1) / 2) * 1.8, n = r.cells.length, sz = Math.min(0.5, 8.4 / n); lab(g, r.label, -4.5, 0.7, z, { anchor: 'l', size: 0.3, color: '#aab4c8', mode }); r.cells.forEach((c, i) => box(g, -4.2 + (i + 0.5) * (8.4 / n), 0, z, sz * 0.9, 0.6, 1.1, c, mode)); });
    caption(g, v.caption, -2.4, mode);
  } else if (v.t === 'table') {
    const cols = v.head.length, rows = v.rows.length, cs = Math.min(1.35, 6.6 / cols), rs = Math.min(1.25, 6.4 / Math.max(1, rows)), x0 = -((cols - 1) / 2) * cs + 1.2, z0 = -((rows - 1) / 2) * rs;
    v.head.forEach((h, i) => lab(g, h, x0 + i * cs, -1.35, z0 + rows * rs - 0.1, { size: 0.3, color: v.hiCol === i ? '#fff' : '#aab4c8', mode }));
    v.rows.forEach((r, k) => {
      const z = z0 + k * rs, nums = r.cells.map((c) => Math.abs(parseFloat(c))), mx = Math.max(1e-9, ...nums.filter(Number.isFinite));
      lab(g, r.label, x0 - cs * 0.6, -1.2, z, { anchor: 'r', size: 0.28, color: r.hi ? '#fff' : '#aab4c8', mode });
      r.cells.forEach((c, i) => { const val = Number.isFinite(nums[i]) ? nums[i] : 0, h = 0.08 + 1.5 * (val / mx), on = v.hiCol === i; box(g, x0 + i * cs, -1.3 + h / 2, z, cs * 0.78, h, rs * 0.7, on ? '#9db4ff' : r.hi ? '#6c9bff' : '#4a6bd0', mode, on ? 0.4 : 0); lab(g, c, x0 + i * cs, -1.3 + h + 0.22, z, { size: 0.24, mode }); });
    });
    caption(g, v.caption, -2.7, mode);
  } else if (v.t === 'checks') {
    const n = v.items.length, step = Math.min(1.05, 5 / Math.max(1, n));
    v.items.forEach((it, k) => { const y = ((n - 1) / 2) * step - k * step, col = it.ok === null ? '#4a5163' : it.ok ? '#2fbf71' : '#e5484d'; box(g, -4.4, y, 0, 0.62, 0.62, 0.62, col, mode, it.ok === null ? 0 : 0.35); lab(g, it.text, -3.8, y, 0, { anchor: 'l', size: 0.38, color: it.ok ? '#e6ebf5' : '#aab4c8', mode }); });
    caption(g, v.caption, -2.9, mode);
  } else if (v.t === 'chain') {
    const n = v.items.length, per = Math.min(n, 5), rows = Math.ceil(n / per), sp = 8.8 / per;
    v.items.forEach((it, k) => {
      const r = Math.floor(k / per), c = k % per, x = -4.4 + (c + 0.5) * sp, y = ((rows - 1) / 2) * 2 - r * 2, col = it.state === 'on' ? '#234fe5' : it.state === 'off' ? '#a62b3a' : '#2a3347';
      box(g, x, y, 0, sp * 0.62, 0.9, 0.9, col, mode, it.state === 'on' ? 0.3 : 0); lab(g, it.label, x, y + 0.85, 0, { size: 0.3, color: it.state === 'dim' ? '#8a94a6' : '#fff', mode });
      if (c < per - 1 && k < n - 1) { const a = new THREE.Mesh(CONE, mat('#6f7a90', mode)); a.scale.set(0.18, 0.4, 0.18); a.rotation.z = -Math.PI / 2; a.position.set(x + sp / 2, y, 0); g.add(a); }
    });
    caption(g, v.caption, -2.7, mode);
  } else if (v.t === 'crowd') {
    // every cat is one small cube; cats that no longer match the evidence fade to a flat, dark tile
    const total = v.groups.reduce((s, x) => s + x.total, 0) || 1, W = 8.6, cell = 0.17, gap = 0.45, usable = W - gap * (v.groups.length - 1);
    const mesh = new THREE.InstancedMesh(BOX, ownMat(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, metalness: 0.1 })), total);
    g.userData.ownInst = [...(g.userData.ownInst ?? []), mesh];
    const m = new THREE.Matrix4(), col = new THREE.Color(); let idx = 0, x = -W / 2;
    v.groups.forEach((gr) => {
      const w = Math.max(cell, (gr.total / total) * usable), cols = Math.max(1, Math.round(w / cell)), rows = Math.ceil(gr.total / cols);
      for (let k = 0; k < gr.total; k++) {
        const r = Math.floor(k / cols), c = k % cols, on = k < gr.keep;
        m.compose(new THREE.Vector3(x + (c + 0.5) * cell, -1.6 + (r + 0.5) * cell + (on ? 0.0 : -0.07), 0), new THREE.Quaternion(), new THREE.Vector3(cell * 0.82, on ? cell * 0.82 : cell * 0.15, cell * 0.82));
        mesh.setMatrixAt(idx, m); col.set(gr.color); if (!on) col.lerp(BG, 0.72); else if (mode === 'dim') col.lerp(BG, 0.5); mesh.setColorAt(idx, col); idx++;
      }
      lab(g, gr.label, x + (cols * cell) / 2, -2.1, 0, { size: 0.3, color: gr.color, mode });
      lab(g, `${gr.keep} / ${gr.total}`, x + (cols * cell) / 2, -2.55, 0, { size: 0.3, mode });
      void rows; x += cols * cell + gap;
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; g.add(mesh);
    caption(g, v.caption, -3.1, mode);
  } else if (v.t === 'points') {
    const xs = [...v.pts.map((p) => p.x), ...(v.segs ?? []).flatMap((s) => [s.a[0], s.b[0]])], ys = [...v.pts.map((p) => p.y), ...(v.segs ?? []).flatMap((s) => [s.a[1], s.b[1]])];
    if (xs.length) {
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = Math.min(8 / Math.max(1e-6, x1 - x0), 4.6 / Math.max(1e-6, y1 - y0));
      const P = (x: number, y: number): [number, number] => [(x - (x0 + x1) / 2) * k, -(y - (y0 + y1) / 2) * k + 0.2];
      (v.segs ?? []).forEach((s) => { const a = P(s.a[0], s.a[1]), b = P(s.b[0], s.b[1]), dx = b[0] - a[0], dy = b[1] - a[1], m = new THREE.Mesh(CYL, mat(s.color, mode, 0.4)); m.scale.set(s.dash ? 0.03 : 0.05, Math.hypot(dx, dy), s.dash ? 0.03 : 0.05); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0); m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; g.add(m); });
      v.pts.forEach((p) => { const q = P(p.x, p.y), s = new THREE.Mesh(SPH, mat(p.color, mode, 0.3)); s.scale.setScalar(0.06 + ((p.r ?? 6) - 5) * 0.012); s.position.set(q[0], q[1], 0); g.add(s); });
    }
    caption(g, v.caption, -2.9, mode);
  }
  return g;
}
