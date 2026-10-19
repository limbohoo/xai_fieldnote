/* The map of the whole chain, in the site's own XAI vocabulary: what kind of component each stage is,
   whether anything is learned and from what, black box or glass box, how it is explained, and where a judgement is made. */
export interface Bi { zh: string; en: string }
const B = (zh: string, en: string): Bi => ({ zh, en });

export type Kind = 'sup' | 'unsup' | 'algo' | 'rule' | 'prob' | 'eval';
export const KIND: Record<Kind, { color: string; name: Bi; short: Bi }> = {
  sup: { color: '#ff7a7a', name: B('监督学习（神经网络）', 'Supervised learning (neural network)'), short: B('监督学习', 'Supervised') },
  unsup: { color: '#b69cff', name: B('无标签的统计估计（无监督）', 'Label-free statistical estimation (unsupervised)'), short: B('无监督估计', 'Unsupervised') },
  algo: { color: '#4fd08c', name: B('确定性算法（信号处理 / 几何）', 'Deterministic algorithm (signal / geometry)'), short: B('算法', 'Algorithm') },
  rule: { color: '#ffb84d', name: B('手写规则（领域知识）', 'Hand-written rules (domain knowledge)'), short: B('规则', 'Rules') },
  prob: { color: '#6c9bff', name: B('概率模型（结构来自机器学习，参数手设）', 'Probabilistic model (ML structure, hand-set parameters)'), short: B('概率模型', 'Probabilistic') },
  eval: { color: '#e6ebf5', name: B('解释检验（XAI 评估）', 'Explanation test (XAI evaluation)'), short: B('解释检验', 'XAI test') },
};

export interface Gate { rule: Bi; why: Bi }
export interface StageXai {
  kind: Kind; box: 'black' | 'glass';
  problem: Bi;      // why this stage exists: the problem it solves
  point: Bi;        // the one thing to remember
  learned: Bi;      // what is learned, from what data (or that nothing is)
  object: Bi; scope: Bi; approach: Bi; access: Bi; method: Bi; // the site's taxonomy
  gates: Gate[];
}

export const XAI: Record<string, StageXai> = {
  detect: { kind: 'sup', box: 'black',
    problem: B('原始画面是 21 万个像素数，后面的计算需要先知道猫在哪里。', 'The raw frame is 218,000 pixel values; everything after needs to know where the cat is first.'),
    point: B('找猫是一个现成的神经网络，它本身不被解释；它的输出（一个框）人可以直接在画面上核对。', 'Finding the cat is an off-the-shelf neural network that is not itself explained; its output, a box, can be checked by eye on the frame.'),
    learned: B('监督学习：YOLOv8 在 COCO 上用人工画的框训练过，“猫”是其中一类。我们没有重训。', 'Supervised: YOLOv8 was trained on COCO with human-drawn boxes, "cat" being one class. We did not retrain it.'),
    object: B('单次预测（这一帧的框）', 'A single prediction (this frame\'s box)'), scope: B('局部', 'Local'), approach: B('不解释网络；输出本身可核对', 'The network is not explained; its output is checkable'), access: B('—', '—'), method: B('可视化输出（框）', 'Visualised output (the box)'),
    gates: [{ rule: B('类别 = 猫，取把握最高的一个；没有框 → 后面全部跳过，标签“看不清”', 'Class = cat, take the most confident; no box → everything after is skipped, label "cannot see"'), why: B('没有证据时不下判断', 'No judgement without evidence') }] },
  keypoints: { kind: 'sup', box: 'black',
    problem: B('像素和“耳朵、眼睛”之间隔着很远。需要一个人能读懂的中间表示。', 'Pixels are far from "ears" and "eyes". A representation people can read is needed in between.'),
    point: B('这是系统里唯一由我们训练的部分。网络是黑箱，但它的输出是 68 个有名字的点，后面所有判断都只用这些点，这就是“概念瓶颈”式的设计。', 'This is the only part we trained. The network is a black box, but its output is 68 named points and every later judgement uses only those points: a concept-bottleneck style design.'),
    learned: B('监督学习：脸 48 点用 CatFLW（1872 张训练，人工标注坐标）；身体 20 点先在 Animal Pose 五种动物上预训练，再用猫微调（迁移学习）。MobileNetV3-large + FPN，热力图 + soft-argmax，损失 = L1 + KL。', 'Supervised: face 48 points on CatFLW (1872 training images with hand-labelled coordinates); body 20 points pretrained on five species from Animal Pose, then fine-tuned on cats (transfer learning). MobileNetV3-large + FPN, heatmap + soft-argmax, loss = L1 + KL.'),
    object: B('模型的中间表示', 'The model\'s intermediate representation'), scope: B('局部（每一帧）', 'Local (per frame)'), approach: B('内在：输出就是可读概念；事后：遮挡测试', 'Intrinsic: the output is a readable concept; post-hoc: occlusion test'), access: B('遮挡测试是模型无关的', 'The occlusion test is model-agnostic'),
    method: B('概念瓶颈（Koh 2020）；遮挡扰动（Zeiler & Fergus 2014）只做了 1 张图、1 个点，只算健全性检查', 'Concept bottleneck (Koh 2020); occlusion (Zeiler & Fergus 2014) on 1 image and 1 point only, a sanity check'),
    gates: [{ rule: B('每个点把握 ≥ 0.25 才用；耳尖不够把握 → 这一帧不量耳朵', 'Use a point only if confidence ≥ 0.25; ear tips below that → no ear measurement this frame'), why: B('宁可缺失，不硬凑数字', 'Missing beats made-up') }] },
  smooth: { kind: 'algo', box: 'glass',
    problem: B('网络每帧的输出会抖，直接用会让后面的数字乱跳。', 'The network\'s output jitters frame to frame; used directly, every later number would jump.'),
    point: B('一个公式，没有学习。它按速度调节平滑程度。', 'One formula, no learning. It sets how much to smooth by speed.'),
    learned: B('不学习。3 个手调参数（f_min = 1.0，β = 0.05，d_cutoff = 1.0）。', 'Nothing learned. 3 hand-tuned parameters (f_min = 1.0, β = 0.05, d_cutoff = 1.0).'),
    object: B('数据（点的时间序列）', 'Data (point time series)'), scope: B('全局（同一公式）', 'Global (one formula)'), approach: B('内在：公式可逐行读', 'Intrinsic: readable line by line'), access: B('—', '—'), method: B('公式本身', 'The formula itself'),
    gates: [] },
  features: { kind: 'algo', box: 'glass',
    problem: B('68 个点太多、而且随猫的远近变化，需要几个有含义、不受远近影响的数。', '68 points are too many and change with distance; a few meaningful, distance-free numbers are needed.'),
    point: B('人工设计的特征：每个数都有名字和单位（两眼间距），这让后面的规则能被人读懂。', 'Hand-designed features: every number has a name and a unit (eye distance), which is what makes the later rules readable.'),
    learned: B('不学习。几何公式（特征工程），在相似变换下不变。', 'Nothing learned. Geometry (feature engineering), invariant under similarity transforms.'),
    object: B('输入特征', 'Input features'), scope: B('全局', 'Global'), approach: B('内在', 'Intrinsic'), access: B('—', '—'), method: B('有语义的特征 + 不变性证明', 'Semantic features + an invariance proof'),
    gates: [{ rule: B('侧脸（左右眼到鼻子的距离差 > 0.2）或俯仰比平时变化 > 30% → 暂停脸部数字', 'Side view (left/right eye-to-nose gap > 0.2) or pitch > 30% off usual → pause face numbers'), why: B('否则抬头会被当成耳朵压低', 'Otherwise looking up reads as ears back') }] },
  baseline: { kind: 'unsup', box: 'glass',
    problem: B('每只猫耳朵的高度本来就不同，同一个数对不同的猫含义不同。', 'Every cat holds its ears differently; the same number means different things for different cats.'),
    point: B('全系统唯一“无监督”的地方：不用任何标签，从这只猫自己的视频估计它的“平时”，再把偏离量当作异常程度（z 分数）。没有聚类或其他无监督学习。', 'The only "unsupervised" part: with no labels, estimate this cat\'s usual from its own video, then treat the deviation as an anomaly score (z). There is no clustering or other unsupervised learning.'),
    learned: B('无标签地估计 2 个参数（中位数 m、尺度 s），来自这只猫开头的一段视频；尺度下限是手设的测量误差。', 'Two parameters (median m, scale s) estimated without labels from the start of this cat\'s video; the scale floor is a hand-set measurement error.'),
    object: B('解释的参照点', 'The reference point of the explanation'), scope: B('每只猫各自', 'Per cat'), approach: B('内在', 'Intrinsic'), access: B('—', '—'), method: B('对比式参照：和“它自己的平时”比（Miller 2019）', 'Contrastive reference: compared with its own usual (Miller 2019)'),
    gates: [{ rule: B('尺度 s 不低于模型测量误差', 'Scale s never below the model\'s measurement error'), why: B('否则平静时 z 爆表，曾造成 40% 误报', 'Otherwise z explodes at rest; it once caused 40% false alarms') }] },
  rules: { kind: 'rule', box: 'glass',
    problem: B('需要从数字得到“看得见的行为”，而且每个结论都要能说出依据。', 'Numbers must become observable behaviour, and every conclusion must name its evidence.'),
    point: B('判断是一张决策表：5 个是 / 否问题，按顺序先中先赢。规则表本身就是全局解释；“哪几个条件为真”就是这一次的局部解释。', 'The judgement is a decision list: 5 yes/no questions, first match wins. The rule table is the global explanation; "which conditions held" is the local one.'),
    learned: B('不学习。8 个门槛按文献方向手设，只在一段约 35 秒的视频上调整过，没有标注检验。', 'Nothing learned. 8 thresholds hand-set from the direction of the literature, adjusted on one ~35 s video, not validated.'),
    object: B('判断过程', 'The decision process'), scope: B('全局（规则表）+ 局部（依据）', 'Global (rule table) + local (evidence)'), approach: B('内在：白箱规则', 'Intrinsic: glass-box rules'), access: B('模型特定（直接读规则）', 'Model-specific (read the rules directly)'), method: B('决策表 + 依据列表', 'Decision list + evidence list'),
    gates: [{ rule: B('进入：耳高 ≤ −1.5、耳转 ≥ 2 且耳高 ≤ −0.5、活动 ≥ 2、静止 ≤ −1', 'Enter: ear height ≤ −1.5, ear rotation ≥ 2 with ear height ≤ −0.5, activity ≥ 2, still ≤ −1'), why: B('只有最可靠的耳朵高度能单独触发', 'Only the most reliable feature may trigger alone') }, { rule: B('保持：门槛放宽到 1.0 / 1.5 / −0.5（滞回）', 'Stay: thresholds relax to 1.0 / 1.5 / −0.5 (hysteresis)'), why: B('防止在边界上闪烁', 'No flicker at the border') }] },
  vote: { kind: 'algo', box: 'glass',
    problem: B('规则每帧都给结果，单帧的偶然翻转会让显示乱跳。', 'The rules answer every frame; single-frame accidents would make the display jump.'),
    point: B('一个时间窗口里的多数投票，没有学习。代价是约 0.18 秒延迟。', 'A majority vote over a time window, nothing learned. The price is about 0.18 s of delay.'),
    learned: B('不学习。2 个手设参数（0.3 秒、60%）。', 'Nothing learned. 2 hand-set parameters (0.3 s, 60%).'),
    object: B('输出的时间稳定性', 'Temporal stability of the output'), scope: B('全局', 'Global'), approach: B('内在', 'Intrinsic'), access: B('—', '—'), method: B('窗口占比可视化', 'Window shares, visualised'),
    gates: [{ rule: B('新标签占最近 0.3 秒 ≥ 60%，且窗口 ≥ 0.15 秒，才换', 'Switch only if the new label holds ≥ 60% of the last 0.3 s, window ≥ 0.15 s'), why: B('两个标签不可能同时过 60%，不会平票', 'Two labels cannot both pass 60%, so no ties') }] },
  guess: { kind: 'prob', box: 'glass',
    problem: B('同一个动作可能有几种含义（耳朵压低可能是紧张，也可能是专注听），要看猫接下来做了什么。', 'One action can mean several things (ears back can be tension or attentive listening); what the cat does next decides.'),
    point: B('结构是机器学习里的朴素贝叶斯，但 55 个参数是手设的，没有训练。每条线索的贡献可以精确相加，所以解释不需要近似。', 'The structure is naive Bayes from machine learning, but its 55 parameters are hand-set, not trained. Each cue\'s contribution adds up exactly, so the explanation needs no approximation.'),
    learned: B('目前不学习。有监督的更新方法 learn() 已写好（Dirichlet / Beta 计数，手设值算 10 条虚拟标注），但已填写的标注是 0 条。', 'Nothing learned yet. A supervised update, learn(), is written (Dirichlet / Beta counts, hand-set values worth 10 virtual labels), but 0 labels have been filled in.'),
    object: B('单次推测', 'A single guess'), scope: B('局部（证据量）+ 全局（两张表）', 'Local (evidence) + global (two tables)'), approach: B('内在：可加的证据', 'Intrinsic: additive evidence'), access: B('模型特定', 'Model-specific'), method: B('对数似然比分解：精确，不是 SHAP 那样的近似分配', 'Log-likelihood-ratio decomposition: exact, not an approximate attribution like SHAP'),
    gates: [{ rule: B('把握：p₁ ≥ 0.6 且领先 0.3 → 高；p₁ ≥ 0.45 且领先 0.15 → 中；否则不说', 'Confidence: p₁ ≥ 0.6 and 0.3 ahead → high; p₁ ≥ 0.45 and 0.15 ahead → medium; otherwise say nothing'), why: B('把握不够就沉默', 'Silent when unsure') }, { rule: B('脸可见 < 0.3：来自脸部的标签降为“低”', 'Face visible < 0.3: face-based labels drop to "low"'), why: B('看不清就不靠脸下结论', 'No face, no face-based claim') }] },
  check: { kind: 'eval', box: 'glass',
    problem: B('解释可能“听起来对”但不是真正的原因，需要能检验。', 'An explanation can sound right without being the real cause; it must be testable.'),
    point: B('用反事实检验解释是否忠实：拿掉写出的理由，结论应该变；拿掉没写的，结论应该不变。这检验的是“忠实于规则”，不是“对猫判断正确”。', 'A counterfactual test of faithfulness: remove the cited reasons and the conclusion should change; remove the uncited ones and it should not. It tests faithfulness to the rules, not correctness about the cat.'),
    learned: B('不学习。直接调用第 06、08 步。', 'Nothing learned. It calls steps 06 and 08 directly.'),
    object: B('解释本身', 'The explanation itself'), scope: B('局部（每个事件）', 'Local (per event)'), approach: B('事后检验', 'Post-hoc test'), access: B('模型特定（重跑规则）', 'Model-specific (rerun the rules)'), method: B('反事实干预（Wachter 2017）；评估层次见 Doshi-Velez & Kim 2017', 'Counterfactual intervention (Wachter 2017); evaluation levels per Doshi-Velez & Kim 2017'),
    gates: [{ rule: B('四项全部通过才算忠实', 'All four checks must pass to be faithful'), why: B('任何一项不过，卡片上的依据就不能信', 'If any fails, the card\'s evidence cannot be trusted') }] },
};

/* the whole chain as an argument: one sentence per link */
export const LOGIC: Bi[] = [
  B('1. 系统看不到情绪，只能看到身体。所以先把画面变成人能读的东西：一个框、68 个有名字的点（这一段用了监督学习，是黑箱）。', '1. The system cannot see emotion, only the body. So first the frame becomes something readable: a box and 68 named points (supervised learning, a black box).'),
  B('2. 再把点变成几个有名字、有单位的数，和这只猫自己的平时比（几何算法 + 无标签的统计估计，白箱）。', '2. The points become a few named numbers with units, compared with this cat\'s own usual (geometry + label-free estimation, glass box).'),
  B('3. 用手写规则把偏离量判成“看得见的行为”，每个结论都带依据（规则，白箱）。', '3. Hand-written rules turn the deviations into observable behaviour, each conclusion with its evidence (rules, glass box).'),
  B('4. 行为不等于情绪：再看猫接下来做了什么，用朴素贝叶斯给出带把握的推测，不够就不说（概率模型，参数手设）。', '4. Behaviour is not emotion: what the cat does next updates a naive-Bayes guess with a confidence band, silent when unsure (probabilistic model, hand-set parameters).'),
  B('5. 最后用反事实检验每条解释是否说出了真正的依据（XAI 评估）。', '5. Finally a counterfactual test checks that every explanation names the real evidence (XAI evaluation).'),
];
export const UNSUP_NOTE: Bi = B('无监督学习：只在第 05 步用了最简单的形式（无标签估计“平时”）。没有用聚类、降维或行为自动发现。可以做的方向是用 B-SOiD 或 Keypoint-MoSeq 从关键点里自动发现行为（未做）。Colab 5.4–5.9 在合成数据上比较过几种分类器，因为没有情绪标签，没有部署。',
  'Unsupervised learning: only in step 05, in its simplest form (estimating "usual" without labels). No clustering, dimensionality reduction or behaviour discovery is used. A possible direction is discovering behaviours from keypoints with B-SOiD or Keypoint-MoSeq (not done). Colab 5.4–5.9 compared several classifiers on synthetic data; with no emotion labels, none was deployed.');
