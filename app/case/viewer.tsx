'use client';
import { useEffect, useRef, useState } from 'react';
import { EAR_L, EAR_R, EYE_L, EYE_R, MUZZLE, TIP_L, TIP_R, faceFeatures, type FeatureKey, type Frame, type Pt, type Step } from './core';

export interface Layers { box: boolean; face: boolean; body: boolean; basis: boolean }

const DPR = 2;
const photoCache = new Map<number, HTMLImageElement>();

function photo(fi: number, onLoad: () => void): HTMLImageElement | null {
  let im = photoCache.get(fi);
  if (!im) {
    im = new Image();
    im.onload = onLoad;
    im.src = `/case/img/${String(fi).padStart(4, '0')}.jpg`;
    photoCache.set(fi, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}

/** Whether the local-only video frames exist (they are not part of the public site). */
export function usePhotoAvailable(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let live = true;
    fetch('/case/img/0000.jpg', { method: 'HEAD' })
      .then((r) => live && setOk(r.ok && (r.headers.get('content-type') || '').startsWith('image')))
      .catch(() => {});
    return () => { live = false; };
  }, []);
  return ok;
}

const centroid = (pts: Pt[], idx: number[]): Pt => [idx.reduce((s, i) => s + pts[i][0], 0) / idx.length, idx.reduce((s, i) => s + pts[i][1], 0) / idx.length];
const BODY_EDGES: [number, number][] = [[2, 17], [17, 18], [18, 19], [0, 2], [1, 2], [5, 9], [9, 13], [6, 10], [10, 14], [7, 11], [11, 15], [8, 12], [12, 16]];
const FACE_LINES: number[][] = [[22, 23, 24, 25, 26], [27, 28, 29, 30, 31], [4, 5], [6, 7], [8, 9], [10, 11], [32, 35]];

export function Viewer({ fi, frame, step, size, layers, minConf, geoFeature, usePhoto, light = false, full = false }: {
  fi: number; frame: Frame; step: Step; size: [number, number]; layers: Layers; minConf: number;
  geoFeature: FeatureKey | null; usePhoto: boolean; light?: boolean; full?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const [fw, fh] = size, W = cv.width, H = cv.height;
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--blue').trim() || '#234fe5';
    ctx.clearRect(0, 0, W, H);

    // transform: whole frame (photo) or a crop around the face (skeleton view)
    const img = usePhoto ? photo(fi, () => setTick((t) => t + 1)) : null;
    let sc = DPR, ox = 0, oy = 0;
    if (!img) {
      ctx.fillStyle = light ? '#ffffff' : '#0d1424';
      ctx.fillRect(0, 0, W, H);
      const ref0 = frame.fp ? centroid(frame.fp, [...Array(48).keys()]) : frame.box ? [(frame.box[0] + frame.box[2]) / 2 * fw, (frame.box[1] + frame.box[3]) / 2 * fh] : [fw / 2, fh / 2];
      let ext = 80;
      if (frame.fp) { const xs = frame.fp.map((p) => p[0]), ys = frame.fp.map((p) => p[1]); ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 40); }
      if (full) {
        // the whole camera frame, so every point sits where it sits in the recording
        sc = Math.min(W / fw, H / fh); ox = (W - fw * sc) / 2; oy = (H - fh * sc) / 2;
        ctx.strokeStyle = '#dfe4eb'; ctx.lineWidth = 1; ctx.strokeRect(ox, oy, fw * sc, fh * sc);
      } else {
        sc = Math.min(H / (ext * 1.65), 9);
        ox = W / 2 - ref0[0] * sc; oy = H / 2 - ref0[1] * sc;
      }
    } else {
      ctx.drawImage(img, 0, 0, W, H);
    }
    const C = light
      ? { box: 'rgba(22,150,80,.9)', bl: 'rgba(29,127,209,.8)', bp: '#1d7fd1', fl: 'rgba(217,130,0,.55)', fp: '#d98200', low: '#aab2bf', white: '#1c2540', cyan: '#0a8fb8', orange: '#e36b00', text: '#445' }
      : { box: 'rgba(120,220,160,.85)', bl: 'rgba(94,200,255,.7)', bp: '#5ec8ff', fl: 'rgba(255,209,102,.45)', fp: '#ffd166', low: '#b8c0cc', white: 'rgba(255,255,255,.95)', cyan: '#7fe0ff', orange: '#ff9f43', text: 'rgba(255,255,255,.85)' };
    const P = (p: Pt): Pt => [p[0] * sc + ox, p[1] * sc + oy];
    const line = (a: Pt, b: Pt, col: string, w: number, dash = false) => {
      const A = P(a), B = P(b);
      ctx.strokeStyle = col; ctx.lineWidth = w * DPR; ctx.setLineDash(dash ? [4 * DPR, 3 * DPR] : []);
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.setLineDash([]);
    };
    const dot = (p: Pt, r: number, col: string, a = 1) => { const A = P(p); ctx.globalAlpha = a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(A[0], A[1], r * DPR, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; };

    if (layers.box && frame.box) {
      const b = frame.box, A = P([b[0] * fw, b[1] * fh]), B = P([b[2] * fw, b[3] * fh]);
      ctx.strokeStyle = C.box; ctx.lineWidth = 1.5 * DPR; ctx.strokeRect(A[0], A[1], B[0] - A[0], B[1] - A[1]);
    }
    if (layers.body && frame.bp && frame.bc) {
      const ok = (i: number) => frame.bc![i] >= minConf;
      BODY_EDGES.forEach(([a, b]) => { if (ok(a) && ok(b)) line(frame.bp![a], frame.bp![b], C.bl, 1.4); });
      frame.bp.forEach((p, i) => { const A = P(p); ctx.globalAlpha = ok(i) ? 0.95 : 0.3; ctx.fillStyle = ok(i) ? C.bp : C.low; ctx.fillRect(A[0] - 2.5 * DPR, A[1] - 2.5 * DPR, 5 * DPR, 5 * DPR); ctx.globalAlpha = 1; });
    }
    if (layers.face && frame.fp && frame.fc) {
      if (!img) FACE_LINES.forEach((ln) => { for (let i = 0; i < ln.length - 1; i++) if (frame.fc![ln[i]] >= minConf && frame.fc![ln[i + 1]] >= minConf) line(frame.fp![ln[i]], frame.fp![ln[i + 1]], C.fl, 1.2); });
      frame.fp.forEach((p, i) => { const ok = frame.fc![i] >= minConf; dot(p, ok ? 2.4 : 1.9, ok ? C.fp : C.low, ok ? 0.95 : 0.35); });
    }
    // how the chosen feature is measured (step 2)
    if (geoFeature && frame.fp) {
      const pts = frame.fp, g = faceFeatures(pts, frame.fc, minConf).geo;
      if (g) {
        const white = C.white, cyan = C.cyan, orange = C.orange;
        const upEnd = (len: number): Pt => [g.mid[0] + g.up[0] * g.d * len, g.mid[1] + g.up[1] * g.d * len];
        if (geoFeature === 'ear_height' || geoFeature === 'ear_angle' || geoFeature === 'muzzle_ratio') line(g.el, g.er, white, 1.4);
        if (geoFeature === 'ear_height') {
          line(g.mid, upEnd(1.6), cyan, 1.4, true);
          [TIP_L, TIP_R].filter((i) => frame.fc![i] >= minConf).forEach((i) => {
            const h = (pts[i][0] - g.mid[0]) * g.up[0] + (pts[i][1] - g.mid[1]) * g.up[1];
            const foot: Pt = [g.mid[0] + g.up[0] * h, g.mid[1] + g.up[1] * h];
            line(g.mid, foot, orange, 2.2); line(foot, pts[i], 'rgba(255,159,67,.7)', 1, true); dot(pts[i], 4, orange);
          });
        } else if (geoFeature === 'ear_angle') {
          ([[TIP_L, [22, 26]], [TIP_R, [27, 31]]] as [number, number[]][]).forEach(([tip, base]) => { if (frame.fc![tip] >= minConf) line(centroid(pts, base), pts[tip], orange, 2.2); });
          line(g.mid, upEnd(1.6), cyan, 1.4, true);
        } else if (geoFeature === 'eye_aperture') {
          [EYE_L, EYE_R].forEach((e) => { line(pts[e[0]], pts[e[1]], cyan, 1.6); line(pts[e[2]], pts[e[3]], orange, 2.2); });
        } else if (geoFeature === 'muzzle_ratio') line(pts[MUZZLE[0]], pts[MUZZLE[1]], orange, 2.2);
      }
    }
    if (geoFeature === 'head_drop' && frame.bp) { line(frame.bp[2], [frame.bp[2][0], frame.bp[18][1]], '#ff9f43', 2.2); line(frame.bp[18], frame.bp[19], '#7fe0ff', 1.6, true); }
    // what the label was decided on: red rings
    if (layers.basis && !step.calibrating) {
      const names = new Set(step.drivers.map((d) => d.feature));
      const ring = (p: Pt, r: number) => { const A = P(p); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2.4 * DPR; ctx.beginPath(); ctx.arc(A[0], A[1], r * sc, 0, 6.2832); ctx.stroke(); };
      if (frame.fp && (names.has('ear_height') || names.has('ear_angle'))) [EAR_L, EAR_R].forEach((e) => ring(centroid(frame.fp!, e), 15 / (img ? 1 : 1)));
      if (frame.fp && names.has('eye_aperture')) [EYE_L, EYE_R].forEach((e) => ring(centroid(frame.fp!, e), 11));
      if (names.has('activity') && frame.box) {
        const b = frame.box, A = P([b[0] * fw, b[1] * fh]), B = P([b[2] * fw, b[3] * fh]);
        ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2 * DPR; ctx.setLineDash([6 * DPR, 4 * DPR]); ctx.strokeRect(A[0] - 3, A[1] - 3, B[0] - A[0] + 6, B[1] - A[1] + 6); ctx.setLineDash([]);
      }
    }
    if (!frame.fp && !frame.bp) {
      ctx.fillStyle = C.text; ctx.font = `${14 * DPR}px sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('这一帧没有找到猫', W / 2, H / 2);
    }
    void accent;
  }, [fi, frame, step, size, layers, minConf, geoFeature, usePhoto, light, full, tick]);

  return <canvas ref={ref} className="cl-canvas" width={size[0] * DPR} height={size[1] * DPR} role="img" aria-label="当前这一帧的关键点（骨架视图）" />;
}
