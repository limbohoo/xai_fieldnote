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
import { useT } from './i18n';
import { METHODS, STEPS, TAG_NAME } from './learning-data';

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

const STEP_COLORS: Record<string, string> = {
  ctx: 'var(--color-blue, #3b82f6)',
  model: 'var(--color-green, #10b981)',
  design: 'var(--color-orange, #f59e0b)',
  test: 'var(--color-purple, #8b5cf6)',
};

export function LearningContent() {
  const t = useT();
  const taxonomy: [string, string][] = [
    [t('解释谁 / Object', 'Who is explained / Object'), t('数据、模型、单次预测、行动计划、能力边界。机器人的目标与分类器的特征贡献，是不同对象。', 'Data, models, single predictions, action plans and capability limits. A robot’s goal and a classifier’s feature contributions are different objects.')],
    [t('解释多大范围 / Scope', 'How far it reaches / Scope'), t('局部 Local：为什么这一个案例这样；全局 Global：模型通常如何工作。', 'Local: why this one case came out this way. Global: how the model usually works.')],
    [t('何时形成 / Approach', 'When it is formed / Approach'), t('内在 Intrinsic：结构本身便于检查；事后 Post-hoc：对已训练模型再做分析。', 'Intrinsic: the structure itself is easy to inspect. Post-hoc: analysis applied to an already-trained model.')],
    [t('需要什么访问 / Access', 'What access it needs / Access'), t('模型无关 Model-agnostic：可通过输入输出查询；模型特定 Model-specific：利用树结构、梯度等信息。', 'Model-agnostic: can be done by querying inputs and outputs. Model-specific: uses tree structure, gradients and similar internals.')],
    [t('给谁看 / Recipient', 'Who it is for / Recipient'), t('开发者 Developer、使用者 User、受影响者 Affected person，所需细节与行动权限不同。', 'Developers, users and affected people need different detail and different powers to act.')],
    [t('用什么表达 / Medium', 'How it is expressed / Medium'), t('图表 Visualization、语言 Language、对话 Dialogue、具身线索 Embodied cues。表达通道与底层方法可以组合。', 'Visualisation, language, dialogue or embodied cues. The channel of expression can be combined with any underlying method.')],
  ];
  const frontiers: [string, string, string, string, number[]][] = [
    ['01', t('从说明走向对话', 'From explanation to dialogue'), 'Interactive explanations',
      t('用户会追问、比较，也会带来模型不知道的信息。Liao 的问题库帮助组织追问，概念瓶颈模型提供可纠正的中间层。设计研究可以把两者接起来，观察人在多轮互动中怎样形成理解。', 'Users ask follow-up questions, compare options, and bring information the model does not have. Liao’s question bank helps organise those follow-ups, and concept bottleneck models provide an intermediate layer that can be corrected. Design research can link the two and observe how understanding forms over several rounds of interaction.'), [3, 10]],
    ['02', t('从屏幕走向行为', 'From screens to behaviour'), 'Situated & embodied XAI',
      t('当解释发生在动作、注视和姿态里，研究对象也变成了一个持续过程：人在什么时候看懂了，线索如何随行动变化？社会线索综述与轨迹实验提供了可开始的概念和测量方式。', 'When an explanation happens through movement, gaze and posture, the object of study becomes an ongoing process: when does a person understand, and how do the cues change with the action? A survey of social cues and trajectory experiments offer concepts and measures to start with.'), [11, 12]],
    ['03', t('从特征归因走向内部计算', 'From feature attribution to internal computation'), 'Mechanistic interpretability',
      t('2025 年 On the Biology of a Large Language Model 用归因图和干预研究 Claude 3.5 Haiku 的内部计算。这里要解释的是模型内部哪些特征与计算路径参与产生输出。可先读作者的可视案例，再看干预如何支持机制假设。', 'The 2025 paper On the Biology of a Large Language Model uses attribution graphs and interventions to study the internal computation of Claude 3.5 Haiku. The question is which internal features and computational paths contribute to an output. Read the authors’ visual cases first, then see how interventions support mechanistic claims.'), [18]],
    ['04', t('让语言解释更有依据', 'Making language explanations more faithful'), 'Faithful language explanations',
      t('LLM 有两种角色：它可以帮别的模型讲解证据，也可以本身成为被解释的对象。LLM 解释综述适合建立分类；思维链忠实性研究则用实验检查文字理由是否说出了实际起作用的线索。设计上可继续探索证据引用、追问与核对方式。', 'An LLM can play two roles: it can explain evidence for another model, or it can itself be the object being explained. A survey of LLM explanations helps build a taxonomy; studies of chain-of-thought faithfulness use experiments to check whether written reasons name the cues that actually mattered. For design, keep exploring how evidence is cited, questioned and checked.'), [27, 19]],
  ];
  const rounds: [string, string, string, string, number[]][] = [
    [t('第一轮', 'Round 1'), t('先认识人怎样理解', 'First, how people understand'), 'Miller → Liao → Wallkötter',
      t('从对比性解释、用户问题库和社会线索建立直觉。随手记录一个真实情境、三句用户问题。', 'Build intuition from contrastive explanations, the user question bank and social cues. Note one real situation and three user questions.'), [2, 3, 11]],
    [t('第二轮', 'Round 2'), t('亲手拆一次预测', 'Take one prediction apart by hand'), 'TreeInterpreter → SHAP → LIME',
      t('先从树路径的小算例开始，再比较 Shapley 归因与局部近似。读到一个图，能说出输出、参考和贡献各是什么。', 'Start with a small worked example of a tree path, then compare Shapley attribution with local approximation. Given any chart, you should be able to say what the output, the reference and the contributions are.'), [23, 6, 7]],
    [t('第三轮', 'Round 3'), t('挑一个案例细读', 'Read one case closely'), t('轨迹 / 概念干预 / 车辆侧碰', 'Trajectories / concept intervention / vehicle side impact'),
      t('选择与你最接近的一篇，沿着问题、输入、方法、实验和结果做一页笔记。随后画一个自己的交互情境。', 'Pick the paper closest to your work and write a one-page note following its question, inputs, method, experiments and results. Then sketch an interaction scenario of your own.'), [12, 10, 25]],
    [t('第四轮', 'Round 4'), t('设计一次可回答问题的验证', 'Design a validation that can answer a question'), 'Rong → Doshi-Velez & Kim → Fact Sheets',
      t('用用户表现和技术检查分别支持主张。最后回 Ali 的综述，补上尚未探索的领域分支。', 'Support each claim with either user performance or technical checks. Finally return to Ali’s survey and fill in the branches you have not yet explored.'), [14, 20, 4, 1]],
  ];
  const situated: [string, string][] = [
    [t('时机与注意力 / Timing', 'Timing and attention / Timing'), t('工作中的人未必有空读长解释。行动前的简短信号、失败后的详细回顾，可以承担不同任务。先观察用户在哪一刻真正需要信息。', 'People at work may not have time to read a long explanation. A brief signal before acting and a detailed review after a failure can serve different tasks. First observe the moment when the user really needs information.')],
    [t('通道与环境 / Modality', 'Channel and environment / Modality'), t('嘈杂车间里的语音、多人空间中的提示音、强光下的灯光，都有各自条件。把解释放进真实光照、噪声与操作姿势中试一次。', 'Speech in a noisy workshop, a chime in a shared room, a light in strong sunlight: each has its own conditions. Try the explanation under real lighting, noise and working postures.')],
    [t('能力边界 / Knowledge limits', 'Limits of knowledge / Knowledge limits'), t('NIST 强调系统应识别自身知识边界。产品可将“传感器没读到”“没有足够依据”和“检测到异常”分成可理解的状态。', 'NIST stresses that a system should recognise the limits of its own knowledge. A product can separate “the sensor could not read it”, “there is not enough evidence” and “an anomaly was detected” into states people can understand.')],
    [t('权限与恢复 / Control', 'Permissions and recovery / Control'), t('解释之后如何继续？谁可以修改、谁可以接管、暂停后怎样恢复？把这些动作接进服务流程，比单独加一个解释按钮更完整。', 'What happens after the explanation? Who can change things, who can take over, how does one resume after a pause? Building these actions into the service flow is more complete than adding a separate explanation button.')],
    [t('不同人、不同需要 / Recipients', 'Different people, different needs / Recipients'), t('操作者要及时判断，维护者要查看细节，旁观者可能只想知道机器人会往哪里去。可以分层显示同一事件的信息。', 'An operator must judge quickly, a maintainer needs the detail, and a bystander may only want to know where the robot is going. The same event can be shown in layers.')],
    [t('运行成本 / Operational fit', 'Running cost / Operational fit'), t('解释耗时、模型更新、隐私与日志可追溯性都影响长期使用。将“为什么这样解释”的版本信息留给需要检查的人。', 'Explanation time, model updates, privacy and traceable logs all affect long-term use. Keep the version information behind “why this explanation” for the people who need to check it.')],
  ];

  return (
    <ReadingNotes>
      <div className="reading-intro">
        <div className="reading-prose">
          <span className="eyebrow">{t('从一个熟悉的时刻开始', 'Start from a familiar moment')}</span>
          <h3>{t('当一个智能产品突然停下来，你会先问什么？', 'When a smart product suddenly stops, what do you ask first?')}</h3>
          <p>
            {t(
              '“发生了什么？”“它在等我吗？”“我应该让开，还是帮它一下？”这些问题包含了状态、意图和下一步行动。对设计者来说，XAI 可以从这样的小片刻开始：找出人缺少哪一块理解，再找到系统能提供的依据。Miller 对社会科学研究的梳理指出，人的解释常常带有对比、选择和社会互动的性质；我们想知道的往往是“为什么这次这样，而不是我预想的那样”。',
              '“What just happened?” “Is it waiting for me?” “Should I step aside, or help it?” These questions contain state, intention and the next action. For designers, XAI can start from small moments like this: find which part of the understanding is missing, then find the evidence the system can provide. Miller’s review of social-science work notes that human explanations are often contrastive, selective and socially interactive. What we usually want to know is “why this happened, and not what I expected”.',
            )}
            <Cite ids={[2]} />
          </p>
          <p>
            {t(
              'Ali 等的综述帮助你把这些小问题放回更大的研究领域：模型解释与公平性、隐私、安全、稳健性等可信 AI 议题相连。入门时可以先沿着“系统怎样判断 → 人怎样理解 → 理解怎样影响行动”来读，再逐渐扩展到这些相邻问题。',
              'Ali et al.’s survey places these small questions back in the wider field, connecting model explanation to fairness, privacy, safety and robustness, the other issues of trustworthy AI. To begin, read along “how the system judges → how people understand → how understanding shapes action”, then widen to the neighbouring questions.',
            )}
            <Cite ids={[1]} />
          </p>
        </div>
        <MarginNote name="scene">
          {t('想到一个你亲身遇过、却没看懂的智能产品行为了吗？把那个时刻留下来，后面的方法会更容易对上具体用途。', 'Can you recall a smart product behaving in a way you did not understand? Keep that moment: the methods later will be easier to match to a real use.')}
        </MarginNote>
      </div>

      <div className="taxonomy-block">
        <details open>
          <summary>
            <span>
              {t('建立分类坐标', 'Set up the taxonomy')} <em>Taxonomy</em>
            </span>
            <span>{t('读论文时随手定位 ＋', 'Use it to place papers while reading ＋')}</span>
          </summary>
          <div className="taxonomy-grid">
            {taxonomy.map(([h, p]) => (
              <div key={h}>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
          <p className="caption">
            {t('综合阅读坐标，依据领域综述与解释方法评估框架整理。', 'Compiled from the field surveys and explanation-evaluation frameworks as a reading coordinate system.')}
            <Cite ids={[1, 4, 11]} />
          </p>
        </details>
      </div>

      <article className="reading-essay question-essay">
        <div>
          <span className="eyebrow">PAPER IN FOCUS · CHI 2020</span>
          <h3>{t('先收集用户的问题，解释形式就有了方向。', 'Collect users’ questions first, and the form of the explanation follows.')}</h3>
          <p>
            {t(
              'Liao、Gruen 与 Miller 访谈了 20 位 UX／设计从业者，整理出面向 XAI 体验设计的用户问题库。它很适合设计研究入门：从用户会问什么切入，再去找支持这种回答的技术。问题库同时包含输入、输出、性能等基础信息，以及 Why、Why not、What if、How to 等解释问题。',
              'Liao, Gruen and Miller interviewed 20 UX and design practitioners and compiled a bank of user questions for designing XAI experiences. It is a good entry point for design research: start from what users would ask, then look for the technology that supports answering it. The bank covers basic information such as inputs, outputs and performance, as well as explanation questions such as Why, Why not, What if and How to.',
            )}
            <Cite ids={[3]} />
          </p>
          <p>
            {t(
              '在 Liao 等人（2020）的论文中，他们将用户对 AI 的疑问归纳为多个典型类别。原论文常以医疗或贷款预测为例，为了更直观，我们这里用大家每天都在用的“智能导航软件”作为贯穿示例，看看如何把用户的自然提问，转化为界面上的设计线索：',
              'In Liao et al. (2020) the users’ questions about AI are grouped into several typical categories. The original paper often uses medical or loan examples; for something more familiar, we use a navigation app that everyone uses daily as the running example, to see how a natural question can become a design cue on the screen:',
            )}
            <Cite ids={[3]} />
          </p>
        </div>
        <dl className="reading-questions">
          <div>
            <dt>{t('为什么 / Why', 'Why')}</dt>
            <dd>{t('“为什么给我导这条路？” → 设计线索：呈现推荐依据（如展示“距离最短”或“红绿灯少”）。', '“Why this route?” → design cue: show the basis of the recommendation (e.g. “shortest distance” or “fewest traffic lights”).')}</dd>
          </div>
          <div>
            <dt>{t('为什么不 / Why not', 'Why not')}</dt>
            <dd>{t('“为什么不走我平时走的大路？” → 设计线索：对比替代选项（如主动提示“大路当前因车祸拥堵”）。', '“Why not the main road I usually take?” → design cue: compare alternatives (e.g. proactively say “the main road is congested after an accident”).')}</dd>
          </div>
          <div>
            <dt>{t('如果…… / What if', 'What if')}</dt>
            <dd>{t('“如果我晚半小时再出发会怎样？” → 设计线索：支持探索并预览未来变化（如提供时间滑块看路况预测）。', '“What if I left half an hour later?” → design cue: support exploration and preview future change (e.g. a time slider showing predicted traffic).')}</dd>
          </div>
          <div>
            <dt>{t('怎样才能 / How to', 'How to')}</dt>
            <dd>{t('“怎样才能避开所有收费站？” → 设计线索：将解释转化为可操作设置（如直接提供“避开收费站”开关）。', '“How can I avoid all toll stations?” → design cue: turn the explanation into an actionable setting (e.g. a direct “avoid tolls” switch).')}</dd>
          </div>
        </dl>
      </article>
      <MarginNote name="question">
        {t('如果你的产品只能先回答一个问题，用户最常问的会是哪一句？用用户的话写，暂时不用“透明性”“可解释性”这些研究术语。', 'If your product could answer only one question first, which sentence would users ask most often? Write it in the users’ words, without research terms such as “transparency” or “explainability” for now.')}
      </MarginNote>

      <Chapter id="methods" number="02" title={t('解释方法与论文案例', 'Explanation methods and paper cases')} summary={t('比较模型、路径、归因与局部代理，并回到论文看它们如何支持判断。', 'Compare models, paths, attribution and local surrogates, and return to the papers to see how each supports judgement.')}>
        <Head
          no="02"
          en="METHODS, MADE READABLE"
          title={t('解释方法、适用条件与论文案例。', 'Explanation methods, their conditions of use and paper cases.')}
          desc={t('先选一个与你的项目最接近的方法。每个入口都按“怎么做—看到什么—怎样用于设计”展开，可以随时切换比较。', 'Start with the method closest to your project. Each entry runs through “how it works — what you see — how to use it in design”, and you can switch between them at any time.')}
        />
        <Tabs defaultValue="treeinterpreter" className="method-tabs">
          <TabsList className="method-tablist" aria-label={t('解释方法', 'Explanation methods')}>
            {METHODS.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="method-trigger">
                {t(m.name.zh, m.name.en)}
                <small>{m.en}</small>
              </TabsTrigger>
            ))}
          </TabsList>
          {METHODS.map((m) => (
            <TabsContent key={m.id} value={m.id} className="method-panel">
              <div className="method-main">
                <span className="eyebrow">{m.en}</span>
                <h3>{t(m.question.zh, m.question.en)}</h3>
                <p>{t(m.principle.zh, m.principle.en)}</p>
                <div className="method-flow">{t(m.output.zh, m.output.en)}</div>
                <p className="method-example">{t(m.example.zh, m.example.en)}</p>
                <Cite ids={m.refs} />
              </div>
              <div className="method-aside">
                <div>
                  <span>{t('连接到设计 / IN PRACTICE', 'Connecting to design / IN PRACTICE')}</span>
                  <p>{t(m.design.zh, m.design.en)}</p>
                </div>
                <div>
                  <span>{t('理解它的适用条件 / CONTEXT', 'Understanding its conditions / CONTEXT')}</span>
                  <p>{t(m.scope.zh, m.scope.en)}</p>
                </div>
                <div className="design-take">
                  <span>{t('回到原文 / WHAT TO READ', 'Back to the source / WHAT TO READ')}</span>
                  <p>{t(m.read.zh, m.read.en)}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="comparison">
          <h3>{t('TreeInterpreter、TreeSHAP、LIME：都能给贡献，思路却不同。', 'TreeInterpreter, TreeSHAP and LIME all give contributions, but they think differently.')}</h3>
          <p>
            {t('在机器人抓取论文里碰到这三个名字时，可以先用下面这张表建立直觉，再比较它们产生的结果。', 'When these three names come up in a robot-grasping paper, use the table below to build intuition first, then compare what each one produces.')}
          </p>
          <Table>
            <TableCaption>
              {t('学习用对照，依据作者文档与原始方法论文整理。', 'A study aid compiled from the authors’ documentation and the original method papers.')}
              <Cite ids={[7, 22, 23, 26]} />
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t('方法 / Method', 'Method')}</TableHead>
                <TableHead>{t('解释怎样形成', 'How the explanation forms')}</TableHead>
                <TableHead>{t('读结果时留意什么', 'What to watch when reading the result')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>TreeInterpreter</TableCell>
                <TableCell>{t('沿实际树路径分解节点预测变化。', 'Splits the change in a node’s prediction along the actual tree path.')}</TableCell>
                <TableCell>{t('贡献与树的分裂路径有关；支持模型见作者文档。', 'Contributions depend on the tree’s split path; for supported models see the author’s documentation.')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>TreeSHAP</TableCell>
                <TableCell>{t('利用树结构计算 Shapley 归因。', 'Uses the tree structure to compute Shapley attributions.')}</TableCell>
                <TableCell>{t('看参考与特征依赖设定；不等于沿一条路径累加。', 'Depends on the reference and the feature-dependence setting; it is not a sum along a single path.')}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>LIME</TableCell>
                <TableCell>{t('用输入附近的简单代理近似原模型。', 'Approximates the original model with a simple surrogate near the input.')}</TableCell>
                <TableCell>{t('看邻域、采样和局部拟合质量。', 'Check the neighbourhood, the sampling and the quality of the local fit.')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <MarginNote name="evidence">
          {t('试着拿一个输出值问：“它相对什么发生变化？”找到基准以后，再看贡献条形图通常会清楚很多。你还会想同时查看哪一个原始输入？', 'Take one output value and ask: “relative to what did it change?” Once you have the baseline, the contribution chart usually becomes much clearer. Which original input would you also want to look at?')}
        </MarginNote>
        <div className="glossary-bridge">
          <span>{t('遇到陌生词？', 'Meet an unfamiliar term?')}</span>
          <a href="/glossary#feature">{t('特征 Feature ↗', 'Feature ↗')}</a>
          <a href="/glossary#treeinterpreter">TreeInterpreter ↗</a>
          <a href="/glossary#shap">SHAP ↗</a>
          <a href="/glossary#local-global">{t('局部与全局 ↗', 'Local and global ↗')}</a>
        </div>

        <div id="cases" className="subchapter">
          <span className="eyebrow">READING THE PAPERS</span>
          <h3>{t('把方法放回论文，看研究者具体做了什么。', 'Put the methods back in the papers, and see what the researchers actually did.')}</h3>
          <p>
            {t('下面接着读实验、图表和设计启发。论文发现与可继续发展的设计想法分别标注。', 'Next, the experiments, figures and design lessons. Findings from the papers and design ideas that can be developed further are labelled separately.')}
          </p>
        </div>
        <div className="case-grid rich-cases">
          <article className="case-card">
            <div className="case-meta">
              <span>01 / MODEL DEBUGGING</span>
              <span>KDD · 2016</span>
            </div>
            <h3>{t('狼，还是哈士奇？', 'Wolf or husky?')}</h3>
            <p className="case-terms">
              {t('虚假相关 Spurious correlation · 局部解释 Local explanation', 'Spurious correlation · Local explanation')}
            </p>
            <p>
              {t(
                'LIME 论文故意训练了一个有问题的狼／哈士奇分类器：训练样本中的狼与雪地背景关联在一起。分类器看起来能够做出一些正确预测，但它可能利用了我们并不希望它依赖的背景。解释把这个隐藏线索显示了出来。',
                'The LIME paper deliberately trained a flawed wolf-versus-husky classifier: in the training data wolves were associated with snowy backgrounds. The classifier seemed to make some correct predictions, but it may have relied on a background we did not want it to depend on. The explanation brought this hidden cue to light.',
              )}
              <Cite ids={[7]} />
            </p>
            <div className="paper-result">
              <span>{t('表 2 · 同一组参与者，看到解释前后', 'Table 2 · the same participants, before and after seeing the explanation')}</span>
              <div>
                <b>10 → 3</b>
                <p>{t('信任这个有问题分类器的人数', 'number of people who trusted the flawed classifier')}</p>
              </div>
              <div>
                <b>12 → 25</b>
                <p>{t('把“雪”识别为可能线索的人数', 'number of people who identified “snow” as a possible cue')}</p>
              </div>
            </div>
            <p>
              {t(
                '参与者是 27 位至少修过一门研究生机器学习课程的学生。他们先看 10 次预测，其中 8 次正确、2 次错误，再看解释并重新判断。这是一个具体的前后比较实验。解释的价值在这里很直观：人更能发现模型究竟在依赖什么。',
                'The participants were 27 students who had taken at least one graduate machine-learning course. They first saw 10 predictions, 8 correct and 2 wrong, then saw the explanation and judged again. This is a concrete before-and-after comparison. The value of the explanation is plain here: people were better able to see what the model was relying on.',
              )}
              <Cite ids={[7]} />
            </p>
            <p className="reading-location">
              {t('原文怎么读：§6.4 → 图 11 → 表 2。可以留意作者怎样把“相信模型”与“识别问题特征”分别记录。', 'How to read the source: §6.4 → Figure 11 → Table 2. Notice how the authors record “trusting the model” separately from “identifying the problematic feature”.')}
            </p>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>02 / HUMAN–ROBOT INTERACTION</span>
              <span>HRI · 2013</span>
            </div>
            <h3>{t('机器人走哪条路，你才能更早猜出它要拿哪个杯子？', 'Which path lets you guess sooner which cup a robot is reaching for?')}</h3>
            <p className="case-terms">
              {t('意图可读性 Legibility · 可预测性 Predictability', 'Legibility · Predictability')}
            </p>
            <p>
              {t(
                '想象桌上有三个杯子，机器人要去拿中间那个。它可以走直线——最省力，但你盯着看了一半还是猜不准，因为直线对三个杯子都"差不多公平"。或者，它先稍微偏向左边，再转向中间——路远了一点，但你只看到起步那段就能排除右边，很快猜出：是中间。',
                'Imagine three cups on a table, and a robot going for the middle one. It can move in a straight line, which is the least effort, but you stare for half the motion and still cannot tell, because a straight line is equally uninformative for all three cups. Or it can first lean slightly left and then turn to the middle: a little longer, but from the start alone you can rule out the right, and quickly guess: the middle.',
              )}
              <Cite ids={[12]} />
            </p>
            <div className="concept-pair">
              <div>
                <span>{t('可预测 / Predictable', 'Predictable')}</span>
                <strong>{t('你已知目标 → 路径符不符合预期？', 'You know the target → does the path match what you expected?')}</strong>
              </div>
              <div>
                <span>{t('意图可读 / Legible', 'Legible')}</span>
                <strong>{t('你不知目标 → 光看动作能不能猜出来？', 'You do not know the target → can you guess it from the motion alone?')}</strong>
              </div>
            </div>
            <p>
              {t(
                '论文的核心发现：这两个目标天然冲突。最短路径最可预测，却往往最难从中途读出意图。要让机器人更容易被理解，就得让它走一条"有点夸张"的路线——牺牲效率，换取可读性。实验让参与者看动作视频，分别记录"多早猜到"和"猜得对不对"，两个指标对应两个概念。',
                'The paper’s core finding: these two goals conflict by nature. The shortest path is the most predictable, yet often the hardest to read intention from midway. To make a robot easier to understand, it has to take a somewhat exaggerated route, trading efficiency for legibility. Participants watched motion videos, and the study recorded “how early they guessed” and “whether the guess was right”, which map onto the two concepts.',
              )}
              <Cite ids={[12]} />
            </p>
            <p className="reading-location">
              {t('原文怎么读：先看概念定义，再看图 6（多早猜出目标）→ 图 7（预期路径差异）。实用问题：你设计的产品动作，是让人"知道目标后觉得合理"，还是"不知道目标也能猜出来"？', 'How to read the source: first the concept definitions, then Figure 6 (how early the goal was guessed) → Figure 7 (differences from the expected path). A practical question: for an action in your product, should people find it reasonable once they know the goal, or be able to guess the goal before they know it?')}
            </p>
            <MarginNote name="expression">
              {t('你正在设计的物件里，有没有哪一段动作天然会"透露"接下来要做什么？把那段动作稍微夸大，可读性往往就上来了。', 'In the object you are designing, is there a movement that naturally reveals what comes next? Exaggerating that movement a little often makes it far more legible.')}
            </MarginNote>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>03 / CONCEPT INTERVENTION</span>
              <span>ICML · 2020</span>
            </div>
            <h3>{t('“翅膀颜色看错了，我能改吗？”', '“The wing colour is wrong. Can I fix it?”')}</h3>
            <p className="case-terms">
              {t('概念瓶颈 Concept bottleneck · 干预 Intervention', 'Concept bottleneck · Intervention')}
            </p>
            <p>
              {t(
                '以前的 AI 像个黑盒：扔进去一张鸟的照片，它直接告诉你结果。如果它认错了，你毫无办法。Koh 等人提出了一种新方法，在中间加了一层“人类能看懂的特征”：AI 会先识别“翅膀是白色的吗？”“嘴是黄色的吗？”，然后再根据这些特征去推断物种。',
                'Earlier AI was a black box: put in a photo of a bird and it simply gave the answer. If it was wrong, you had no way to respond. Koh et al. proposed adding a layer of “human-understandable concepts” in the middle: the AI first asks “is the wing white?” and “is the beak yellow?”, and then infers the species from those concepts.',
              )}
              <Cite ids={[10]} />
            </p>
            <div className="method-flow">
              {t('图像 Image → 提取中间特征（如翅膀颜色、有无骨刺） → 最终预测', 'Image → extract intermediate concepts (e.g. wing colour, presence of a bone spur) → final prediction')}
              <br />
              {t('👩‍⚕️ 人类发现特征错了 ↗ 手动纠正特征，AI 重新推断', '👩‍⚕️ a person spots a wrong concept ↗ corrects it by hand, and the AI infers again')}
            </div>
            <p>
              {t(
                '这就是“干预（Intervention）”。比如看膝关节 X 光片时，AI 错误地判断病情很严重，医生发现是因为 AI 误把阴影看成了“骨刺”。医生就可以在中间层“插手”，把“骨刺”这一项改为“无”。AI 收到这个修正后，就会立刻调整最终的病情预测。这让 AI 从死板的机器，变成了可以和专家“商量”的助手。',
                'This is “intervention”. Say an AI reads a knee X-ray as severe, and the doctor finds it mistook a shadow for a “bone spur”. The doctor can step in at the middle layer and change the “bone spur” item to “absent”. Once the AI receives this correction, it adjusts its final prediction at once. The AI becomes an assistant that can be “consulted” by experts rather than a rigid machine.',
              )}
              <Cite ids={[10]} />
            </p>
            <p className="case-design">
              <b>{t('设计延伸。', 'Design extension.')}</b>
              {t(
                '这个思路非常适合做人机协作界面。不要只给用户一个冷冰冰的最终结果，而是展示它推理的“中间步骤”。允许用户像批改作业一样，修改其中错掉的小步骤，从而纠正大结果。',
                'This idea suits human–AI collaboration interfaces well. Do not give users only a cold final result; show the “intermediate steps” of the reasoning. Let users correct the wrong small steps, as if marking homework, and so correct the overall result.',
              )}
            </p>
            <MarginNote name="agency">
              {t('你的使用者有什么知识，是模型可能缺少的？如果给他们一个可以修正的中间层，最自然的概念会是什么？', 'What knowledge do your users have that the model may lack? If you gave them an intermediate layer they could correct, what would be the most natural concept?')}
            </MarginNote>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>04 / ENGINEERING DESIGN</span>
              <span>ICED · 2025</span>
            </div>
            <h3>{t('从 556 次仿真，读懂结构参数的作用。', 'Reading the effect of structural parameters from 556 simulations.')}</h3>
            <p className="case-terms">
              {t('代理模型 Surrogate model · 参数归因 Parameter attribution', 'Surrogate model · Parameter attribution')}
            </p>
            <p>
              {t(
                'Mathieu 等研究车辆侧碰结构优化：围绕侧门槛的 14 个壁厚参数，生成 556 个有限元子模型设计方案，再训练梯度提升树预测质量比吸能表现；未见测试集上的 R² 为 0.80。代理模型让分析更轻量，TreeSHAP 帮助理解参数对预测的作用。',
                'Mathieu et al. study structural optimisation for vehicle side impact: 14 wall-thickness parameters around the side sill generated 556 finite-element sub-model designs, and a gradient-boosted tree was trained to predict specific energy absorption; R² on an unseen test set was 0.80. The surrogate model makes analysis lighter, and TreeSHAP helps understand how the parameters affect the prediction.',
              )}
              <Cite ids={[25]} />
            </p>
            <div className="paper-result engineering-result">
              <div>
                <b>14</b>
                <p>{t('壁厚参数', 'wall-thickness parameters')}</p>
              </div>
              <div>
                <b>556</b>
                <p>{t('仿真设计方案', 'simulated designs')}</p>
              </div>
              <div>
                <b>0.80</b>
                <p>{t('测试集 R²', 'test-set R²')}</p>
              </div>
            </div>
            <p>
              {t(
                '作者把多个部件的贡献汇总为 systemSHAP，也用 differenceSHAP 比较方案差异，再通过 LLM 界面支持提问和技术报告。读图 1 可以看到从仿真到解释的整条链；图 4 则展示报告中的参数比较。这里优化算法负责搜索方案，XAI 负责帮助分析预测与差异，LLM 负责组织交互。',
                'The authors sum the contributions of several components into systemSHAP, compare designs with differenceSHAP, and support questions and technical reports through an LLM interface. Figure 1 shows the whole chain from simulation to explanation; Figure 4 shows a parameter comparison in a report. Here the optimiser searches the designs, XAI helps analyse predictions and differences, and the LLM organises the interaction.',
              )}
              <Cite ids={[25]} />
            </p>
            <p className="case-design">
              <b>{t('设计延伸。', 'Design extension.')}</b>
              {t(
                '这给产品工程提供了一个很近的入口：把材料厚度、结构尺寸等设计变量变成可讨论的证据。下一步可以研究，设计师据此比较方案时是否更容易发现取舍；原论文是工程案例，并非这类用户实验。',
                'This offers product engineering a close entry point: turn design variables such as material thickness and structural dimensions into evidence people can discuss. A next step is to study whether designers find trade-offs more easily when comparing options this way; the original paper is an engineering case, not a user study of this kind.',
              )}
            </p>
          </article>
        </div>

        <div className="secondary-cases">
          <article>
            <span className="eyebrow">05 / FROM MY READING LIST</span>
            <h3>{t('抓取失败：为什么要比较三种解释器？', 'Grasp failures: why compare three explainers?')}</h3>
            <p>
              {t(
                'Alvanpour 等的研究把 LIME、TreeSHAP 和 TreeInterpreter 放在机器人抓取失败预测中比较。可检索摘要涉及三指机器人模拟抓取数据，包含关节位置、速度和力矩等信号，以及特征排序与计算开销的比较。这个问题很适合接在方法章后面读：同一个预测任务，不同解释器会突出哪些输入？',
                'Alvanpour et al. compare LIME, TreeSHAP and TreeInterpreter on predicting grasp failures for robots. The retrievable abstract refers to simulated grasping data from a three-finger robot, with signals such as joint positions, velocities and torques, and a comparison of feature rankings and computational cost. This suits reading after the methods chapter: for the same prediction task, which inputs does each explainer highlight?',
              )}
              <Cite ids={[13]} />
            </p>
            <p>
              {t(
                '阅读时可以做一张小记录：输入是什么、预测模型是什么、解释算法是什么、比较指标是什么。这样就不会把“随机森林”与“TreeInterpreter”写在同一层分类里。此处为阅读建议。',
                'While reading, keep a short note: what the input is, what the prediction model is, what the explanation algorithm is, and what the comparison metric is. That way you will not put “random forest” and “TreeInterpreter” on the same level of the taxonomy. This is a reading suggestion.',
              )}
            </p>
            <p className="source-access">
              {t('资料深度：摘要与书目信息；全文访问受限，因此这里不编写胜出方法、具体分数或实验结论。', 'Depth of source: abstract and bibliographic information only. Full text is not accessible, so this page does not state a winning method, specific scores or experimental conclusions.')}
            </p>
          </article>
          <article>
            <span className="eyebrow">06 / EDUCATION & TRAINING</span>
            <h3>{t('解释也可能是一段教学。', 'An explanation can also be a lesson.')}</h3>
            <p>
              {t(
                'Fiok 等把 XAI 放到教育与培训语境中讨论，是我原始书单中的另一个入口。对 HCI 研究者，可以带着两个学习目标读它：使用者是在学“这个 AI 如何判断”，还是在借反馈学习领域知识？两者会带来不同的交互与评估需求。',
                'Fiok et al. discuss XAI in education and training, another entry on my original reading list. For HCI researchers, read it with two learning goals in mind: is the user learning “how this AI judges”, or learning domain knowledge through feedback? The two lead to different interaction and evaluation needs.',
              )}
              <Cite ids={[17]} />
            </p>
            <p className="case-design">
              <b>{t('自拟情境。', 'A scenario of my own.')}</b>
              {t(
                '智能工具提示握持姿态有误，可能只说“角度偏大”，也可能显示当前姿态与参考姿态，再让学习者尝试调整。这里可以研究反馈是否帮助下一次独立操作，而不仅是当前一步完成。',
                'A smart tool says a grip is wrong. It may only say “the angle is too large”, or it may show the current posture next to a reference posture and let the learner try to adjust. Here one can study whether the feedback helps the next independent attempt, not only the current step.',
              )}
            </p>
            <p className="source-access">
              {t('资料深度：摘要与书目信息；上面的教学情境是设计推演，不作为该综述的实验案例。', 'Depth of source: abstract and bibliographic information only. The teaching scenario above is a design speculation, not an experimental case from the survey.')}
            </p>
          </article>
        </div>
      </Chapter>

      <MethodAtlas />

      <Chapter id="process" number="04" title={t('从场景到验证：十步参考', 'From context to validation: a ten-step reference')} summary={t('保留原始学习流程，并把场景、模型、表达与验证串成可回访的工作框架。', 'Keeps the original learning sequence and links context, model, expression and validation into a working frame you can return to.')}>
        <Head
          no="04"
          en="A REFERENCE FRAMEWORK"
          title={t('从场景到验证的十步参考。', 'A ten-step reference from context to validation.')}
          desc={t('这套顺序很适合把零散的术语串起来：从场景与人出发，经过模型、方法和表达，最后回到技术与用户验证。下面保留我最初笔记中的十个锚点，并补上每步可以留下的产出。', 'This sequence links scattered terms: start from the context and the people, go through model, method and expression, and finish with technical and user validation. Below are the ten anchors from my first notes, with the outputs each step can leave behind.')}
        />
        <div className="workflow-origin">
          <div>
            <strong>{t('我的原始笔记 / Original learning notes', 'My original learning notes / Original learning notes')}</strong>
            <p>
              {t('十步名称与顺序来自我最初整理的两页笔记；展开解释由本页结合文献补充。它是一套可反复回访的综合参考，实践中可以跳转与迭代。', 'The ten step names and their order come from two pages of notes I first made; the expanded explanations were added here with reference to the literature. It is a synthesis to revisit repeatedly, and in practice you can jump around and iterate.')}
            </p>
          </div>
          <a href="/xai-learning-workflow-reference.pdf" target="_blank" rel="noreferrer" className="outline-button">
            {t('打开原始两页 PDF ↗', 'Open the original two-page PDF ↗')}
          </a>
        </div>
        <div className="process-grid ten-steps">
          {STEPS.map((st, i) => (
            <article className="process-step" key={i} style={{ borderTop: `4px solid ${STEP_COLORS[st.tag]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className="step-no">{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: STEP_COLORS[st.tag], background: `${STEP_COLORS[st.tag]}15`, padding: '2px 8px', borderRadius: '12px' }}>
                  {t(TAG_NAME[st.tag].zh, TAG_NAME[st.tag].en)}
                </span>
              </div>
              <h3>{t(st.title.zh, st.title.en)}</h3>
              <span className="en-label">{st.en}</span>
              <p>{t(st.body.zh, st.body.en)}</p>
              <p className="step-result">{t(st.result.zh, st.result.en)}</p>
              <Cite ids={st.refs} />
            </article>
          ))}
        </div>

        <div className="workflow-deep">
          <article className="reading-prose">
            <span className="eyebrow">{t('把第 7、8 步接起来', 'Connecting steps 7 and 8')}</span>
            <h3>{t('SHAP + LLM：先有解释材料，再组织成语言。', 'SHAP + LLM: first the explanation material, then language to organise it.')}</h3>
            <p>
              {t(
                '我的原笔记记录了 Hsu 等的文字解释示例：模型预测 → SHAP 全局图 → 提取特征重要性及特征值与 SHAP 值的相关关系 → 整理表格 → 交给 ChatGPT API 生成约 100 词的解释。这条链保留下来，作为认识“解释数据”和“解释表达”两层工作的一种参考。具体操作来自我的原笔记；本页核对了论文书目信息，未重新验证全文中的每个操作细节。',
                'My original notes record a text-explanation example from Hsu et al.: model prediction → SHAP global plot → extract feature importances and the relation between feature values and SHAP values → tabulate → give to the ChatGPT API to write an explanation of about 100 words. This chain is kept as a reference for the two layers of work, “explanation data” and “explanation expression”. The specific steps come from my original notes; this page checked the bibliographic details of the paper and did not re-verify every step in the full text.',
              )}
              <Cite ids={[24]} />
            </p>
            <div className="method-flow">
              {t('预测模型 → 解释器 → 结构化证据 → LLM 语言层 → 用户阅读与追问', 'Prediction model → explainer → structured evidence → LLM language layer → the user reads and asks follow-ups')}
            </div>
            <p>
              {t(
                '对照车辆侧碰案例再读，会更容易理解组合的用途：原始工程数据通过模型与归因变得可分析，语言界面让人可以围绕这些材料提问。',
                'Read it alongside the vehicle side-impact case and the purpose of the combination becomes clearer: raw engineering data becomes analysable through a model and attributions, and the language interface lets people ask questions about that material.',
              )}
              <Cite ids={[25]} />
            </p>
            <p className="case-design">
              <b>{t('原型建议。', 'Prototype suggestion.')}</b>
              {t(
                '让每段说明能展开对应输入、贡献和参考值；生成失败时，仍能查看原始解释材料。这样便于设计评审时核对，也方便使用者进一步追问。',
                'Let each passage of explanation expand to its inputs, contributions and reference values; when generation fails, the original explanation material is still viewable. This makes review easier and lets users ask further questions.',
              )}
            </p>
          </article>
          <article className="reading-prose">
            <span className="eyebrow">{t('把第 9、10 步分开看', 'Looking at steps 9 and 10 separately')}</span>
            <h3>{t('解释算得怎样，和人学到了什么，都值得测。', 'Both how well the explanation computes and what people learn from it are worth testing.')}</h3>
            <p>
              {t(
                'Doshi-Velez 与 Kim 区分三种评估入口：在真实应用中由真实用户完成任务；在简化任务中研究人的理解；以及不直接依赖用户实验的功能性评估。它们帮助我们选择与研究问题相称的证据。',
                'Doshi-Velez and Kim distinguish three routes to evaluation: real users completing tasks in a real application; studying people’s understanding in simplified tasks; and functional evaluation that does not directly rely on user experiments. They help us choose evidence that fits the research question.',
              )}
              <Cite ids={[20]} />
            </p>
            <p>
              {t(
                'Rong 等梳理了 97 篇核心用户研究，讨论理解、信任、可用性与人机协作等评估目标。读这类综述，可以收集“别人如何把理解变成可观察的行为”，再选适合自己场景的任务。',
                'Rong et al. review 97 core user studies and discuss evaluation goals such as understanding, trust, usability and human–AI collaboration. When reading such a review, collect how others turned understanding into observable behaviour, then choose tasks that fit your own setting.',
              )}
              <Cite ids={[14]} />
            </p>
            <dl className="reading-questions">
              <div>
                <dt>{t('技术层 / Technical', 'Technical layer / Technical')}</dt>
                <dd>
                  {t('检查归因、局部拟合、稳定性与运行时间；依据方法选择测试。', 'Check attribution, local fit, stability and run time; choose tests according to the method.')}
                  <Cite ids={[4, 15]} />
                </dd>
              </div>
              <div>
                <dt>{t('理解层 / Understanding', 'Understanding layer / Understanding')}</dt>
                <dd>
                  {t('让人解释一个新案例，或预测系统下一步，再结合访谈了解判断过程。', 'Ask people to explain a new case or predict the system’s next step, and combine this with interviews to learn how they judged.')}
                  <Cite ids={[14, 20]} />
                </dd>
              </div>
              <div>
                <dt>{t('协作层 / Collaboration', 'Collaboration layer / Collaboration')}</dt>
                <dd>
                  {t('观察任务结果、错误发现与采纳行为，比较有解释和其他条件下的差异。', 'Observe task results, error detection and acceptance behaviour, and compare conditions with and without the explanation.')}
                  <Cite ids={[14]} />
                </dd>
              </div>
            </dl>
            <details className="reading-detail">
              <summary>
                {t('我笔记里的排序指标，怎样读？', 'How to read the ranking metrics in my notes?')} <span>＋</span>
              </summary>
              <p>
                {t(
                  'Kendall’s Tau 关注排序次序的对应，RBO 关注排序列表的重合并可更重视前部；运行时间关注解释开销。我的原笔记把它们放在抓取方法比较旁边。它们适合回答“方法给出的顺序相近吗、算得快吗”，而理解测验能继续回答“人读懂了吗”。这里是对我笔记中指标用途的释义，具体公式与实验设定请回到原论文。',
                  'Kendall’s Tau looks at whether the order of rankings agrees; RBO looks at how much two ranked lists overlap and can weight the top more heavily; run time looks at explanation cost. My original notes put them beside the grasp-method comparison. They help answer “are the methods’ orders similar, and are they fast?”, while a comprehension test can go on to answer “did people understand?”. This is my paraphrase of what the metrics are for; for formulas and experimental settings, go back to the original paper.',
                )}
                <Cite ids={[13]} />
              </p>
            </details>
          </article>
        </div>
        <MarginNote name="evaluation">
          {t('回想狼与哈士奇的实验：研究者把“有没有发现雪”变成了可记录的结果。你的研究里，有没有一个同样具体的“读懂了”的表现？先记下行为，再决定用什么量表。', 'Recall the wolf-and-husky study: the researchers turned “did they notice the snow?” into a recordable result. In your study, is there an equally concrete sign of “understood”? Record the behaviour first, then decide which scale to use.')}
        </MarginNote>

        <article className="situated-reading">
          <div>
            <span className="eyebrow">{t('走进真实使用 / IN THE WILD', 'Into real use / IN THE WILD')}</span>
            <h3>{t('解释进入生活后，还会遇到这些设计条件。', 'Once explanations enter everyday life, these design conditions follow.')}</h3>
            <p>
              {t(
                '下面将用户需求、Fact Sheets、NIST 原则与具身综述转成场景设计提示；例子是本页的综合推演，便于做原型时逐项对照。',
                'Below, user needs, Fact Sheets, NIST principles and the embodied-interaction survey are turned into scenario design prompts. The examples are this page’s own synthesis, so you can check them item by item when prototyping.',
              )}
              <Cite ids={[3, 4, 5, 11]} />
            </p>
          </div>
          <div className="situated-grid">
            {situated.map(([h, p]) => (
              <div key={h}>
                <h4>{h}</h4>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </article>
      </Chapter>

      <Chapter id="frontiers" number="05" title={t('研究前沿与下一步阅读', 'Research frontiers and what to read next')} summary={t('从交互解释、具身行为、机制可解释性到可信语言解释，选择下一篇该读什么。', 'From interactive explanation and embodied behaviour to mechanistic interpretability and trustworthy language explanation: choose what to read next.')}>
        <Head
          no="05"
          en="WHERE TO READ NEXT"
          title={t('研究前沿与下一步阅读。', 'Research frontiers and what to read next.')}
          desc={t('以下以 2020—2025 年代表性研究为入口，帮助选择下一步阅读方向；不是对全部最新研究的穷尽清单。', 'These entry points draw on representative studies from 2020–2025 to help choose the next direction; this is not an exhaustive list of the latest research.')}
        />
        <div className="frontier-list">
          {frontiers.map(([n, cn, en, body, refs]) => (
            <article key={n}>
              <span className="small-no">{n}</span>
              <div>
                <h3>{cn}</h3>
                <span className="en-label">{en}</span>
              </div>
              <p>
                {body}
                <Cite ids={refs} />
              </p>
            </article>
          ))}
        </div>

        <div id="studio" className="subchapter">
          <span className="eyebrow">A READING ROUTE</span>
          <h3>{t('不用一次读完，可以这样往前走。', 'You do not have to read it all at once. Move forward like this.')}</h3>
          <p>
            {t('每轮留下一个小产出，慢慢把自己的项目放进这张地图。基础术语可以随时到', 'Leave one small output each round, and slowly place your own project on this map. For basic terms, look them up any time in the')}{' '}
            <a href="/glossary">{t('Glossary 词典 ↗', 'Glossary ↗')}</a>{t(' 查阅。', '.')}
          </p>
        </div>
        <div className="reading-rounds">
          {rounds.map(([n, h, en, p, refs]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{h}</h3>
              <p className="route-reading">{en}</p>
              <p>{p}</p>
              <Cite ids={refs} />
            </article>
          ))}
        </div>

        <NotesExport />
        <div id="sources" className="subchapter sources-section">
          <span className="eyebrow">THE READING SHELF</span>
          <h3>{t('所有入口，都可以回到来源。', 'Every entry point leads back to its source.')}</h3>
          <p>
            {t('正文编号打开原始来源；词典中的定义也各自链接到对应论文或官方资料。', 'The numbers in the text open the original sources; each definition in the glossary also links to its paper or official source.')}
          </p>
        </div>
        <details className="source-index" open>
          <summary>
            {t(`全部 ${sources.length} 项文献与资料`, `All ${sources.length} sources`)} <span>{t('收起 / 展开索引 ＋', 'Collapse / expand the index ＋')}</span>
          </summary>
          <ol>
            {sources.map((s) => (
              <li key={s.id} id={'ref-' + s.id}>
                <span className="ref-no">{String(s.id).padStart(2, '0')}</span>
                <div>
                  <div className="ref-meta">
                    {s.author} · {s.year} <span>{t(s.type.zh, s.type.en)}</span>
                  </div>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗
                  </a>
                  <p>{s.venue}{'verify' in s && s.verify ? <em className="ref-verify">{t('　⚠️ 书目信息待核对，引用前请查原文', '  ⚠️ bibliographic details to be checked against the original before citing')}</em> : null}</p>
                  <p className="ref-use">{t(s.use.zh, s.use.en)}</p>
                </div>
              </li>
            ))}
          </ol>
        </details>
        <p className="caption">
          {t('资料整理：2026.09.07 · 最近修订：2026.10.13。论文内容均以转述呈现；教学算例、阅读建议与设计延伸已在相应位置说明。原始学习笔记：', 'Sources compiled 2026.09.07 · last revised 2026.10.13. Paper content is paraphrased; teaching examples, reading suggestions and design extensions are marked where they appear. Original learning notes: ')}
          <a href="/xai-learning-workflow-reference.pdf" target="_blank" rel="noreferrer">
            {t('《XAI 可解释性研究和设计流程 · 参考版》↗', 'XAI Explainability Research and Design Workflow · Reference edition ↗')}
          </a>
        </p>
      </Chapter>
    </ReadingNotes>
  );
}
