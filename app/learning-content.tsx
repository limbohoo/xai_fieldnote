'use client';
import { useEffect, useRef, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { sources } from './sources';

function Cite({ ids }: { ids: number[] }) {
  return (
    <span className="cites">
      {ids.map((id) => (
        <a
          key={id}
          href={sources[id - 1].url}
          target="_blank"
          rel="noreferrer"
          title={`${sources[id - 1].author} · ${sources[id - 1].title}`}
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
    en: 'Intrinsic',
    question: '能直接看懂系统怎样做决定吗？',
    principle:
      '在建模时使用人能检查的结构，例如浅层决策树、稀疏规则。结构复杂度与使用者的知识，会影响实际可理解程度。',
    fits: '规则明确、决策逻辑需要审查的任务。先把它作为性能与可用性的基线。',
    output: '规则 Rule → 条件 Condition → 结果 Outcome',
    limit: '“白箱”不等于人人看得懂。树很深、规则很多，仍需要面向任务的表达。',
    design: '把条件做成用户可检查的依据；检验用户能否预测边界情况。',
    refs: [1, 16],
  },
  {
    id: 'shap',
    cn: '特征归因',
    en: 'SHAP',
    question: '哪些输入推动了这次预测？',
    principle:
      '把预测相对参考值的差异分配给各项特征。Tree-SHAP 利用树结构计算归因；SHAP 是解释方法，不是预测模型。',
    fits: '表格、传感器特征及树模型的分析。明确解释的是哪个输出、使用什么参考。',
    output: '参考值 Baseline + 特征贡献 Contributions → 预测 Prediction',
    limit: '归因受参考与特征依赖假设影响；不能据此直接断言现实因果。',
    design: '将输入名称转成场景语言，同时保留正负方向、单位与比较对象。',
    refs: [6],
  },
  {
    id: 'lime',
    cn: '局部代理',
    en: 'LIME',
    question: '在这个案例附近，什么简单规则能近似模型？',
    principle:
      '扰动输入，观察模型输出，再拟合一个局部、较简单的代理模型。这个解释只描述选定邻域。',
    fits: '需要分析单个预测，且能查询模型输出的图像、文本或表格任务。',
    output: '输入扰动 Perturbations → 局部拟合 Local surrogate',
    limit: '采样和邻域定义会影响解释；附近的近似不能替代模型整体逻辑。',
    design: '给解释标明适用范围；通过其他案例检查用户是否过度泛化。',
    refs: [7],
  },
  {
    id: 'visual',
    cn: '视觉归因',
    en: 'Grad-CAM',
    question: '图像中哪些区域与这个类别输出有关？',
    principle:
      'Grad-CAM 使用目标输出的梯度对卷积特征图加权，形成类别相关的粗粒度定位图。',
    fits: '具有适合卷积层的视觉模型；可用于排查模型是否依赖背景线索。',
    output: '类别 Class → 区域定位 Localization map',
    limit: '热图不是精确分割，也不是因果证明。视觉上合理仍需模型敏感性检验。',
    design:
      '将原图与解释同时呈现，允许检查失败案例，避免用颜色强度暗示未经校准的置信度。',
    refs: [21, 15],
  },
  {
    id: 'counterfactual',
    cn: '反事实',
    en: 'Counterfactual',
    question: '改变什么，模型会给出另一种结果？',
    principle:
      '搜索能改变模型预测的替代输入。DiCE 特别考虑多个不同的候选方案与可行性。',
    fits: '用户需要探索替代条件、比较方案，或理解决策边界的任务。',
    output: '当前输入 Current → 可行改变 Change → 不同预测 Alternative',
    limit:
      '模型预测改变不保证现实结果改变；不可变特征、行动成本和因果约束必须明确。',
    design: '把“如果”与“建议采取的行动”分开，并让用户检查是否可实现。',
    refs: [8],
  },
  {
    id: 'concept',
    cn: '概念解释',
    en: 'Concept-based',
    question: '人理解的概念怎样进入模型判断？',
    principle:
      'TCAV 测试模型对用户定义概念的敏感性；概念瓶颈模型先预测概念，再以概念预测结果，支持概念层干预。',
    fits: '领域专家能够定义并验证中间概念的任务，例如鸟类属性识别。',
    output: '输入 Input → 可理解概念 Concepts → 结果 Output',
    limit:
      'TCAV 和概念瓶颈不是同一方法。概念标签、覆盖范围与干预质量都会影响结果。',
    design: '给用户一个可以纠正的中间层，而不只是展示最终答案。',
    refs: [9, 10],
  },
  {
    id: 'embodied',
    cn: '行为与意图',
    en: 'Embodied',
    question: '系统的下一步，能从行为中被理解吗？',
    principle:
      '通过动作轨迹、目光、姿态与语言传达意图。动作可预测性和意图可读性是不同的设计目标。',
    fits: '人机共处、协作装配、服务机器人及具有动作的智能产品。',
    output: '目标 Goal ↔ 动作 Motion ↔ 人的推断 Inference',
    limit:
      '这是解释与交互的设计空间，不是单一算法。社会线索有效不等于模型机制已被解释。',
    design:
      '关注动作前、动作中、失败后，分别需要表达什么，以及何时允许人介入。',
    refs: [11, 12],
  },
];
const prompts = [
  [
    'scene',
    '真实场景 / Situated task',
    '谁在什么环境中完成什么任务？出错会影响谁？',
  ],
  [
    'question',
    '解释问题 / Explanation need',
    '用户会问 Why、Why not、What if，还是 How sure？',
  ],
  [
    'evidence',
    '证据与边界 / Evidence & limits',
    '系统实际记录了什么？哪些理由无法由证据支持？',
  ],
  [
    'expression',
    '具身表达 / Embodied expression',
    '怎样用动作、声音、触觉或语言表达？谁可能看不到、听不懂？',
  ],
  ['agency', '纠正与退出 / Agency', '用户怎样纠正、撤销、暂停或拒绝系统建议？'],
  [
    'evaluation',
    '验证计划 / Evaluation',
    '用什么对照，证明理解或协作变好了？怎样识别过度依赖？',
  ],
];
const STORAGE = 'xai-fieldnotes-reflections-v1';
function Reflection() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('笔记保存在当前浏览器，不会上传。');
  const [ready, setReady] = useState(false);
  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  // Hydrate this device-local draft after SSR; browser storage is unavailable on the server.
  /* oxlint-disable react/react-compiler */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
          setNotes(
            Object.fromEntries(
              prompts.map(([key]) => [
                key,
                typeof saved[key] === 'string' ? saved[key] : '',
              ]),
            ),
          );
        }
      }
    } catch {
      setStatus('无法读取本地笔记；仍可填写并导出。');
    }
    setReady(true);
  }, []);
  /* oxlint-enable react/react-compiler */
  function update(key: string, value: string) {
    const next = { ...notes, [key]: value };
    setNotes(next);
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
      setStatus('已保存到当前浏览器 · 不跨设备同步');
    } catch {
      setStatus('本地保存不可用，请导出笔记备份。');
    }
  }
  useEffect(() => {
    const ctx = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!ctx) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        ctx.registerTool(
          {
            name: 'read_xai_reflections',
            title: '读取 XAI 学习笔记',
            description: '读取当前页面六个思考区的用户笔记；不修改内容。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute(input: unknown) {
              if (
                input === null ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object');
              return {
                notes: prompts.map(([key, title]) => ({
                  title,
                  text: notesRef.current[key] || '',
                })),
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Unsupported proposed API is optional. */
    }
    return () => lifecycle.abort();
  }, []);
  function download() {
    const text =
      '# XAI Fieldnotes · 我的研究思考\n\n' +
      prompts
        .map(
          ([key, title, q]) =>
            '## ' + title + '\n\n' + q + '\n\n' + (notes[key] || '（待思考）'),
        )
        .join('\n\n') +
      '\n\n来源与学习地图：https://xai-fieldnotes-design.limboh.chatgpt.site\n';
    const url = URL.createObjectURL(
      new Blob([text], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'XAI-我的研究思考.md';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="reflection-grid">
        {prompts.map(([key, title, q], i) => (
          <div className="reflection" key={key}>
            <label htmlFor={'note-' + key}>
              <span className="small-no">0{i + 1}</span>
              {title}
            </label>
            <p id={'hint-' + key}>{q}</p>
            <Textarea
              id={'note-' + key}
              aria-describedby={'hint-' + key}
              value={notes[key] || ''}
              disabled={!ready}
              onChange={(e) => update(key, e.target.value)}
              placeholder="从你正在研究的产品开始写……"
              className="note-input"
            />
          </div>
        ))}
      </div>
      <div className="notes-footer">
        <output>{status}</output>
        <button className="outline-button" onClick={download}>
          导出我的思考 ↓
        </button>
      </div>
    </>
  );
}
function MotionDiagram() {
  return (
    <figure className="motion-diagram">
      {/* SVG has no native equivalent for an accessible image role. */}
      <svg
        viewBox="0 0 480 165"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label="原创概念示意：两条动作路径到达同一个目标；一条直达，另一条较早向目标侧偏转，不是论文数据复现"
      >
        <defs>
          <marker
            id="arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#234fe5" />
          </marker>
        </defs>
        <line x1="240" y1="20" x2="240" y2="145" stroke="#dfe4eb" />
        <circle cx="50" cy="132" r="5" fill="#687284" />
        <circle cx="420" cy="132" r="5" fill="#687284" />
        <circle cx="180" cy="35" r="8" fill="#234fe5" />
        <circle cx="285" cy="35" r="8" fill="#234fe5" />
        <path
          d="M54 128 L170 43"
          stroke="#687284"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5 5"
        />
        <path
          d="M416 130 C280 135 292 78 287 47"
          stroke="#234fe5"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrow)"
        />
        <text x="40" y="30">
          Predictability
        </text>
        <text x="313" y="30">
          Legibility
        </text>
        <text x="83" y="150">
          知道目标 → 预期路径
        </text>
        <text x="270" y="150">
          看到路径 → 推断目标
        </text>
      </svg>
      <figcaption>
        原创关系示意 / Conceptual redraw · 非原论文图与实验轨迹
      </figcaption>
    </figure>
  );
}
export function LearningContent() {
  return (
    <>
      <div className="taxonomy-block">
        <details>
          <summary>
            <span>
              建立分类坐标 <em>Taxonomy</em>
            </span>
            <span>6 个维度，定位一篇论文 ＋</span>
          </summary>
          <div className="taxonomy-grid">
            {[
              ['对象 Object', '数据／单次预测／整体模型／行动计划／能力边界'],
              [
                '范围 Scope',
                '局部 Local：解释这一次；全局 Global：解释整体行为',
              ],
              [
                '来源 Approach',
                '内在 Intrinsic：结构可读；事后 Post-hoc：分析已训练模型',
              ],
              [
                '访问 Access',
                '模型无关 Model-agnostic／模型特定 Model-specific',
              ],
              [
                '接收者 Recipient',
                '开发者 Developer／使用者 User／受影响者 Affected person',
              ],
              [
                '表达 Medium',
                '可视化 Visualization／对话 Dialogue／具身线索 Embodied cues',
              ],
            ].map(([title, text]) => (
              <div key={title}>
                <h4>{title}</h4>
                <p>{text}</p>
              </div>
            ))}
          </div>
          <p className="caption">
            分类维度的学习性整理；可以交叉，不是互斥的学派。术语定义在不同文献间可能有所差异。
            <Cite ids={[1, 4, 11]} />
          </p>
        </details>
      </div>
      <section id="methods" className="section">
        <Head
          no="02"
          en="METHODS & MEANING"
          title="一种方法，回答一种问题。"
          desc="先想清楚想知道什么，再看输出、适用条件和证据边界。点击方法，比较它能为设计提供什么。"
        />
        <Tabs defaultValue="shap" className="method-tabs">
          <TabsList className="method-tablist">
            {methods.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="method-trigger">
                <span>{m.cn}</span>
                <small>{m.en}</small>
              </TabsTrigger>
            ))}
          </TabsList>
          {methods.map((m) => (
            <TabsContent key={m.id} value={m.id} className="method-panel">
              <div className="method-main">
                <div className="eyebrow">
                  THE QUESTION / {m.en.toUpperCase()}
                </div>
                <h3>{m.question}</h3>
                <p>{m.principle}</p>
                <div className="method-flow">{m.output}</div>
                <Cite ids={m.refs} />
              </div>
              <div className="method-aside">
                <div>
                  <span>适用 / WHEN</span>
                  <p>{m.fits}</p>
                </div>
                <div>
                  <span>边界 / LIMIT</span>
                  <p>{m.limit}</p>
                </div>
                <div className="design-take">
                  <span>设计推演 / DESIGN PROMPT</span>
                  <p>{m.design}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <p className="caption">
          以上为方法选择入口；设计推演是本页建议。技术评估应匹配方法，不能用一个指标统一排名所有解释。
          <Cite ids={[4, 20]} />
        </p>
      </section>
      <section id="cases" className="section">
        <Head
          no="03"
          en="RESEARCH IN CONTEXT"
          title="从论文里，看见设计机会。"
          desc="四个值得学习的切面：意图沟通、概念纠正、模型排错和失败诊断。案例摘要与设计迁移分开阅读。"
        />
        <div className="case-grid">
          <article className="case-card">
            <div className="case-meta">
              <span>01 / HUMAN–ROBOT INTERACTION</span>
              <span>HRI · 2013</span>
            </div>
            <h3>一条路径，也可以解释意图。</h3>
            <p className="case-terms">
              意图可读性 Legibility × 可预测性 Predictability
            </p>
            <MotionDiagram />
            <p>
              Dragan
              等区分“知道目标后预期动作”和“看到动作后推断目标”，并用机器人轨迹实验研究两者的差异。
              <Cite ids={[12]} />
            </p>
            <details>
              <summary>
                展开证据与设计迁移 <span>＋</span>
              </summary>
              <div className="case-detail">
                <h4>论文证据 / Evidence</h4>
                <p>
                  同一任务中，较可预测的轨迹未必更容易让观察者辨认目标。研究针对特定轨迹与实验情境，不等于所有产品都应使用夸张动作。
                </p>
                <h4>设计迁移 / Design proposition</h4>
                <p>
                  在协作设备行动前设计一个可辨认的起势，比较用户识别意图的准确率与所需时间，同时检查动作是否干扰任务。
                </p>
                <h4>留给你 / Reflect</h4>
                <p>你的产品需要让人提前知道“去哪里”，还是“为什么这样做”？</p>
              </div>
            </details>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>02 / HUMAN–MODEL INTERACTION</span>
              <span>ICML · 2020</span>
            </div>
            <h3>把“看懂”变成“可以纠正”。</h3>
            <p className="case-terms">概念瓶颈模型 Concept Bottleneck Models</p>
            <div className="concept-diagram">
              <span>
                输入
                <br />
                <small>Input</small>
              </span>
              <b>→</b>
              <span className="concept-node">
                概念
                <br />
                <small>Concept</small>
                <i>人可纠正 ↙</i>
              </span>
              <b>→</b>
              <span>
                预测
                <br />
                <small>Prediction</small>
              </span>
            </div>
            <p>
              Koh 等在鸟类识别与 X
              光评级任务中，将概念置于输入和预测之间；纠正概念预测可改变最终结果。
              <Cite ids={[10]} />
            </p>
            <details>
              <summary>
                展开证据与设计迁移 <span>＋</span>
              </summary>
              <div className="case-detail">
                <h4>论文证据 / Evidence</h4>
                <p>
                  实验显示概念干预有改善准确率的潜力；效果依赖概念与纠正质量。不能据此声称任意界面中的普通用户都能有效纠错。
                </p>
                <h4>设计迁移 / Design proposition</h4>
                <p>
                  让用户确认系统“看到的是什么”，再决定是否行动。原型中先用可核验概念，如“有人”“门打开”，避免直接声称“用户生气”。
                </p>
                <h4>留给你 / Reflect</h4>
                <p>什么中间判断，是你的用户有能力纠正、也愿意纠正的？</p>
              </div>
            </details>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>03 / MODEL DEBUGGING</span>
              <span>KDD · 2016</span>
            </div>
            <h3>判断正确，依据也可能有问题。</h3>
            <p className="case-terms">
              局部解释 Local explanation · 数据捷径 Shortcut
            </p>
            <div className="case-callout">
              <span>识别了动物？</span>
              <span className="callout-arrow">↘</span>
              <strong>还是依赖了背景？</strong>
            </div>
            <p>
              LIME
              论文的狼与哈士奇示例揭示了分类器对雪地背景的依赖，说明单看预测表现可能遗漏不可靠的依据。
              <Cite ids={[7]} />
            </p>
            <details>
              <summary>
                展开证据与设计迁移 <span>＋</span>
              </summary>
              <div className="case-detail">
                <h4>论文证据 / Evidence</h4>
                <p>
                  这是用于研究解释与信任判断的特定示例，不是所有视觉模型的共同结论；局部解释本身也需要检验。
                </p>
                <h4>设计迁移 / Design proposition</h4>
                <p>
                  为原型建立“换背景、换光线、换位置”的测试案例，观察模型与用户是否仍能做出合理判断。
                </p>
                <h4>留给你 / Reflect</h4>
                <p>系统是否在借助一个恰好相关、却与任务无关的线索？</p>
              </div>
            </details>
          </article>
          <article className="case-card">
            <div className="case-meta">
              <span>04 / FAILURE ANALYSIS</span>
              <span>Electronics · 2025</span>
            </div>
            <h3>先定位失败，再决定如何表达。</h3>
            <p className="case-terms">抓取失败预测 Grasp failure prediction</p>
            <div className="case-callout compact">
              <span>传感器与关节特征</span>
              <span>→</span>
              <strong>失败预测 → 归因比较</strong>
            </div>
            <p>
              Alvanpour 等用模拟抓取数据，对比 Tree-SHAP、LIME 和
              TreeInterpreter 的重要特征、排序与计算效率。
              <Cite ids={[13]} />
            </p>
            <details>
              <summary>
                展开证据与设计迁移 <span>＋</span>
              </summary>
              <div className="case-detail">
                <h4>证据边界 / Evidence limits</h4>
                <p>
                  这里依据论文摘要与可检索信息。方法之间的排序一致性不直接证明解释正确，也不能替代真实工人的理解或协作实验。
                </p>
                <h4>设计迁移 / Design proposition</h4>
                <p>
                  将诊断转成用户可行动的提示前，先验证“重新放置”“降低速度”等建议是否确实对应失败机制。
                </p>
                <h4>留给你 / Reflect</h4>
                <p>使用者看到失败原因后，能做哪一个有依据的下一步？</p>
              </div>
            </details>
          </article>
        </div>
        <p className="caption">
          图示由本页原创概括，非论文原图或实验数据复现。案例未按效果大小排名。
        </p>
      </section>
      <section id="process" className="section">
        <Head
          no="04"
          en="FROM RESEARCH TO PRACTICE"
          title="把解释，放回真实的使用过程。"
          desc="以你的两页流程笔记为基础，补入能力边界、行动时机、用户纠正与对照评估。以下是文献支持的综合工作流，并非统一行业标准。"
        />
        <div className="process-grid">
          {[
            [
              '01',
              '情境与人',
              'Context & people',
              '观察任务、利益相关者和失败后果；确认谁使用、谁受影响。',
              '产出：一段明确的使用情境。',
              [3, 4],
            ],
            [
              '02',
              '解释需求',
              'Explanation needs',
              '收集 Why / Why not / What if / How sure；确定解释会支持哪项判断。',
              '产出：优先解释的用户问题。',
              [2, 3],
            ],
            [
              '03',
              '依据与方法',
              'Evidence & method',
              '定义解释对象、模型访问和参考；比较内在可解释模型与事后方法。',
              '产出：可核验的解释依据。',
              [4, 6, 16],
            ],
            [
              '04',
              '表达与干预',
              'Expression & agency',
              '选择时机与通道；让人可以追问、纠正、暂停或拒绝。',
              '产出：交互原型与状态规则。',
              [10, 11, 12],
            ],
            [
              '05',
              '验证与迭代',
              'Evaluate & iterate',
              '分别检验解释忠实性、用户理解与协作效果；用失败案例迭代。',
              '产出：证据、局限与下一轮问题。',
              [14, 15, 20],
            ],
          ].map(([n, cn, en, body, result, ids]) => (
            <article className="process-step" key={String(n)}>
              <span className="step-no">{String(n)}</span>
              <h3>{String(cn)}</h3>
              <span className="en-label">{String(en)}</span>
              <p>{String(body)}</p>
              <p className="step-result">{String(result)}</p>
              <Cite ids={ids as number[]} />
            </article>
          ))}
        </div>
        <div className="practice-grid">
          <div>
            <h3>进入真实场景前，问这四件事。</h3>
            <p className="caption">
              应用设计检查 / Design synthesis <Cite ids={[3, 4, 5, 11]} />
            </p>
            <dl className="questions">
              <div>
                <dt>
                  谁在场？<span>Stakeholders</span>
                </dt>
                <dd>操作者、旁观者、受影响的人，是否需要不同程度的信息？</dd>
              </div>
              <div>
                <dt>
                  何时解释？<span>Timing</span>
                </dt>
                <dd>
                  行动前传达意图；行动中表达变化；失败后支持恢复。紧急时是否来得及读？
                </dd>
              </div>
              <div>
                <dt>
                  怎样被感知？<span>Modality</span>
                </dt>
                <dd>
                  声音会不会打扰别人？颜色是否成为唯一线索？动作是否会被误读？
                </dd>
              </div>
              <div>
                <dt>
                  何时交还控制？<span>Knowledge limits</span>
                </dt>
                <dd>
                  面对陌生情境、传感器失效或判断不可靠时，怎样表达边界并请求介入？
                </dd>
              </div>
            </dl>
          </div>
          <div className="evaluation">
            <h3>每个研究主张，都配一种证据。</h3>
            <div className="eval-row">
              <strong>
                解释忠实 <small>Faithfulness</small>
              </strong>
              <p>
                针对方法设计模型参数、输入或概念干预；漂亮图像不足以证明忠实。
                <Cite ids={[15]} />
              </p>
            </div>
            <div className="eval-row">
              <strong>
                用户理解 <small>Understanding</small>
              </strong>
              <p>
                让用户预测新案例、识别失败条件；结合理解测验与访谈。
                <Cite ids={[14, 20]} />
              </p>
            </div>
            <div className="eval-row">
              <strong>
                适当依赖 <small>Appropriate reliance</small>
              </strong>
              <p>
                分别观察 AI 正确和错误时的采纳与拒绝，并检查任务表现。
                <Cite ids={[14]} />
              </p>
            </div>
            <p className="eval-proposal">
              <b>实验设计建议</b> 比较“无解释／解释 A／解释
              B”，尽量保持预测与任务条件相同。先明确主要指标，再决定样本与分析方式。
            </p>
          </div>
        </div>
        <div className="editor-note">
          <span>方法警觉 / CRITICAL NOTE</span>
          <p>
            Kendall’s Tau、RBO
            关注排序相似性；一致性不是正确性的充分证据。反事实成立、用户喜欢、信任提升，也分别不等同于现实因果、真实理解或更好的决策。
            <Cite ids={[8, 14, 20]} />
          </p>
        </div>
      </section>
      <section id="frontiers" className="section">
        <Head
          no="05"
          en="OPEN QUESTIONS"
          title="前沿，往往是尚未解决的关系。"
          desc="以下是与你的设计研究相关的前沿入口，以 2020–2025 年代表性研究为锚点；不声称覆盖截至今日的全部最新成果。"
        />
        <div className="frontier-list">
          {[
            [
              '01',
              '从解释到协商',
              'Interactive & contestable explanations',
              '怎样让人追问、纠正中间概念，并理解纠正后的影响？',
              '概念干预已有实验基础；跨人群、跨情境的有效交互仍需要验证。',
              [3, 10],
            ],
            [
              '02',
              '从单次输出到持续行动',
              'Situated & embodied explainability',
              '一个持续行动的产品，怎样表达目标、变化和不确定性？',
              '社会线索与轨迹研究提供入口；真实环境中的长期理解不能由短时实验直接推断。',
              [11, 12],
            ],
            [
              '03',
              '从输入贡献到内部机制',
              'Mechanistic interpretability',
              '能否追踪语言模型内部哪些特征与计算共同产生结果？',
              '2025 年的归因图研究用于 Claude 3.5 Haiku，结合干预检验机制假设；它是局部研究工具，并非完整读心。',
              [18],
            ],
            [
              '04',
              '从流畅说明到可信理由',
              'Faithful language explanations',
              '系统说出的理由，与真正影响结果的依据一致吗？',
              '思维链忠实性实验提示文字理由可能遗漏实际线索。LLM 可做表达层，也可以本身成为被解释的对象。',
              [19],
            ],
          ].map(([n, cn, en, q, body, ids]) => (
            <article key={String(n)}>
              <span className="small-no">{String(n)}</span>
              <div>
                <h3>{String(cn)}</h3>
                <span className="en-label">{String(en)}</span>
              </div>
              <div>
                <p className="frontier-question">{String(q)}</p>
                <p>
                  {String(body)}
                  <Cite ids={ids as number[]} />
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="education-note">
          <span>另一个应用入口 / EDUCATION & TRAINING</span>
          <p>
            教育与培训中的解释需求取决于学习目标和接收者。阅读 Fiok
            等的综述时，可以追问：解释是在帮助学习者理解系统，还是帮助其学会领域知识？两种结果应分别评估。后一句为本页阅读建议。
            <Cite ids={[17]} />
          </p>
        </div>
      </section>
      <section id="studio" className="section studio">
        <Head
          no="06"
          en="SPACE TO THINK"
          title="把地图，变成你的研究问题。"
          desc="选择一个真实产品或交互场景。先写一个暂时的答案，读完案例后再回来修改。这里没有标准答案。"
        />
        <Reflection />
      </section>
      <section id="sources" className="section sources-section">
        <Head
          no="↗"
          en="THE READING SHELF"
          title="带着问题，回到原文。"
          desc="编号引用直接打开来源。文献索引保留英文原题，便于检索；设计推演、原创图示与综合流程均不作为论文直接结论。"
        />
        <div className="reading-path">
          <span>建议阅读顺序 / START HERE</span>
          {[
            [1, '看全景'],
            [2, '理解人'],
            [3, '定义问题'],
            [11, '进入具身'],
            [14, '设计评估'],
          ].map(([id, label]) => (
            <a
              href={sources[Number(id) - 1].url}
              target="_blank"
              rel="noreferrer"
              key={id}
            >
              <b>{String(label)}</b>
              <small>{sources[Number(id) - 1].author} ↗</small>
            </a>
          ))}
        </div>
        <details className="source-index">
          <summary>
            全部 21 篇文献与来源说明 <span>展开索引 ＋</span>
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
        <p className="provenance">
          整理依据：用户提供的《XAI
          可解释性研究与设计流程图》两页参考笔记，以及以上论文、机构报告与原始研究页面。笔记是综合学习框架；本页未上传原
          PDF。核验日期：2026 年 9 月 7
          日。文献索引注明了部分仅依据摘要的条目；文章链接可能需要机构访问。
        </p>
      </section>
    </>
  );
}
