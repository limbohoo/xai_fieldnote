/* The model taken apart: level 2 = the parts inside one stage, level 3 = the smallest step inside a part. Each node is plain words + one live card. */
import { FEATURES, LIK, MODEL_ERROR, PRIOR, STATES, Z, checkEvent, classify, faceFeatures, fin, guess, zEvent, type FeatureKey } from '../case/core';
import { FIDX, LCOL } from '../case/vocab';
import { cueKeys, cueName, driverTxt, featName, featShort, rp, stateShort, type Lang } from './i18n';
import type { SceneData, SceneState } from './scene';
import { contributions, posterior, rank, robustness } from './nbmath';
import type { Vis } from './vis';

export interface Bi { zh: string; en: string }
export interface Ctl { key: string; label: Bi; min: number; max: number; step: number; def: number }
export interface NodeCtx { d: SceneData; s: SceneState; lang: Lang; ps: Record<string, number> }
export interface Node { id: string; stage: string; level: 2 | 3; parent: string; title: Bi; plain: Bi; why?: Bi; tex?: string; controls?: Ctl[]; vis: (c: NodeCtx) => Vis }

const B = (zh: string, en: string): Bi => ({ zh, en });
const L = (c: NodeCtx) => (zh: string, en: string) => (c.lang === 'en' ? en : zh);
const frame = (c: NodeCtx) => c.d.clip.frames[c.s.fi];
const kframe = (c: NodeCtx) => c.d.clip.frames[c.s.kfi];
const num = (v: number | null | undefined, n = 2) => (fin(v) ? (v as number).toFixed(n) : '—');
export const DEFAULTS: Record<string, number> = { beta: 1.5, noise: 0.4, rival: 0, alpha: 0.3, minConf: 0.25, nocat: 0, perturb: 0.25 };
const ps = (c: NodeCtx, k: string) => c.ps[k] ?? DEFAULTS[k];
const CTL = {
  beta: { key: 'beta', label: B('β（越大，越只信最亮的格子）', 'β (larger = trust only the brightest cell)'), min: 0.2, max: 4, step: 0.1, def: 1.5 },
  noise: { key: 'noise', label: B('热力图噪声', 'Heatmap noise'), min: 0, max: 2, step: 0.05, def: 0.4 },
  rival: { key: 'rival', label: B('另一个相似的峰', 'A second similar peak'), min: 0, max: 1, step: 0.05, def: 0 },
  alpha: { key: 'alpha', label: B('α（越大越信当前帧）', 'α (larger = trust the current frame)'), min: 0.05, max: 1, step: 0.05, def: 0.3 },
  minConf: { key: 'minConf', label: B('把握门槛', 'Confidence bar'), min: 0, max: 0.9, step: 0.05, def: 0.25 },
  perturb: { key: 'perturb', label: B('手设数字的误差 ε（每个数乘 (1+ε)^u）', 'Error ε in the hand-set numbers (each × (1+ε)^u)'), min: 0, max: 1, step: 0.05, def: 0.25 },
  nocat: { key: 'nocat', label: B('假设这一帧没找到猫（0 否，1 是）', 'Pretend no cat was found (0 no, 1 yes)'), min: 0, max: 1, step: 1, def: 0 },
};

/* nearest recorded event to the chosen moment, used by the faithfulness check */
function nearest(c: NodeCtx) {
  const t = frame(c).t; let best = 0, bd = 1e9;
  c.d.events.forEach((e, i) => { const dd = Math.abs((e.start_s + (e.end_s ?? e.start_s)) / 2 - t); if (dd < bd) { bd = dd; best = i; } });
  return { e: c.d.events[best], chk: c.d.checks[best], i: best };
}
const STATE_COL = ['#ff7a7a', '#ffb84d', '#4fd08c', '#6c9bff', '#b69cff'];
const flags = (ks: FeatureKey[]) => { const o: Partial<Record<FeatureKey, boolean>> = {}; ks.forEach((k) => (o[k] = true)); return o; };
const USED: FeatureKey[] = ['ear_height', 'ear_angle', 'eye_aperture', 'activity'];

function heatmap(c: NodeCtx) {
  const N = 11, beta = ps(c, 'beta'), noise = ps(c, 'noise'), rival = ps(c, 'rival'), truth: [number, number] = [6.3, 4.6], other: [number, number] = [2.2, 7.4];
  const rnd = (i: number, j: number) => { const x = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return x - Math.floor(x); };
  const H: number[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const g = (q: [number, number]) => Math.exp(-((i - q[0]) ** 2 + (j - q[1]) ** 2) / 2.2); H.push(g(truth) + rival * g(other) + noise * 0.35 * (rnd(i, j) - 0.5)); }
  const mx = Math.max(...H), e = H.map((v) => Math.exp(beta * 3 * (v - mx))), sum = e.reduce((a, b) => a + b, 0), P = e.map((v) => v / sum);
  let sx = 0, sy = 0; P.forEach((p, k) => { sx += p * (k % N); sy += p * Math.floor(k / N); });
  const am = H.indexOf(mx);
  return { N, H, P, truth, soft: [sx, sy] as [number, number], hard: [am % N, Math.floor(am / N)] as [number, number], beta };
}

export const NODES: Node[] = [
  /* ---------------- 01 detect ---------------- */
  { id: 'detect.image', stage: 'detect', level: 2, parent: 'detect', title: B('一帧画面', 'One frame'),
    plain: B('电脑眼里的一张画面，就是一大堆数字：每个像素有红、绿、蓝三个数。', 'To a computer a frame is a big pile of numbers: every pixel has a red, a green and a blue value.'),
    vis: (c) => { const [W, H] = c.d.clip.size, t = L(c); return { t: 'eq', lines: [{ text: t(`一帧 = ${W} × ${H} 个像素`, `One frame = ${W} × ${H} pixels`) }, { text: t('每个像素 = 3 个数（红、绿、蓝）', 'Each pixel = 3 numbers (red, green, blue)') }, { text: `${W} × ${H} × 3 = ${(W * H * 3).toLocaleString()}`, color: '#6c9bff', size: 52 }, { text: t('系统要从这堆数字里找到猫。', 'The system must find the cat inside this pile of numbers.') }] }; } },
  { id: 'detect.find', stage: 'detect', level: 2, parent: 'detect', title: B('检测器给出框', 'The detector draws a box'),
    plain: B('检测器看整帧，输出：框在哪里、框里是什么、有几分把握。', 'The detector looks at the whole frame and reports where a box is, what is in it, and how sure it is.'),
    tex: String.raw`D(I)=\{(b_k,c_k,s_k)\}`,
    vis: (c) => { const f = frame(c), t = L(c); return { t: 'frame', aspect: c.d.clip.size[0] / c.d.clip.size[1], box: f.box ? [f.box[0], f.box[1], f.box[2], f.box[3]] : null, none: t('这一帧没有找到猫', 'No cat found on this frame'), note: f.box ? t(`框 x ${f.box[0].toFixed(2)}，y ${f.box[1].toFixed(2)}，宽 ${f.box[2].toFixed(2)}，高 ${f.box[3].toFixed(2)}（占画面比例）`, `Box x ${f.box[0].toFixed(2)}, y ${f.box[1].toFixed(2)}, w ${f.box[2].toFixed(2)}, h ${f.box[3].toFixed(2)} (share of frame)`) : undefined }; } },
  { id: 'detect.pick', stage: 'detect', level: 2, parent: 'detect', title: B('只留猫，取最有把握的', 'Keep cats, take the surest'),
    plain: B('候选框里只留“猫”，再取把握最高的一个。后面所有步骤只看这个框里面。', 'Keep only boxes labelled "cat" and take the most confident one. Every later step looks only inside it.'),
    tex: String.raw`b^{*}=\arg\max_{c_k=\text{cat}} s_k`,
    vis: (c) => { const f = frame(c), t = L(c); return { t: 'eq', lines: [{ text: t('1. 候选框很多，只留类别 = 猫的', '1. Many candidate boxes; keep class = cat') }, { text: t('2. 取把握最高的一个，记为 b*', '2. Take the most confident one, call it b*') }, { text: f.box ? t('这一帧：找到了 → 继续往下算', 'This frame: found → carry on') : t('这一帧：没找到 → 记为“空”，后面全部跳过', 'This frame: not found → "empty", everything after is skipped'), color: f.box ? '#4fd08c' : '#ff7a7a', size: 40 }] }; } },
  { id: 'detect.pick.missing', stage: 'detect', level: 3, parent: 'detect.pick', title: B('没找到猫会怎样', 'What if no cat is found'),
    plain: B('“没有”不会被悄悄补成某个数。它一路传下去，每一步都跳过，最后的标签是“看不清”。', '"None" is never silently filled with a number. It travels down, every step is skipped, and the final label is "cannot see".'),
    controls: [CTL.nocat],
    vis: (c) => { const t = L(c), gone = ps(c, 'nocat') >= 1 || !frame(c).box, names = [t('找猫', 'Detect'), t('标点', 'Keypoints'), t('防抖', 'Smooth'), t('量特征', 'Features'), t('和平时比', 'Baseline'), t('套规则', 'Rules'), t('投票', 'Vote'), t('推测', 'Guess'), t('检验', 'Check')];
      return { t: 'chain', items: names.map((n, i) => ({ label: n, state: i === 0 ? (gone ? 'off' : 'on') : gone ? 'dim' : 'on' })), caption: gone ? t('没有猫：第 1 步为空，其余全部跳过。标签 = 看不清。', 'No cat: step 1 is empty, the rest are skipped. Label = cannot see.') : t('找到猫：每一步都正常运行。拖动滑块试试“没找到”。', 'Cat found: every step runs. Try the slider to pretend it was not found.') }; } },

  /* ---------------- 02 keypoints ---------------- */
  { id: 'keypoints.crop', stage: 'keypoints', level: 2, parent: 'keypoints', title: B('裁出猫', 'Crop the cat'),
    plain: B('只把框里的内容交给后面的网络，背景不参与计算。', 'Only what is inside the box goes on to the network; the background plays no part.'),
    vis: (c) => { const f = frame(c), t = L(c); return { t: 'frame', aspect: c.d.clip.size[0] / c.d.clip.size[1], box: f.box ? [f.box[0], f.box[1], f.box[2], f.box[3]] : null, none: t('没有框，无法裁剪', 'No box, nothing to crop'), note: t('蓝框里的部分被裁出来，缩放后交给网络。', 'The part inside the blue box is cut out, resized and handed to the network.') }; } },
  { id: 'keypoints.heatmap', stage: 'keypoints', level: 2, parent: 'keypoints', title: B('每个点一张热力图', 'One heatmap per point'),
    plain: B('网络不直接说“耳尖在这里”，而是画一张图：越亮，越可能是点在这里。（示意图，不是网络真实输出）', 'The network does not just say "the ear tip is here". It draws a map: the brighter a cell, the likelier the point is there. (Illustration, not real network output.)'),
    vis: (c) => { const h = heatmap(c), t = L(c); return { t: 'grid', n: h.N, vals: h.P.map((p) => p / Math.max(...h.P)), caption: t('身体 20 点 + 脸 48 点，每个点各有一张这样的图。', '20 body points + 48 face points, each with a map like this.') }; } },
  { id: 'keypoints.softmax', stage: 'keypoints', level: 2, parent: 'keypoints', title: B('把亮度变成权重', 'Turn brightness into weights'),
    plain: B('softmax 把每格的亮度变成“权重”，加起来等于 1。β 越大，最亮的格子拿走越多权重。', 'Softmax turns each cell\'s brightness into a weight; all weights add to 1. The larger β, the more of it the brightest cell takes.'),
    tex: String.raw`P_{ij}=\frac{e^{\beta H_{ij}}}{\sum e^{\beta H_{kl}}}`, controls: [CTL.beta],
    vis: (c) => { const vals = [0.2, 0.5, 1.0, 0.7, 0.3, 0.1], b = ps(c, 'beta'), e = vals.map((v) => Math.exp(b * 3 * (v - 1))), s = e.reduce((a, x) => a + x, 0), t = L(c);
      return { t: 'bars', items: vals.map((v, i) => ({ label: t(`格子 ${i + 1}（亮度 ${v}）`, `Cell ${i + 1} (brightness ${v})`), v: e[i] / s, hi: v === 1, note: ((e[i] / s) * 100).toFixed(0) + '%' })), lo: 0, hi: 1, caption: t('权重加起来 = 100%。把 β 拉大，最亮的格子越来越独占。', 'Weights add to 100%. Raise β and the brightest cell takes more and more.') }; } },
  { id: 'keypoints.average', stage: 'keypoints', level: 2, parent: 'keypoints', title: B('加权平均 = 点的位置', 'Weighted average = the point'),
    plain: B('点的位置 = 每格的位置按权重取平均（soft-argmax）。它可以落在格子之间，所以比“取最亮的格子”更细。', 'The point = the average of all cell positions, weighted (soft-argmax). It can land between cells, so it is finer than "pick the brightest cell".'),
    tex: String.raw`\hat p=\sum_{ij}P_{ij}\,x_{ij}`, controls: [CTL.beta, CTL.noise, CTL.rival],
    vis: (c) => { const h = heatmap(c), t = L(c), d = (a: [number, number]) => Math.hypot(a[0] - h.truth[0], a[1] - h.truth[1]).toFixed(2);
      return { t: 'grid', n: h.N, vals: h.P.map((p) => p / Math.max(...h.P)), marks: [{ x: h.truth[0], y: h.truth[1], shape: 'x', color: '#fff' }, { x: h.hard[0], y: h.hard[1], shape: 'sq', color: '#ffb84d' }, { x: h.soft[0] - 0, y: h.soft[1] - 0, shape: 'circ', color: '#ff7a7a' }], caption: t(`× 真实位置　□ 最亮格（偏 ${d(h.hard)}）　○ 加权平均（偏 ${d(h.soft)}）`, `× truth   □ brightest cell (off ${d(h.hard)})   ○ weighted average (off ${d(h.soft)})`) }; } },
  { id: 'keypoints.average.train', stage: 'keypoints', level: 3, parent: 'keypoints.average', title: B('为什么它能被训练', 'Why it can be trained'),
    plain: B('取最亮格子的结果一动不动，网络不知道往哪改。加权平均是连续的：某一格变亮，点就朝它移动一点，所以坐标误差能直接回传给网络。', 'The brightest-cell answer jumps and gives the network no direction. The weighted average is smooth: brighten one cell and the point moves a little toward it, so coordinate error can flow straight back to the network.'),
    tex: String.raw`\frac{\partial\hat p}{\partial H_{ij}}=\beta P_{ij}(x_{ij}-\hat p)`,
    vis: (c) => { const t = L(c); return { t: 'eq', lines: [{ text: t('某一格变亮 → 点朝那一格移动', 'A cell gets brighter → the point moves toward it') }, { text: '∂p̂ / ∂H = β · P · ( x − p̂ )', color: '#6c9bff', size: 48 }, { text: t('移动多少 = 它的权重 P × 它离点的距离', 'How much = its weight P × its distance from the point') }, { text: t('所以坐标误差可以直接当作训练的损失。', 'So coordinate error can be used directly as the training loss.') }] }; } },
  { id: 'keypoints.conf', stage: 'keypoints', level: 2, parent: 'keypoints', title: B('每个点的把握', 'A confidence for each point'),
    plain: B('每个点都带一个把握值。把握低的点不会被拿去用，系统宁可说“这一帧量不出来”。拖动滑块看哪些点被丢掉。', 'Every point carries a confidence. Low-confidence points are not used; the system would rather say "cannot measure this frame". Drag the slider to see which points drop out.'),
    controls: [CTL.minConf],
    vis: (c) => { const kf = kframe(c), m = ps(c, 'minConf'), t = L(c); const pts = [...(kf.fp ?? []), ...(kf.bp ?? [])], cf = [...(kf.fc ?? []), ...(kf.bc ?? [])]; const ok = cf.filter((v) => v >= m).length;
      return { t: 'points', pts: pts.map((p, i) => ({ x: p[0], y: p[1], color: (cf[i] ?? 0) >= m ? (i < (kf.fp?.length ?? 0) ? '#6fe3c1' : '#b69cff') : '#ff6b6b', r: 7 })), caption: t(`${ok} / ${pts.length} 个点够把握（红色被丢掉）。门槛 ${m.toFixed(2)}，系统实际用 0.25。`, `${ok} / ${pts.length} points are confident enough (red are dropped). Bar ${m.toFixed(2)}; the system uses 0.25.`) }; } },

  /* ---------------- 03 smooth ---------------- */
  { id: 'smooth.raw', stage: 'smooth', level: 2, parent: 'smooth', title: B('点每帧都在抖', 'Points jitter every frame'),
    plain: B('即使猫不动，网络每帧给出的点也会有一点点不同。画成曲线就是一条毛毛的线。', 'Even when the cat is still, the network\'s points differ slightly from frame to frame. Plotted, that is a fuzzy line.'),
    vis: (c) => { const j = FIDX[c.s.feat], a = Math.max(0, c.s.fi - 90), f = c.d.clip.frames.slice(a, c.s.fi + 91), t = L(c); return { t: 'series', a: f.map((x) => x.raw?.[j] ?? null), mark: c.s.fi - a, la: featName(c.lang, c.s.feat), caption: t('这是原始的数（前后各 3 秒）。', 'These are the raw numbers (3 s either side).') }; } },
  { id: 'smooth.ema', stage: 'smooth', level: 2, parent: 'smooth', title: B('把上一帧也算进来', 'Count the previous frame too'),
    plain: B('最简单的平滑：新的值 = α × 当前帧 + (1 − α) × 上一次的结果。α 小，更平滑，但反应更慢。', 'The simplest smoothing: new value = α × current frame + (1 − α) × the previous result. Small α is smoother but slower to react.'),
    tex: String.raw`y_t=\alpha x_t+(1-\alpha)y_{t-1}`, controls: [CTL.alpha],
    vis: (c) => { const j = FIDX[c.s.feat], a = Math.max(0, c.s.fi - 90), f = c.d.clip.frames.slice(a, c.s.fi + 91), al = ps(c, 'alpha'), t = L(c); const raw = f.map((x) => x.raw?.[j] ?? null); let y: number | null = null; const ema = raw.map((v) => { if (!fin(v)) return y; y = y === null ? v : al * v + (1 - al) * y; return y; });
      return { t: 'series', a: raw, b: ema, mark: c.s.fi - a, la: t('灰：原始', 'grey: raw'), lb: t('蓝：平滑后', 'blue: smoothed'), caption: t(`α = ${al.toFixed(2)}。α 越小线越平，但转折处会拖后。`, `α = ${al.toFixed(2)}. The smaller α, the flatter the line, but it lags at turns.`) }; } },
  { id: 'smooth.adaptive', stage: 'smooth', level: 2, parent: 'smooth', title: B('动得快，就少平滑', 'Smooth less when moving fast'),
    plain: B('固定的 α 有代价：想压住抖动就会拖后腿。One-Euro 让 α 随速度变化：慢时多平滑，快时少平滑。蓝线是系统实际用的结果。', 'A fixed α has a price: calming jitter means lagging. One-Euro lets α follow speed: smooth a lot when slow, little when fast. The blue line is what the system actually uses.'),
    tex: String.raw`f_c=f_{\min}+\beta\lvert\dot{\hat x}\rvert`,
    vis: (c) => { const j = FIDX[c.s.feat], a = Math.max(0, c.s.fi - 90), f = c.d.clip.frames.slice(a, c.s.fi + 91), t = L(c); return { t: 'series', a: f.map((x) => x.raw?.[j] ?? null), b: f.map((x) => x.sm?.[j] ?? null), mark: c.s.fi - a, la: t('灰：原始', 'grey: raw'), lb: t('蓝：One-Euro', 'blue: One-Euro'), caption: t('平稳处很平，快速变化处紧跟着走。', 'Flat where steady, close behind where it changes fast.') }; } },
  { id: 'smooth.adaptive.lag', stage: 'smooth', level: 3, parent: 'smooth.adaptive', title: B('为什么滞后有上限', 'Why the lag is capped'),
    plain: B('固定的平滑：速度越快，拖得越远。One-Euro：速度越快截止频率越高，拖后腿的距离不会超过一个上限。（示意参数 f_min = 1，β = 1）', 'Fixed smoothing: the faster the motion, the farther it lags. One-Euro: the faster the motion the higher the cutoff, so the lag never exceeds a cap. (Illustrative f_min = 1, β = 1.)'),
    tex: String.raw`\text{lag}=\frac{v}{2\pi(f_{\min}+\beta v)}\le\frac1{2\pi\beta}`,
    vis: (c) => { const t = L(c), sp = [0.5, 1, 2, 4, 8], fixed = sp.map((v) => v / (2 * Math.PI)), ad = sp.map((v) => v / (2 * Math.PI * (1 + v))); return { t: 'bars', items: sp.flatMap((v, i) => [{ label: t(`速度 ${v}：固定`, `speed ${v}: fixed`), v: fixed[i], color: '#ff7a7a', note: fixed[i].toFixed(2) }, { label: t(`速度 ${v}：One-Euro`, `speed ${v}: One-Euro`), v: ad[i], color: '#4fd08c', note: ad[i].toFixed(2) }]).slice(0, 8), lo: 0, hi: fixed[3], caption: t('红：固定平滑的滞后（越快越大）。绿：One-Euro（上限 0.16）。', 'Red: lag of fixed smoothing (grows with speed). Green: One-Euro (capped at 0.16).') }; } },

  /* ---------------- 04 features ---------------- */
  { id: 'features.ruler', stage: 'features', level: 2, parent: 'features', title: B('两眼定一把尺子', 'Two eyes make a ruler'),
    plain: B('连接两只眼睛，得到一条“水平线”，它的长度 d 就是尺子。垂直于它、朝头顶的方向叫“向上”。', 'Join the two eyes for a "horizontal line"; its length d is the ruler. The direction perpendicular to it, toward the top of the head, is "up".'),
    tex: String.raw`d=\lVert e_R-e_L\rVert`,
    vis: (c) => { const f = kframe(c), t = L(c); if (!f.fp) return { t: 'eq', lines: [{ text: t('这一帧没有脸部点', 'No face points on this frame') }] }; const ff = faceFeatures(f.fp, f.fc, 0.25), g = ff.geo;
      return { t: 'points', pts: f.fp.map((p, i) => ({ x: p[0], y: p[1], color: [22, 23, 24, 25, 26, 27, 28, 29, 30, 31].includes(i) ? '#ff9a5a' : [4, 5, 6, 7, 8, 9, 10, 11].includes(i) ? '#6c9bff' : '#4a5570', r: 5 })), segs: g ? [{ a: g.el, b: g.er, color: '#6c9bff' }, { a: g.mid, b: [g.mid[0] + g.up[0] * g.d, g.mid[1] + g.up[1] * g.d], color: '#fff', dash: true }] : [], caption: t('蓝线 = 尺子（两眼连线）；白虚线 = 向上；橙色 = 耳朵。', 'Blue = ruler (eye line); white dashed = up; orange = ears.') }; } },
  { id: 'features.height', stage: 'features', level: 2, parent: 'features', title: B('耳尖比两眼高多少', 'How high the ear tips sit'),
    plain: B('从两眼中点出发，沿“向上”量两个耳尖各高多少，再除以尺子 d。耳朵压低，这个数就变小。', 'From the eye midpoint, measure how far each ear tip is along "up", then divide by the ruler d. When the ears go back, this number shrinks.'),
    tex: String.raw`h=\frac{1}{2d}\sum_{L,R}(t-m)\cdot\text{up}`,
    vis: (c) => { const f = kframe(c), t = L(c), ff = f.fp ? faceFeatures(f.fp, f.fc, ps(c, 'minConf')) : null, g = ff?.geo; if (!g || !f.fp || !fin(ff?.ear_height)) return { t: 'eq', lines: [{ text: t('耳尖把握不够，量不出来', 'Ear tips not confident enough to measure') }] };
      const tip = (i: number) => ((f.fp![i][0] - g.mid[0]) * g.up[0] + (f.fp![i][1] - g.mid[1]) * g.up[1]) / g.d;
      return { t: 'bars', items: [{ label: t('左耳尖（÷ d）', 'Left tip (÷ d)'), v: tip(24) }, { label: t('右耳尖（÷ d）', 'Right tip (÷ d)'), v: tip(29) }, { label: t('平均 = 耳朵高度', 'Mean = ear height'), v: ff!.ear_height, hi: true }], lo: 0, hi: Math.max(1, ff!.ear_height * 1.3), caption: t('单位是“两眼间距”。数字大 = 耳朵竖得高。', 'Unit is "eye distance". A big number = ears held high.') }; } },
  { id: 'features.scale', stage: 'features', level: 2, parent: 'features', title: B('除以尺子，就和远近无关', 'Dividing by the ruler removes distance'),
    plain: B('把脸缩小一半或放大一倍，耳朵高度的数字不变。因为分子分母一起缩放。', 'Halve or double the face and the ear-height number stays put, because numerator and denominator scale together.'),
    vis: (c) => { const f = kframe(c), t = L(c); if (!f.fp) return { t: 'eq', lines: [{ text: t('这一帧没有脸部点', 'No face points on this frame') }] };
      const sc = [0.5, 1, 2], vals = sc.map((k) => faceFeatures(f.fp!.map((p) => [p[0] * k, p[1] * k] as [number, number]), f.fc, 0.25).ear_height);
      return { t: 'bars', items: sc.map((k, i) => ({ label: t(`脸缩放 ×${k}`, `Face scaled ×${k}`), v: fin(vals[i]) ? vals[i] : 0, hi: k === 1 })), lo: 0, hi: Math.max(1, ...vals.filter(fin)) * 1.2, caption: t('三个大小，耳朵高度完全一样。这是真的用缩放后的点重新算出来的。', 'Three sizes, the same ear height. These were recomputed from the actually rescaled points.') }; } },
  { id: 'features.scale.proof', stage: 'features', level: 3, parent: 'features.scale', title: B('为什么一定不变', 'Why it must stay the same'),
    plain: B('把所有点放大 s 倍：尺子 d 变成 s·d，每个耳尖的“高度”也变成 s 倍，相除后 s 约掉。平移、旋转同理。', 'Scale every point by s: the ruler d becomes s·d and each tip\'s height also becomes s times as big; dividing cancels s. Shifting and rotating work the same way.'),
    tex: String.raw`h'=\frac{s\sum(t-m)\cdot\text{up}}{2\,s\,d}=h`,
    vis: (c) => { const t = L(c); return { t: 'eq', lines: [{ text: t('放大 s 倍：d → s·d', 'Scale by s: d → s·d') }, { text: t('耳尖高度 → s × 耳尖高度', 'tip height → s × tip height') }, { text: 'h′ = (s · 高度) ÷ (s · d) = h'.replace('高度', c.lang === 'en' ? 'height' : '高度'), color: '#6c9bff', size: 46 }, { text: t('所以猫离镜头远近、头在画面里转动，都不影响它。', 'So distance to the camera or head rotation in the image does not affect it.') }] }; } },
  { id: 'features.six', stage: 'features', level: 2, parent: 'features', title: B('得到 6 个数', 'Six numbers come out'),
    plain: B('压成 6 个数。其中耳朵高度、耳朵外转、眼睛睁开、活动量 4 个被规则用到，灰色两个没有用。', 'Compressed into six numbers. Ear height, ear rotation, eye opening and activity are used by the rules; the two grey ones are not.'),
    vis: (c) => { const raw = frame(c).raw, sh = featShort(c.lang); return { t: 'bars', items: FEATURES.map((k, i) => ({ label: sh[i] + (USED.includes(k) ? '' : '（—）'), v: fin(raw?.[i]) ? Math.abs(raw![i] as number) / c.d.fmax[k] : 0, color: USED.includes(k) ? '#6c9bff' : '#4a5163', note: num(raw?.[i], 2) })), lo: 0, hi: 1, caption: L(c)('条的长度 = 这一帧的值 ÷ 整段视频里的最大值。', 'Bar length = this frame\'s value ÷ the largest value in the whole video.') }; } },

  /* ---------------- 05 baseline ---------------- */
  { id: 'baseline.usual', stage: 'baseline', level: 2, parent: 'baseline', title: B('先记下它的“平时”', 'First learn its "usual"'),
    plain: B('每只猫耳朵的高度本来就不一样。所以先用视频开头一小段（浅蓝区）当作这只猫的平时。', 'Every cat holds its ears differently, so a short stretch at the start (pale blue) is taken as this cat\'s usual.'),
    vis: (c) => { const j = FIDX[c.s.feat], t = L(c), base = c.d.base; return { t: 'series', a: c.d.clip.frames.map((f) => f.sm?.[j] ?? null), mark: c.s.fi, shade: [0, base.doneAt], la: featName(c.lang, c.s.feat), caption: t(`浅蓝 = 记平时的前 ${base.doneAt} 帧。`, `Pale blue = the first ${base.doneAt} frames used to learn usual.`) }; } },
  { id: 'baseline.robust', stage: 'baseline', level: 2, parent: 'baseline', title: B('中间值和正常抖动', 'The middle value and normal wobble'),
    plain: B('“平时”取这一段的中间值 m；“正常抖动”取每个数离 m 的距离的中间值 MAD，再乘 1.4826，并且不低于模型自己的测量误差。', '"Usual" is the middle value m of the segment; "normal wobble" is the middle of the distances from m (MAD) × 1.4826, never below the model\'s own measurement error.'),
    tex: String.raw`s=\max(1.4826\,\text{MAD},\ \varepsilon)`,
    vis: (c) => { const k = c.s.feat, m = c.d.base.med[k], s = c.d.base.scale[k], t = L(c); return { t: 'eq', lines: [{ text: t(`特征：${featName(c.lang, k)}`, `Feature: ${featName(c.lang, k)}`) }, { text: t(`平时 m = ${num(m, 3)}`, `usual m = ${num(m, 3)}`), color: '#6c9bff', size: 44 }, { text: t(`正常抖动 s = ${num(s, 3)}`, `normal wobble s = ${num(s, 3)}`), color: '#4fd08c', size: 44 }, { text: t(`（测量误差下限 ${MODEL_ERROR[k]}）`, `(measurement-error floor ${MODEL_ERROR[k]})`), color: '#9aa5b8' }] }; } },
  { id: 'baseline.robust.median', stage: 'baseline', level: 3, parent: 'baseline.robust', title: B('为什么用中间值，不用平均', 'Why the middle value, not the mean'),
    plain: B('记平时的那段里，猫恰好有一次大动作（5.0）。平均值被拉到 1.68，中间值仍是 1.03。中间值不怕少数几帧的意外。', 'During the usual segment the cat happens to make one big move (5.0). The mean is dragged to 1.68; the middle value stays at 1.03. The middle value ignores a few surprises.'),
    vis: (c) => { const v = [1.0, 1.1, 0.9, 1.0, 1.05, 5.0], mean = v.reduce((a, b) => a + b, 0) / v.length, med = [...v].sort((a, b) => a - b).slice(2, 4).reduce((a, b) => a + b, 0) / 2, t = L(c);
      return { t: 'bars', items: [...v.map((x, i) => ({ label: t(`第 ${i + 1} 帧`, `Frame ${i + 1}`), v: x, color: x > 3 ? '#ff7a7a' : '#4a6bd0' })), { label: t('平均值', 'Mean'), v: mean, color: '#ff9a5a', hi: true }, { label: t('中间值', 'Median'), v: med, color: '#4fd08c', hi: true }].slice(0, 8), lo: 0, hi: 5.2, caption: t('红色那一帧是意外。平均值被它拉歪，中间值没动。', 'The red frame is the surprise. It drags the mean; the median does not move.') }; } },
  { id: 'baseline.z', stage: 'baseline', level: 2, parent: 'baseline', title: B('换算成 z', 'Convert to z'),
    plain: B('z = (这一帧 − 平时) ÷ 正常抖动，就是“比平时偏了几个正常抖动”。不同单位的 6 个特征，从此放在同一把尺子上。', 'z = (this frame − usual) ÷ normal wobble: how many normal wobbles away from usual. Six features in different units now sit on one ruler.'),
    tex: String.raw`z=\frac{x-m}{s}`,
    vis: (c) => { const st = c.d.out[c.s.fi], sh = featShort(c.lang); return { t: 'bars', items: FEATURES.map((k, i) => ({ label: sh[i], v: fin(st.z[k]) ? Math.max(-4, Math.min(4, st.z[k] as number)) : 0, color: USED.includes(k) ? '#6c9bff' : '#4a5163', note: st.calibrating ? '…' : num(st.z[k], 2) })), lo: -4, hi: 4, lines: [{ v: -1.5, label: '−1.5' }, { v: 1.5, label: '+1.5' }], caption: L(c)('0 = 平时的样子；超过虚线（±1.5）才算明显。', '0 = looks usual; beyond the dashed lines (±1.5) counts as clear.') }; } },

  /* ---------------- 06 rules ---------------- */
  { id: 'rules.conds', stage: 'rules', level: 2, parent: 'rules', title: B('五个问题', 'Five questions'),
    plain: B('规则就是几个“是 / 否”的问题：耳朵是不是比平时低很多？是不是不动？……每个问题只看一个 z。', 'The rules are a few yes/no questions: are the ears much lower than usual? is it still? … each looks at just one z.'),
    vis: (c) => { const z = c.d.out[c.s.fi].z, st = c.d.out[c.s.fi], t = L(c), prev = c.s.fi > 0 ? c.d.out[c.s.fi - 1].label : 'resting';
      const backBar = prev === 'ears_back' || prev === 'freeze' ? Z.EAR_H_STAY : Z.EAR_H, upBar = prev === 'alert' ? Z.EAR_H_STAY : Z.EAR_H, actBar = prev === 'active' ? Z.ACTIVE_STAY : Z.ACTIVE, stillBar = prev === 'freeze' ? Z.STILL_STAY : Z.STILL;
      if (st.calibrating) return { t: 'eq', lines: [{ text: t('这一帧还在记平时，规则不运行。', 'Still learning usual here; the rules do not run.') }] };
      const eh = z.ear_height, ea = z.ear_angle, ac = z.activity;
      return { t: 'checks', items: [{ text: t(`耳高 z = ${num(eh)} ≤ −${backBar} ？（耳朵压低）`, `ear height z = ${num(eh)} ≤ −${backBar} ? (ears back)`), ok: fin(eh) ? (eh as number) <= -backBar : null }, { text: t(`耳转 z = ${num(ea)} ≥ ${Z.AUX}，且耳高 ≤ −${Z.EAR_CO} ？`, `ear rotation z = ${num(ea)} ≥ ${Z.AUX} and ear height ≤ −${Z.EAR_CO} ?`), ok: fin(ea) && fin(eh) ? (ea as number) >= Z.AUX && (eh as number) <= -Z.EAR_CO : null }, { text: t(`活动 z = ${num(ac)} ≤ ${stillBar} ？（静止）`, `activity z = ${num(ac)} ≤ ${stillBar} ? (still)`), ok: fin(ac) ? (ac as number) <= stillBar : null }, { text: t(`耳高 z ≥ ${upBar} ？（耳朵竖高）`, `ear height z ≥ ${upBar} ? (ears up)`), ok: fin(eh) ? (eh as number) >= upBar : null }, { text: t(`活动 z ≥ ${actBar} ？（动起来）`, `activity z ≥ ${actBar} ? (moving)`), ok: fin(ac) ? (ac as number) >= actBar : null }], caption: t('✓ 表示这个问题的答案是“是”。', '✓ means the answer is yes.') }; } },
  { id: 'rules.order', stage: 'rules', level: 2, parent: 'rules', title: B('排队，先中先赢', 'Queue: first match wins'),
    plain: B('问题按顺序排队：先看是不是“突然不动”，再看“耳朵压低”，然后“注意到了”“动起来了”，都不是就是“没有明显变化”。', 'The questions queue in order: "froze" first, then "ears back", then "noticed", then "moving"; if none, "no clear change".'),
    tex: String.raw`f=\text{first true of }(B\land S,\ B,\ U\land\lnot M,\ M)`,
    vis: (c) => { const k = c.d.out[c.s.fi].raw, order = ['freeze', 'ears_back', 'alert', 'active', 'resting']; return { t: 'chain', items: order.map((o) => ({ label: rp(c.lang, o), state: o === k ? 'on' : 'dim' })), caption: L(c)(`这一帧排到：${rp(c.lang, k)}`, `This frame stops at: ${rp(c.lang, k)}`) }; } },
  { id: 'rules.hyst', stage: 'rules', level: 2, parent: 'rules', title: B('进入难，离开容易', 'Hard to enter, easy to leave'),
    plain: B('进入“耳朵压低”要低于 −1.5，但一旦进入，只要不回到 −1.0 以上就保持。这样 z 在边界上抖，标签也不会来回闪。', 'Entering "ears back" needs z below −1.5, but once in, it stays until z climbs back above −1.0. So z jittering at the edge does not make the label flicker.'),
    vis: (c) => { const a = Math.max(0, c.s.fi - 90), z = c.d.out.slice(a, c.s.fi + 91).map((s) => (s.calibrating ? null : fin(s.z.ear_height) ? (s.z.ear_height as number) : null)), t = L(c); return { t: 'series', a: z, mark: c.s.fi - a, lines: [{ v: -1.5, label: t('进入 −1.5', 'enter −1.5'), color: '#ff7a7a' }, { v: -1.0, label: t('保持 −1.0', 'stay −1.0'), color: '#ffb84d' }], la: t('耳朵高度 z', 'ear height z'), caption: t('线越过红线才进入；要回到橙线以上才离开。', 'Crossing the red line enters; only rising above the orange line leaves.') }; } },
  { id: 'rules.hyst.band', stage: 'rules', level: 3, parent: 'rules.hyst', title: B('这个“缓冲带”有多宽', 'How wide is the buffer'),
    plain: B('进入线 1.5 和保持线 1.0 之间是 0.5 的缓冲带。z 要整个穿过 0.5，标签才会翻转，所以小于 0.25 的抖动翻不动它。', 'Between the enter line 1.5 and stay line 1.0 sits a buffer of 0.5. z must cross all of it to flip the label, so jitter under 0.25 cannot.'),
    tex: String.raw`\Delta=1.5-1.0=0.5`,
    vis: (c) => { const t = L(c); return { t: 'eq', lines: [{ text: t('进入线：1.5　保持线：1.0', 'Enter line: 1.5   Stay line: 1.0') }, { text: t('缓冲带 = 1.5 − 1.0 = 0.5', 'Buffer = 1.5 − 1.0 = 0.5'), color: '#6c9bff', size: 48 }, { text: t('z 在带子里时，标签听“上一帧”的', 'While z is inside the band, the label follows the previous frame') }, { text: t('要翻转，必须穿过整个 0.5', 'To flip, z must cross the full 0.5') }] }; } },
  { id: 'rules.evidence', stage: 'rules', level: 2, parent: 'rules', title: B('依据', 'The evidence'),
    plain: B('规则给出标签的同时，也交出“哪些问题答对了”，就是依据。标签和依据来自同一次计算，不可能互相矛盾。', 'Along with the label, the rules hand over which questions came out true: the evidence. Label and evidence come from one computation, so they cannot disagree.'),
    vis: (c) => { const st = c.d.out[c.s.fi], t = L(c); return { t: 'eq', lines: [{ text: t(`标签：${rp(c.lang, st.label)}`, `Label: ${rp(c.lang, st.label)}`), color: LCOL[st.label], size: 44 }, ...(st.drivers.length ? st.drivers.map((d) => ({ text: '· ' + driverTxt(c.lang, d), color: '#e6ebf5' })) : [{ text: t('这个标签没有需要列出的依据。', 'No evidence to list for this label.'), color: '#9aa5b8' }])] }; } },

  /* ---------------- 07 vote ---------------- */
  { id: 'vote.flicker', stage: 'vote', level: 2, parent: 'vote', title: B('规则的结果会闪', 'The rule result flickers'),
    plain: B('规则每一帧都给一个结果，偶尔会闪一下。上排是每帧的结果，下排是投票后显示的。', 'The rules give a result every frame and now and then it flickers. The top row is the per-frame result, the bottom row what is shown after the vote.'),
    vis: (c) => { const a = Math.max(0, c.s.fi - 29), w = c.d.out.slice(a, c.s.fi + 1), t = L(c); return { t: 'strip', rows: [{ label: t('规则每帧的结果', 'Rule result per frame'), cells: w.map((s) => LCOL[s.raw]) }, { label: t('投票后显示的', 'Shown after the vote'), cells: w.map((s) => LCOL[s.label]) }], caption: t('最近 30 帧（约 1 秒）。', 'The last 30 frames (about 1 s).') }; } },
  { id: 'vote.count', stage: 'vote', level: 2, parent: 'vote', title: B('数一数最近 0.3 秒', 'Count the last 0.3 s'),
    plain: B('只看最近 0.3 秒，数每个结果占了几成。', 'Look only at the last 0.3 s and count what share each result holds.'),
    vis: (c) => { const n = Math.round(0.3 * c.d.clip.fps), w = c.d.out.slice(Math.max(0, c.s.fi - n), c.s.fi + 1), m = new Map<string, number>(); w.forEach((s) => m.set(s.raw, (m.get(s.raw) ?? 0) + 1)); const ent = [...m.entries()].sort((a, b) => b[1] - a[1]);
      return { t: 'bars', items: ent.slice(0, 5).map(([k, v]) => ({ label: rp(c.lang, k), v: v / w.length, color: LCOL[k], note: Math.round((v / w.length) * 100) + '%' })), lo: 0, hi: 1, lines: [{ v: 0.6, label: '60%' }], caption: L(c)(`窗口共 ${w.length} 帧。虚线 = 换标签所需的 60%。`, `The window holds ${w.length} frames. The dashed line = the 60% needed to switch.`) }; } },
  { id: 'vote.switch', stage: 'vote', level: 2, parent: 'vote', title: B('过了六成才换', 'Switch only past 60%'),
    plain: B('新结果占到六成以上，显示的标签才换。两个标签不可能同时占六成，所以不会出现“平票”。代价是约 0.18 秒的延迟。', 'The displayed label changes only when a new result holds over 60%. Two labels cannot both hold 60%, so there is never a tie. The price is about 0.18 s of delay.'),
    tex: String.raw`q_k\ge0.6\Rightarrow\ell_t=k`,
    vis: (c) => { const st = c.d.out[c.s.fi], t = L(c), same = st.label === st.raw; return { t: 'eq', lines: [{ text: t(`这一帧规则说：${rp(c.lang, st.raw)}`, `Rule says on this frame: ${rp(c.lang, st.raw)}`), color: LCOL[st.raw], size: 40 }, { text: t(`显示的标签：${rp(c.lang, st.label)}`, `Shown label: ${rp(c.lang, st.label)}`), color: LCOL[st.label], size: 44 }, { text: same ? t('一致，没有冲突。', 'They agree; no conflict.') : t('不一致：这一帧的结果还没占到六成，暂不切换。', 'They differ: this result has not reached 60% yet, so no switch.'), color: same ? '#4fd08c' : '#ffb84d' }] }; } },

  /* ---------------- 08 guess: 1000 cats, filter by evidence, recount the shares ---------------- */
  { id: 'guess.start', stage: 'guess', level: 2, parent: 'guess', title: B('起点：1000 只刚做出这个动作的猫', 'Start: 1000 cats that just did this'),
    plain: B('想象 1000 只刚做出这个动作的猫（比如耳朵压低）。按我们手设的起始概率，把它们分成五群：紧张的 400 只，专注的 300 只……每个小方块是一只猫。', 'Imagine 1000 cats that have just done this (say, ears back). By our hand-set starting odds they split into five groups: 400 tense, 300 attentive… each small cube is one cat.'),
    vis: (c) => { const p = PRIOR[c.s.gl], s0 = p.reduce((a, b) => a + b, 0), t = L(c); return { t: 'crowd', groups: STATES.map((s, i) => ({ label: stateShort(c.lang, s), color: STATE_COL[i], total: Math.round((1000 * p[i]) / s0), keep: Math.round((1000 * p[i]) / s0) })), caption: t(`标签：${rp(c.lang, c.s.gl)}。这五群是我们手设的起始概率，不是数出来的。`, `Label: ${rp(c.lang, c.s.gl)}. The five groups are our hand-set starting odds, not counted from data.`) }; } },
  { id: 'guess.cue', stage: 'guess', level: 2, parent: 'guess', title: B('一条线索：只留下做了这个动作的猫', 'One cue: keep only the cats that did it'),
    plain: B('现在看到猫“随后躲开了”。我们只留下做了这个动作的猫，其余淡出。每一群留下多少，看这个动作在那种状态的猫里有多常见：紧张的猫 60% 会躲开，放松的只有 5%。', 'Now we see the cat "moved away". Keep only the cats that did that; the rest fade out. How many of each group stay depends on how common the action is in that state: 60% of tense cats move away, only 5% of relaxed ones.'),
    vis: (c) => { const cue = c.s.gc[0] ?? 'moves_away', p = PRIOR[c.s.gl], s0 = p.reduce((a, b) => a + b, 0), t = L(c), g = STATES.map((s, i) => { const tot = Math.round((1000 * p[i]) / s0); return { label: stateShort(c.lang, s), color: STATE_COL[i], total: tot, keep: Math.round(tot * LIK[cue][i]) }; }), kept = g.reduce((a, x) => a + x.keep, 0);
      return { t: 'crowd', groups: g, caption: t(`线索：${cueName(c.lang, cue)}。留下 ${g.map((x) => x.keep).join(' + ')} = ${kept} 只。`, `Cue: ${cueName(c.lang, cue)}. Kept ${g.map((x) => x.keep).join(' + ')} = ${kept} cats.`) }; } },
  { id: 'guess.cue.table', stage: 'guess', level: 3, parent: 'guess.cue', title: B('线索表：每群猫里有多少会做这个动作', 'The cue table: how many of each group do it'),
    plain: B('每条线索一行，每个状态一列：这个状态的猫里，有多大比例会做这个动作。上一步“留下多少”就是拿这一行去乘每一群的猫数。这些百分比也是我们手设的。', 'One row per cue, one column per state: what share of cats in that state do this action. The "how many stay" in the previous step is this row times each group\'s count. These percentages are hand-set too.'),
    vis: (c) => ({ t: 'table', head: STATES.map((s) => stateShort(c.lang, s)), rows: cueKeys.map((k) => ({ label: cueName(c.lang, k), cells: LIK[k].map((v) => Math.round(v * 100) + '%'), hi: c.s.gc.includes(k) })), hiCol: c.s.col, caption: L(c)('亮的行 = 已选的线索；亮的列 = 选中的状态。', 'Bright rows = picked cues; bright column = the selected state.') }) },
  { id: 'guess.norm', stage: 'guess', level: 2, parent: 'guess', title: B('重新数占比（这就是“归一化”）', 'Recount the shares (this is "normalising")'),
    plain: B('筛完之后，留下的猫一共 310 只，其中紧张的 240 只。所以现在紧张占 240 ÷ 310 = 77%。“归一化”就是这个除法：用留下的总数重新数一遍占比，让五个占比加起来等于 100%。', 'After filtering, 310 cats remain, 240 of them tense. So tense now holds 240 ÷ 310 = 77%. "Normalising" is just this division: recount the shares with the cats that remain, so the five shares add to 100%.'),
    tex: String.raw`P(s\mid\ell,c)=\frac{n_s}{\sum_{s'}n_{s'}}`,
    vis: (c) => { const p = PRIOR[c.s.gl], s0 = p.reduce((a, b) => a + b, 0), post = posterior(c.s.gl, c.s.gc), t = L(c), cnt = STATES.map((_, i) => Math.round((1000 * p[i]) / s0 * c.s.gc.reduce((a, k) => a * LIK[k][i], 1))), tot = cnt.reduce((a, b) => a + b, 0);
      return { t: 'bars', items: STATES.map((s, i) => ({ label: stateShort(c.lang, s), v: cnt[i], color: STATE_COL[i], hi: i === rank(post)[0], note: t(`${cnt[i]} 只 → ${(post[i] * 100).toFixed(0)}%`, `${cnt[i]} cats → ${(post[i] * 100).toFixed(0)}%`) })), lo: 0, hi: Math.max(1, ...cnt), caption: t(`留下共 ${tot} 只。占比 = 这群留下的数 ÷ ${tot}。`, `${tot} cats remain. Share = this group's remaining count ÷ ${tot}.`) }; } },
  { id: 'guess.norm.col', stage: 'guess', level: 3, parent: 'guess.norm', title: B('其中一群的算式', 'The arithmetic for one group'),
    plain: B('选中的一群（一种状态）：起始的猫数，乘上每条线索的比例，得到留下的数；再除以所有群留下的总数，得到占比。在 3D 里点柱子，或在右侧面板点列名，可以换一群。', 'For the selected group (one state): the starting count times each cue\'s share gives who stays; divide by everyone who stays to get the share. Click a bar in 3D, or a column name in the panel, to switch group.'),
    vis: (c) => { const p = PRIOR[c.s.gl], s0 = p.reduce((a, b) => a + b, 0), col = c.s.col, t = L(c), start = (1000 * p[col]) / s0, keep = c.s.gc.reduce((a, k) => a * LIK[k][col], start), cnt = STATES.map((_, i) => (1000 * p[i]) / s0 * c.s.gc.reduce((a, k) => a * LIK[k][i], 1)), tot = cnt.reduce((a, b) => a + b, 0);
      return { t: 'eq', lines: [{ text: t(`这一群：${stateShort(c.lang, STATES[col])}`, `This group: ${stateShort(c.lang, STATES[col])}`), color: STATE_COL[col], size: 44 }, { text: `${Math.round(start)}${c.s.gc.map((k) => ` × ${Math.round(LIK[k][col] * 100)}%`).join('')} = ${keep.toFixed(keep < 10 ? 1 : 0)}`, size: 40 }, { text: t(`所有群留下的总数 ${tot.toFixed(0)}`, `Everyone who stays: ${tot.toFixed(0)}`), color: '#9aa5b8' }, { text: `${keep.toFixed(keep < 10 ? 1 : 0)} ÷ ${tot.toFixed(0)} = ${((keep / tot) * 100).toFixed(0)}%`, color: '#6c9bff', size: 48 }] }; } },
  { id: 'guess.more', stage: 'guess', level: 2, parent: 'guess', title: B('再来一条线索：在剩下的猫里再筛一次', 'Another cue: filter the remaining cats again'),
    plain: B('线索可以一条接一条：每多一条，就在剩下的猫里再筛一次。我们假设各条线索互不影响，所以可以这样连着筛。没做某个动作，不会把猫筛掉：只有“做了”才算数。', 'Cues can come one after another: each new one filters the remaining cats again. We assume the cues do not affect each other, which is what allows chaining. Not doing an action never removes a cat: only "did it" counts.'),
    vis: (c) => { const p = PRIOR[c.s.gl], s0 = p.reduce((a, b) => a + b, 0), t = L(c), g = STATES.map((s, i) => { const tot = Math.round((1000 * p[i]) / s0); return { label: stateShort(c.lang, s), color: STATE_COL[i], total: tot, keep: Math.round(tot * c.s.gc.reduce((a, k) => a * LIK[k][i], 1)) }; }), kept = g.reduce((a, x) => a + x.keep, 0);
      return { t: 'crowd', groups: g, caption: c.s.gc.length ? t(`已用线索：${c.s.gc.map((k) => cueName(c.lang, k)).join('、')}。留下 ${kept} 只。`, `Cues used: ${c.s.gc.map((k) => cueName(c.lang, k)).join(', ')}. ${kept} cats remain.`) : t('还没选线索：1000 只都在。在右侧面板里点选线索。', 'No cue picked: all 1000 stay. Pick cues in the right-hand panel.') }; } },
  { id: 'guess.more.evidence', stage: 'guess', level: 3, parent: 'guess.more', title: B('每条线索给了多少证据', 'How much evidence each cue gives'),
    plain: B('换一个角度看：每条线索让“领先的状态”比“第二名”多领先多少倍。数字取对数后可以直接相加：正数帮领先者，负数拉它回来。', 'Another view: by how many times each cue puts the leading state ahead of the runner-up. In log form the numbers simply add: positive helps the leader, negative pulls it back.'),
    tex: String.raw`\log\frac{P(a\mid\ell,C)}{P(b\mid\ell,C)}=\log\frac{P(a\mid\ell)}{P(b\mid\ell)}+\sum_{c\in C}\log\frac{P(c\mid a)}{P(c\mid b)}`,
    vis: (c) => { const t = L(c), k = contributions(c.s.gl, c.s.gc), nm = (i: number) => stateShort(c.lang, STATES[i]);
      return { t: 'bars', items: [{ label: t(`起始：${nm(k.top)} 对 ${nm(k.second)}`, `Start: ${nm(k.top)} vs ${nm(k.second)}`), v: k.prior, note: k.prior.toFixed(2) }, ...k.items.map((x) => ({ label: cueName(c.lang, x.cue), v: x.v, color: x.v >= 0 ? '#4fd08c' : '#ff7a7a', note: (x.v >= 0 ? '+' : '') + x.v.toFixed(2) })), { label: t('合计', 'Total'), v: k.total, hi: true, note: k.total.toFixed(2) }].slice(0, 8), lo: -3, hi: 3, lines: [{ v: 0, label: '0' }], caption: t(`合计 = ${k.total.toFixed(2)}，换算回去是 ${Math.exp(k.total).toFixed(1)} 倍。没选线索时只有起始项。`, `Total = ${k.total.toFixed(2)}, which is ${Math.exp(k.total).toFixed(1)} times. With no cue picked only the starting term remains.`) }; } },
  { id: 'guess.band', stage: 'guess', level: 2, parent: 'guess', title: B('够不够说：把握', 'Sure enough to say it'),
    plain: B('看占比最高的 p₁ 和第二名 p₂：p₁ 要够高，还要和 p₂ 拉开。不够，系统就不说情绪，只写看到的行为。', 'Look at the top share p₁ and the runner-up p₂: p₁ must be high enough and clear of p₂. If not, the system says no emotion and only writes the behaviour.'),
    vis: (c) => { const g = guess(c.s.gl, c.s.gc, 0.8), t = L(c); if (!g) return { t: 'eq', lines: [{ text: t('这个标签不做推测', 'No guess for this label') }] }; const bn = c.lang === 'en' ? { 高: 'high', 中: 'medium', 低: 'low' }[g.band] : g.band;
      return { t: 'checks', items: [{ text: `p₁ = ${g.p1.toFixed(2)}（${stateShort(c.lang, g.top)}）`, ok: null }, { text: `p₂ = ${g.p2.toFixed(2)}（${stateShort(c.lang, g.second)}）`, ok: null }, { text: t(`高：p₁ ≥ 0.6 且 p₁ − p₂ ≥ 0.3`, 'High: p₁ ≥ 0.6 and p₁ − p₂ ≥ 0.3'), ok: g.p1 >= 0.6 && g.p1 - g.p2 >= 0.3 }, { text: t('中：p₁ ≥ 0.45 且 p₁ − p₂ ≥ 0.15', 'Medium: p₁ ≥ 0.45 and p₁ − p₂ ≥ 0.15'), ok: g.p1 >= 0.45 && g.p1 - g.p2 >= 0.15 }], caption: t(`把握：${bn}（脸可见比例按 0.8 计）。${g.show ? '会显示给主人。' : '不显示情绪。'}`, `Confidence: ${bn} (face visible taken as 0.8). ${g.show ? 'Shown to the owner.' : 'No emotion shown.'}`) }; } },
  { id: 'guess.band.robust', stage: 'guess', level: 3, parent: 'guess.band', title: B('手设数字有误差时，稳不稳', 'Do the hand-set numbers matter'),
    plain: B('这 55 个概率都是我们手设的。把每一个随机放大或缩小一点，重算 200 次，看领先的状态有多少次没变。越接近 100%，结论越不依赖我们的猜测。', 'All 55 probabilities were set by hand. Scale each up or down a little at random, recompute 200 times and count how often the leading state stays. The closer to 100%, the less the conclusion depends on our guesses.'),
    controls: [CTL.perturb], tex: String.raw`r=\frac1N\sum_n\mathbf 1[\arg\max_s P^{(n)}=s^{*}]`,
    vis: (c) => { const t = L(c), e = ps(c, 'perturb'), r = robustness(c.s.gl, c.s.gc, e), top = rank(posterior(c.s.gl, c.s.gc))[0];
      return { t: 'bars', items: STATES.map((s, i) => ({ label: stateShort(c.lang, s) + (i === top ? t('（现在领先）', ' (leader now)') : ''), v: r.share[i], hi: i === top, color: i === top ? '#6c9bff' : '#4a5163', note: Math.round(r.share[i] * 100) + '%' })), lo: 0, hi: 1, caption: t(`每个数在 ±${Math.round(e * 100)}% 内随机变动，${r.n} 次里领先状态不变的占 ${Math.round(r.kept * 100)}%；仍能给出推测（把握够）的占 ${Math.round(r.shown * 100)}%。`, `With every number varied within ±${Math.round(e * 100)}%, the leader stayed in ${Math.round(r.kept * 100)}% of ${r.n} runs; a guess was still shown (enough confidence) in ${Math.round(r.shown * 100)}%.`) }; } },
  { id: 'guess.assume', stage: 'guess', level: 2, parent: 'guess', title: B('这个模型做了哪些假设', 'What the model assumes'),
    plain: B('红色是已知只是近似、或没有被检验的地方；灰色是设定。这些不是缺点清单，而是“结论成立所需的前提”，答辩时要主动讲。', 'Red marks what is known to be only an approximation, or unvalidated; grey marks a set-up choice. This is not a list of flaws but the premises the conclusion needs, and worth stating up front.'),
    vis: (c) => { const t = L(c); return { t: 'checks', items: [{ text: t('线索在已知状态时互相独立（A1）：只是近似', 'Cues independent given the state (A1): only approximate'), ok: false }, { text: t('线索不再依赖标签（A2）：没有检验', 'Cues independent of the label (A2): not checked'), ok: false }, { text: t('没出现的线索不算证据：和完整模型不同', 'Absent cues are not evidence: differs from the full model'), ok: false }, { text: t('状态只有 5 种，没有“其他”：封闭集合', 'Only 5 states, no "other": a closed set'), ok: null }, { text: t('标签被当作没有误差的观测', 'The label is taken as an error-free observation'), ok: false }, { text: t('55 个概率手设，没有被标注检验', 'All 55 probabilities hand-set, none validated'), ok: false }, { text: t('p₁ 没有校准：不是猜对的概率', 'p₁ is uncalibrated: not the probability of being right'), ok: false }], caption: t('红 = 近似或没有检验；灰 = 设定。', 'Red = approximate or unvalidated; grey = a set-up choice.') }; } },

  /* ---------------- 09 check ---------------- */
  { id: 'check.rerun', stage: 'check', level: 2, parent: 'check', title: B('用记下的数字重算', 'Rerun on the recorded numbers'),
    plain: B('拿事件当时记下的数字，把规则重新跑一遍，结果必须和当时一样，否则记录不完整。', 'Take the numbers recorded at the event and run the rules again; the result must match, or the record is incomplete.'),
    vis: (c) => { const { e, chk } = nearest(c), t = L(c); if (!e) return { t: 'eq', lines: [{ text: t('没有事件数据', 'No event data') }] }; const r = classify(zEvent(e), false, e.prev_reaction).key; return { t: 'chain', items: [{ label: t('当时：', 'Then: ') + rp(c.lang, e.reaction), state: 'on' }, { label: t('重算：', 'Rerun: ') + rp(c.lang, r), state: chk.reproduces ? 'on' : 'off' }], caption: chk.reproduces ? t('✓ 一样，记录是完整的。', '✓ Same: the record is complete.') : t('✗ 不一样。', '✗ Different.') }; } },
  { id: 'check.cited', stage: 'check', level: 2, parent: 'check', title: B('抽掉他说的理由', 'Pull the reasons he named'),
    plain: B('把解释里写出的特征当成“平时”（z = 0）。如果标签变了，说明这些理由确实是原因；没变，就是空话。', 'Treat the features named in the explanation as usual (z = 0). If the label changes, those reasons really were the cause; if not, they were empty words.'),
    vis: (c) => { const { e, chk } = nearest(c), t = L(c); if (!e) return { t: 'eq', lines: [{ text: t('没有事件数据', 'No event data') }] }; const r = classify(zEvent(e, flags(chk.cited)), false, e.prev_reaction).key; return { t: 'eq', lines: [{ text: t('抽掉：', 'Pull: ') + (chk.cited.map((k) => featName(c.lang, k)).join(', ') || '—'), size: 38 }, { text: t(`标签：${rp(c.lang, e.reaction)} → ${rp(c.lang, r)}`, `Label: ${rp(c.lang, e.reaction)} → ${rp(c.lang, r)}`), color: LCOL[r], size: 44 }, { text: chk.names ? t('✓ 变了：理由是真的原因', '✓ Changed: the reasons are real') : t('✗ 没变：理由是空话', '✗ Unchanged: empty words'), color: chk.names ? '#4fd08c' : '#ff7a7a', size: 40 }] }; } },
  { id: 'check.uncited', stage: 'check', level: 2, parent: 'check', title: B('抽掉他没说的因素', 'Pull what he did not name'),
    plain: B('把没写进解释的特征当成“平时”。标签应该不变；变了，说明有一个没说出来的隐藏原因。', 'Treat the features not named as usual. The label should stay; if it changes, there is a hidden cause nobody mentioned.'),
    vis: (c) => { const { e, chk } = nearest(c), t = L(c); if (!e) return { t: 'eq', lines: [{ text: t('没有事件数据', 'No event data') }] }; const rest = USED.filter((k) => !chk.cited.includes(k)), r = classify(zEvent(e, flags(rest)), false, e.prev_reaction).key; return { t: 'eq', lines: [{ text: t('抽掉：', 'Pull: ') + (rest.map((k) => featName(c.lang, k)).join(', ') || '—'), size: 38 }, { text: t(`标签：${rp(c.lang, e.reaction)} → ${rp(c.lang, r)}`, `Label: ${rp(c.lang, e.reaction)} → ${rp(c.lang, r)}`), color: LCOL[r], size: 44 }, { text: !chk.hidden ? t('✓ 没变：没说的确实没起作用', '✓ Unchanged: the unnamed really did not matter') : t('✗ 变了：有隐藏原因', '✗ Changed: a hidden cause'), color: !chk.hidden ? '#4fd08c' : '#ff7a7a', size: 40 }] }; } },
  { id: 'check.guess', stage: 'check', level: 2, parent: 'check', title: B('推测也能重现', 'The guess reproduces too'),
    plain: B('用记下的线索，把朴素贝叶斯再算一遍，得到的最可能状态和把握要和当时一样。', 'Run the naive Bayes again on the recorded cues; the most likely state and the confidence must match.'),
    vis: (c) => { const { e, chk } = nearest(c), t = L(c); if (!e) return { t: 'eq', lines: [{ text: t('没有事件数据', 'No event data') }] }; return { t: 'eq', lines: [{ text: e.interp ? t(`当时的推测：${stateShort(c.lang, e.interp.top)}（把握 ${e.interp.band}）`, `Recorded guess: ${stateShort(c.lang, e.interp.top)} (confidence ${e.interp.band})`) : t('这个事件没有推测', 'This event has no guess'), size: 38 }, { text: chk.guessOk ? t('✓ 重算后一样', '✓ Same after recomputing') : t('✗ 重算后不一样', '✗ Different after recomputing'), color: chk.guessOk ? '#4fd08c' : '#ff7a7a', size: 44 }, { text: t(`四项${chk.pass ? '全部通过：这个解释忠实' : '没有全部通过'}`, `Four checks: ${chk.pass ? 'all pass, faithful' : 'not all pass'}`), size: 36 }] }; } },
];
export const STAGE_IDS = ['detect', 'keypoints', 'smooth', 'features', 'baseline', 'rules', 'vote', 'guess', 'check'];
export const nodeById = (id: string) => NODES.find((n) => n.id === id);
export const childrenOf = (id: string) => NODES.filter((n) => n.parent === id);
void STATES;
