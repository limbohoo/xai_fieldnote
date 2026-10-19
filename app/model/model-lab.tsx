'use client';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LIK, MODEL_ERROR, PRIOR, STATES, Z, checkEvent, classify, faceFeatures, fin, guess, run, zEvent,
  type ClipData, type EventRec, type FeatureKey, type Frame, type Pt, type Reaction, type Step,
} from '../case/core';
import { FEAT, FIDX, LCOL, fmt, mmss } from '../case/vocab';
import { cueKeys, cueName, driverTxt, featName, rp, stateName, stateShort, useT } from './i18n';
import { contributions, robustness } from './nbmath';

/* The 2D, hands-on view of each stage. Every string goes through t(zh, en). */
const COL = { blue: '#234fe5', ink: '#151a24', warn: '#b4690e', bad: '#b02a37', ok: '#1f7a45' };
const heat = (v: number) => `rgba(35,79,229,${(0.06 + 0.88 * Math.min(1, v)).toFixed(2)})`;

function Series({ vals, lo, hi, mark, w = 520, h = 120, band, shade, color = COL.blue, label }: {
  vals: (number | null)[]; lo: number; hi: number; mark?: number; w?: number; h?: number; band?: [number, number]; shade?: [number, number]; color?: string; label: string;
}) {
  const n = vals.length, X = (i: number) => (i / Math.max(1, n - 1)) * w, Y = (v: number) => h - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo || 1)) * h;
  const segs: string[] = []; let cur: string[] = [];
  vals.forEach((v, i) => { if (fin(v)) cur.push(`${X(i).toFixed(1)},${Y(v).toFixed(1)}`); else if (cur.length) { segs.push(cur.join(' ')); cur = []; } });
  if (cur.length) segs.push(cur.join(' '));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="ml-chart" role="img" aria-label={label}>
      {shade ? <rect x={X(shade[0])} y={0} width={Math.max(0, X(shade[1]) - X(shade[0]))} height={h} fill="#eef3ff" /> : null}
      {band ? <rect x={0} y={Y(band[1])} width={w} height={Math.max(0, Y(band[0]) - Y(band[1]))} fill="#f0f2f6" /> : null}
      {segs.map((s, i) => <polyline key={i} points={s} fill="none" stroke={color} strokeWidth={1.4} />)}
      {mark !== undefined ? <line x1={X(mark)} x2={X(mark)} y1={0} y2={h} stroke={COL.ink} strokeWidth={1} strokeDasharray="3 3" /> : null}
    </svg>
  );
}

function Bars({ v }: { v: number[] }) {
  const { lang } = useT();
  return (
    <div className="ml-bars">
      {STATES.map((s, i) => <div key={s} className="ml-bar"><span>{stateShort(lang, s)}</span><i><b style={{ width: Math.min(100, v[i] * 100) + '%' }} /></i><em className="num">{v[i].toFixed(2)}</em></div>)}
    </div>
  );
}

function FeatPick({ feat, setFeat }: { feat: FeatureKey; setFeat: (k: FeatureKey) => void }) {
  const { t, lang } = useT();
  return (
    <div className="cl-seg" role="group" aria-label={t('选一个特征', 'Pick a feature')}>
      {FEAT.map((f) => <button key={f.k} aria-pressed={feat === f.k} className={f.used ? '' : 'dim'} onClick={() => setFeat(f.k)}>{featName(lang, f.k)}</button>)}
    </div>
  );
}

export function ViewDetect({ clip, f }: { clip: ClipData; f: Frame }) {
  const { t } = useT();
  const [W, H] = clip.size;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="ml-stage-svg" role="img" aria-label={t('这一帧的猫框', 'The cat box on this frame')}>
        <rect x={0} y={0} width={W} height={H} fill="#f5f7fb" />
        {f.box ? <rect x={f.box[0] * W} y={f.box[1] * H} width={f.box[2] * W} height={f.box[3] * H} fill="none" stroke={COL.blue} strokeWidth={2} /> : null}
      </svg>
      <p className="cl-small">{f.box
        ? t(`框（占画面的比例）：x ${f.box[0].toFixed(2)}，y ${f.box[1].toFixed(2)}，宽 ${f.box[2].toFixed(2)}，高 ${f.box[3].toFixed(2)}。画面本身不公开，这里只画框。`, `Box (as a share of the frame): x ${f.box[0].toFixed(2)}, y ${f.box[1].toFixed(2)}, w ${f.box[2].toFixed(2)}, h ${f.box[3].toFixed(2)}. The video frame itself is not published; only the box is drawn.`)
        : t('这一帧没有找到猫，后面的步骤跳过。', 'No cat found on this frame, so the later steps are skipped.')}</p>
    </div>
  );
}

export function ViewKeypoints() {
  const { t } = useT();
  const N = 11, [beta, setBeta] = useState(1.5), [noise, setNoise] = useState(0.4), [rival, setRival] = useState(0.0);
  const truth: Pt = [6.3, 4.6], other: Pt = [2.2, 7.4];
  const rnd = (i: number, j: number) => { const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return x - Math.floor(x); };
  const H: number[][] = [];
  for (let j = 0; j < N; j++) { H.push([]); for (let i = 0; i < N; i++) {
    const g = (c: Pt) => Math.exp(-((i - c[0]) ** 2 + (j - c[1]) ** 2) / 2.2);
    H[j].push(g(truth) + rival * g(other) + noise * 0.35 * (rnd(i, j) - 0.5));
  } }
  const flat = H.flat(), mx = Math.max(...flat);
  const e = flat.map((v) => Math.exp(beta * 3 * (v - mx))), s = e.reduce((a, b) => a + b, 0);
  const P = e.map((v) => v / s), pm = Math.max(...P);
  let sx = 0, sy = 0; P.forEach((p, k) => { sx += p * (k % N); sy += p * Math.floor(k / N); });
  const am = flat.indexOf(mx), ax = am % N, ay = Math.floor(am / N);
  const err = (x: number, y: number) => Math.hypot(x - truth[0], y - truth[1]);
  return (
    <div className="ml-two">
      <svg viewBox={`0 0 ${N * 22} ${N * 22}`} className="ml-grid" role="img" aria-label={t('热力图和两种取点方式', 'Heatmap and two ways to pick the point')}>
        {P.map((p, k) => <rect key={k} x={(k % N) * 22} y={Math.floor(k / N) * 22} width={22} height={22} fill={heat(p / pm)} stroke="#fff" strokeWidth={0.6} />)}
        <path d={`M${(truth[0] + 0.5) * 22 - 5} ${(truth[1] + 0.5) * 22 - 5}l10 10m0 -10l-10 10`} stroke={COL.ink} strokeWidth={1.6} />
        <rect x={(ax + 0.5) * 22 - 5} y={(ay + 0.5) * 22 - 5} width={10} height={10} fill="none" stroke={COL.warn} strokeWidth={2} />
        <circle cx={(sx + 0.5) * 22} cy={(sy + 0.5) * 22} r={5} fill="#fff" stroke={COL.bad} strokeWidth={2} />
      </svg>
      <div className="ml-ctl">
        <label>{t('β（越大越尖）', 'β (larger = sharper)')}<input type="range" min={0.2} max={4} step={0.1} value={beta} onChange={(e) => setBeta(+e.target.value)} /><span className="num">{beta.toFixed(1)}</span></label>
        <label>{t('热力图噪声', 'Heatmap noise')}<input type="range" min={0} max={2} step={0.05} value={noise} onChange={(e) => setNoise(+e.target.value)} /><span className="num">{noise.toFixed(2)}</span></label>
        <label>{t('另一个相似的峰', 'A second, similar peak')}<input type="range" min={0} max={1} step={0.05} value={rival} onChange={(e) => setRival(+e.target.value)} /><span className="num">{rival.toFixed(2)}</span></label>
        <dl className="cl-kv">
          <dt>{t('× 真实位置', '× true position')}</dt><dd className="num">({truth[0]}, {truth[1]})</dd>
          <dt>{t('□ 取最大格', '□ brightest cell')}</dt><dd className="num">({ax}, {ay}){t('，偏差 ', ', off by ')}{err(ax, ay).toFixed(2)}{t(' 格', ' cells')}</dd>
          <dt>○ soft-argmax</dt><dd className="num">({sx.toFixed(2)}, {sy.toFixed(2)}){t('，偏差 ', ', off by ')}{err(sx, sy).toFixed(2)}{t(' 格', ' cells')}</dd>
        </dl>
        <p className="cl-note">{t('示意图：11 × 11 的合成热力图，不是网络的真实输出。β 小时把相似的峰平均到中间；β 大时接近“取最大格”。', 'Illustration: a synthetic 11 × 11 heatmap, not real network output. A small β averages similar peaks into the middle; a large β approaches "pick the brightest cell".')}</p>
      </div>
    </div>
  );
}

export function ViewSmooth({ clip, fi, feat, setFeat }: { clip: ClipData; fi: number; feat: FeatureKey; setFeat: (k: FeatureKey) => void }) {
  const { t } = useT();
  const a = Math.max(0, fi - 90), b = Math.min(clip.frames.length, fi + 90), j = FIDX[feat];
  const raw = clip.frames.slice(a, b).map((f) => f.raw?.[j] ?? null), sm = clip.frames.slice(a, b).map((f) => f.sm?.[j] ?? null);
  const all = [...raw, ...sm].filter(fin), lo = Math.min(...all, 0), hi = Math.max(...all, 1e-6);
  const jit = (v: (number | null)[]) => { const d = v.map((x, i) => (i && fin(x) && fin(v[i - 1]) ? Math.abs((x as number) - (v[i - 1] as number)) : null)).filter(fin); return d.length ? d.reduce((s, x) => s + x, 0) / d.length : NaN; };
  const lb = t('数值随时间的变化', 'Value over time');
  return (
    <div>
      <FeatPick feat={feat} setFeat={setFeat} />
      <Series vals={raw} lo={lo} hi={hi} mark={fi - a} color="#c8d2e3" label={lb} />
      <Series vals={sm} lo={lo} hi={hi} mark={fi - a} label={lb} />
      <p className="cl-small"><span style={{ color: '#8a94a6' }}>{t('灰线', 'Grey')}</span>{t(' 滤波前，', ' = before filter, ')}<span style={{ color: COL.blue }}>{t('蓝线', 'blue')}</span>{t(` 滤波后；这一帧前后各 3 秒。帧间平均跳动：${fmt(jit(raw), 3)} → ${fmt(jit(sm), 3)}。`, ` = after; 3 s either side of this frame. Average frame-to-frame jump: ${fmt(jit(raw), 3)} → ${fmt(jit(sm), 3)}.`)}</p>
    </div>
  );
}

export function ViewFeatures({ f, fi, minConf }: { f: Frame; fi: number; minConf: number }) {
  const { t, lang } = useT();
  const ff = f.fp ? faceFeatures(f.fp, f.fc, minConf) : null;
  const g = ff?.geo;
  const raw = (k: FeatureKey) => (f.raw ? f.raw[FIDX[k]] : null);
  let vb = '0 0 100 100';
  if (f.fp) {
    const xs = f.fp.map((p) => p[0]), ys = f.fp.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = Math.max(x1 - x0, y1 - y0) * 0.12;
    vb = `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`;
  }
  const dot = (i: number, c: string) => f.fp ? <circle key={i} cx={f.fp[i][0]} cy={f.fp[i][1]} r={Math.max(0.6, (g?.d ?? 20) * 0.04)} fill={c} /> : null;
  const arrow = g ? [g.mid[0], g.mid[1], g.mid[0] + g.up[0] * g.d, g.mid[1] + g.up[1] * g.d] : null;
  return (
    <div className="ml-two">
      {f.fp ? (
        <svg viewBox={vb} className="ml-stage-svg sq" role="img" aria-label={t('脸部点和量特征用的参照线', 'Face points and the reference lines used for measuring')}>
          {f.fp.map((_, i) => dot(i, '#c8d2e3'))}
          {[22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map((i) => dot(i, '#d9622b'))}
          {[4, 5, 6, 7, 8, 9, 10, 11].map((i) => dot(i, COL.blue))}
          {g ? <>
            <line x1={g.el[0]} y1={g.el[1]} x2={g.er[0]} y2={g.er[1]} stroke={COL.blue} strokeWidth={g.d * 0.03} />
            {arrow ? <line x1={arrow[0]} y1={arrow[1]} x2={arrow[2]} y2={arrow[3]} stroke={COL.ink} strokeWidth={g.d * 0.03} strokeDasharray={`${g.d * 0.08} ${g.d * 0.06}`} /> : null}
            <circle cx={g.mid[0]} cy={g.mid[1]} r={g.d * 0.06} fill={COL.ink} />
          </> : null}
        </svg>
      ) : <p className="cl-warn">{t('这一帧没有画出脸部点，特征取自相邻帧的数字。', 'No face points on this frame; the numbers come from a neighbouring frame.')}</p>}
      <div>
        <table className="ml-table">
          <thead><tr><th>{t('特征', 'Feature')}</th><th>{t('这一帧（滤波前）', 'This frame (raw)')}</th><th>{t('规则用吗', 'Used by rules')}</th></tr></thead>
          <tbody>{FEAT.map((x) => <tr key={x.k}><td>{featName(lang, x.k)}</td><td className="num">{fmt(raw(x.k), 3)}</td><td>{x.used ? t('用', 'yes') : t('没用', 'no')}</td></tr>)}</tbody>
        </table>
        <p className="cl-note">{t(`蓝线是两眼连线，长度 d 是度量的单位；虚线是“头顶方向”，从两眼中点出发。橙色点是耳朵，蓝色点是眼睛。帧 ${fi}。`, `The blue line joins the eyes; its length d is the unit of measure. The dashed line is "toward the top of the head" from the eye midpoint. Orange dots are the ears, blue dots the eyes. Frame ${fi}.`)}</p>
      </div>
    </div>
  );
}

export function ViewBaseline({ clip, base, out, fi, feat, setFeat, calib, setCalib }: {
  clip: ClipData; base: ReturnType<typeof run>['base']; out: Step[]; fi: number; feat: FeatureKey; setFeat: (k: FeatureKey) => void; calib: number; setCalib: (n: number) => void;
}) {
  const { t } = useT();
  const j = FIDX[feat], vals = clip.frames.map((f) => f.sm?.[j] ?? null);
  const m = base.med[feat], s = base.scale[feat];
  const fin2 = vals.filter(fin) as number[], lo = Math.min(...fin2), hi = Math.max(...fin2);
  const z = out[fi]?.z[feat];
  return (
    <div>
      <FeatPick feat={feat} setFeat={setFeat} />
      <Series vals={vals} lo={lo} hi={hi} mark={fi} shade={[0, base.doneAt]} band={fin(m) && fin(s) ? [(m as number) - 1.5 * (s as number), (m as number) + 1.5 * (s as number)] : undefined} h={130} label={t('特征值和平时', 'Feature value and its usual range')} />
      <div className="cl-sl"><label htmlFor="ml-calib">{t('记“平时”用的帧数', 'Frames used to learn "usual"')}</label><input id="ml-calib" type="range" min={60} max={300} step={30} value={calib} onChange={(e) => setCalib(+e.target.value)} /><span className="num">{calib}</span></div>
      <dl className="cl-kv">
        <dt>{t('平时 m', 'Usual m')}</dt><dd className="num">{fmt(m, 3)}</dd>
        <dt>{t('尺度 s', 'Scale s')}</dt><dd className="num">{fmt(s, 3)}　{t('（下限 ', '(floor ')}{MODEL_ERROR[feat]}{t('）', ')')}</dd>
        <dt>{t('这一帧的 z', 'z on this frame')}</dt><dd className="num">{fin(z) ? (z as number).toFixed(2) : out[fi]?.calibrating ? t('还在记平时', 'still learning usual') : '—'}</dd>
      </dl>
      <p className="cl-note">{t('浅蓝底是记“平时”的那一段，灰带是平时 ±1.5 个尺度。拉动帧数，看 m、s 和之后每一帧的 z 怎么变：平时记得越短，估计越不稳。', 'The pale-blue area is the segment used to learn "usual"; the grey band is usual ±1.5 scales. Drag the frame count to see m, s and every later z change: the shorter the segment, the less stable the estimate.')}</p>
    </div>
  );
}

export function ViewRules({ step, prev, setPrev }: { step: Step; prev: string; setPrev: (p: string) => void }) {
  const { t, lang } = useT();
  const z = step.z, r = classify(z, step.calibrating, prev);
  const bar = (name: string, ok: boolean | null, txt: string) => <li key={name} className={ok ? 'on' : ''}><i>{ok === null ? '·' : ok ? '✓' : '✗'}</i>{txt}</li>;
  const eh = z.ear_height, ea = z.ear_angle, ac = z.activity;
  const backBar = prev === 'ears_back' || prev === 'freeze' ? Z.EAR_H_STAY : Z.EAR_H, upBar = prev === 'alert' ? Z.EAR_H_STAY : Z.EAR_H;
  const activeBar = prev === 'active' ? Z.ACTIVE_STAY : Z.ACTIVE, stillBar = prev === 'freeze' ? Z.STILL_STAY : Z.STILL;
  const has = (k: FeatureKey) => fin(z[k]);
  return (
    <div>
      <div className="ml-row"><span className="cl-small">{t('上一帧的标签（决定进入还是离开的门槛）：', 'Label on the previous frame (decides the enter / leave threshold):')}</span>
        <div className="cl-seg" role="group" aria-label={t('上一帧的标签', 'Previous label')}>
          {(['resting', 'ears_back', 'freeze', 'alert', 'active'] as Reaction[]).map((k) => <button key={k} aria-pressed={prev === k} onClick={() => setPrev(k)}>{rp(lang, k)}</button>)}
        </div>
      </div>
      {step.calibrating ? <p className="cl-warn">{t('这一帧还在记“平时”，规则不运行。把进度条拖到后面。', 'This frame is still learning "usual", so the rules do not run. Drag the time slider later.')}</p> : (
        <ul className="ml-rules">
          {bar('back', has('ear_height') ? eh! <= -backBar : null, t(`耳高 z = ${fmt(eh)} ≤ −${backBar} ？`, `ear height z = ${fmt(eh)} ≤ −${backBar} ?`))}
          {bar('back2', has('ear_angle') && has('ear_height') ? ea! >= Z.AUX && eh! <= -Z.EAR_CO : null, t(`（补充）耳转 z = ${fmt(ea)} ≥ ${Z.AUX} 且 耳高 z ≤ −${Z.EAR_CO} ？`, `(extra) ear rotation z = ${fmt(ea)} ≥ ${Z.AUX} and ear height z ≤ −${Z.EAR_CO} ?`))}
          {bar('still', has('activity') ? ac! <= stillBar : null, t(`活动 z = ${fmt(ac)} ≤ ${stillBar} ？（静止）`, `activity z = ${fmt(ac)} ≤ ${stillBar} ? (still)`))}
          {bar('alert', has('ear_height') ? eh! >= upBar : null, t(`耳高 z ≥ ${upBar} ？（耳朵竖高）`, `ear height z ≥ ${upBar} ? (ears up)`))}
          {bar('active', has('activity') ? ac! >= activeBar : null, t(`活动 z ≥ ${activeBar} ？（动起来）`, `activity z ≥ ${activeBar} ? (moving)`))}
        </ul>
      )}
      <p className="ml-out">{t('规则结果：', 'Rule result: ')}<b style={{ color: LCOL[r.key] }}>{rp(lang, r.key)}</b>{r.drivers.length ? t('　依据：', '  Evidence: ') + r.drivers.map((d) => driverTxt(lang, d)).join(t('；', '; ')) : ''}</p>
      <p className="cl-note">{t('优先级从上到下：先看耳朵压低（同时静止则是“突然不动”），然后是注意到了、动起来，都不满足就是“没有明显变化”。', 'Priority runs top to bottom: ears back first (still at the same time means "froze"), then noticed, then moving; if none holds, "no clear change".')}</p>
    </div>
  );
}

export function ViewVote({ out, fi, fps }: { out: Step[]; fi: number; fps: number }) {
  const { t, lang } = useT();
  const n = Math.round(0.3 * fps), a = Math.max(0, fi - n), win = out.slice(a, fi + 1);
  const cur = out[fi];
  const counts = new Map<string, number>(); win.forEach((s) => counts.set(s.raw, (counts.get(s.raw) ?? 0) + 1));
  const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0];
  // playground: a cat that really changes at frame 15; the rule output flickers by a chosen amount
  const [flick, setFlick] = useState(0.25), [maj, setMaj] = useState(0.6);
  const N = 45, CH = 15, dt = 1 / 30, hold = 0.3;
  const rnd = (i: number) => { const x = Math.sin(i * 91.7 + 3.1) * 43758.5453; return x - Math.floor(x); };
  const truth = Array.from({ length: N }, (_, i) => (i < CH ? 'resting' : 'ears_back'));
  const raw = truth.map((k, i) => (rnd(i) < flick ? (k === 'resting' ? 'ears_back' : 'resting') : k));
  const shown: string[] = []; let c = 'resting';
  raw.forEach((r, i) => {
    const w0 = Math.max(0, i - Math.round(hold / dt)), w = raw.slice(w0, i + 1);
    if (r !== c) { const share = w.filter((x) => x === r).length / w.length; if (share >= maj && (w.length - 1) * dt >= 0.5 * hold) c = r; }
    shown.push(c);
  });
  const flips = (v: string[]) => v.reduce((k, x, i) => k + (i && x !== v[i - 1] ? 1 : 0), 0);
  const first = shown.findIndex((x, i) => i >= CH && x === 'ears_back'), delay = first < 0 ? null : Math.round((first - CH) * dt * 1000);
  const row = (name: string, v: string[]) => <div className="vt-row"><span>{name}</span><div>{v.map((k, i) => <i key={i} title={rp(lang, k)} style={{ background: LCOL[k], outline: i === CH ? '2px solid #151a24' : undefined }} />)}</div></div>;
  return (
    <div>
      <p className="vt-q">{t('问题：规则每帧都给一个结果，偶尔会闪一下。如果直接显示，标签会来回跳。怎么办？', 'The problem: the rules give a result on every frame and sometimes flicker. Shown directly, the label would jump back and forth. What to do?')}</p>
      <p className="vt-a">{t('做法：不看单帧，看最近 0.3 秒里哪个结果占多数，占到六成才换。', 'The fix: do not trust one frame; look at which result holds the majority of the last 0.3 s, and switch only at 60%.')}</p>
      <div className="vt-play">
        {row(t('猫真实的状态', 'What the cat really does'), truth)}
        {row(t('规则每帧的结果', 'Rule result per frame'), raw)}
        {row(t('投票后显示的', 'Shown after the vote'), shown)}
        <p className="cl-small">{t('黑框那一格是猫真正变化的时刻。', 'The outlined cell is the moment the cat really changes.')}</p>
      </div>
      <div className="ml-ctl">
        <label>{t('规则结果的闪烁比例', 'Share of flickering frames')}<input type="range" min={0} max={0.45} step={0.05} value={flick} onChange={(e) => setFlick(+e.target.value)} /><span className="num">{Math.round(flick * 100)}%</span></label>
        <label>{t('切换需要的占比', 'Share needed to switch')}<input type="range" min={0.5} max={0.9} step={0.05} value={maj} onChange={(e) => setMaj(+e.target.value)} /><span className="num">{Math.round(maj * 100)}%</span></label>
      </div>
      <dl className="cl-kv">
        <dt>{t('规则结果来回跳了', 'Rule result flipped')}</dt><dd className="num">{flips(raw)}{t(' 次', ' times')}</dd>
        <dt>{t('显示的标签跳了', 'Shown label flipped')}</dt><dd className="num">{flips(shown)}{t(' 次', ' times')}</dd>
        <dt>{t('代价：延迟', 'Price: delay')}</dt><dd className="num">{delay === null ? t('没有切过去', 'never switched') : delay + ' ms'}</dd>
      </dl>
      <p className="cl-note">{t('把“占比”拉高，显示更稳，但延迟更长，甚至一直不切换；拉低，则更灵敏但容易被闪烁带着跳。0.5 以下不行：两个标签可能同时过线。', 'Raise the share: steadier display, longer delay, maybe never switching. Lower it: more responsive but easier to be pushed around by flicker. Below 50% will not do: two labels could both pass the bar.')}</p>
      <details className="cl-more"><summary><span>{t('看真实视频这一帧的窗口', 'See the real window on this video frame')}</span><b aria-hidden="true">＋</b></summary>
        <div className="cl-more-body">
          <div className="ml-strip">{win.map((s, i) => <span key={i} title={rp(lang, s.raw)} style={{ background: LCOL[s.raw] }} />)}</div>
          <ul className="ml-legend">{[...counts.entries()].map(([k, cn]) => <li key={k}><i style={{ background: LCOL[k] }} />{rp(lang, k)} <b className="num">{Math.round((cn / win.length) * 100)}%</b></li>)}</ul>
          <p className="ml-out">{t('窗口里最多的是“', 'Most frequent in the window: "')}{top ? rp(lang, top[0]) : '—'}{t('”（', '" (')}{top ? Math.round((top[1] / win.length) * 100) : 0}%{t('）。显示的标签：', '). Displayed label: ')}<b style={{ color: LCOL[cur.label] }}>{rp(lang, cur.label)}</b>{cur.label !== cur.raw ? t(`　（这一帧的规则结果是“${rp(lang, cur.raw)}”，占比不到 60%，暂不切换）`, `  (this frame's rule result is "${rp(lang, cur.raw)}", under 60%, so no switch yet)`) : null}</p>
        </div>
      </details>
    </div>
  );
}

export interface GuessState { label: string; setLabel: (k: string) => void; cues: string[]; setCues: (c: string[]) => void; col: number; setCol: (c: number) => void }
/* step 08 as a calculation table: every column is one state, click it to see its own arithmetic */
export function GuessLab({ label, setLabel, cues, setCues, col, setCol }: GuessState) {
  const { t, lang } = useT();
  const names = Object.keys(PRIOR), [fv, setFv] = useState(0.8);
  const toggle = (c: string) => setCues(cues.includes(c) ? cues.filter((y) => y !== c) : [...cues, c]);
  const sum = PRIOR[label].reduce((a, b) => a + b, 0), p0 = PRIOR[label].map((p) => p / sum);
  const prod = p0.map((p, i) => cues.reduce((a, c) => a * LIK[c][i], p)), Zs = prod.reduce((a, b) => a + b, 0), post = prod.map((v) => v / Zs);
  const g = guess(label, cues, fv);
  const bandName = (b: string) => (lang === 'en' ? { 高: 'high', 中: 'medium', 低: 'low' }[b] : b);
  const sn = stateShort(lang, STATES[col]);
  const eq = `${p0[col].toFixed(2)}${cues.map((c) => ` × ${LIK[c][col].toFixed(2)}`).join('')} = ${prod[col].toFixed(3)}`;
  const cc = (i: number) => (i === col ? 'sel' : '');
  const ct = contributions(label, cues), rb = robustness(label, cues, 0.25), nm = (i: number) => stateShort(lang, STATES[i]);
  return (
    <div className="gl">
      <p className="gl-step"><b>1</b>{t('选一个标签（系统刚看到的行为）', 'Pick a label (the behaviour just seen)')}</p>
      <div className="cl-seg" role="group" aria-label={t('标签', 'Label')}>{names.map((k) => <button key={k} aria-pressed={label === k} onClick={() => setLabel(k)}>{rp(lang, k)}</button>)}</div>
      <p className="gl-step"><b>2</b>{t('点选随后看到的线索（可以多选，也可以一条都不选）', 'Pick the cues seen afterwards (any number, or none)')}</p>
      <div className="cl-seg" role="group" aria-label={t('线索', 'Cues')}>{cueKeys.map((k) => <button key={k} aria-pressed={cues.includes(k)} onClick={() => toggle(k)}>{cueName(lang, k)}</button>)}</div>
      <p className="gl-step"><b>3</b>{t('每一列是一种状态。点列名，看这一列是怎么算出来的', 'Each column is one state. Click a column name to see its own arithmetic')}</p>
      <table className="gl-table">
        <thead><tr><th />{STATES.map((s, i) => <th key={s} className={cc(i)}><button aria-pressed={col === i} onClick={() => setCol(i)}>{stateShort(lang, s)}</button></th>)}</tr></thead>
        <tbody>
          <tr><th>{t('起始概率', 'Starting')}</th>{p0.map((v, i) => <td key={i} className={cc(i)}>{v.toFixed(2)}</td>)}</tr>
          {cues.map((c) => <tr key={c}><th>× {cueName(lang, c)}</th>{LIK[c].map((v, i) => <td key={i} className={cc(i)}>{v.toFixed(2)}</td>)}</tr>)}
          <tr className="gl-prod"><th>{t('乘起来', 'Product')}</th>{prod.map((v, i) => <td key={i} className={cc(i)}>{v.toFixed(3)}</td>)}</tr>
          <tr className="gl-post"><th>{t(`÷ 合计 ${Zs.toFixed(3)}`, `÷ total ${Zs.toFixed(3)}`)}</th>{post.map((v, i) => <td key={i} className={cc(i)}><i style={{ height: Math.max(2, v * 56) + 'px' }} /><b>{v.toFixed(2)}</b></td>)}</tr>
        </tbody>
      </table>
      <p className="gl-eq">{t(`「${sn}」这一列：`, `Column "${sn}": `)}<code>{eq}</code>{t('；再除以五列合计 ', '; divide by the five-column total ')}<code>{Zs.toFixed(3)}</code>{' = '}<b>{post[col].toFixed(2)}</b></p>
      <p className="gl-step"><b>4</b>{t('把握：最高概率够不够高，和第二名拉开够不够？脸看不清时要降一级', 'Confidence: is the top probability high enough, and far enough ahead of the second? A hidden face lowers it')}</p>
      <div className="cl-sl"><label htmlFor="ml-fv">{t('脸可见的比例', 'Share of face visible')}</label><input id="ml-fv" type="range" min={0} max={1} step={0.05} value={fv} onChange={(e) => setFv(+e.target.value)} /><span className="num">{fv.toFixed(2)}</span></div>
      <p className="ml-out">{g
        ? <>{t(`最像“${stateName(lang, g.top)}”（${g.p1.toFixed(2)}），第二是“${stateName(lang, g.second)}”（${g.p2.toFixed(2)}）。把握：`, `Most like "${stateName(lang, g.top)}" (${g.p1.toFixed(2)}), second "${stateName(lang, g.second)}" (${g.p2.toFixed(2)}). Confidence: `)}<b>{bandName(g.band)}</b>{g.show ? t('，显示给主人。', ', shown to the owner.') : t('，不显示情绪，只写看到的行为。', ', no emotion shown; only the behaviour is written.')}</>
        : t('这个标签没有对应的推测。', 'This label has no guess attached.')}</p>
      <p className="gl-step"><b>5</b>{t(`每条线索让「${nm(ct.top)}」比「${nm(ct.second)}」多领先了多少（对数似然比，可以相加）`, `How much each cue puts "${nm(ct.top)}" ahead of "${nm(ct.second)}" (log-likelihood ratio, additive)`)}</p>
      <table className="gl-ev"><tbody>
        <tr><th>{t('起始概率之比', 'Starting odds')}</th><td className={ct.prior >= 0 ? 'pos' : 'neg'}>{ct.prior >= 0 ? '+' : ''}{ct.prior.toFixed(2)}</td></tr>
        {ct.items.map((x) => <tr key={x.cue}><th>{cueName(lang, x.cue)}</th><td className={x.v >= 0 ? 'pos' : 'neg'}>{x.v >= 0 ? '+' : ''}{x.v.toFixed(2)}</td></tr>)}
        <tr className="tot"><th>{t('合计', 'Total')}</th><td>{ct.total.toFixed(2)}　<small>= e^{ct.total.toFixed(2)} = {Math.exp(ct.total).toFixed(1)}{t(' 倍', ' to 1')}</small></td></tr>
      </tbody></table>
      <p className="cl-note">{t('只用出现过的线索：没选的线索不会改变结果，“没看到”不被当作证据。', 'Only cues that occurred are used: cues you did not pick change nothing, and "not seen" is not treated as evidence.')}</p>
      <p className="gl-step"><b>6</b>{t('如果手设的数字不准，结论稳不稳？', 'If the hand-set numbers are off, does the conclusion hold?')}</p>
      <p className="gl-eq">{t(`把 55 个手设数字各自随机放大或缩小最多 25%，重算 ${rb.n} 次：领先的状态不变占 `, `Scale each of the 55 hand-set numbers by up to ±25% at random and recompute ${rb.n} times: the leader is unchanged in `)}<b>{Math.round(rb.kept * 100)}%</b>{t('；仍然给出推测（把握够）占 ', '; a guess is still shown (enough confidence) in ')}<b>{Math.round(rb.shown * 100)}%</b>。</p>
      <p className="cl-note">{t('上面的概率是模型内部算出来的，不是“猜对的概率”：55 个数都是手设，没有被标注检验过，线索之间的独立性也只是近似。', 'The probabilities above are the model\'s internal numbers, not "the probability of being right": all 55 are hand-set and unvalidated, and independence between cues is only an approximation.')}</p>
      <details className="cl-more"><summary><span>{t('看两张手设的完整表（矩阵视图）', 'See the two full hand-set tables (matrix view)')}</span><b aria-hidden="true">＋</b></summary>
        <div className="cl-more-body">
          <p className="cl-small">{t('起始概率：行是标签，列是状态', 'Starting probability: rows are labels, columns are states')}</p>
          <Matrix rows={Object.entries(PRIOR).map(([k, v]) => [rp(lang, k), v] as [string, number[]])} sel={rp(lang, label)} />
          <p className="cl-small">{t('似然 P(线索 | 状态)：行是线索，列是状态', 'Likelihood P(cue | state): rows are cues, columns are states')}</p>
          <Matrix rows={cueKeys.map((k) => [cueName(lang, k), LIK[k]] as [string, number[]])} sel={cues.map((c) => cueName(lang, c))} />
        </div>
      </details>
    </div>
  );
}
function Matrix({ rows, sel }: { rows: [string, number[]][]; sel: string | string[] }) {
  const { lang } = useT();
  const on = (n: string) => (Array.isArray(sel) ? sel.includes(n) : sel === n);
  return (
    <table className="ml-matrix">
      <thead><tr><th />{STATES.map((s) => <th key={s}>{stateShort(lang, s)}</th>)}</tr></thead>
      <tbody>{rows.map(([n, v]) => <tr key={n} className={on(n) ? 'sel' : ''}><th>{n}</th>{v.map((x, i) => <td key={i} style={{ background: heat(x) }} className={x > 0.45 ? 'dark' : ''}>{x.toFixed(2)}</td>)}</tr>)}</tbody>
    </table>
  );
}

export function ViewCheck({ events, ev, setEv }: { events: EventRec[]; ev: number; setEv: (i: number) => void }) {
  const { t, lang } = useT();
  const e = events[ev], [out, setOut] = useState<FeatureKey[]>([]);
  useEffect(() => setOut([]), [ev]);
  if (!e) return <p className="cl-warn">{t('没有事件数据。', 'No event data.')}</p>;
  const chk = checkEvent(e), cited = chk.cited, U: FeatureKey[] = ['ear_height', 'ear_angle', 'eye_aperture', 'activity'];
  const rest = U.filter((k) => !cited.includes(k));
  const flags = (ks: FeatureKey[]) => { const o: Partial<Record<FeatureKey, boolean>> = {}; ks.forEach((k) => (o[k] = true)); return o; };
  const now = classify(zEvent(e, flags(out)), false, e.prev_reaction).key, changed = now !== e.reaction;
  const same = (a: FeatureKey[], b: FeatureKey[]) => a.length === b.length && a.every((k) => b.includes(k));
  const toggle = (k: FeatureKey) => setOut((u) => (u.includes(k) ? u.filter((x) => x !== k) : [...u, k]));
  const chip = (k: string) => <b className="ck-chip" style={{ background: LCOL[k] }}>{rp(lang, k)}</b>;
  const nm = (ks: FeatureKey[]) => ks.map((k) => featName(lang, k)).join(t('、', ', ')) || '—';
  let verdict = '', good: boolean | null = null;
  if (out.length === 0) verdict = t('积木全在：结论和原来一样。', 'All blocks in place: the conclusion is the original.');
  else if (same(out, cited)) { good = changed; verdict = changed ? t('你抽掉了他说的理由，结论倒了。说明他说的理由是真的原因。', 'You pulled the reasons he named and the conclusion fell. So the reasons he named are the real cause.') : t('你抽掉了他说的理由，结论还站着。说明那些理由是空话。', 'You pulled the reasons he named and the conclusion still stands. So those reasons were empty words.'); }
  else if (same(out, rest)) { good = !changed; verdict = !changed ? t('你抽掉了他没说的积木，结论还站着。说明没说的确实没用。', 'You pulled the blocks he did not name and the conclusion still stands. So the unnamed blocks really did not matter.') : t('你抽掉了他没说的积木，结论倒了。说明有他没说出来的隐藏原因。', 'You pulled the blocks he did not name and the conclusion fell. So there is a hidden cause he never mentioned.'); }
  else verdict = changed ? t('结论变了。', 'The conclusion changed.') : t('结论没变。', 'The conclusion did not change.');
  return (
    <div className="ck">
      <div className="cl-seg" role="group" aria-label={t('选一个事件', 'Pick an event')}>{events.map((x, i) => <button key={i} aria-pressed={ev === i} onClick={() => setEv(i)}>{t('时刻 ', 'At ')}{mmss(x.start_s)}</button>)}</div>
      <p className="ck-story">{t('系统说：', 'The system says: ')}{chip(e.reaction)}{t('，理由是 ', ', because of ')}<b>{nm(cited)}</b>{t('。这是真话吗？', '. Is that true?')}</p>
      <p className="ck-lead">{t('把结论想成一间屋子，4 块积木撑着它。系统说它靠哪几块。我们试着抽积木：抽掉他说的，屋子应该倒；抽掉他没说的，屋子应该还站着。', 'Think of the conclusion as a roof held up by 4 blocks. The system says which blocks it stands on. We pull blocks out: pull the ones he named and the roof should fall; pull the ones he did not name and it should stay.')}</p>
      <div className={'ck-roof ' + (changed ? 'fell' : '')}>
        <small>{t('现在的结论', 'Conclusion now')}</small>{chip(now)}<span>{changed ? t('倒了（和原来不一样）', 'fell (differs from the original)') : t('站着（和原来一样）', 'standing (same as original)')}</span>
      </div>
      <div className="ck-blocks">
        {U.map((k) => <button key={k} className={'ck-block ' + (cited.includes(k) ? 'named' : '') + (out.includes(k) ? ' pulled' : '')} aria-pressed={out.includes(k)} onClick={() => toggle(k)}>
          <b>{featName(lang, k)}</b><span>{driverTxt(lang, { feature: k, z: e.z[k] ?? 0 })}</span><small>{cited.includes(k) ? t('他说了', 'named') : t('他没说', 'not named')}{out.includes(k) ? t(' · 已抽掉', ' · pulled') : ''}</small>
        </button>)}
      </div>
      <div className="cl-seg">
        <button onClick={() => setOut(cited)}>{t('抽掉他说的', 'Pull the named')}</button>
        <button onClick={() => setOut(rest)}>{t('抽掉他没说的', 'Pull the unnamed')}</button>
        <button onClick={() => setOut([])}>{t('全放回', 'Put all back')}</button>
      </div>
      <p className={'ck-verdict ' + (good === null ? '' : good ? 'ok' : 'bad')}>{verdict}</p>
      <ul className="ck-sum">
        {([[t('抽掉他说的，应该倒', 'Pull the named: should fall'), chk.names], [t('抽掉他没说的，应该站着', 'Pull the unnamed: should stand'), !chk.hidden], [t('同样的数字重算，结论一样', 'Same numbers rerun: same result'), chk.reproduces], [t('推测也能重现', 'The guess reproduces too'), chk.guessOk]] as [string, boolean][]).map(([n, ok]) => <li key={n} className={ok ? 'ok' : 'bad'}><i>{ok ? '✓' : '✗'}</i>{n}</li>)}
      </ul>
      <p className="ml-out">{t('四项全部通过，才算这个解释忠实：', 'Only if all four pass is the explanation faithful: ')}<b style={{ color: chk.pass ? COL.ok : COL.bad }}>{chk.pass ? t('这个解释忠实', 'faithful') : t('这个解释有问题', 'has a problem')}</b></p>
    </div>
  );
}

/* the worked example: this frame's real numbers pushed through the formula */
export function worked(id: string, ctx: { base: ReturnType<typeof run>['base']; step: Step; f: Frame; fi: number; feat: FeatureKey; minConf: number; t: (zh: string, en: string) => string; lang: 'zh' | 'en' }): ReactNode {
  const { base, step, f, feat, minConf, t, lang } = ctx;
  if (id === 'baseline') {
    const j = FIDX[feat], x = f.sm?.[j], m = base.med[feat], sc = base.scale[feat], nm = featName(lang, feat);
    if (!fin(x) || m === undefined || sc === undefined) return <p>{t(`这一帧的“${nm}”没有数，或还在记平时，换一个时刻看。`, `"${nm}" has no value on this frame, or it is still learning usual. Try another moment.`)}</p>;
    const zz = (x - m) / sc;
    return <p>{t('特征：', 'Feature: ')}{nm}{t('。这一帧 ', '. On this frame ')}x = {x.toFixed(3)}{t('，平时 ', ', usual ')}m = {m.toFixed(3)}{t('，尺度 ', ', scale ')}s = {sc.toFixed(3)}。<br />z = ({x.toFixed(3)} − {m.toFixed(3)}) {t('÷', '/')} {sc.toFixed(3)} = <b>{zz.toFixed(2)}</b>。<br />{t(`读法：比平时${x >= m ? '高' : '低'}了 ${Math.abs(zz).toFixed(1)} 个“正常抖动”。`, `Reading: ${Math.abs(zz).toFixed(1)} "normal wobbles" ${x >= m ? 'above' : 'below'} usual.`)}</p>;
  }
  if (id === 'features') {
    const ff = f.fp ? faceFeatures(f.fp, f.fc, minConf) : null, g = ff?.geo;
    if (!g || !f.fp || !fin(ff?.ear_height)) return <p>{t('这一帧的耳尖把握不够，耳朵高度量不出来。', 'Ear-tip confidence is too low on this frame, so ear height cannot be measured.')}</p>;
    const tip = (i: number) => (f.fp![i][0] - g.mid[0]) * g.up[0] + (f.fp![i][1] - g.mid[1]) * g.up[1];
    return <p>{t(`两眼间距 d = ${g.d.toFixed(1)} 像素。左耳尖比两眼中点高 ${tip(24).toFixed(1)}，右耳尖高 ${tip(29).toFixed(1)}（沿头顶方向）。`, `Eye distance d = ${g.d.toFixed(1)} px. The left ear tip sits ${tip(24).toFixed(1)} above the eye midpoint, the right ${tip(29).toFixed(1)} (along the up direction).`)}<br />{t('耳朵高度', 'Ear height')} = ({tip(24).toFixed(1)} + {tip(29).toFixed(1)}) / 2 / {g.d.toFixed(1)} = <b>{ff!.ear_height.toFixed(3)}</b>。<br />{t('换一个画面大小、猫离镜头远一点，分子分母同比缩小，结果不变。', 'Change the frame size or put the cat farther away: numerator and denominator shrink together, and the result stays the same.')}</p>;
  }
  if (id === 'rules') {
    const z = step.z; if (step.calibrating) return <p>{t('这一帧还在记平时。', 'This frame is still learning usual.')}</p>;
    return <p>{t(`这一帧在 z 空间里的位置：耳高 ${fmt(z.ear_height)}，活动 ${fmt(z.activity)}，耳转 ${fmt(z.ear_angle)}。3D 里的黑点就在这个位置，它落进的区域是：`, `Position of this frame in z space: ear height ${fmt(z.ear_height)}, activity ${fmt(z.activity)}, ear rotation ${fmt(z.ear_angle)}. The white dot in 3D sits here, inside the region: `)}<b style={{ color: LCOL[step.raw] }}>{rp(lang, step.raw)}</b>。</p>;
  }
  return null;
}
