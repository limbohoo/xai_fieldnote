/* Bilingual content for the reading chapters. Chinese is the original; English follows the same meaning. */
export type Bi = { zh: string; en: string };
const B = (zh: string, en: string): Bi => ({ zh, en });

export interface Method {
  id: string;
  name: Bi;
  en: string;
  question: Bi;
  principle: Bi;
  example: Bi;
  output: Bi;
  design: Bi;
  scope: Bi;
  read: Bi;
  refs: number[];
}

export const METHODS: Method[] = [
  {
    id: 'intrinsic',
    name: B('内在可解释', 'Interpretable models'),
    en: 'Interpretable models',
    question: B('能不能直接读懂决策规则？', 'Can the decision rule be read directly?'),
    principle: B(
      '比如一棵小决策树：先看温度，再看负载，最后决定降速。因为它的判断过程本身就是人能看懂的规则，所以不需要额外的“解释工具”。简单的公式、小树图，都属于这一类。',
      'For example, a small decision tree: check temperature, then load, then decide to slow down. Its decision process is itself a rule people can read, so no extra “explanation tool” is needed. Simple formulas and small tree diagrams belong to this kind.',
    ),
    example: B(
      'Rudin 建议：在人命关天或需要清晰理由的场景里，先试试这种原本就简单的模型，别一上来就整复杂的黑盒模型。',
      'Rudin argues that where lives are at stake or clear reasons are needed, try a model that is simple to begin with, rather than reaching for a complex black box.',
    ),
    output: B('输入条件 → 可检查的规则 → 预测结果', 'Input conditions → checkable rules → prediction'),
    design: B(
      '界面上，直接把模型的判断条件展示出来，比如亮起红灯并显示“温度>80度，触发降速”。所见即所得。',
      'In the interface, show the decision conditions directly, e.g. a red light with “temperature > 80 °C triggers slow-down”. What you see is what the model used.',
    ),
    scope: B('简单是最大的优势；但如果规则写了几百条或者全是生僻专业词，普通人依然看不懂。', 'Simplicity is the main advantage; but if the rules run to hundreds of lines or use obscure jargon, ordinary people still cannot follow them.'),
    read: B('从 Rudin 的论点入手，再回 Ali 的分类看内在解释与事后解释的位置。', 'Start from Rudin’s argument, then return to Ali’s classification to see where intrinsic and post-hoc explanations sit.'),
    refs: [16, 1],
  },
  {
    id: 'treeinterpreter',
    name: B('树路径分解', 'Tree path decomposition'),
    en: 'TreeInterpreter',
    question: B('沿着这棵树，预测值是怎样一步步变出来的？', 'Following the tree, how is the prediction built step by step?'),
    principle: B(
      '如果把 AI 预测比作算账，它能帮你查明“每一笔钱是怎么加减的”。它跟着树模型的决策过程一步步走，把最终结果拆解成每一个特征（比如温度、时间）分别贡献了多少分。',
      'If an AI prediction is like a ledger, this tells you how each entry was added or subtracted. It follows the tree model’s decisions step by step and splits the final result into how much each feature (say temperature or time) contributed.',
    ),
    example: B(
      '打个比方：基础分 20，因为“温度高”加了 12 分，因为“负载低”减了 5 分，最后得分 27。这就叫路径分解。',
      'For instance: a base of 20, plus 12 because “temperature is high”, minus 5 because “load is low”, giving 27. This is path decomposition.',
    ),
    output: B('预测 Prediction = 基准 Bias + 各特征的加减分 Contributions', 'Prediction = bias (baseline) + each feature’s contribution'),
    design: B(
      '界面上可以画一个加减分的瀑布图。让用户清楚看到，是哪个因素把预测值推高了，哪个因素把它拉低了。',
      'The interface can draw a waterfall chart of additions and subtractions, so users see which factor pushed the prediction up and which pulled it down.',
    ),
    scope: B(
      '它专门针对带“树”的模型（比如随机森林）有效。算出来的只是“分数的拆解”，不能完全等同于现实中的因果关系。',
      'It applies to tree-based models (such as random forests). What it computes is a decomposition of the score, not a full account of real-world causes.',
    ),
    read: B('先读作者的节点分解示例，再看仓库 predict 的返回值 prediction / bias / contributions。', 'First read the author’s node-decomposition example, then look at what the repository’s predict returns: prediction / bias / contributions.'),
    refs: [22, 23],
  },
  {
    id: 'shap',
    name: B('特征归因', 'Feature attribution'),
    en: 'SHAP / TreeSHAP',
    question: B('这次的结果，是谁在推高，谁在拉低？', 'For this result, which features push it up and which pull it down?'),
    principle: B(
      'SHAP 就像是给团队发奖金。它通过计算每个特征在各种组合下的“边际贡献”，算出一个绝对公平的得分，告诉你谁是导致这个预测结果的最大功臣，谁在帮倒忙。',
      'SHAP is like sharing a bonus among a team. It computes each feature’s marginal contribution across all combinations, yielding a fair score that shows which features drove the prediction and which worked against it.',
    ),
    example: B(
      '看单个人，它告诉你“为什么拒绝他的贷款（因为收入太低）”；看所有人，它能画出一张大图，告诉你“总体来看，收入和年龄是如何影响贷款通过率的”。',
      'For one person, it tells you why a loan was refused (income too low). Across everyone, it draws a bigger picture of how income and age affect loan approval overall.',
    ),
    output: B('参考基准 Baseline + 各特征的 SHAP 贡献值 → 模型最终输出', 'Baseline + each feature’s SHAP value → the model’s output'),
    design: B(
      '界面上常表现为红蓝条形图或力导向图。红色向右推高结果，蓝色向左拉低结果。设计时要提醒用户：长条代表的是“影响力”大小，而不是原始数据的大小。',
      'Interfaces often show red–blue bar charts or force plots: red pushes the result up, blue pulls it down. Remind users that a long bar means influence on the model, not the size of the raw data.',
    ),
    scope: B(
      '它能算出一个极其精确的“重要度”，但这依赖于你设定的对比基准。把它当成 AI 在利用哪些信息的线索，而不是真实的因果定律。',
      'It yields a precise “importance”, but that depends on the reference baseline you choose. Read it as a clue to which information the AI uses, not as a causal law.',
    ),
    read: B('2017 年论文建立共同框架；2020 年树模型论文展示如何从局部解释走向整体理解。', 'The 2017 paper sets the shared framework; the 2020 tree-model paper shows how to move from local explanations to global understanding.'),
    refs: [6, 26],
  },
  {
    id: 'lime',
    name: B('局部代理', 'Local surrogate'),
    en: 'LIME',
    question: B('如果不明白整个黑盒，能不能只解释这一个具体案例？', 'If the whole black box is unclear, can we explain just this one case?'),
    principle: B(
      '黑盒模型太复杂看不懂？LIME 的做法是：就在当前这个数据附近，稍微改改数据（比如遮住图片的某一块，或删掉句子的几个词），看看黑盒的反应。然后用一个超简单的模型来模仿黑盒在这个局部的行为。',
      'Too complex to read? LIME perturbs the data right around the current case (masking part of an image, or deleting a few words of a sentence), watches how the black box responds, and fits a very simple model that imitates the black box locally.',
    ),
    example: B(
      '比如前文“狼和哈士奇”的实验里，通过不断遮挡图片的不同部分，LIME 发现只要遮住背景的“雪”，模型就不认识狼了。这就暴露了模型其实是在看背景。',
      'In the “wolf or husky” experiment, masking different parts of the image revealed that hiding the background snow made the model stop recognising the wolf. The model was looking at the background.',
    ),
    output: B('改动数据测试黑盒反应 → 拟合一个简单模型 → 给出这一个案例的解释', 'Perturb the data, observe the black box → fit a simple model → explain this one case'),
    design: B(
      '如果是处理文章，界面上可以高亮出几个决定性的关键词；如果是处理图片，可以圈出决定性的几块区域。它专门用来给“单次”决策抓重点。',
      'For text, highlight a few decisive words; for images, circle the decisive regions. It is designed to pick out what mattered for a single decision.',
    ),
    scope: B(
      '因为它只是在这个案例“附近”做模仿，所以解释不一定对远处的案例适用。重点在于你怎么定义“附近”的范围。',
      'Because it imitates the model only “near” this case, the explanation may not hold for distant cases. What matters is how you define “near”.',
    ),
    read: B('先看论文图 1 理解操作，再读 §6.4 与表 2 的用户实验。', 'Read Figure 1 to understand the procedure, then the user study in §6.4 and Table 2.'),
    refs: [7],
  },
  {
    id: 'visual',
    name: B('视觉归因', 'Visual attribution'),
    en: 'Grad-CAM',
    question: B('AI 在做判断时，眼睛究竟盯在图片的哪里？', 'Where in the picture is the AI looking when it decides?'),
    principle: B(
      '专门针对看图的 AI。它通过追踪 AI 神经网络里倒数几层的“注意力”，画出一张热力图。它保留了图片的空间位置，让你直接看到 AI 的重点和原图的对应关系。',
      'Designed for AI that looks at images. It traces the “attention” in the last few layers of the network and draws a heatmap. It keeps the spatial layout, so you can see directly where the AI focuses on the original picture.',
    ),
    example: B(
      '如果 AI 把猫认成了狗，你可以看看它的热力图。如果热力图最红的地方在背景的草地上，你就知道它根本没在看动物，而是瞎猜的。',
      'If the AI mistakes a cat for a dog, check its heatmap. If the reddest area is on the background grass, it was not looking at the animal at all.',
    ),
    output: B('设定你想了解的类别 → 追踪神经网络激活程度 → 在原图上叠加热力图', 'Pick the class → trace the network’s activations → overlay a heatmap on the image'),
    design: B(
      '界面上通常就是一张盖在原图上的热力图。一定要加个开关让用户能随时关掉它看原图，并且告诉用户：越红代表 AI 越关注这个区域，不代表它越肯定。',
      'The interface usually shows a heatmap over the image. Always add a switch to hide it and see the original, and tell users: redder means the AI attends more to that area, not that it is more certain.',
    ),
    scope: B(
      '热力图看着很酷，但有时很有欺骗性（就像人盯着题看也不代表懂了）。需要通过随机化检查等方式，确认它真的反映了模型的判断，而不仅仅是个边缘检测器。',
      'Heatmaps look convincing but can mislead (staring at a problem does not mean understanding it). Randomisation checks can confirm that the map reflects the model’s decision and not just an edge detector.',
    ),
    read: B('Grad-CAM 读图像定位方式；Sanity Checks 接着读“怎样知道热图值得看”。', 'Grad-CAM for how image localisation works; then Sanity Checks for how to tell whether a heatmap is worth trusting.'),
    refs: [21, 15],
  },
  {
    id: 'counterfactual',
    name: B('反事实解释', 'Counterfactual explanation'),
    en: 'Counterfactual / DiCE',
    question: B('我需要改变什么，才能让 AI 给我通过？', 'What would I need to change for the AI to approve me?'),
    principle: B(
      '它不告诉你“为什么现在不行”，而是告诉你“怎样做就行了”。它会去寻找那些稍微改变一点条件，就能扭转 AI 判定的虚拟案例，并展示给你。',
      'It does not tell you why it is not possible now; it tells you what would make it possible. It searches for hypothetical cases where a small change in conditions flips the AI’s decision, and shows them to you.',
    ),
    example: B(
      '比如你申请信用卡被 AI 拒绝了。它不会给你一堆复杂的归因数值，而是直接说：“如果你把月收入提高 2000 块，或者把现有的债务还清 5000 块，我就能给你批卡。”',
      'Say a credit-card application was refused. Instead of a pile of attribution numbers, it says: “If your monthly income rose by 2,000, or you cleared 5,000 of existing debt, I would approve the card.”',
    ),
    output: B('当前被拒案例 → 生成几个扭转结果的替代方案 → 给到目标建议', 'Refused case → several alternatives that flip the outcome → suggested targets'),
    design: B(
      '非常适合做成“建议面板”或“What-if 模拟器”。给用户提供几个可行的操作选项，让他们自己选觉得哪条改变路径最容易做到。给出的解释充满了行动力。',
      'Well suited to a suggestion panel or a “what-if” simulator. Offer a few feasible options and let users pick the path that seems easiest. The explanation becomes actionable.',
    ),
    scope: B(
      '方案必须是真实可操作的。如果 AI 告诉你“只要把年龄减少 10 岁就能批卡”，这在数学上成立，但在现实里毫无用处。',
      'The options must be actually achievable. If the AI says “reduce your age by 10 years and you are approved”, that holds mathematically and is useless in practice.',
    ),
    read: B('DiCE 关注如何生成“多个彼此不同”且“可操作”的方案。', 'DiCE focuses on generating several diverse and actionable alternatives.'),
    refs: [8],
  },
];

export interface Step {
  tag: 'ctx' | 'model' | 'design' | 'test';
  title: Bi;
  en: string;
  body: Bi;
  result: Bi;
  refs: number[];
}

export const TAG_NAME: Record<Step['tag'], Bi> = {
  ctx: B('情境与需求', 'Context & needs'),
  model: B('模型与算法', 'Model & algorithm'),
  design: B('设计与表达', 'Design & expression'),
  test: B('测试与验证', 'Testing & validation'),
};

export const STEPS: Step[] = [
  {
    tag: 'ctx', title: B('定义应用场景', 'Define the application context'), en: 'Application context',
    body: B('把场景写成一段会发生的事情：谁正在做什么，AI 在哪一步参与，出错后会怎样。医疗、教育或机器人只是领域名称，还可以继续落到一个具体任务。', 'Write the context as a sequence of events: who is doing what, at which step the AI takes part, and what happens when it goes wrong. Medicine, education or robotics are only domain names; go on to a concrete task.'),
    result: B('留下：一段使用情境与关键时刻。', 'Leave behind: one usage scenario and its key moments.'), refs: [3, 4],
  },
  {
    tag: 'ctx', title: B('识别目标用户', 'Identify the target users'), en: 'People & stakeholders',
    body: B('把开发者、操作者、领域专家和受影响的人分开。工程师可能要查信号；普通使用者可能只想知道此刻是否该采纳建议。', 'Separate developers, operators, domain experts and the people affected. Engineers may need to check signals; ordinary users may only want to know whether to act on advice right now.'),
    result: B('留下：不同角色各自要完成的判断。', 'Leave behind: the judgement each role has to make.'), refs: [2, 3],
  },
  {
    tag: 'ctx', title: B('发现解释需求', 'Discover explanation needs'), en: 'Explanation needs',
    body: B('从观察、访谈和失败时刻收集原话：“为什么停了？”“为什么不是另一个选项？”“我改哪里有用？”将问题与任务连起来。', 'Collect people’s own words from observation, interviews and moments of failure: “Why did it stop?” “Why not the other option?” “What should I change?” Tie the questions to the task.'),
    result: B('留下：优先回答的用户问题。', 'Leave behind: the user questions to answer first.'), refs: [3],
  },
  {
    tag: 'ctx', title: B('定义解释对象', 'Define the explanation target'), en: 'Explanation target',
    body: B('确定这次解释的是数据、单次预测、整体模型，还是机器人目标和行动计划。对象清楚后，才知道该找什么证据。', 'Decide whether this explanation is about the data, a single prediction, the whole model, or a robot’s goal and plan. Once the target is clear, you know what evidence to look for.'),
    result: B('留下：一句“解释什么”的定义。', 'Leave behind: one sentence defining what is being explained.'), refs: [1, 4, 11],
  },
  {
    tag: 'model', title: B('判断数据与模型类型', 'Determine the data and model type'), en: 'Data & model',
    body: B('分两层记录：输入是表格、图像、文本、时序还是动作数据？模型是规则、树模型还是深度网络？同时记下能否访问参数、梯度或只能查询输出。', 'Record two layers: is the input tabular, image, text, time series or action data? Is the model rules, a tree model or a deep network? Also note whether you can access parameters and gradients, or can only query outputs.'),
    result: B('留下：数据、模型、访问条件的小档案。', 'Leave behind: a short profile of the data, the model and the access conditions.'), refs: [4, 22],
  },
  {
    tag: 'model', title: B('选择 XAI 方法', 'Choose an XAI method'), en: 'Method selection',
    body: B('用当前问题缩小选择：路径贡献可看 TreeInterpreter，树模型归因可看 TreeSHAP，局部近似可看 LIME，图像区域可看 Grad-CAM，替代方案可看反事实。', 'Narrow the choice by the question at hand: path contributions → TreeInterpreter; tree-model attribution → TreeSHAP; local approximation → LIME; image regions → Grad-CAM; alternatives → counterfactuals.'),
    result: B('留下：一个主方法和一个比较方案。', 'Leave behind: one main method and one comparison method.'), refs: [7, 8, 21, 22, 26],
  },
  {
    tag: 'model', title: B('生成解释数据', 'Generate explanation data'), en: 'Explanation evidence',
    body: B('保存贡献值、参考值、路径、区域图或反事实样本，同时保留对应输入、预测结果和模型版本。这是后续表达能够回溯的依据。', 'Save contributions, reference values, paths, region maps or counterfactual examples, together with the matching input, prediction and model version. This is what later expression can trace back to.'),
    result: B('留下：结构化解释记录及对应案例。', 'Leave behind: structured explanation records and their cases.'), refs: [4, 6, 22],
  },
  {
    tag: 'design', title: B('转译成人能理解的表达', 'Translate into human-readable expression'), en: 'Human-readable expression',
    body: B('根据任务选择图表、短句、对话、声音、动作或学习反馈。可以让 LLM 把结构化结果组织成文字，也可以把行动意图转成具身线索。', 'Choose charts, short sentences, dialogue, sound, movement or learning feedback to suit the task. An LLM can organise structured results into text, or an intention can be turned into embodied cues.'),
    result: B('留下：表达原型和解释触发时机。', 'Leave behind: expression prototypes and when the explanation should appear.'), refs: [3, 11, 24, 25],
  },
  {
    tag: 'test', title: B('技术验证', 'Technical validation'), en: 'Technical validation',
    body: B('检查解释是否忠实于所解释的模型，输入微变后是否稳定，重复计算是否一致，以及运行时间是否适合当前任务。具体测试要与方法相配。', 'Check whether the explanation is faithful to the model it explains, whether it stays stable under small input changes, whether repeated computation agrees, and whether the run time suits the task. The specific tests must match the method.'),
    result: B('留下：技术检查结果与适用条件。', 'Leave behind: technical check results and the conditions under which they hold.'), refs: [4, 15, 20],
  },
  {
    tag: 'test', title: B('用户验证与迭代', 'User validation and iteration'), en: 'Human evaluation & iteration',
    body: B('让目标用户实际使用：能否理解、判断下一步、发现错误、有效完成任务？结合行为记录和访谈，再回到需求、方法或表达继续调整。', 'Have the target users actually use it: can they understand it, judge the next step, spot errors, and complete the task well? Combine behaviour logs and interviews, then go back to needs, methods or expression and adjust.'),
    result: B('留下：理解与任务表现证据、下一轮修改。', 'Leave behind: evidence of understanding and task performance, and the next round of changes.'), refs: [14, 20],
  },
];
