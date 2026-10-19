/* The arithmetic behind step 08, written once so the 2D table, the 3D parts and the sensitivity check all use the same numbers. */
import { LIK, PRIOR, STATES } from '../case/core';

type Tab = Record<string, number[]>;
const norm = (a: number[]) => { const s = a.reduce((x, y) => x + y, 0); return a.map((v) => v / s); };

/* observed-cues-only naive Bayes: exactly what ml/catpose/interpret.py computes */
export function posterior(label: string, cues: string[], prior: Tab = PRIOR, lik: Tab = LIK): number[] {
  let p = norm(prior[label]);
  cues.forEach((c) => { if (lik[c]) p = norm(p.map((v, i) => v * lik[c][i])); });
  return p;
}
export const rank = (p: number[]) => p.map((_, i) => i).sort((a, b) => p[b] - p[a]);

/* how much each piece of evidence moves the log-odds of the leader over the runner-up */
export function contributions(label: string, cues: string[]) {
  const post = posterior(label, cues), [a, b] = rank(post), p0 = norm(PRIOR[label]);
  const items = cues.map((c) => ({ cue: c, v: Math.log(LIK[c][a] / LIK[c][b]) }));
  const prior = Math.log(p0[a] / p0[b]), total = prior + items.reduce((s, x) => s + x.v, 0);
  return { top: a, second: b, prior, items, total, check: Math.log(post[a] / post[b]) };
}

function mulberry32(seed: number) { let t = seed; return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

/* every hand-set number is scaled by (1+eps)^u with u uniform in [-1, 1]; how often does the top state stay the same? */
export function robustness(label: string, cues: string[], eps: number, n = 200) {
  const rnd = mulberry32(12345), base = posterior(label, cues), top = rank(base)[0], count = STATES.map(() => 0);
  let kept = 0, shown = 0;
  for (let k = 0; k < n; k++) {
    const jit = (t: Tab) => Object.fromEntries(Object.entries(t).map(([key, row]) => [key, row.map((v) => v * Math.pow(1 + eps, rnd() * 2 - 1))])) as Tab;
    const post = posterior(label, cues, jit(PRIOR), jit(LIK)), r = rank(post), p1 = post[r[0]], p2 = post[r[1]];
    count[r[0]]++; if (r[0] === top) kept++;
    if ((p1 >= 0.6 && p1 - p2 >= 0.3) || (p1 >= 0.45 && p1 - p2 >= 0.15)) shown++;
  }
  return { share: count.map((c) => c / n), kept: kept / n, shown: shown / n, top, n };
}
