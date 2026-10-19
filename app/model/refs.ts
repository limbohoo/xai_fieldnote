/* Sources behind each stage and the starting numbers. Entries come from the project's own reference list (Colab section 11);
   `verify` marks the ones that list itself flags as "assembled from memory, check volume/pages/DOI before citing". */
export interface Bi { zh: string; en: string }
export interface Ref { cite: string; url?: string; verify?: boolean; use: Bi }
const B = (zh: string, en: string): Bi => ({ zh, en });

export const REFS: Record<string, Ref> = {
  yolo: { cite: 'Jocher, G., Chaurasia, A., & Qiu, J. (2023). Ultralytics YOLOv8.', url: 'https://github.com/ultralytics/ultralytics', use: B('现成的找物体模型，我们没有重训。', 'The off-the-shelf detector; we did not retrain it.') },
  coco: { cite: 'Lin, T.-Y., et al. (2014). Microsoft COCO: Common objects in context. ECCV.', url: 'https://arxiv.org/abs/1405.0312', use: B('YOLOv8 预训练用的数据集，“猫”是其中一个类别。', 'The dataset YOLOv8 is pretrained on; "cat" is one of its classes.') },
  mnv3: { cite: 'Howard, A., et al. (2019). Searching for MobileNetV3. ICCV.', url: 'https://arxiv.org/abs/1905.02244', use: B('关键点网络的骨干（MobileNetV3-large）。', 'The backbone of the keypoint networks (MobileNetV3-large).') },
  fpn: { cite: 'Lin, T.-Y., et al. (2017). Feature pyramid networks for object detection. CVPR.', url: 'https://arxiv.org/abs/1612.03144', use: B('骨干后面接的特征金字塔（FPN）。', 'The feature pyramid (FPN) attached to the backbone.') },
  integral: { cite: 'Sun, X., Xiao, B., Wei, F., Liang, S., & Wei, Y. (2018). Integral human pose regression. ECCV.', url: 'https://arxiv.org/abs/1711.08229', use: B('“对热力图取期望得到坐标”（soft-argmax）以及它可求导的做法。', 'Taking the expectation of a heatmap as the coordinate (soft-argmax) and why it is differentiable.') },
  nibali: { cite: 'Nibali, A., He, Z., Morgan, S., & Prendergast, L. (2018). Numerical coordinate regression with convolutional neural networks. arXiv:1801.07372.', url: 'https://arxiv.org/abs/1801.07372', use: B('用可导的方式从热力图回归坐标，并配合热力图分布的正则项。', 'Differentiable coordinate regression from heatmaps, with a regulariser on the heatmap distribution.') },
  catflw: { cite: 'Martvel, G., Farhat, N., Shimshoni, I., & Zamansky, A. (2023). CatFLW: Cat facial landmarks in the wild dataset. arXiv:2305.04232.', url: 'https://arxiv.org/abs/2305.04232', use: B('脸部 48 点网络的训练数据：2079 张猫脸（1872 训练 / 207 验证）。', 'Training data for the 48-point face network: 2079 cat faces (1872 train / 207 validation).') },
  animalpose: { cite: 'Cao, J., Tang, H., Fang, H.-S., Shen, X., Lu, C., & Tai, Y.-W. (2019). Cross-domain adaptation for animal pose estimation. ICCV, 9498–9507.', use: B('身体 20 点网络的训练数据：先用五种动物预训练，再用猫微调。', 'Training data for the 20-point body network: pretrained on five species, then fine-tuned on cats.') },
  finka: { cite: 'Finka, L. R., et al. (2019). Geometric morphometrics for the study of facial expressions in non-human animals, using the domestic cat as an exemplar. Scientific Reports, 9, 9883.', use: B('48 个脸部点的方案，与猫的面部肌肉对应。', 'The 48-landmark scheme, tied to the cat\'s facial muscles.') },
  casiez: { cite: 'Casiez, G., Roussel, N., & Vogel, D. (2012). 1€ filter: A simple speed-based low-pass filter for noisy input in interactive systems. CHI.', url: 'https://doi.org/10.1145/2207676.2208639', use: B('One-Euro 滤波的原始论文。', 'The original One-Euro filter paper.') },
  fgs: { cite: 'Evangelista, M. C., et al. (2019). Facial expressions of pain in cats: The development and validation of a Feline Grimace Scale. Scientific Reports, 9, 19128.', url: 'https://doi.org/10.1038/s41598-019-55693-8', use: B('耳朵位置是猫面部表情量表里的一个动作单元。要注意它验证的是疼痛，不是一般的情绪。', 'Ear position is one action unit of the Feline Grimace Scale. Note it was validated for pain, not for emotion in general.') },
  bennett: { cite: 'Bennett, V., Gourkow, N., & Mills, D. S. (2017). Facial correlates of emotional behaviour in the domestic cat (Felis catus). Behavioural Processes, 141, 342–350.', url: 'https://doi.org/10.1016/j.beproc.2017.03.011', use: B('提醒：和恐惧、挫败最相关的面部动作主要是眨眼、嘴部动作和头部转向，而不是耳朵，这些我们没有测。', 'A caution: the facial actions most related to fear and frustration are blinking, mouth movements and head turning, not the ears; we do not measure those.') },
  catsprot: { cite: 'Cats Protection. (n.d.). Cat body language.', url: 'https://www.cats.org.uk/help-and-advice/cat-behaviour/cat-body-language', use: B('面向主人的科普，没有引用研究，只作措辞和方向参考，不是证据。', 'An owner-facing guide that cites no studies; used only for wording and direction, not as evidence.') },
  humphrey: { cite: 'Humphrey, T., Proops, L., Forman, J., Spooner, R., & McComb, K. (2020). The role of cat eye narrowing movements in cat–human communication. Scientific Reports, 10, 16503.', verify: true, use: B('眼睛眯起、慢眨眼与放松、友好相关。', 'Eye narrowing and slow blinks relate to relaxed, friendly states.') },
  leyhausen: { cite: 'Leyhausen, P. (1979). Cat behavior: The predatory and social behavior of domestic and wild cats. Garland STPM Press.', use: B('猫的捕猎序列：定位、潜伏、追逐、扑击……', 'The cat\'s predatory sequence: orient, stalk, chase, pounce…') },
  hall98: { cite: 'Hall, S. L., & Bradshaw, J. W. S. (1998). The influence of hunger on object play by adult domestic cats. Applied Animal Behaviour Science, 58, 143–150.', verify: true, use: B('物体玩耍在结构上与捕猎相同。', 'Object play has the same structure as predation.') },
  leys: { cite: 'Leys, C., Ley, C., Klein, O., Bernard, P., & Licata, L. (2013). Detecting outliers: Do not use standard deviation around the mean, use absolute deviation around the median. Journal of Experimental Social Psychology, 49(4), 764–766.', url: 'https://doi.org/10.1016/j.jesp.2013.03.013', verify: true, use: B('为什么用中位数和 MAD，而不是均值和标准差。', 'Why use the median and MAD instead of the mean and standard deviation.') },
  rousseeuw: { cite: 'Rousseeuw, P. J., & Croux, C. (1993). Alternatives to the median absolute deviation. Journal of the American Statistical Association, 88(424), 1273–1283.', verify: true, use: B('MAD 乘 1.4826 等于正态下的标准差。', 'MAD × 1.4826 equals the standard deviation under normality.') },
  koh: { cite: 'Koh, P. W., et al. (2020). Concept bottleneck models. ICML.', url: 'https://proceedings.mlr.press/v119/koh20a.html', use: B('“先得到人能读懂的中间量，再由它得出结论”的结构。', 'The structure "first an intermediate quantity people can read, then the conclusion from it".') },
  miller: { cite: 'Miller, T. (2019). Explanation in artificial intelligence: Insights from the social sciences. Artificial Intelligence, 267, 1–38.', url: 'https://doi.org/10.1016/j.artint.2018.07.007', use: B('人们期待“为什么是这个，而不是那个”的对比式解释。', 'People expect contrastive explanations: why this and not that.') },
  wachter: { cite: 'Wachter, S., Mittelstadt, B., & Russell, C. (2017). Counterfactual explanations without opening the black box. Harvard Journal of Law & Technology, 31(2).', use: B('反事实解释：改变输入，看结论怎么变。', 'Counterfactual explanation: change the input and see how the conclusion changes.') },
  doshi: { cite: 'Doshi-Velez, F., & Kim, B. (2017). Towards a rigorous science of interpretable machine learning. arXiv:1702.08608.', url: 'https://arxiv.org/abs/1702.08608', use: B('评估解释的框架：先判断对不对，再判断解释忠不忠实，再判断人看没看懂。', 'The evaluation framework: is it right, is the explanation faithful, do people understand it.') },
  domingos: { cite: 'Domingos, P., & Pazzani, M. (1997). On the optimality of the simple Bayesian classifier under zero-one loss. Machine Learning, 29, 103–130.', verify: true, use: B('朴素贝叶斯：排序可以很好，但概率本身往往不准、偏自信。', 'Naive Bayes: the ranking can be good while the probabilities themselves are often inaccurate and over-confident.') },
  cohen: { cite: 'Cohen, J. (1960). A coefficient of agreement for nominal scales. Educational and Psychological Measurement, 20(1), 37–46.', use: B('两个标注者的一致性（κ）。', 'Agreement between two annotators (κ).') },
  docs: { cite: 'Project docs: ml/share/docs/反应识别与事件报告.md; Colab CatPose_XAI_Tutorial §5.10–5.12; code ml/catpose/{reactions,interpret,smoothing}.py.', use: B('本页数字和规则的出处：门槛、概率、窗口都能在这些文件里逐行找到。', 'Where this page\'s numbers and rules come from: thresholds, probabilities and windows can be found line by line in these files.') },
};

/* per stage: which sources stand behind it */
export const STAGE_REFS: Record<string, string[]> = {
  detect: ['yolo', 'coco'],
  keypoints: ['mnv3', 'fpn', 'integral', 'nibali', 'catflw', 'animalpose', 'finka'],
  smooth: ['casiez'],
  features: ['finka', 'fgs'],
  baseline: ['leys', 'rousseeuw'],
  rules: ['fgs', 'bennett', 'catsprot', 'humphrey', 'docs'],
  vote: ['docs'],
  guess: ['fgs', 'bennett', 'leyhausen', 'hall98', 'humphrey', 'catsprot', 'koh', 'domingos', 'cohen', 'docs'],
  check: ['wachter', 'miller', 'doshi', 'cohen', 'koh'],
};

/* nodes that need their own "why this number" */
export const NODE_WHY: Record<string, { why: Bi; refs: string[]; limit: Bi }> = {
  'guess.prior': {
    why: B('起始概率回答的是：只知道标签、还没看后续行为时，这个行为更常对应哪种状态。大小关系是我们读文献方向定的：耳朵压低时，耳朵位置是猫面部表情量表里的动作单元，所以“紧张”最高（0.40）；但同一个动作也出现在“专注地听”时，所以专注给 0.30，不让紧张独占。突然不动既可能是害怕，也可能是捕猎序列里的潜伏，所以紧张 0.45、想玩 0.20。注意到了（耳朵竖高）更像警惕 / 好奇（0.50）。动起来了则以想玩（0.40）和好奇（0.30）为主。',
      'The starting odds answer: knowing only the label, before seeing any later behaviour, which state does this behaviour more often go with. The ordering is our reading of the direction of the literature: for "ears back", ear position is an action unit of the Feline Grimace Scale, so "tense" is highest (0.40); but the same action also appears when listening attentively, so attentive gets 0.30 and tense does not take it all. Freezing can be fear or the stalking phase of the predatory sequence, so tense 0.45 and playful 0.20. "Noticed" (ears up) is more wary / curious (0.50). "Moving" is mostly playful (0.40) and curious (0.30).'),
    refs: ['fgs', 'leyhausen', 'bennett', 'catsprot', 'docs'],
    limit: B('文献只给出方向，没有给出这些具体数值；“耳朵压低 → 紧张 0.40”是我们的估计，不是论文里的结果。Bennett 等（2017）还提醒，与恐惧最相关的是眨眼、嘴部和头部转向，所以耳朵这条线索本身就偏弱。这 20 个数没有被标注检验过。', 'The literature gives a direction, not these exact numbers; "ears back → tense 0.40" is our estimate, not a result from a paper. Bennett et al. (2017) also warn that the actions most related to fear are blinking, mouth and head turning, so the ear cue is weak to begin with. None of these 20 numbers has been checked against annotation.'),
  },
  'guess.lik': {
    why: B('每条线索一行：猫处在某种状态时，这条线索出现的可能。大小关系的依据：紧张的猫更常随后躲开或跑开（0.60 / 0.55，放松时只有 0.05 / 0.02）；扑玩在想玩时最高（0.70），因为物体玩耍与捕猎的结构相同；放松时更常很快平静下来（0.60）。',
      'One row per cue: how likely the cue appears when the cat is in each state. The ordering: tense cats more often move or run away afterwards (0.60 / 0.55 against 0.05 / 0.02 when relaxed); pouncing is highest when playful (0.70), since object play has the structure of predation; relaxed cats more often settle quickly (0.60).'),
    refs: ['leyhausen', 'hall98', 'humphrey', 'docs'],
    limit: B('只有“扑玩 ↔ 想玩”有文献直接支持（捕猎序列、物体玩耍）。“躲开 ↔ 紧张”“平静 ↔ 放松”是常识性假设，我们没有找到给出这些数值的研究。“之前小车刚有动作”是项目自己的实验设置，没有任何文献。', 'Only "pounce ↔ playful" is directly supported (predatory sequence, object play). "Moves away ↔ tense" and "settles ↔ relaxed" are common-sense assumptions; we found no study giving these numbers. "Robot moved just before" is the project\'s own experimental set-up and has no literature.'),
  },
  'rules.conds': {
    why: B('门槛按“比这只猫自己的平时偏了几个正常抖动”来定：耳朵高度最可靠，取 1.5；其余特征更嘈杂，取 2.0；静止取 −1。耳朵位置作为信号来自猫面部表情量表的耳朵动作单元。',
      'Thresholds are set as "how many normal wobbles from this cat\'s own usual": ear height is the most reliable, so 1.5; the other features are noisier, so 2.0; still is −1. Ear position as a signal comes from the ear action unit of the Feline Grimace Scale.'),
    refs: ['fgs', 'catsprot', 'bennett', 'docs'],
    limit: B('具体数值（1.5、2.0、−1）是猜测，只在一段约 35 秒的视频上调整过。', 'The exact values (1.5, 2.0, −1) are guesses, tuned on one video of about 35 s.'),
  },
};
