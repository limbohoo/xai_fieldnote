'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { ReadingNotes, MarginNote, NotesExport } from './reading-notes';
import { sources } from './sources';
import { MethodAtlas } from './method-atlas';
import { Chapter } from './chapter';
function Cite({ ids }: { ids: number[] }) {
  return (
    <span className="cites">
      {ids.map((id) => (
        <a
          key={id}
          href={sources[id - 1].url}
          target="_blank"
          rel="noreferrer"
          title={sources[id - 1].author + ' · ' + sources[id - 1].title}
        >
          [{String(id).padStart(2, '0')}] ↗
        </a>
      ))}
    </span>
  );
}
function Head({
  no,
  en,
  title,
  desc,
}: {
  no: string;
  en: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="section-head">
      <div className="eyebrow">
        {no} / {en}
      </div>
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}
const methods = [
  {
    id: 'intrinsic',
    cn: '内在可解释',
    en: 'Interpretable models',
    question: '能不能直接读懂决策规则？',
    principle:
      '比如一棵小决策树：先看温度，再看负载，最后决定降速。因为它的判断过程本身就是人能看懂的规则，所以不需要额外的“解释工具”。简单的公式、小树图，都属于这一类。',
    example:
      'Rudin 建议：在人命关天或需要清晰理由的场景里，先试试这种原本就简单的模型，别一上来就整复杂的黑盒模型。',
    output: '输入条件 → 可检查的规则 → 预测结果',
    design:
      '界面上，直接把模型的判断条件展示出来，比如亮起红灯并显示“温度>80度，触发降速”。所见即所得。',
    scope: '简单是最大的优势；但如果规则写了几百条或者全是生僻专业词，普通人依然看不懂。',
    read: '从 Rudin 的论点入手，再回 Ali 的分类看内在解释与事后解释的位置。',
    refs: [16, 1],
  },
  {
    id: 'treeinterpreter',
    cn: '树路径分解',
    en: 'TreeInterpreter',
    question: '沿着这棵树，预测值是怎样一步步变出来的？',
    principle:
      '如果把 AI 预测比作算账，它能帮你查明“每一笔钱是怎么加减的”。它跟着树模型的决策过程一步步走，把最终结果拆解成每一个特征（比如温度、时间）分别贡献了多少分。',
    example:
      '打个比方：基础分 20，因为“温度高”加了 12 分，因为“负载低”减了 5 分，最后得分 27。这就叫路径分解。',
    output: '预测 Prediction = 基准 Bias + 各特征的加减分 Contributions',
    design:
      '界面上可以画一个加减分的瀑布图。让用户清楚看到，是哪个因素把预测值推高了，哪个因素把它拉低了。',
    scope:
      '它专门针对带“树”的模型（比如随机森林）有效。算出来的只是“分数的拆解”，不能完全等同于现实中的因果关系。',
    read: '先读作者的节点分解示例，再看仓库 predict 的返回值 prediction / bias / contributions。',
    refs: [22, 23],
  },
  {
    id: 'shap',
    cn: '特征归因',
    en: 'SHAP / TreeSHAP',
    question: '这次的结果，是谁在推高，谁在拉低？',
    principle:
      'SHAP 就像是给团队发奖金。它通过计算每个特征在各种组合下的“边际贡献”，算出一个绝对公平的得分，告诉你谁是导致这个预测结果的最大功臣，谁在帮倒忙。',
    example:
      '看单个人，它告诉你“为什么拒绝他的贷款（因为收入太低）”；看所有人，它能画出一张大图，告诉你“总体来看，收入和年龄是如何影响贷款通过率的”。',
    output: '参考基准 Baseline + 各特征的 SHAP 贡献值 → 模型最终输出',
    design:
      '界面上常表现为红蓝条形图或力导向图。红色向右推高结果，蓝色向左拉低结果。设计时要提醒用户：长条代表的是“影响力”大小，而不是原始数据的大小。',
    scope:
      '它能算出一个极其精确的“重要度”，但这依赖于你设定的对比基准。把它当成 AI 在利用哪些信息的线索，而不是真实的因果定律。',
    read: '2017 年论文建立共同框架；2020 年树模型论文展示如何从局部解释走向整体理解。',
    refs: [6, 26],
  },
  {
    id: 'lime',
    cn: '局部代理',
    en: 'LIME',
    question: '如果不明白整个黑盒，能不能只解释这一个具体案例？',
    principle:
      '黑盒模型太复杂看不懂？LIME 的做法是：就在当前这个数据附近，稍微改改数据（比如遮住图片的某一块，或删掉句子的几个词），看看黑盒的反应。然后用一个超简单的模型来模仿黑盒在这个局部的行为。',
    example:
      '比如前文“狼和哈士奇”的实验里，通过不断遮挡图片的不同部分，LIME 发现只要遮住背景的“雪”，模型就不认识狼了。这就暴露了模型其实是在看背景。',
    output: '改动数据测试黑盒反应 → 拟合一个简单模型 → 给出这一个案例的解释',
    design:
      '如果是处理文章，界面上可以高亮出几个决定性的关键词；如果是处理图片，可以圈出决定性的几块区域。它专门用来给“单次”决策抓重点。',
    scope:
      '因为它只是在这个案例“附近”做模仿，所以解释不一定对远处的案例适用。重点在于你怎么定义“附近”的范围。',
    read: '先看论文图 1 理解操作，再读 §6.4 与表 2 的用户实验。',
    refs: [7],
  },
  {
    id: 'visual',
    cn: '视觉归因',
    en: 'Grad-CAM',
    question: 'AI 在做判断时，眼睛究竟盯在图片的哪里？',
    principle:
      '专门针对看图的 AI。它通过追踪 AI 神经网络里倒数几层的“注意力”，画出一张热力图。它保留了图片的空间位置，让你直接看到 AI 的重点和原图的对应关系。',
    example:
      '如果 AI 把猫认成了狗，你可以看看它的热力图。如果热力图最红的地方在背景的草地上，你就知道它根本没在看动物，而是瞎猜的。',
    output: '设定你想了解的类别 → 追踪神经网络激活程度 → 在原图上叠加热力图',
    design:
      '界面上通常就是一张盖在原图上的热力图。一定要加个开关让用户能随时关掉它看原图，并且告诉用户：越红代表 AI 越关注这个区域，不代表它越肯定。',
    scope:
      '热力图看着很酷，但有时很有欺骗性（就像人盯着题看也不代表懂了）。需要通过随机化检查等方式，确认它真的反映了模型的判断，而不仅仅是个边缘检测器。',
    read: 'Grad-CAM 读图像定位方式；Sanity Checks 接着读“怎样知道热图值得看”。',
    refs: [21, 15],
  },
  {
    id: 'counterfactual',
    cn: '反事实解释',
    en: 'Counterfactual / DiCE',
    question: '我需要改变什么，才能让 AI 给我通过？',
    principle:
      '它不告诉你“为什么现在不行”，而是告诉你“怎样做就行了”。它会去寻找那些稍微改变一点条件，就能扭转 AI 判定的虚拟案例，并展示给你。',
    example:
      '比如你申请信用卡被 AI 拒绝了。它不会给你一堆复杂的归因数值，而是直接说：“如果你把月收入提高 2000 块，或者把现有的债务还清 5000 块，我就能给你批卡。”',
    output: '当前被拒案例 → 生成几个扭转结果的替代方案 → 给到目标建议',
    design:
      '非常适合做成“建议面板”或“What-if 模拟器”。给用户提供几个可行的操作选项，让他们自己选觉得哪条改变路径最容易做到。给出的解释充满了行动力。',
    scope:
      '方案必须是真实可操作的。如果 AI 告诉你“只要把年龄减少 10 岁就能批卡”，这在数学上成立，但在现实里毫无用处。',
    read: 'DiCE 关注如何生成“多个彼此不同”且“可操作”的方案。',
    refs: [8],
  },
];
const steps = [
  [
    '定义应用场景',
    'Application context',
    '把场景写成一段会发生的事情：谁正在做什么，AI 在哪一步参与，出错后会怎样。医疗、教育或机器人只是领域名称，还可以继续落到一个具体任务。',
    '留下：一段使用情境与关键时刻。',
    [3, 4],
    '情境与需求',
  ],
  [
    '识别目标用户',
    'People & stakeholders',
    '把开发者、操作者、领域专家和受影响的人分开。工程师可能要查信号；普通使用者可能只想知道此刻是否该采纳建议。',
    '留下：不同角色各自要完成的判断。',
    [2, 3],
    '情境与需求',
  ],
  [
    '发现解释需求',
    'Explanation needs',
    '从观察、访谈和失败时刻收集原话：“为什么停了？”“为什么不是另一个选项？”“我改哪里有用？”将问题与任务连起来。',
    '留下：优先回答的用户问题。',
    [3],
    '情境与需求',
  ],
  [
    '定义解释对象',
    'Explanation target',
    '确定这次解释的是数据、单次预测、整体模型，还是机器人目标和行动计划。对象清楚后，才知道该找什么证据。',
    '留下：一句“解释什么”的定义。',
    [1, 4, 11],
    '情境与需求',
  ],
  [
    '判断数据与模型类型',
    'Data & model',
    '分两层记录：输入是表格、图像、文本、时序还是动作数据？模型是规则、树模型还是深度网络？同时记下能否访问参数、梯度或只能查询输出。',
    '留下：数据、模型、访问条件的小档案。',
    [4, 22],
    '模型与算法',
  ],
  [
    '选择 XAI 方法',
    'Method selection',
    '用当前问题缩小选择：路径贡献可看 TreeInterpreter，树模型归因可看 TreeSHAP，局部近似可看 LIME，图像区域可看 Grad-CAM，替代方案可看反事实。',
    '留下：一个主方法和一个比较方案。',
    [7, 8, 21, 22, 26],
    '模型与算法',
  ],
  [
    '生成解释数据',
    'Explanation evidence',
    '保存贡献值、参考值、路径、区域图或反事实样本，同时保留对应输入、预测结果和模型版本。这是后续表达能够回溯的依据。',
    '留下：结构化解释记录及对应案例。',
    [4, 6, 22],
    '模型与算法',
  ],
  [
    '转译成人能理解的表达',
    'Human-readable expression',
    '根据任务选择图表、短句、对话、声音、动作或学习反馈。可以让 LLM 把结构化结果组织成文字，也可以把行动意图转成具身线索。',
    '留下：表达原型和解释触发时机。',
    [3, 11, 24, 25],
    '设计与表达',
  ],
  [
    '技术验证',
    'Technical validation',
    '检查解释是否忠实于所解释的模型，输入微变后是否稳定，重复计算是否一致，以及运行时间是否适合当前任务。具体测试要与方法相配。',
    '留下：技术检查结果与适用条件。',
    [4, 15, 20],
    '测试与验证',
  ],
  [
    '用户验证与迭代',
    'Human evaluation & iteration',
    '让目标用户实际使用：能否理解、判断下一步、发现错误、有效完成任务？结合行为记录和访谈，再回到需求、方法或表达继续调整。',
    '留下：理解与任务表现证据、下一轮修改。',
    [14, 20],
    '测试与验证',
  ],
] as const;
export function LearningContent() {
  return (
    <ReadingNotes>
      <div className="reading-intro">
        <div className="reading-prose">
          <span className="eyebrow">从一个熟悉的时刻开始</span>
          <h3>当一个智能产品突然停下来，你会先问什么？</h3>
          <p>
            “发生了什么？”“它在等我吗？”“我应该让开，还是帮它一下？”这些问题包含了状态、意图和下一步行动。对设计者来说，XAI
            可以从这样的小片刻开始：找出人缺少哪一块理解，再找到系统能提供的依据。Miller
            对社会科学研究的梳理指出，人的解释常常带有对比、选择和社会互动的性质；我们想知道的往往是“为什么这次这样，而不是我预想的那样”。
            <Cite ids={[2]} />
          </p>
          <p>
            Ali
            等的综述帮助你把这些小问题放回更大的研究领域：模型解释与公平性、隐私、安全、稳健性等可信
            AI 议题相连。入门时可以先沿着“系统怎样判断 → 人怎样理解 →
            理解怎样影响行动”来读，再逐渐扩展到这些相邻问题。
            <Cite ids={[1]} />
          </p>
        </div>
        <MarginNote name="scene">
          想到一个你亲身遇过、却没看懂的智能产品行为了吗？把那个时刻留下来，后面的方法会更容易对上具体用途。
        </MarginNote>
      </div>
      <div className="taxonomy-block">
        <details open>
          <summary>
            <span>
              建立分类坐标 <em>Taxonomy</em>
            </span>
            <span>读论文时随手定位 ＋</span>
          </summary>
          <div className="taxonomy-grid">
            {[
              [
                '解释谁 / Object',
                '数据、模型、单次预测、行动计划、能力边界。机器人的目标与分类器的特征贡献，是不同对象。',
              ],
              [
                '解释多大范围 / Scope',
                '局部 Local：为什么这一个案例这样；全局 Global：模型通常如何工作。',
              ],
              [
                '何时形成 / Approach',
                '内在 Intrinsic：结构本身便于检查；事后 Post-hoc：对已训练模型再做分析。',
              ],
              [
                '需要什么访问 / Access',
                '模型无关 Model-agnostic：可通过输入输出查询；模型特定 Model-specific：利用树结构、梯度等信息。',
              ],
              [
                '给谁看 / Recipient',
                '开发者 Developer、使用者 User、受影响者 Affected person，所需细节与行动权限不同。',
              ],
              [
                '用什么表达 / Medium',
                '图表 Visualization、语言 Language、对话 Dialogue、具身线索 Embodied cues。表达通道与底层方法可以组合。',
              ],
            ].map(([t, p]) => (
              <div key={t}>
                <h4>{t}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <p className="caption">
            综合阅读坐标，依据领域综述与解释方法评估框架整理。
            <Cite ids={[1, 4, 11]} />
          </p>
        </details>
      </div>
      <article className="reading-essay question-essay">
        <div>
          <span className="eyebrow">PAPER IN FOCUS · CHI 2020</span>
          <h3>先收集用户的问题，解释形式就有了方向。</h3>
          <p>
            Liao、Gruen 与 Miller 访谈了 20 位 UX／设计从业者，整理出面向 XAI
            体验设计的用户问题库。它很适合设计研究入门：从用户会问什么切入，再去找支持这种回答的技术。问题库同时包含输入、输出、性能等基础信息，以及
            Why、Why not、What if、How to 等解释问题。
            <Cite ids={[3]} />
          </p>
          <p>
            在 Liao 等人（2020）的论文中，他们将用户对 AI 的疑问归纳为多个典型类别 <Cite ids={[3]} />。原论文常以医疗或贷款预测为例，为了更直观，我们这里用大家每天都在用的<b>“智能导航软件”</b>作为贯穿示例，看看如何把用户的自然提问，转化为界面上的设计线索：
          </p>
        </div>
        <dl className="reading-questions">
          <div>
            <dt>为什么 / Why</dt>
            <dd>“为什么给我导这条路？” → 设计线索：呈现推荐依据（如展示“距离最短”或“红绿灯少”）。</dd>
          </div>
          <div>
            <dt>为什么不 / Why not</dt>
            <dd>“为什么不走我平时走的大路？” → 设计线索：对比替代选项（如主动提示“大路当前因车祸拥堵”）。</dd>
          </div>
          <div>
            <dt>如果…… / What if</dt>
            <dd>“如果我晚半小时再出发会怎样？” → 设计线索：支持探索并预览未来变化（如提供时间滑块看路况预测）。</dd>
          </div>
          <div>
            <dt>怎样才能 / How to</dt>
            <dd>“怎样才能避开所有收费站？” → 设计线索：将解释转化为可操作设置（如直接提供“避开收费站”开关）。</dd>
          </div>
        </dl>
      </article>
      <MarginNote name="question">
        如果你的产品只能先回答一个问题，用户最常问的会是哪一句？用用户的话写，暂时不用“透明性”“可解释性”这些研究术语。
      </MarginNote>
      <Chapter id="methods" number="02" title="解释方法与论文案例" summary="比较模型、路径、归因与局部代理，并回到论文看它们如何支持判断。">
        <Head
          no="02"
          en="METHODS, MADE READABLE"
          title="解释方法、适用条件与论文案例。"
          desc="先选一个与你的项目最接近的方法。每个入口都按“怎么做—看到什么—怎样用于设计”展开，可以随时切换比较。"
        />
        <Tabs defaultValue="treeinterpreter" className="method-tabs">
          <TabsList className="method-tablist" aria-label="解释方法">
            {methods.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="method-trigger">
                {m.cn}
                <small>{m.en}</small>
              </TabsTrigger>
            ))}
          </TabsList>
          {methods.map((m) => (
            <TabsContent key={m.id} value={m.id} className="method-panel">
              <div className="method-main">
                <span className="eyebrow">{m.en}</span>
                <h3>{m.question}</h3>
                <p>{m.principle}</p>
                <div className="method-flow">{m.output}</div>
                <p className="method-example">{m.example}</p>
                <Cite ids={m.refs} />
              </div>
              <div className="method-aside">
                <div>
                  <span>连接到设计 / IN PRACTICE</span>
                  <p>{m.design}</p>
                </div>
                <div>
                  <span>理解它的适用条件 / CONTEXT</span>
                  <p>{m.scope}</p>
                </div>
                <div className="design-take">
                  <span>回到原文 / WHAT TO READ</span>
                  <p>{m.read}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <div className="comparison">
          <h3>TreeInterpreter、TreeSHAP、LIME：都能给贡献，思路却不同。</h3>
          <p>
            在机器人抓取论文里碰到这三个名字时，可以先用下面这张表建立直觉，再比较它们产生的结果。
          </p>
          <Table>
            <TableCaption>
              学习用对照，依据作者文档与原始方法论文整理。
              <Cite ids={[7, 22, 23, 26]} />
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>方法 / Method</TableHead>
                <TableHead>解释怎样形成</TableHead>
                <TableHead>读结果时留意什么</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>TreeInterpreter</TableCell>
                <TableCell>沿实际树路径分解节点预测变化。</TableCell>
                <TableCell>
                  贡献与树的分裂路径有关；支持模型见作者文档。
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>TreeSHAP</TableCell>
                <TableCell>利用树结构计算 Shapley 归因。</TableCell>
                <TableCell>
                  看参考与特征依赖设定；不等于沿一条路径累加。
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>LIME</TableCell>
                <TableCell>用输入附近的简单代理近似原模型。</TableCell>
                <TableCell>看邻域、采样和局部拟合质量。</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <MarginNote name="evidence">
          试着拿一个输出值问：“它相对什么发生变化？”找到基准以后，再看贡献条形图通常会清楚很多。你还会想同时查看哪一个原始输入？
        </MarginNote>
        <div className="glossary-bridge">
          <span>遇到陌生词？</span>
          <a href="/glossary#feature">特征 Feature ↗</a>
          <a href="/glossary#treeinterpreter">TreeInterpreter ↗</a>
          <a href="/glossary#shap">SHAP ↗</a>
          <a href="/glossary#local-global">局部与全局 ↗</a>
        </div>
        <div id="cases" className="subchapter">
          <span className="eyebrow">READING THE PAPERS</span>
          <h3>把方法放回论文，看研究者具体做了什么。</h3>
          <p>
            下面接着读实验、图表和设计启发。论文发现与可继续发展的设计想法分别标注。
          </p>
        </div>
        <div className="case-grid rich-cases">
          <article className="case-card">
            <div className="case-meta">
              <span>01 / MODEL DEBUGGING</span>
              <span>KDD · 2016</span>
            </div>
            <h3>狼，还是哈士奇？</h3>
            <p className="case-terms">
              虚假相关 Spurious correlation · 局部解释 Local explanation
            </p>
            <p>
              LIME
              论文故意训练了一个有问题的狼／哈士奇分类器：训练样本中的狼与雪地背景关联在一起。分类器看起来能够做出一些正确预测，但它可能利用了我们并不希望它依赖的背景。解释把这个隐藏线索显示了出来。
              <Cite ids={[7]} />
            </p>
            <div className="paper-result">
              <span>表 2 · 同一组参与者，看到解释前后</span>
              <div>
                <b>10 → 3</b>
                <p>信任这个有问题分类器的人数</p>
              </div>
              <div>
                <b>12 → 25</b>
                <p>把“雪”识别为可能线索的人数</p>
              </div>
            </div>
            <p>
              参与者是 27 位至少修过一门研究生机器学习课程的学生。他们先看 10
              次预测，其中 8 次正确、2
              次错误，再看解释并重新判断。这是一个具体的前后比较实验。解释的价值在这里很直观：人更能发现模型究竟在依赖什么。
              <Cite ids={[7]} />
            </p>
            <p className="reading-location">
              原文怎么读：§6.4 → 图 11 → 表
              2。可以留意作者怎样把“相信模型”与“识别问题特征”分别记录。
            </p>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>02 / HUMAN–ROBOT INTERACTION</span>
              <span>HRI · 2013</span>
            </div>
            <h3>机器人走哪条路，你才能更早猜出它要拿哪个杯子？</h3>
            <p className="case-terms">
              意图可读性 Legibility · 可预测性 Predictability
            </p>
            <p>
              想象桌上有三个杯子，机器人要去拿中间那个。它可以走直线——最省力，但你盯着看了一半还是猜不准，因为直线对三个杯子都"差不多公平"。或者，它先稍微偏向左边，再转向中间——路远了一点，但你只看到起步那段就能排除右边，很快猜出：是中间。
              <Cite ids={[12]} />
            </p>
            <div className="concept-pair">
              <div>
                <span>可预测 / Predictable</span>
                <strong>你已知目标 → 路径符不符合预期？</strong>
              </div>
              <div>
                <span>意图可读 / Legible</span>
                <strong>你不知目标 → 光看动作能不能猜出来？</strong>
              </div>
            </div>
            <p>
              论文的核心发现：这两个目标天然冲突。最短路径最可预测，却往往最难从中途读出意图。要让机器人更容易被理解，就得让它走一条"有点夸张"的路线——牺牲效率，换取可读性。实验让参与者看动作视频，分别记录"多早猜到"和"猜得对不对"，两个指标对应两个概念。
              <Cite ids={[12]} />
            </p>
            <p className="reading-location">
              原文怎么读：先看概念定义，再看图 6（多早猜出目标）→ 图 7（预期路径差异）。实用问题：你设计的产品动作，是让人"知道目标后觉得合理"，还是"不知道目标也能猜出来"？
            </p>
            <MarginNote name="expression">
              你正在设计的物件里，有没有哪一段动作天然会"透露"接下来要做什么？把那段动作稍微夸大，可读性往往就上来了。
            </MarginNote>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>03 / CONCEPT INTERVENTION</span>
              <span>ICML · 2020</span>
            </div>
            <h3>“翅膀颜色看错了，我能改吗？”</h3>
            <p className="case-terms">
              概念瓶颈 Concept bottleneck · 干预 Intervention
            </p>
            <p>
              以前的 AI 像个黑盒：扔进去一张鸟的照片，它直接告诉你结果。如果它认错了，你毫无办法。Koh 等人提出了一种新方法，在中间加了一层“人类能看懂的特征”：AI 会先识别“翅膀是白色的吗？”“嘴是黄色的吗？”，然后再根据这些特征去推断物种。
              <Cite ids={[10]} />
            </p>
            <div className="method-flow">
              图像 Image → 提取中间特征（如翅膀颜色、有无骨刺） → 最终预测
              <br />
              👩‍⚕️ 人类发现特征错了 ↗ 手动纠正特征，AI 重新推断
            </div>
            <p>
              这就是“干预（Intervention）”。比如看膝关节 X 光片时，AI 错误地判断病情很严重，医生发现是因为 AI 误把阴影看成了“骨刺”。医生就可以在中间层“插手”，把“骨刺”这一项改为“无”。AI 收到这个修正后，就会立刻调整最终的病情预测。这让 AI 从死板的机器，变成了可以和专家“商量”的助手。
              <Cite ids={[10]} />
            </p>
            <p className="case-design">
              <b>设计延伸。</b>
              这个思路非常适合做人机协作界面。不要只给用户一个冷冰冰的最终结果，而是展示它推理的“中间步骤”。允许用户像批改作业一样，修改其中错掉的小步骤，从而纠正大结果。
            </p>
            <MarginNote name="agency">
              你的使用者有什么知识，是模型可能缺少的？如果给他们一个可以修正的中间层，最自然的概念会是什么？
            </MarginNote>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>04 / ENGINEERING DESIGN</span>
              <span>ICED · 2025</span>
            </div>
            <h3>从 556 次仿真，读懂结构参数的作用。</h3>
            <p className="case-terms">
              代理模型 Surrogate model · 参数归因 Parameter attribution
            </p>
            <p>
              Mathieu 等研究车辆侧碰结构优化：围绕侧门槛的 14 个壁厚参数，生成
              556
              个有限元子模型设计方案，再训练梯度提升树预测质量比吸能表现；未见测试集上的
              R² 为 0.80。代理模型让分析更轻量，TreeSHAP
              帮助理解参数对预测的作用。
              <Cite ids={[25]} />
            </p>
            <div className="paper-result engineering-result">
              <div>
                <b>14</b>
                <p>壁厚参数</p>
              </div>
              <div>
                <b>556</b>
                <p>仿真设计方案</p>
              </div>
              <div>
                <b>0.80</b>
                <p>测试集 R²</p>
              </div>
            </div>
            <p>
              作者把多个部件的贡献汇总为 systemSHAP，也用 differenceSHAP
              比较方案差异，再通过 LLM 界面支持提问和技术报告。读图 1
              可以看到从仿真到解释的整条链；图 4
              则展示报告中的参数比较。这里优化算法负责搜索方案，XAI
              负责帮助分析预测与差异，LLM 负责组织交互。
              <Cite ids={[25]} />
            </p>
            <p className="case-design">
              <b>设计延伸。</b>
              这给产品工程提供了一个很近的入口：把材料厚度、结构尺寸等设计变量变成可讨论的证据。下一步可以研究，设计师据此比较方案时是否更容易发现取舍；原论文是工程案例，并非这类用户实验。
            </p>
          </article>
        </div>
        <div className="secondary-cases">
          <article>
            <span className="eyebrow">05 / YOUR ORIGINAL READING</span>
            <h3>抓取失败：为什么要比较三种解释器？</h3>
            <p>
              Alvanpour 等的研究把 LIME、TreeSHAP 和 TreeInterpreter
              放在机器人抓取失败预测中比较。可检索摘要涉及三指机器人模拟抓取数据，包含关节位置、速度和力矩等信号，以及特征排序与计算开销的比较。这个问题很适合接在方法章后面读：同一个预测任务，不同解释器会突出哪些输入？
              <Cite ids={[13]} />
            </p>
            <p>
              阅读时可以做一张小记录：输入是什么、预测模型是什么、解释算法是什么、比较指标是什么。这样就不会把“随机森林”与“TreeInterpreter”写在同一层分类里。此处为阅读建议。
            </p>
            <p className="source-access">
              资料深度：摘要与书目信息；全文访问受限，因此这里不编写胜出方法、具体分数或实验结论。
            </p>
          </article>
          <article>
            <span className="eyebrow">06 / EDUCATION & TRAINING</span>
            <h3>解释也可能是一段教学。</h3>
            <p>
              Fiok 等把 XAI
              放到教育与培训语境中讨论，是你原始书单中的另一个入口。对 HCI
              研究者，可以带着两个学习目标读它：使用者是在学“这个 AI
              如何判断”，还是在借反馈学习领域知识？两者会带来不同的交互与评估需求。
              <Cite ids={[17]} />
            </p>
            <p className="case-design">
              <b>自拟情境。</b>
              智能工具提示握持姿态有误，可能只说“角度偏大”，也可能显示当前姿态与参考姿态，再让学习者尝试调整。这里可以研究反馈是否帮助下一次独立操作，而不仅是当前一步完成。
            </p>
            <p className="source-access">
              资料深度：摘要与书目信息；上面的教学情境是设计推演，不作为该综述的实验案例。
            </p>
          </article>
        </div>
      </Chapter>
      <MethodAtlas />
      <Chapter id="process" number="04" title="从场景到验证：十步参考" summary="保留原始学习流程，并把场景、模型、表达与验证串成可回访的工作框架。">
        <Head
          no="03"
          en="A REFERENCE FRAMEWORK"
          title="从场景到验证的十步参考。"
          desc="这套顺序很适合把零散的术语串起来：从场景与人出发，经过模型、方法和表达，最后回到技术与用户验证。下面保留原笔记中的十个锚点，并补上每步可以留下的产出。"
        />
        <div className="workflow-origin">
          <div>
            <strong>原始参考 / Original learning notes</strong>
            <p>
              十步名称与顺序来自你提供的两页笔记；展开解释由本页结合文献补充。它是一套可反复回访的综合参考，实践中可以跳转与迭代。
            </p>
          </div>
          <a
            href="/xai-learning-workflow-reference.pdf"
            target="_blank"
            rel="noreferrer"
            className="outline-button"
          >
            打开原始两页 PDF ↗
          </a>
        </div>
        <div className="process-grid ten-steps">
          {steps.map(([cn, en, body, result, refs, tag], i) => {
            const colors: Record<string, string> = {
              '情境与需求': 'var(--color-blue, #3b82f6)',
              '模型与算法': 'var(--color-green, #10b981)',
              '设计与表达': 'var(--color-orange, #f59e0b)',
              '测试与验证': 'var(--color-purple, #8b5cf6)',
            };
            return (
              <article className="process-step" key={cn} style={{ borderTop: `4px solid ${colors[tag]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="step-no">{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: colors[tag], background: `${colors[tag]}15`, padding: '2px 8px', borderRadius: '12px' }}>{tag}</span>
                </div>
                <h3>{cn}</h3>
                <span className="en-label">{en}</span>
                <p>{body}</p>
                <p className="step-result">{result}</p>
                <Cite ids={[...refs]} />
              </article>
            );
          })}
        </div>
        <div className="workflow-deep">
          <article className="reading-prose">
            <span className="eyebrow">把第 7、8 步接起来</span>
            <h3>SHAP + LLM：先有解释材料，再组织成语言。</h3>
            <p>
              你原笔记记录了 Hsu 等的文字解释示例：模型预测 → SHAP 全局图 →
              提取特征重要性及特征值与 SHAP 值的相关关系 → 整理表格 → 交给
              ChatGPT API 生成约 100
              词的解释。这条链保留下来，作为认识“解释数据”和“解释表达”两层工作的一种参考。具体操作来自原笔记；本页核对了论文书目信息，未重新验证全文中的每个操作细节。
              <Cite ids={[24]} />
            </p>
            <div className="method-flow">
              预测模型 → 解释器 → 结构化证据 → LLM 语言层 → 用户阅读与追问
            </div>
            <p>
              对照车辆侧碰案例再读，会更容易理解组合的用途：原始工程数据通过模型与归因变得可分析，语言界面让人可以围绕这些材料提问。
              <Cite ids={[25]} />
            </p>
            <p className="case-design">
              <b>原型建议。</b>
              让每段说明能展开对应输入、贡献和参考值；生成失败时，仍能查看原始解释材料。这样便于设计评审时核对，也方便使用者进一步追问。
            </p>
          </article>
          <article className="reading-prose">
            <span className="eyebrow">把第 9、10 步分开看</span>
            <h3>解释算得怎样，和人学到了什么，都值得测。</h3>
            <p>
              Doshi-Velez 与 Kim
              区分三种评估入口：在真实应用中由真实用户完成任务；在简化任务中研究人的理解；以及不直接依赖用户实验的功能性评估。它们帮助我们选择与研究问题相称的证据。
              <Cite ids={[20]} />
            </p>
            <p>
              Rong 等梳理了 97
              篇核心用户研究，讨论理解、信任、可用性与人机协作等评估目标。读这类综述，可以收集“别人如何把理解变成可观察的行为”，再选适合自己场景的任务。
              <Cite ids={[14]} />
            </p>
            <dl className="reading-questions">
              <div>
                <dt>技术层 / Technical</dt>
                <dd>
                  检查归因、局部拟合、稳定性与运行时间；依据方法选择测试。
                  <Cite ids={[4, 15]} />
                </dd>
              </div>
              <div>
                <dt>理解层 / Understanding</dt>
                <dd>
                  让人解释一个新案例，或预测系统下一步，再结合访谈了解判断过程。
                  <Cite ids={[14, 20]} />
                </dd>
              </div>
              <div>
                <dt>协作层 / Collaboration</dt>
                <dd>
                  观察任务结果、错误发现与采纳行为，比较有解释和其他条件下的差异。
                  <Cite ids={[14]} />
                </dd>
              </div>
            </dl>
            <details className="reading-detail">
              <summary>
                原笔记中的排序指标，怎样读？ <span>＋</span>
              </summary>
              <p>
                Kendall’s Tau 关注排序次序的对应，RBO
                关注排序列表的重合并可更重视前部；运行时间关注解释开销。你原笔记将它们放在抓取方法比较旁边。它们适合回答“方法给出的顺序相近吗、算得快吗”，而理解测验能继续回答“人读懂了吗”。这里是对原笔记指标用途的释义，具体公式与实验设定请回到原论文。
                <Cite ids={[13]} />
              </p>
            </details>
          </article>
        </div>
        <MarginNote name="evaluation">
          回想狼与哈士奇的实验：研究者把“有没有发现雪”变成了可记录的结果。你的研究里，有没有一个同样具体的“读懂了”的表现？先记下行为，再决定用什么量表。
        </MarginNote>
        <article className="situated-reading">
          <div>
            <span className="eyebrow">走进真实使用 / IN THE WILD</span>
            <h3>解释进入生活后，还会遇到这些设计条件。</h3>
            <p>
              下面将用户需求、Fact Sheets、NIST
              原则与具身综述转成场景设计提示；例子是本页的综合推演，便于做原型时逐项对照。
              <Cite ids={[3, 4, 5, 11]} />
            </p>
          </div>
          <div className="situated-grid">
            {[
              [
                '时机与注意力 / Timing',
                '工作中的人未必有空读长解释。行动前的简短信号、失败后的详细回顾，可以承担不同任务。先观察用户在哪一刻真正需要信息。',
              ],
              [
                '通道与环境 / Modality',
                '嘈杂车间里的语音、多人空间中的提示音、强光下的灯光，都有各自条件。把解释放进真实光照、噪声与操作姿势中试一次。',
              ],
              [
                '能力边界 / Knowledge limits',
                'NIST 强调系统应识别自身知识边界。产品可将“传感器没读到”“没有足够依据”和“检测到异常”分成可理解的状态。',
              ],
              [
                '权限与恢复 / Control',
                '解释之后如何继续？谁可以修改、谁可以接管、暂停后怎样恢复？把这些动作接进服务流程，比单独加一个解释按钮更完整。',
              ],
              [
                '不同人、不同需要 / Recipients',
                '操作者要及时判断，维护者要查看细节，旁观者可能只想知道机器人会往哪里去。可以分层显示同一事件的信息。',
              ],
              [
                '运行成本 / Operational fit',
                '解释耗时、模型更新、隐私与日志可追溯性都影响长期使用。将“为什么这样解释”的版本信息留给需要检查的人。',
              ],
            ].map(([t, p]) => (
              <div key={t}>
                <h4>{t}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </article>
      </Chapter>
      <Chapter id="frontiers" number="05" title="研究前沿与下一步阅读" summary="从交互解释、具身行为、机制可解释性到可信语言解释，选择下一篇该读什么。">
        <Head
          no="04"
          en="WHERE TO READ NEXT"
          title="研究前沿与下一步阅读。"
          desc="以下以 2020—2025 年代表性研究为入口，帮助选择下一步阅读方向；不是对全部最新研究的穷尽清单。"
        />
        <div className="frontier-list">
          {[
            [
              '01',
              '从说明走向对话',
              'Interactive explanations',
              '用户会追问、比较，也会带来模型不知道的信息。Liao 的问题库帮助组织追问，概念瓶颈模型提供可纠正的中间层。设计研究可以把两者接起来，观察人在多轮互动中怎样形成理解。',
              [3, 10],
            ],
            [
              '02',
              '从屏幕走向行为',
              'Situated & embodied XAI',
              '当解释发生在动作、注视和姿态里，研究对象也变成了一个持续过程：人在什么时候看懂了，线索如何随行动变化？社会线索综述与轨迹实验提供了可开始的概念和测量方式。',
              [11, 12],
            ],
            [
              '03',
              '从特征归因走向内部计算',
              'Mechanistic interpretability',
              '2025 年 On the Biology of a Large Language Model 用归因图和干预研究 Claude 3.5 Haiku 的内部计算。这里要解释的是模型内部哪些特征与计算路径参与产生输出。可先读作者的可视案例，再看干预如何支持机制假设。',
              [18],
            ],
            [
              '04',
              '让语言解释更有依据',
              'Faithful language explanations',
              'LLM 有两种角色：它可以帮别的模型讲解证据，也可以本身成为被解释的对象。LLM 解释综述适合建立分类；思维链忠实性研究则用实验检查文字理由是否说出了实际起作用的线索。设计上可继续探索证据引用、追问与核对方式。',
              [27, 19],
            ],
          ].map(([n, cn, en, body, refs]) => (
            <article key={String(n)}>
              <span className="small-no">{String(n)}</span>
              <div>
                <h3>{String(cn)}</h3>
                <span className="en-label">{String(en)}</span>
              </div>
              <p>
                {String(body)}
                <Cite ids={refs as number[]} />
              </p>
            </article>
          ))}
        </div>
        <div id="studio" className="subchapter">
          <span className="eyebrow">A READING ROUTE</span>
          <h3>不用一次读完，可以这样往前走。</h3>
          <p>
            每轮留下一个小产出，慢慢把自己的项目放进这张地图。基础术语可以随时到{' '}
            <a href="/glossary">Glossary 词典 ↗</a> 查阅。
          </p>
        </div>
        <div className="reading-rounds">
          {[
            [
              '第一轮',
              '先认识人怎样理解',
              'Miller → Liao → Wallkötter',
              '从对比性解释、用户问题库和社会线索建立直觉。随手记录一个真实情境、三句用户问题。',
              [2, 3, 11],
            ],
            [
              '第二轮',
              '亲手拆一次预测',
              'TreeInterpreter → SHAP → LIME',
              '先从树路径的小算例开始，再比较 Shapley 归因与局部近似。读到一个图，能说出输出、参考和贡献各是什么。',
              [23, 6, 7],
            ],
            [
              '第三轮',
              '挑一个案例细读',
              '轨迹 / 概念干预 / 车辆侧碰',
              '选择与你最接近的一篇，沿着问题、输入、方法、实验和结果做一页笔记。随后画一个自己的交互情境。',
              [12, 10, 25],
            ],
            [
              '第四轮',
              '设计一次可回答问题的验证',
              'Rong → Doshi-Velez & Kim → Fact Sheets',
              '用用户表现和技术检查分别支持主张。最后回 Ali 的综述，补上尚未探索的领域分支。',
              [14, 20, 4, 1],
            ],
          ].map(([n, t, en, p, refs]) => (
            <article key={String(n)}>
              <span>{String(n)}</span>
              <h3>{String(t)}</h3>
              <p className="route-reading">{String(en)}</p>
              <p>{String(p)}</p>
              <Cite ids={refs as number[]} />
            </article>
          ))}
        </div>
        <NotesExport />
        <div id="sources" className="subchapter sources-section">
          <span className="eyebrow">THE READING SHELF</span>
          <h3>所有入口，都可以回到来源。</h3>
          <p>
            正文编号打开原始来源；词典中的定义也各自链接到对应论文或官方资料。
          </p>
        </div>
        <details className="source-index" open>
          <summary>
            全部 {sources.length} 项文献与资料 <span>收起 / 展开索引 ＋</span>
          </summary>
          <ol>
            {sources.map((s) => (
              <li key={s.id} id={'ref-' + s.id}>
                <span className="ref-no">{String(s.id).padStart(2, '0')}</span>
                <div>
                  <div className="ref-meta">
                    {s.author} · {s.year} <span>{s.type}</span>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗
                  </a>
                  <p>{s.venue}</p>
                  <p className="ref-use">{s.use}</p>
                </div>
              </li>
            ))}
          </ol>
        </details>
        <p className="caption">
          资料整理：2026.09.07。论文内容均以转述呈现；教学算例、阅读建议与设计延伸已在相应位置说明。原始学习笔记：
          <a
            href="/xai-learning-workflow-reference.pdf"
            target="_blank"
            rel="noreferrer"
          >
            《XAI 可解释性研究和设计流程 · 参考版》↗
          </a>
        </p>
      </Chapter>
    </ReadingNotes>
  );
}
