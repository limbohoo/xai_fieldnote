import { LIK, PRIOR, STATES, Z, FEATURES } from '../case/core';
import type { Lang } from './i18n';

export type Origin = 'net' | 'pre' | 'formula' | 'hand';
export interface StageInfo { id: string; no: string; name: string; en: string; origin: Origin; inDim: string; outDim: string; formula: string[]; text: string; params: string }
export const NPROB = Object.keys(PRIOR).length * STATES.length + Object.keys(LIK).length * STATES.length;
export const HAND = NPROB + Object.keys(Z).length + FEATURES.length;
export const ORIGIN: Record<Lang, Record<Origin, [string, string]>> = {
  zh: { pre: ['现成模型', 'ev-ok'], net: ['我们训练的网络', 'ev-proto'], formula: ['公式，没有要学的参数', 'ev-ok'], hand: ['手设数字', 'ev-hand'] },
  en: { pre: ['Off-the-shelf model', 'ev-ok'], net: ['Network we trained', 'ev-proto'], formula: ['Formula, nothing to learn', 'ev-ok'], hand: ['Hand-set numbers', 'ev-hand'] },
};
export const PARAMS: Record<Lang, Record<string, [string, string]>> = {
  zh: { detect: ['现成模型', '没有在我们的数据上重训'], keypoints: ['2 个网络', '身体 20 点、脸 48 点，我们训练'], smooth: ['0', '只有 2 个调节旋钮'], features: ['0', '纯几何公式'], baseline: ['6', '测量误差下限（手设）'], rules: ['8', '门槛（手设）'], vote: ['2', '0.3 秒、60%（手设）'], guess: [String(NPROB), '概率（手设）'], check: ['0', '直接调用规则'] },
  en: { detect: ['Pretrained', 'not retrained on our data'], keypoints: ['2 networks', 'body 20 pts, face 48 pts, trained by us'], smooth: ['0', 'two tuning knobs only'], features: ['0', 'pure geometry'], baseline: ['6', 'error floors (hand-set)'], rules: ['8', 'thresholds (hand-set)'], vote: ['2', '0.3 s and 60% (hand-set)'], guess: [String(NPROB), 'probabilities (hand-set)'], check: ['0', 'reuses the rules'] },
};

const ZH: StageInfo[] = [
  { id: 'detect', no: '01', name: '找猫', en: 'DETECT', origin: 'pre', inDim: '一帧画面 H × W × 3', outDim: '一个框 (x, y, w, h) + 把握',
    formula: ['框 = YOLOv8(画面)', '只保留类别为 cat 的框，取把握最高的一个'],
    text: '现成的找物体模型在整帧里框出猫。后面所有步骤只看框里的内容，框外的背景不参与。没有框的帧，后面的步骤都不做，标签记为“看不清”。',
    params: '使用现成的 YOLOv8，没有在我们的数据上重新训练。' },
  { id: 'keypoints', no: '02', name: '标点', en: 'KEYPOINTS', origin: 'net', inDim: '猫的裁剪图', outDim: '脸 48 × (x, y, 把握) + 身体 20 × (x, y, 把握)',
    formula: ['H = 网络(裁剪图)    // 每个点一张热力图，K × h × w', 'P(x,y) = softmax(β · H)', '点的位置 = ( Σ P·x , Σ P·y )    // soft-argmax'],
    text: '网络给每个点画一张“可能在哪里”的热力图，再取这张图的加权平均位置。加权平均可以落在格子之间，所以点的位置比格子更细；它还可以求导，网络因此能直接用点的位置训练。每个点另带一个把握值。',
    params: '身体网络 MobileNetV3 + FPN（20 个点），脸网络同类做法（48 个点）。两个网络是我们训练的。' },
  { id: 'smooth', no: '03', name: '防抖', en: 'SMOOTH', origin: 'formula', inDim: '68 个点 × 每帧', outDim: '同样 68 个点，抖动变小',
    formula: ['τ = 1 / (2π · f꜀)', 'f꜀ = f꜀ₘᵢₙ + β · |dx̂/dt|    // 动得越快，截止频率越高', 'α = 1 / (1 + τ / Δt)', 'x̂ₜ = α · xₜ + (1 − α) · x̂ₜ₋₁'],
    text: 'One-Euro 滤波按速度调整平滑程度：猫不动时压住抖动，猫快速动时放开，不拖后腿。', params: '没有要学的参数，只有两个调节旋钮。' },
  { id: 'features', no: '04', name: '量特征', en: 'FEATURES', origin: 'formula', inDim: '68 个点', outDim: '6 个数',
    formula: ['x̂ = 左眼 → 右眼 的单位向量，d = 两眼间距', 'up = 垂直于 x̂ 且朝向远离下巴的单位向量', '耳朵高度 = mean_左右耳尖 ( (耳尖 − 两眼中点) · up ) / d', '眼睛睁开 = mean_左右眼 ( 眼睛上下距离 / 眼睛宽度 )'],
    text: '从点的位置算出 6 个数。数字都以两眼间距为单位，所以猫离镜头远近、头在画面里歪一点，都不改变数字。', params: '公式。6 个数里有 4 个被规则用到。' },
  { id: 'baseline', no: '05', name: '和平时比', en: 'BASELINE', origin: 'formula', inDim: '6 个数 × 每帧', outDim: '6 个偏离度 z',
    formula: ['m = median(记平时那段的数)', 's = max( 1.4826 · MAD , 模型测量误差 )', 'z = ( x − m ) / s'],
    text: '用这只猫开头那一小段当“平时”，之后每一帧的数字都换算成：比它平时偏了多少个“正常抖动”。z 为 0 是平时的样子，±2 已经很明显。',
    params: '平时的中位数 m 和尺度 s 由视频开头算出；s 的下限是 6 个测量误差，是我们设的。' },
  { id: 'rules', no: '06', name: '套规则', en: 'RULES', origin: 'hand', inDim: '4 个 z（耳高、耳转、眼睁、活动）+ 上一帧的标签', outDim: '7 个标签之一 + 依据',
    formula: ['耳朵压低:  耳高 z ≤ −1.5   （或 耳转 z ≥ 2 且 耳高 z ≤ −0.5）', '突然不动:  耳朵压低 且 活动 z ≤ −1', '注意到了:  耳高 z ≥ 1.5 且 不在动', '动起来了:  活动 z ≥ 2'],
    text: '每个标签是一条 if 规则，只看 4 个 z。进入一个标签的门槛高，离开的门槛低（滞回），所以标签不会在边界上闪烁。规则同时给出“依据”：哪几个 z 越过了门槛。',
    params: '门槛是我们按文献方向自己定的，没有经过人工标注检验。' },
  { id: 'vote', no: '07', name: '平滑投票', en: 'VOTE', origin: 'hand', inDim: '每帧的规则结果', outDim: '显示的标签',
    formula: ['窗口 = 最近 0.3 秒', '新标签占窗口 ≥ 60%，且窗口至少有 0.15 秒，才切换'],
    text: '规则每帧都给一个结果，显示的标签要在最近 0.3 秒里占多数才会换。按时间算，不按帧数算，电脑慢一点延迟也一样。', params: '0.3 秒和 60% 是手设的。' },
  { id: 'guess', no: '08', name: '推测状态', en: 'GUESS', origin: 'hand', inDim: '标签 + 随后的线索（最多 7 条）+ 脸可见比例', outDim: '5 个概率 + 把握档（高 / 中 / 低）',
    formula: ['P(状态 | 标签, 线索) ∝ P(状态 | 标签) · Π P(线索ᵢ | 状态)', '把握 高: p₁ ≥ 0.6 且 p₁ − p₂ ≥ 0.3；中: p₁ ≥ 0.45 且 p₁ − p₂ ≥ 0.15；其余为低'],
    text: '朴素贝叶斯：每个标签对应 5 种状态的一组起始概率，每看到一条线索，就把各状态的概率乘上“这条线索在该状态下多常出现”，再归一化。把握是“低”就不说。',
    params: `${NPROB} 个概率全部是手设，没有一个被标注检验过。` },
  { id: 'check', no: '09', name: '检验解释', en: 'FAITHFULNESS', origin: 'formula', inDim: '一个事件的 z 和它的依据', outDim: '4 项检验，全部通过才算忠实',
    formula: ['能重现:  用记录的 z 重新跑规则，标签不变', '写出的就是原因:  把依据改回平时（z = 0），标签变', '没有隐藏原因:  把没写的改回平时，标签不变', '推测能重现'],
    text: '这一步用反事实检验解释说的是不是真话：把解释里提到的特征拨回“平时”，标签该变；把没提到的拨回去，标签不该变。', params: '没有参数，直接调用第 06、08 步的规则。' },
];
const EN: StageInfo[] = [
  { id: 'detect', no: '01', name: 'Find the cat', en: 'DETECT', origin: 'pre', inDim: 'One frame, H × W × 3', outDim: 'One box (x, y, w, h) + confidence',
    formula: ['box = YOLOv8(frame)', 'keep boxes of class "cat", take the most confident'],
    text: 'An off-the-shelf object detector boxes the cat in the full frame. Every later step looks only inside the box. If there is no box, the later steps are skipped and the label is "cannot see".',
    params: 'Off-the-shelf YOLOv8, not retrained on our data.' },
  { id: 'keypoints', no: '02', name: 'Place keypoints', en: 'KEYPOINTS', origin: 'net', inDim: 'Cropped image of the cat', outDim: 'Face 48 × (x, y, conf) + body 20 × (x, y, conf)',
    formula: ['H = network(crop)    // one heatmap per point, K × h × w', 'P(x,y) = softmax(β · H)', 'point = ( Σ P·x , Σ P·y )    // soft-argmax'],
    text: 'The network draws one heatmap per point showing where it might be, then takes the weighted average position of that map. The average can land between cells, so the position is finer than the grid. It is also differentiable, so the network trains directly on point positions. Each point also carries a confidence.',
    params: 'Body network: MobileNetV3 + FPN (20 points). Face network: same approach (48 points). Both trained by us.' },
  { id: 'smooth', no: '03', name: 'Smooth jitter', en: 'SMOOTH', origin: 'formula', inDim: '68 points per frame', outDim: 'Same 68 points, less jitter',
    formula: ['τ = 1 / (2π · f꜀)', 'f꜀ = f꜀ₘᵢₙ + β · |dx̂/dt|    // faster motion, higher cutoff', 'α = 1 / (1 + τ / Δt)', 'x̂ₜ = α · xₜ + (1 − α) · x̂ₜ₋₁'],
    text: 'The One-Euro filter changes how much it smooths according to speed: when the cat is still it suppresses jitter, when the cat moves fast it lets the signal through and does not lag.', params: 'Nothing to learn, only two tuning knobs.' },
  { id: 'features', no: '04', name: 'Measure features', en: 'FEATURES', origin: 'formula', inDim: '68 points', outDim: '6 numbers',
    formula: ['x̂ = unit vector from left eye to right eye, d = eye distance', 'up = unit vector perpendicular to x̂, pointing away from the chin', 'ear height = mean over both ear tips ( (tip − eye midpoint) · up ) / d', 'eye opening = mean over both eyes ( eye height / eye width )'],
    text: 'Six numbers are computed from point positions. All are measured in units of the eye distance, so how far the cat is from the camera, or a slight head tilt, does not change them.', params: 'Formulas. 4 of the 6 numbers are used by the rules.' },
  { id: 'baseline', no: '05', name: 'Compare to usual', en: 'BASELINE', origin: 'formula', inDim: '6 numbers per frame', outDim: '6 deviation scores z',
    formula: ['m = median(numbers from the usual segment)', 's = max( 1.4826 · MAD , model error )', 'z = ( x − m ) / s'],
    text: 'A short segment at the start of the video is taken as this cat\'s "usual". After that, every number is converted into: how many "normal wobbles" it is away from usual. z = 0 is the usual look; ±2 is already clear.',
    params: 'Median m and scale s come from the start of the video. The floor of s is the 6 model errors, set by us.' },
  { id: 'rules', no: '06', name: 'Apply rules', en: 'RULES', origin: 'hand', inDim: '4 z scores (ear height, ear rotation, eye opening, activity) + last label', outDim: 'One of 7 labels + the evidence',
    formula: ['Ears back:  ear height z ≤ −1.5   (or ear rotation z ≥ 2 and ear height z ≤ −0.5)', 'Froze:  ears back and activity z ≤ −1', 'Noticed:  ear height z ≥ 1.5 and not moving', 'Moving:  activity z ≥ 2'],
    text: 'Each label is an if-rule over just 4 z scores. The threshold to enter a label is high and the one to leave is low (hysteresis), so labels do not flicker at the border. The rules also report the evidence: which z scores crossed a threshold.',
    params: 'Thresholds were set by us following the direction of the literature. They have not been checked against human annotation.' },
  { id: 'vote', no: '07', name: 'Smooth by vote', en: 'VOTE', origin: 'hand', inDim: 'Rule result of each frame', outDim: 'Displayed label',
    formula: ['window = last 0.3 s', 'switch only if the new label holds ≥ 60% of the window and the window spans ≥ 0.15 s'],
    text: 'The rules give a result every frame. The displayed label changes only when the new one has the majority of the last 0.3 seconds. The window is in time, not frames, so a slower computer gives the same delay.', params: '0.3 s and 60% are hand-set.' },
  { id: 'guess', no: '08', name: 'Guess the state', en: 'GUESS', origin: 'hand', inDim: 'Label + later cues (up to 7) + share of face visible', outDim: '5 probabilities + confidence band (high / medium / low)',
    formula: ['P(state | label, cues) ∝ P(state | label) · Π P(cueᵢ | state)', 'Confidence high: p₁ ≥ 0.6 and p₁ − p₂ ≥ 0.3; medium: p₁ ≥ 0.45 and p₁ − p₂ ≥ 0.15; otherwise low'],
    text: 'Naive Bayes: each label has a starting set of probabilities over 5 states. Each cue multiplies every state by how often that cue appears in that state, then renormalises. With low confidence the system says nothing.',
    params: `All ${NPROB} probabilities are hand-set. None has been checked against annotation.` },
  { id: 'check', no: '09', name: 'Check the explanation', en: 'FAITHFULNESS', origin: 'formula', inDim: 'One event: its z scores and its evidence', outDim: '4 checks, all must pass to be faithful',
    formula: ['Reproducible:  rerun the rules on the recorded z, label unchanged', 'Cause is cited:  set cited features back to usual (z = 0), label changes', 'No hidden cause:  set uncited features back to usual, label unchanged', 'Guess reproducible'],
    text: 'A counterfactual test of whether the explanation tells the truth: set the features it mentions back to "usual", the label should change; set the ones it does not mention back, the label should not change.', params: 'No parameters. It calls the rules from steps 06 and 08.' },
];
export const getStages = (l: Lang) => (l === 'en' ? EN : ZH);

const SZ: Record<string, [string, string][]> = {
  keypoints: [['H', '热力图：每个点一张小图，每个格子的数表示“点在这里的可能性”'], ['β', '放大倍数。越大，最亮的格子占的权重越高'], ['softmax', '把一堆任意的数变成加起来为 1 的权重，越大的数权重越大'], ['Σ P·x', '每个格子的横坐标乘上它的权重再加起来，就是加权平均位置']],
  smooth: [['x̂', '滤波后的值'], ['Δt', '两帧之间的时间'], ['f꜀', '截止频率：越高，越相信这一帧，越少平滑'], ['α', '0 到 1 之间。越大越信当前帧，越小越信之前的结果']],
  features: [['d', '两眼之间的距离，所有长度都除以它，所以数字和远近无关'], ['x̂ / up', '两个互相垂直的方向：沿着眼线的方向，和朝头顶的方向'], ['点乘 ·', '一个向量在某个方向上的投影长度。耳尖减中点，再点乘 up，就是耳尖在头顶方向上比两眼高多少']],
  baseline: [['x', '这一帧的特征值'], ['m', '平时的中位数：把记平时那段的数排好队，取正中间的'], ['MAD', '每个数离中位数的距离，再取这些距离的中位数'], ['1.4826', '让 MAD 和标准差在正常情况下相等的系数'], ['z', '偏离度：比平时偏了几个“正常抖动”']],
  rules: [['z', '偏离度，见上一步'], ['≤ / ≥', '越过门槛。进入标签的门槛高（如 1.5），离开的门槛低（如 1.0），所以标签不闪烁'], ['区域', '把 z 当作坐标，每条规则围出一块空间；点落进哪块，就是哪个标签']],
  vote: [['窗口', '最近 0.3 秒内所有帧的规则结果'], ['≥ 60%', '新标签占窗口的比例要过这个线']],
  guess: [['P(状态 | 标签)', '已知标签时，每种状态的起始概率'], ['P(线索 | 状态)', '如果猫是这种状态，这条线索多常出现'], ['∝', '成正比。算完再把五个数除以它们的和，让总和为 1'], ['Π', '连乘：每条线索各乘一次']],
  check: [['z = 0', '“平时”。把一个特征拨回 0，相当于问“如果它没偏离，结论还成立吗”']],
};
const SE: Record<string, [string, string][]> = {
  keypoints: [['H', 'Heatmap: one small image per point; each cell holds how likely the point is there'], ['β', 'Sharpening factor. The larger it is, the more weight the brightest cell gets'], ['softmax', 'Turns any list of numbers into weights that sum to 1; larger numbers get more weight'], ['Σ P·x', 'Multiply each cell\'s x by its weight and add up: the weighted average position']],
  smooth: [['x̂', 'The filtered value'], ['Δt', 'Time between two frames'], ['f꜀', 'Cutoff frequency: higher means trust this frame more, smooth less'], ['α', 'Between 0 and 1. Larger trusts the current frame, smaller trusts the past']],
  features: [['d', 'Distance between the eyes. Every length is divided by it, so distance to the camera drops out'], ['x̂ / up', 'Two perpendicular directions: along the eye line, and toward the top of the head'], ['dot ·', 'Length of the projection of a vector onto a direction. Tip minus midpoint, dotted with up, is how far the tip sits above the eyes']],
  baseline: [['x', 'The feature value on this frame'], ['m', 'Median of the usual segment: sort the numbers and take the middle one'], ['MAD', 'Median of the distances between each number and the median'], ['1.4826', 'Factor that makes MAD equal the standard deviation for normal data'], ['z', 'Deviation: how many "normal wobbles" away from usual']],
  rules: [['z', 'Deviation, from the previous step'], ['≤ / ≥', 'Crossing a threshold. Entering a label needs a high bar (e.g. 1.5), leaving needs a low one (e.g. 1.0), so labels do not flicker'], ['region', 'Treat z as coordinates; each rule encloses a block of space. Whichever block the point falls in is the label']],
  vote: [['window', 'Rule results of all frames in the last 0.3 s'], ['≥ 60%', 'Share of the window the new label must reach']],
  guess: [['P(state | label)', 'Starting probability of each state given the label'], ['P(cue | state)', 'If the cat were in this state, how often this cue appears'], ['∝', 'Proportional to. Afterwards divide the five numbers by their sum so they total 1'], ['Π', 'Product: each cue multiplies once']],
  check: [['z = 0', '"Usual". Setting a feature to 0 asks: if it had not deviated, would the conclusion still hold?']],
};
export const getSymbols = (l: Lang) => (l === 'en' ? SE : SZ);
