'use client';

import { useState } from 'react';
import { Chapter } from './chapter';
import { useT } from './i18n';

const limeSource = 'https://arxiv.org/html/1602.04938v3#S6.SS4';
const treeSource = 'https://blog.datadive.net/interpreting-random-forests/';
const shapSource = 'https://shap.readthedocs.io/en/latest/example_notebooks/api_examples/plots/waterfall.html';

function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children} ↗</a>;
}

function Flow({ items }: { items: [string, string][] }) {
  return <ol className="atlas-flow">{items.map(([title, detail], i) => <li key={title}><span className="atlas-step">0{i + 1}</span><strong>{title}</strong><p>{detail}</p></li>)}</ol>;
}

function TreeWalk() {
  const t = useT();
  const [step, setStep] = useState(0);
  const values = [20, 26, 23];
  const lines = [
    t('先记录根节点的预测值，它是这棵树的基准。', 'First record the root node’s prediction: it is this tree’s baseline.'),
    t('样本通过房间条件这一分裂，节点值从20变为26；差值+6归给房间特征。', 'The sample passes the room-count split, and the node value goes from 20 to 26; the difference, +6, is credited to the rooms feature.'),
    t('再通过污染条件分裂：23−26=−3。两次变化加上基准，正好回到叶节点预测。', 'Then the pollution split: 23 − 26 = −3. The two changes plus the baseline bring us exactly to the leaf prediction.'),
  ];
  return <div className="atlas-tree-demo">
    <div>
      <svg viewBox="0 0 540 280" role="img" aria-label={t(`教学树：根节点20，房间条件分裂后26，污染条件分裂后23；当前显示第${step}步。未经过的分支以灰色表示。`, `Teaching tree: root node 20, 26 after the room-count split, 23 after the pollution split; showing step ${step}. Branches not on the path are grey.`)}>
        <path d="M270 58 L140 125 M270 58 L400 125 M140 168 L75 233 M140 168 L230 233" fill="none" stroke="#d5dbe5" strokeWidth="2" />
        <path d={step === 0 ? '' : step === 1 ? 'M270 58 L140 125' : 'M270 58 L140 125 M140 168 L230 233'} fill="none" stroke="#234fe5" strokeWidth="3" />
        <rect x="202" y="13" width="136" height="50" rx="6" fill="#234fe5" /><text x="270" y="44" textAnchor="middle" fill="white">{t('基准值 20', 'Baseline 20')}</text>
        <text x="154" y="88" textAnchor="middle">{t('房间条件 RM', 'Rooms RM')}</text>
        <rect x="85" y="124" width="110" height="46" rx="6" fill={step > 0 ? '#eaf0ff' : '#f3f5f8'} stroke={step > 0 ? '#234fe5' : '#d5dbe5'} /><text x="140" y="153" textAnchor="middle">{t('节点值 26', 'Node value 26')}</text>
        <rect x="350" y="124" width="100" height="46" rx="6" fill="#f3f5f8" /><text x="400" y="153" textAnchor="middle" fill="#667085">{t('其他分支', 'Other branch')}</text>
        <text x="231" y="193" textAnchor="middle">{t('污染条件 NOX', 'Pollution NOX')}</text>
        <rect x="17" y="233" width="116" height="40" rx="6" fill="#f3f5f8" /><text x="75" y="258" textAnchor="middle" fill="#667085">{t('其他分支', 'Other branch')}</text>
        <rect x="171" y="233" width="118" height="40" rx="6" fill={step > 1 ? '#234fe5' : '#f3f5f8'} /><text x="230" y="258" textAnchor="middle" fill={step > 1 ? 'white' : '#667085'}>{t('预测值 23', 'Prediction 23')}</text>
      </svg>
    </div>
    <div className="atlas-ledger" aria-live="polite">
      <span className="eyebrow">PATH DECOMPOSITION · {t('路径分解', 'path decomposition')}</span>
      <p className="atlas-equation">20 {step > 0 && <span>+ 6</span>} {step > 1 && <span>− 3</span>} = <b>{values[step]}</b></p>
      <p>{lines[step]}</p>
      <div className="atlas-controls"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>{t('上一步', 'Previous')}</button><button type="button" onClick={() => setStep(step === 2 ? 0 : step + 1)}>{step === 2 ? t('重新走一遍', 'Start again') : t('沿路径走一步 →', 'One step along the path →')}</button></div>
    </div>
  </div>;
}

export function MethodAtlas() {
  const t = useT();
  return <Chapter id="atlas" number="03" title={t('三种解释策略图解', 'Three explanation strategies, illustrated')} summary={t('用 LIME、TreeInterpreter 与 SHAP 的原始案例，看见解释如何生成与被误读。', 'Using the original cases for LIME, TreeInterpreter and SHAP, see how explanations are generated and how they get misread.')}><section className="section method-atlas" aria-labelledby="atlas-title">
    <div className="section-head"><div className="eyebrow">VISUAL FIELD GUIDE / {t('独立图鉴', 'stand-alone atlas')}</div><h2 id="atlas-title">{t('看见解释是怎样产生的。', 'See how an explanation is produced.')}</h2><p>{t('三个方法，三个适合它的案例。先看图建立直觉，再展开追踪输入、操作与结果。不需要先读懂公式。', 'Three methods, three cases that suit each. Look at the pictures first to build intuition, then expand to follow inputs, operations and results. No formulas are needed to begin.')}</p></div>
    <div className="atlas-index"><a href="#atlas-lime">{t('01 · LIME 看扰动', '01 · LIME looks at perturbations')}</a><a href="#atlas-tree">{t('02 · TreeInterpreter 走路径', '02 · TreeInterpreter walks the path')}</a><a href="#atlas-shap">{t('03 · SHAP 读贡献', '03 · SHAP reads contributions')}</a></div>

    <article id="atlas-lime" className="atlas-card">
      <header><span className="eyebrow">01 / LIME · {t('局部代理', 'local surrogate')} LOCAL SURROGATE</span><h3>{t('它识别的是狼，还是雪？', 'Is it recognising the wolf, or the snow?')}</h3><p className="atlas-takeaway"><b>{t('核心：', 'Key idea: ')}</b>{t('改变输入的局部区域，看黑盒输出怎样变；这里暴露的是模型借用了雪地背景。', 'Change local regions of the input and see how the black box’s output changes; here it exposes that the model borrowed the snowy background.')}</p></header>
      <figure className="atlas-paper-pair"><div><img src="https://arxiv.org/html/1602.04938v3/husky.png" alt={t('LIME论文图11a：雪地中的哈士奇，被分类器误判为狼', 'LIME paper Figure 11a: a husky in snow, misclassified as a wolf')} width="300" height="225" loading="lazy" /><span>{t('输入 Input · 真实类别：哈士奇', 'Input · true class: husky')}</span></div><div><img src="https://arxiv.org/html/1602.04938v3/exp_husky.png" alt={t('LIME论文图11b：解释显示与狼预测相关的雪地背景区域', 'LIME paper Figure 11b: the snowy background regions linked to the wolf prediction')} width="300" height="225" loading="lazy" /><span>{t('解释 Explanation · 背景成为线索', 'Explanation · the background becomes the cue')}</span></div><figcaption>{t('论文原图 11(a–b)，不是本站运行结果。', 'Original Figure 11(a–b) from the paper, not a result run on this site.')}<Source href={limeSource}>{t('Ribeiro 等，2016，§6.4', 'Ribeiro et al., 2016, §6.4')}</Source></figcaption></figure>
      <details className="atlas-expand"><summary>{t('展开', 'Expand')} <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          [t('划分区域 / Superpixels', 'Split into regions / Superpixels'), t('将照片分为小区域，用“保留／遮挡”表示它们。区域不一定对应完整的动物或物体。', 'Divide the photo into small regions, each either kept or hidden. A region does not have to match a whole animal or object.')],
          [t('生成扰动 / Perturbation', 'Generate perturbations / Perturbation'), t('遮挡不同区域组合，构造许多变体；逐个交给原分类器，记录目标类别的输出。', 'Hide different combinations of regions to build many variants; pass each through the original classifier and record the output for the target class.')],
          [t('局部拟合 / Local fit', 'Local fit / Local fit'), t('按与原输入的接近程度加权，拟合一个简单代理模型，同时限制解释复杂度。', 'Weight the variants by how close they are to the original input, fit a simple surrogate model, and keep the explanation limited in complexity.')],
          [t('显示贡献 / Explanation', 'Show contributions / Explanation'), t('将代理模型中支持目标类别的区域映回照片。看到的是局部近似，不是神经网络内部的直接记录。', 'Map the regions that support the target class in the surrogate back onto the photo. What you see is a local approximation, not a direct record of the network’s internals.')],
        ]} />
        <p className="atlas-caption">{t('方法流程依据论文 §3，图解为本站整理。', 'The procedure follows §3 of the paper; the illustration is compiled for this site.')}<Source href="https://arxiv.org/html/1602.04938v3#S3">{t('阅读算法', 'Read the algorithm')}</Source></p>
        <p className="atlas-limit">{t('别误读：一次遮挡造成的变化不等于完整的 LIME 解释；区域划分、采样和“附近”的定义都会影响结果。', 'Do not misread: the change from one occlusion is not a full LIME explanation; how regions are split, how sampling is done and what counts as “nearby” all affect the result.')}</p>
      </div></details>
    </article>

    <article id="atlas-tree" className="atlas-card">
      <header><span className="eyebrow">02 / TREEINTERPRETER · {t('树路径分解', 'tree path decomposition')}</span><h3>{t('从根到叶，把每一次变化记下来。', 'From root to leaf, record every change.')}</h3><p className="atlas-takeaway"><b>{t('核心：', 'Key idea: ')}</b>{t('沿实际经过的树路径，把每个节点值的变化归到当次分裂使用的特征。', 'Along the actual tree path, credit the change at each node to the feature used at that split.')}</p></header>
      <TreeWalk />
      <p className="atlas-caption">{t('依据作者案例简化重绘。20、26、23和两次分裂均为教学设定，不是原树数值、真实房价或实验复现；图中只展开一条路径。', 'Simplified redraw of the author’s example. 20, 26, 23 and the two splits are teaching values, not the original tree, real house prices or a reproduction of the experiment; only one path is shown.')}<Source href={treeSource}>{t('Saabas，2014', 'Saabas, 2014')}</Source></p>
      <details className="atlas-expand"><summary>{t('展开', 'Expand')} <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          [t('读取基准 / Bias', 'Read the baseline / Bias'), t('从已经训练好的树取根节点预测值。', 'Take the root node’s prediction from the trained tree.')],
          [t('追踪路径 / Decision path', 'Trace the path / Decision path'), t('按该样本的特征值走向叶节点，记录每一步子节点值减父节点值。', 'Follow the sample’s feature values down to a leaf, recording child-node value minus parent-node value at each step.')],
          [t('按特征累计 / Contribution', 'Accumulate by feature / Contribution'), t('把差值归给该次分裂使用的特征；同一特征出现多次，就累加它的差值。', 'Credit each difference to the feature used at that split; if the same feature appears several times, add up its differences.')],
          [t('森林汇总 / Average', 'Average over the forest / Average'), t('对于取树预测平均值的随机森林，分别平均各树的基准和每个特征的贡献。', 'For a random forest that averages its trees, average each tree’s baseline and each feature’s contribution separately.')],
        ]} />
        <div className="atlas-formula">{t('预测 Prediction = 基准 Bias + Σ 特征贡献 Contributions', 'Prediction = Bias (baseline) + Σ feature contributions')}</div>
        <div className="atlas-two"><div><h4>{t('为什么它不等于 SHAP？', 'Why is it not the same as SHAP?')}</h4><p>{t('这里分配的是具体树路径上的节点变化，并没有遍历特征加入不同组合的边际贡献。两者可能都输出贡献条，但分配规则不同。', 'Here the change at each node along the actual tree path is credited; it does not go through the marginal contributions of a feature across different combinations. Both may output contribution bars, but the allocation rules differ.')}</p><Source href="https://github.com/andosa/treeinterpreter">{t('实现与支持的模型', 'Implementation and supported models')}</Source></div><aside><h4>{t('给设计者的读图提示', 'Reading tip for designers')}</h4><p>{t('“污染指标贡献 −3”是在分解这次预测，不是在承诺降低污染就能让房价上涨3。把贡献条直接改写成行动建议，会越过它能提供的证据。', '“Pollution contributes −3” decomposes this prediction; it does not promise that reducing pollution would raise house prices by 3. Rewriting a contribution bar directly as advice goes beyond the evidence it provides.')}</p></aside></div>
        <p className="atlas-limit">{t('来源：作者的技术文章与工具实现。原文用历史 Boston Housing 数据，这里只用它解释算法。', 'Source: the author’s technical article and tool. The original uses the historical Boston Housing data; here it only illustrates the algorithm.')}<Source href={treeSource}>{t('原始案例与推导', 'Original example and derivation')}</Source></p>
      </div></details>
    </article>

    <article id="atlas-shap" className="atlas-card">
      <header><span className="eyebrow">03 / SHAP · {t('特征归因', 'feature attribution')} FEATURE ATTRIBUTION</span><h3>{t('一次收入预测，如何偏离参考基准？', 'How does an income prediction move away from its reference baseline?')}</h3><p className="atlas-takeaway"><b>{t('核心：', 'Key idea: ')}</b>{t('从参考输出出发，把特征在不同组合中的边际贡献汇总为一次预测的归因。', 'Starting from a reference output, sum each feature’s marginal contribution across combinations into the attribution of one prediction.')}</p></header>
      <figure className="atlas-shap-figure"><img src="https://shap.readthedocs.io/en/latest/_images/example_notebooks_api_examples_plots_waterfall_3_0.png" alt={t('SHAP官方收入预测瀑布图：从底部基准逐项累加特征贡献，到达顶部单个样本的模型输出；红色为正贡献、蓝色为负贡献', 'Official SHAP income-prediction waterfall: starting from the baseline at the bottom, feature contributions add up to the model output for one sample at the top; red is positive, blue is negative')} width="900" height="650" loading="lazy" /><figcaption>{t('官方示例原图；按原图从下往上读。横轴单位是对数几率 Log-odds，不是收入或概率百分点。', 'The official example figure; read it from bottom to top. The horizontal unit is log-odds, not income or percentage points of probability.')}<Source href={shapSource}>{t('SHAP waterfall 文档', 'SHAP waterfall documentation')}</Source></figcaption></figure>
      <div className="atlas-reading-key"><span>{t('① 底部：参考背景上的期望输出', '① Bottom: expected output over the reference background')}</span><span>{t('② 正／负条：推高／拉低输出', '② Positive / negative bars: push the output up / down')}</span><span>{t('③ 顶部：这个样本的最终输出', '③ Top: this sample’s final output')}</span></div>
      <details className="atlas-expand"><summary>{t('展开', 'Expand')} <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          [t('确定对象 / Target', 'Fix the target / Target'), t('固定要解释的样本、模型与输出尺度。本例解释的是收入分类模型的原始分数。', 'Fix the sample to explain, the model and the output scale. This example explains the raw score of an income classification model.')],
          [t('定义参考 / Background', 'Define the reference / Background'), t('确定背景数据与缺失特征的处理方式。“未加入”不是一律把特征改成0。', 'Decide the background data and how missing features are handled. “Not included” does not simply mean setting the feature to 0.')],
          [t('比较组合 / Coalitions', 'Compare combinations / Coalitions'), t('概念上比较某特征加入不同特征组合前后的输出差异，按 Shapley 权重汇总。实际算法可利用模型结构高效计算。', 'Conceptually, compare the output difference when a feature is added to different combinations of other features, weighted by Shapley weights. Real algorithms can exploit the model’s structure to compute this efficiently.')],
          [t('绘制归因 / Attribution', 'Draw the attribution / Attribution'), t('把各贡献与基准放在同一输出尺度上。瀑布图的显示顺序不是模型真实的计算顺序。', 'Place each contribution and the baseline on the same output scale. The order of bars in a waterfall chart is not the order in which the model computes them.')],
        ]} />
        <div className="atlas-coalition" role="img" aria-label={t('组合机制示意：分别比较参考与参考加A，以及参考加B与参考加B加A，再汇总A的边际贡献。省略其他组合，不是该收入案例的实际计算。', 'Schematic of coalitions: compare the reference with reference + A, and reference + B with reference + B + A, then sum A’s marginal contributions. Other combinations are omitted; this is not the actual calculation for this income case.')}><div><span>{t('参考', 'Reference')}</span><b>→ {t('加入 A', 'add A')} →</b><span>{t('参考 + A', 'Reference + A')}</span><em>{t('差值 Δ₁', 'difference Δ₁')}</em></div><div><span>{t('参考 + B', 'Reference + B')}</span><b>→ {t('加入 A', 'add A')} →</b><span>{t('参考 + B + A', 'Reference + B + A')}</span><em>{t('差值 Δ₂', 'difference Δ₂')}</em></div><p>{t('遍历其余组合 → 加权汇总 → A 的贡献 φ', 'go through the other combinations → weighted sum → A’s contribution φ')}<sub>A</sub></p></div>
        <p className="atlas-caption">{t('组合机制为概念示意，A、B不指代上图的具体特征，未显示完整计算。', 'The coalition mechanism is conceptual. A and B do not refer to specific features in the figure above, and the full calculation is not shown.')}<Source href="https://proceedings.neurips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html">Lundberg & Lee，2017</Source></p>
        <div className="atlas-two"><div><h4>{t('官方案例里的反直觉之处', 'The counter-intuitive point in the official example')}</h4><p>{t('文档指出，这个样本的资本收益为2,174美元，却对高收入预测产生负贡献。作者进一步查看跨样本散点图，而不是仅凭这张图推断原因。', 'The documentation notes that this sample’s capital gain is $2,174 yet contributes negatively to the high-income prediction. The authors go on to look at a scatter plot across samples rather than inferring the cause from this one chart.')}</p><Source href={shapSource}>{t('原例与后续散点图', 'The original example and the follow-up scatter plot')}</Source></div><aside><h4>{t('界面该多解释哪一句？', 'Which sentence should the interface explain further?')}</h4><p>{t('“贡献为负”不是说这个属性不好，也不是说改变它必然改善结果。如果用户想知道“我能怎么做”，还需要检查可行动性与真实影响，不能把归因当成承诺。', '“Negative contribution” does not mean the attribute is bad, nor that changing it will necessarily improve the result. If users want to know “what can I do?”, check actionability and real effects too; do not treat an attribution as a promise.')}</p></aside></div>
        <p className="atlas-limit">{t('记住：SHAP 的分配性质不等于社会公平或因果证明。选定的模型、参考背景与解释设定，是读这张图的前提。', 'Remember: the allocation property of SHAP is not proof of social fairness or causation. The chosen model, the reference background and the explanation settings are the premises for reading this chart.')}</p>
      </div></details>
    </article>
  </section></Chapter>;
}
