/* A small canvas renderer: every second- and third-level part of the model is one card, drawn from a plain description of what to show. */
export type Vis =
  | { t: 'frame'; aspect: number; box: [number, number, number, number] | null; note?: string; none?: string }
  | { t: 'grid'; n: number; vals: number[]; marks?: { x: number; y: number; shape: 'x' | 'sq' | 'circ'; color: string }[]; caption?: string }
  | { t: 'bars'; items: { label: string; v: number; color?: string; hi?: boolean; note?: string }[]; lo?: number; hi?: number; lines?: { v: number; label: string; color?: string }[]; caption?: string }
  | { t: 'eq'; lines: { text: string; color?: string; size?: number }[] }
  | { t: 'series'; a: (number | null)[]; b?: (number | null)[]; mark?: number; band?: [number, number]; shade?: [number, number]; lines?: { v: number; label: string; color?: string }[]; caption?: string; la?: string; lb?: string }
  | { t: 'strip'; rows: { label: string; cells: string[] }[]; caption?: string }
  | { t: 'table'; head: string[]; rows: { label: string; cells: string[]; hi?: boolean }[]; hiCol?: number; caption?: string }
  | { t: 'checks'; items: { text: string; ok: boolean | null }[]; caption?: string }
  | { t: 'chain'; items: { label: string; state: 'on' | 'off' | 'dim' }[]; caption?: string }
  | { t: 'points'; pts: { x: number; y: number; color: string; r?: number }[]; segs?: { a: [number, number]; b: [number, number]; color: string; dash?: boolean }[]; caption?: string };

export const CW = 1024, CH = 640;
const FONT = '"PingFang SC","Helvetica Neue",sans-serif';
const heat = (v: number) => `rgba(108,155,255,${(0.08 + 0.9 * Math.min(1, Math.max(0, v))).toFixed(2)})`;

function fit(g: CanvasRenderingContext2D, text: string, size: number, maxW: number, weight = 500) {
  let s = size; g.font = `${weight} ${s}px ${FONT}`;
  while (g.measureText(text).width > maxW && s > 16) { s -= 2; g.font = `${weight} ${s}px ${FONT}`; }
  return s;
}
function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  let line = '', yy = y;
  for (const ch of text) { const t = line + ch; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, yy); line = ch; yy += lh; } else line = t; }
  if (line) g.fillText(line, x, yy);
  return yy;
}
function caption(g: CanvasRenderingContext2D, text?: string) {
  if (!text) return;
  g.fillStyle = '#9aa5b8'; g.font = `500 28px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; wrap(g, text, 40, CH - 52, CW - 80, 34);
}

export function drawVis(cv: HTMLCanvasElement, v: Vis, title: string) {
  cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#0d1322'; g.fillRect(0, 0, CW, CH);
  g.fillStyle = '#e6ebf5'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = `700 40px ${FONT}`; g.fillText(title, 40, 62);
  g.strokeStyle = '#243049'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 84); g.lineTo(CW - 40, 84); g.stroke();
  const top = 110, bottom = CH - 110, H = bottom - top;

  if (v.t === 'frame') {
    const w = Math.min(CW - 160, H * v.aspect), h = w / v.aspect, x0 = (CW - w) / 2, y0 = top + (H - h) / 2;
    g.fillStyle = '#1b2336'; g.fillRect(x0, y0, w, h); g.strokeStyle = '#3a4764'; g.lineWidth = 2; g.strokeRect(x0, y0, w, h);
    if (v.box) { g.strokeStyle = '#9db4ff'; g.lineWidth = 5; g.strokeRect(x0 + v.box[0] * w, y0 + v.box[1] * h, v.box[2] * w, v.box[3] * h); g.fillStyle = 'rgba(108,155,255,.12)'; g.fillRect(x0 + v.box[0] * w, y0 + v.box[1] * h, v.box[2] * w, v.box[3] * h); }
    else { g.fillStyle = '#ff7a7a'; g.textAlign = 'center'; g.font = `600 34px ${FONT}`; g.fillText(v.none ?? '', CW / 2, y0 + h / 2); }
    caption(g, v.note);
  } else if (v.t === 'grid') {
    const s = Math.min(H, CW - 120) / v.n, x0 = (CW - s * v.n) / 2, y0 = top + (H - s * v.n) / 2;
    v.vals.forEach((val, k) => { g.fillStyle = heat(val); g.fillRect(x0 + (k % v.n) * s, y0 + Math.floor(k / v.n) * s, s - 1, s - 1); });
    (v.marks ?? []).forEach((m) => { const cx = x0 + (m.x + 0.5) * s, cy = y0 + (m.y + 0.5) * s; g.strokeStyle = m.color; g.lineWidth = 5;
      if (m.shape === 'x') { g.beginPath(); g.moveTo(cx - 12, cy - 12); g.lineTo(cx + 12, cy + 12); g.moveTo(cx + 12, cy - 12); g.lineTo(cx - 12, cy + 12); g.stroke(); }
      else if (m.shape === 'sq') g.strokeRect(cx - 13, cy - 13, 26, 26); else { g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); g.stroke(); } });
    caption(g, v.caption);
  } else if (v.t === 'bars') {
    const n = v.items.length, rowH = Math.min(62, H / Math.max(1, n)), lo = v.lo ?? 0, hi = v.hi ?? Math.max(1e-9, ...v.items.map((i) => Math.abs(i.v))), labW = 260, x0 = 40 + labW, bw = CW - 80 - labW - 150;
    const X = (val: number) => x0 + ((val - lo) / (hi - lo || 1)) * bw;
    v.items.forEach((it, k) => {
      const y = top + k * rowH; g.fillStyle = it.hi ? '#fff' : '#aab4c8'; g.textAlign = 'left'; g.font = `${it.hi ? 700 : 500} 28px ${FONT}`; g.textBaseline = 'middle'; g.fillText(it.label, 40, y + rowH / 2);
      g.fillStyle = '#1b2336'; g.fillRect(x0, y + 10, bw, rowH - 20);
      g.fillStyle = it.color ?? (it.hi ? '#6c9bff' : '#4a6bd0'); g.fillRect(Math.min(X(0 > lo ? 0 : lo), X(it.v)), y + 10, Math.abs(X(it.v) - X(0 > lo ? 0 : lo)), rowH - 20);
      g.fillStyle = '#e6ebf5'; g.textAlign = 'left'; g.font = `600 26px ${FONT}`; g.fillText(it.note ?? it.v.toFixed(2), x0 + bw + 14, y + rowH / 2);
    });
    (v.lines ?? []).forEach((l) => { g.strokeStyle = l.color ?? '#ffb84d'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(X(l.v), top - 6); g.lineTo(X(l.v), top + n * rowH + 4); g.stroke(); g.setLineDash([]); g.fillStyle = l.color ?? '#ffb84d'; g.textAlign = 'center'; g.font = `600 22px ${FONT}`; g.textBaseline = 'alphabetic'; g.fillText(l.label, X(l.v), top + n * rowH + 28); });
    caption(g, v.caption);
  } else if (v.t === 'eq') {
    const n = v.lines.length, step = Math.min(96, H / Math.max(1, n));
    v.lines.forEach((l, k) => { g.fillStyle = l.color ?? '#e6ebf5'; g.textAlign = 'left'; g.textBaseline = 'middle'; const s = fit(g, l.text, l.size ?? 34, CW - 80, 600); void s; g.fillText(l.text, 40, top + k * step + step / 2); });
  } else if (v.t === 'series') {
    const all = [...v.a, ...(v.b ?? [])].filter((x): x is number => typeof x === 'number' && Number.isFinite(x)), extra = (v.lines ?? []).map((l) => l.v);
    const lo = Math.min(...all, ...extra), hi = Math.max(...all, ...extra), px = 60, w = CW - 2 * px, Y = (val: number) => top + H - ((val - lo) / (hi - lo || 1)) * H, X = (i: number) => px + (i / Math.max(1, v.a.length - 1)) * w;
    if (v.shade) { g.fillStyle = 'rgba(108,155,255,.13)'; g.fillRect(X(v.shade[0]), top, X(v.shade[1]) - X(v.shade[0]), H); }
    if (v.band) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(px, Y(v.band[1]), w, Y(v.band[0]) - Y(v.band[1])); }
    (v.lines ?? []).forEach((l) => { g.strokeStyle = l.color ?? '#ffb84d'; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(px, Y(l.v)); g.lineTo(px + w, Y(l.v)); g.stroke(); g.setLineDash([]); g.fillStyle = l.color ?? '#ffb84d'; g.font = `600 22px ${FONT}`; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(l.label, px + w, Y(l.v) - 4); });
    const line = (arr: (number | null)[], col: string, lw: number) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); let on = false; arr.forEach((val, i) => { if (typeof val !== 'number' || !Number.isFinite(val)) { on = false; return; } if (!on) { g.moveTo(X(i), Y(val)); on = true; } else g.lineTo(X(i), Y(val)); }); g.stroke(); };
    line(v.a, v.b ? '#5b6577' : '#6c9bff', v.b ? 2 : 3); if (v.b) line(v.b, '#6c9bff', 4);
    if (v.mark !== undefined) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(X(v.mark), top); g.lineTo(X(v.mark), top + H); g.stroke(); g.setLineDash([]); }
    if (v.la || v.lb) { g.font = `600 24px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'top'; if (v.la) { g.fillStyle = v.b ? '#8a94a6' : '#6c9bff'; g.fillText(v.la, px, top - 2); } if (v.lb) { g.fillStyle = '#6c9bff'; g.fillText(v.lb, px + 300, top - 2); } }
    caption(g, v.caption);
  } else if (v.t === 'strip') {
    const n = v.rows.length, rh = Math.min(120, H / n);
    v.rows.forEach((r, k) => { const y = top + k * rh + 14, w = (CW - 80) / r.cells.length; g.fillStyle = '#aab4c8'; g.font = `500 26px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(r.label, 40, y + 4); r.cells.forEach((c, i) => { g.fillStyle = c; g.fillRect(40 + i * w, y + 14, w - 2, rh - 60); }); });
    caption(g, v.caption);
  } else if (v.t === 'table') {
    const cols = v.head.length, labW = 250, cw = (CW - 80 - labW) / cols, rh = Math.min(64, H / (v.rows.length + 1));
    g.textBaseline = 'middle';
    v.head.forEach((h, i) => { if (v.hiCol === i) { g.fillStyle = 'rgba(108,155,255,.2)'; g.fillRect(40 + labW + i * cw, top, cw, rh * (v.rows.length + 1)); } g.fillStyle = '#e6ebf5'; g.font = `700 26px ${FONT}`; g.textAlign = 'center'; g.fillText(h, 40 + labW + i * cw + cw / 2, top + rh / 2); });
    v.rows.forEach((r, k) => { const y = top + (k + 1) * rh; g.fillStyle = r.hi ? '#fff' : '#aab4c8'; g.font = `${r.hi ? 700 : 500} 24px ${FONT}`; g.textAlign = 'left'; g.fillText(r.label, 40, y + rh / 2); r.cells.forEach((c, i) => { g.textAlign = 'center'; g.font = `${r.hi ? 700 : 500} 28px ${FONT}`; g.fillText(c, 40 + labW + i * cw + cw / 2, y + rh / 2); }); g.strokeStyle = '#243049'; g.lineWidth = 1; g.beginPath(); g.moveTo(40, y); g.lineTo(CW - 40, y); g.stroke(); });
    caption(g, v.caption);
  } else if (v.t === 'checks') {
    const n = v.items.length, step = Math.min(88, H / Math.max(1, n));
    v.items.forEach((it, k) => { const y = top + k * step + step / 2; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = it.ok === null ? '#6f7a90' : it.ok ? '#4fd08c' : '#ff7a7a'; g.font = `700 36px ${FONT}`; g.fillText(it.ok === null ? '·' : it.ok ? '✓' : '✗', 40, y); g.fillStyle = it.ok ? '#e6ebf5' : '#aab4c8'; fit(g, it.text, 30, CW - 140, it.ok ? 700 : 500); g.fillText(it.text, 100, y); });
    caption(g, v.caption);
  } else if (v.t === 'chain') {
    const n = v.items.length, per = Math.min(n, 5), rows = Math.ceil(n / per), bw = (CW - 80 - (per - 1) * 28) / per, bh = Math.min(96, (H - (rows - 1) * 40) / rows);
    v.items.forEach((it, k) => { const r = Math.floor(k / per), c = k % per, x = 40 + c * (bw + 28), y = top + r * (bh + 40) + 10; g.fillStyle = it.state === 'on' ? '#234fe5' : it.state === 'off' ? '#3a1f26' : '#1b2336'; g.fillRect(x, y, bw, bh); g.strokeStyle = it.state === 'on' ? '#9db4ff' : '#2a3347'; g.lineWidth = 3; g.strokeRect(x, y, bw, bh);
      g.fillStyle = it.state === 'dim' ? '#6f7a90' : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, it.label, 26, bw - 16, 600); g.fillText(it.label, x + bw / 2, y + bh / 2);
      if (c < per - 1 && k < n - 1) { g.fillStyle = '#6f7a90'; g.font = `600 30px ${FONT}`; g.fillText('›', x + bw + 14, y + bh / 2); } });
    caption(g, v.caption);
  } else if (v.t === 'points') {
    const xs = [...v.pts.map((p) => p.x), ...(v.segs ?? []).flatMap((s) => [s.a[0], s.b[0]])], ys = [...v.pts.map((p) => p.y), ...(v.segs ?? []).flatMap((s) => [s.a[1], s.b[1]])];
    if (xs.length) { const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), k = Math.min((CW - 160) / Math.max(1e-6, x1 - x0), H / Math.max(1e-6, y1 - y0)), cx = CW / 2 - ((x0 + x1) / 2) * k, cy = top + H / 2 - ((y0 + y1) / 2) * k;
      (v.segs ?? []).forEach((s) => { g.strokeStyle = s.color; g.lineWidth = 4; g.setLineDash(s.dash ? [10, 8] : []); g.beginPath(); g.moveTo(cx + s.a[0] * k, cy + s.a[1] * k); g.lineTo(cx + s.b[0] * k, cy + s.b[1] * k); g.stroke(); g.setLineDash([]); });
      v.pts.forEach((p) => { g.fillStyle = p.color; g.beginPath(); g.arc(cx + p.x * k, cy + p.y * k, p.r ?? 6, 0, 7); g.fill(); }); }
    caption(g, v.caption);
  }
}
