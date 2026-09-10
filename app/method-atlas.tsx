'use client';

import { useState } from 'react';
import { Chapter } from './chapter';

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
  const [step, setStep] = useState(0);
  const values = [20, 26, 23];
  return <div className="atlas-tree-demo">
    <div>
      <svg viewBox="0 0 540 280" role="img" aria-label={`教学树：根节点20，房间条件分裂后26，污染条件分裂后23；当前显示第${step}步。未经过的分支以灰色表示。`}>
        <path d="M270 58 L140 125 M270 58 L400 125 M140 168 L75 233 M140 168 L230 233" fill="none" stroke="#d5dbe5" strokeWidth="2" />
        <path d={step === 0 ? '' : step === 1 ? 'M270 58 L140 125' : 'M270 58 L140 125 M140 168 L230 233'} fill="none" stroke="#234fe5" strokeWidth="3" />
        <rect x="202" y="13" width="136" height="50" rx="6" fill="#234fe5" /><text x="270" y="44" textAnchor="middle" fill="white">基准值 20</text>
        <text x="154" y="88" textAnchor="middle">房间条件 RM</text>
        <rect x="85" y="124" width="110" height="46" rx="6" fill={step > 0 ? '#eaf0ff' : '#f3f5f8'} stroke={step > 0 ? '#234fe5' : '#d5dbe5'} /><text x="140" y="153" textAnchor="middle">节点值 26</text>
        <rect x="350" y="124" width="100" height="46" rx="6" fill="#f3f5f8" /><text x="400" y="153" textAnchor="middle" fill="#667085">其他分支</text>
        <text x="231" y="193" textAnchor="middle">污染条件 NOX</text>
        <rect x="17" y="233" width="116" height="40" rx="6" fill="#f3f5f8" /><text x="75" y="258" textAnchor="middle" fill="#667085">其他分支</text>
        <rect x="171" y="233" width="118" height="40" rx="6" fill={step > 1 ? '#234fe5' : '#f3f5f8'} /><text x="230" y="258" textAnchor="middle" fill={step > 1 ? 'white' : '#667085'}>预测值 23</text>
      </svg>
    </div>
    <div className="atlas-ledger" aria-live="polite">
      <span className="eyebrow">PATH DECOMPOSITION · 路径分解</span>
      <p className="atlas-equation">20 {step > 0 && <span>+ 6</span>} {step > 1 && <span>− 3</span>} = <b>{values[step]}</b></p>
      <p>{['先记录根节点的预测值，它是这棵树的基准。', '样本通过房间条件这一分裂，节点值从20变为26；差值+6归给房间特征。', '再通过污染条件分裂：23−26=−3。两次变化加上基准，正好回到叶节点预测。'][step]}</p>
      <div className="atlas-controls"><button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</button><button type="button" onClick={() => setStep(step === 2 ? 0 : step + 1)}>{step === 2 ? '重新走一遍' : '沿路径走一步 →'}</button></div>
    </div>
  </div>;
}

export function MethodAtlas() {
  return <Chapter id="atlas" number="03" title="三种解释策略图解" summary="用 LIME、TreeInterpreter 与 SHAP 的原始案例，看见解释如何生成与被误读。"><section className="section method-atlas" aria-labelledby="atlas-title">
    <div className="section-head"><div className="eyebrow">VISUAL FIELD GUIDE / 独立图鉴</div><h2 id="atlas-title">看见解释是怎样产生的。</h2><p>三个方法，三个适合它的案例。先看图建立直觉，再展开追踪输入、操作与结果。不需要先读懂公式。</p></div>
    <div className="atlas-index"><a href="#atlas-lime">01 · LIME 看扰动</a><a href="#atlas-tree">02 · TreeInterpreter 走路径</a><a href="#atlas-shap">03 · SHAP 读贡献</a></div>

    <article id="atlas-lime" className="atlas-card">
      <header><span className="eyebrow">01 / LIME · 局部代理 LOCAL SURROGATE</span><h3>它识别的是狼，还是雪？</h3><p className="atlas-takeaway"><b>核心：</b>改变输入的局部区域，看黑盒输出怎样变；这里暴露的是模型借用了雪地背景。</p></header>
      <figure className="atlas-paper-pair"><div><img src="https://arxiv.org/html/1602.04938v3/husky.png" alt="LIME论文图11a：雪地中的哈士奇，被分类器误判为狼" width="300" height="225" loading="lazy" /><span>输入 Input · 真实类别：哈士奇</span></div><div><img src="https://arxiv.org/html/1602.04938v3/exp_husky.png" alt="LIME论文图11b：解释显示与狼预测相关的雪地背景区域" width="300" height="225" loading="lazy" /><span>解释 Explanation · 背景成为线索</span></div><figcaption>论文原图 11(a–b)，不是本站运行结果。<Source href={limeSource}>Ribeiro 等，2016，§6.4</Source></figcaption></figure>
      <details className="atlas-expand"><summary>展开 <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          ['划分区域 / Superpixels', '将照片分为小区域，用“保留／遮挡”表示它们。区域不一定对应完整的动物或物体。'],
          ['生成扰动 / Perturbation', '遮挡不同区域组合，构造许多变体；逐个交给原分类器，记录目标类别的输出。'],
          ['局部拟合 / Local fit', '按与原输入的接近程度加权，拟合一个简单代理模型，同时限制解释复杂度。'],
          ['显示贡献 / Explanation', '将代理模型中支持目标类别的区域映回照片。看到的是局部近似，不是神经网络内部的直接记录。'],
        ]} />
        <p className="atlas-caption">方法流程依据论文 §3，图解为本站整理。<Source href="https://arxiv.org/html/1602.04938v3#S3">阅读算法</Source></p>
        <div className="atlas-two"><div><h4>论文观察 / Finding</h4><p>27名有机器学习背景的参与者中，提到雪地线索的人从12名增至25名；信任这个坏模型的人从10名降至3名。小样本结果不代表所有用户都会如此。</p><Source href={limeSource}>表2与实验设定</Source></div><aside><h4>放到真实场景里</h4><p>假如质检模型高亮的是拍摄台而非产品缺陷，你会先让同一产品换一个背景再测吗？这是由案例引出的设计检查，不是论文已经验证的质检结论。</p></aside></div>
        <p className="atlas-limit">别误读：一次遮挡造成的变化不等于完整的 LIME 解释；区域划分、采样和“附近”的定义都会影响结果。</p>
      </div></details>
    </article>

    <article id="atlas-tree" className="atlas-card">
      <header><span className="eyebrow">02 / TREEINTERPRETER · 树路径分解</span><h3>从根到叶，把每一次变化记下来。</h3><p className="atlas-takeaway"><b>核心：</b>沿实际经过的树路径，把每个节点值的变化归到当次分裂使用的特征。</p></header>
      <TreeWalk />
      <p className="atlas-caption">依据作者案例简化重绘。20、26、23和两次分裂均为教学设定，不是原树数值、真实房价或实验复现；图中只展开一条路径。<Source href={treeSource}>Saabas，2014</Source></p>
      <details className="atlas-expand"><summary>展开 <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          ['读取基准 / Bias', '从已经训练好的树取根节点预测值。'],
          ['追踪路径 / Decision path', '按该样本的特征值走向叶节点，记录每一步子节点值减父节点值。'],
          ['按特征累计 / Contribution', '把差值归给该次分裂使用的特征；同一特征出现多次，就累加它的差值。'],
          ['森林汇总 / Average', '对于取树预测平均值的随机森林，分别平均各树的基准和每个特征的贡献。'],
        ]} />
        <div className="atlas-formula">预测 Prediction = 基准 Bias + Σ 特征贡献 Contributions</div>
        <div className="atlas-two"><div><h4>为什么它不等于 SHAP？</h4><p>这里分配的是具体树路径上的节点变化，并没有遍历特征加入不同组合的边际贡献。两者可能都输出贡献条，但分配规则不同。</p><Source href="https://github.com/andosa/treeinterpreter">实现与支持的模型</Source></div><aside><h4>给设计者的读图提示</h4><p>“污染指标贡献 −3”是在分解这次预测，不是在承诺降低污染就能让房价上涨3。把贡献条直接改写成行动建议，会越过它能提供的证据。</p></aside></div>
        <p className="atlas-limit">来源边界：这是作者技术文章与工具实现，不是本站新增的论文实验。原文采用历史 Boston Housing 数据；此处仅解释算法机制，不把该数据集作为当代住房决策的使用建议。<Source href={treeSource}>原始案例与推导</Source></p>
      </div></details>
    </article>

    <article id="atlas-shap" className="atlas-card">
      <header><span className="eyebrow">03 / SHAP · 特征归因 FEATURE ATTRIBUTION</span><h3>一次收入预测，如何偏离参考基准？</h3><p className="atlas-takeaway"><b>核心：</b>从参考输出出发，把特征在不同组合中的边际贡献汇总为一次预测的归因。</p></header>
      <figure className="atlas-shap-figure"><img src="https://shap.readthedocs.io/en/latest/_images/example_notebooks_api_examples_plots_waterfall_3_0.png" alt="SHAP官方收入预测瀑布图：从底部基准逐项累加特征贡献，到达顶部单个样本的模型输出；红色为正贡献、蓝色为负贡献" width="900" height="650" loading="lazy" /><figcaption>官方示例原图；按原图从下往上读。横轴单位是对数几率 Log-odds，不是收入或概率百分点。<Source href={shapSource}>SHAP waterfall 文档</Source></figcaption></figure>
      <div className="atlas-reading-key"><span>① 底部：参考背景上的期望输出</span><span>② 正／负条：推高／拉低输出</span><span>③ 顶部：这个样本的最终输出</span></div>
      <details className="atlas-expand"><summary>展开 <span aria-hidden="true">⌄</span></summary><div className="atlas-expanded">
        <Flow items={[
          ['确定对象 / Target', '固定要解释的样本、模型与输出尺度。本例解释的是收入分类模型的原始分数。'],
          ['定义参考 / Background', '确定背景数据与缺失特征的处理方式。“未加入”不是一律把特征改成0。'],
          ['比较组合 / Coalitions', '概念上比较某特征加入不同特征组合前后的输出差异，按 Shapley 权重汇总。实际算法可利用模型结构高效计算。'],
          ['绘制归因 / Attribution', '把各贡献与基准放在同一输出尺度上。瀑布图的显示顺序不是模型真实的计算顺序。'],
        ]} />
        <div className="atlas-coalition" role="img" aria-label="组合机制示意：分别比较参考与参考加A，以及参考加B与参考加B加A，再汇总A的边际贡献。省略其他组合，不是该收入案例的实际计算。"><div><span>参考</span><b>→ 加入 A →</b><span>参考 + A</span><em>差值 Δ₁</em></div><div><span>参考 + B</span><b>→ 加入 A →</b><span>参考 + B + A</span><em>差值 Δ₂</em></div><p>遍历其余组合 → 加权汇总 → A 的贡献 φ<sub>A</sub></p></div>
        <p className="atlas-caption">组合机制为概念示意，A、B不指代上图的具体特征，未显示完整计算。<Source href="https://proceedings.neurips.cc/paper_files/paper/2017/hash/8a20a8621978632d76c43dfd28b67767-Abstract.html">Lundberg & Lee，2017</Source></p>
        <div className="atlas-two"><div><h4>官方案例里的反直觉之处</h4><p>文档指出，这个样本的资本收益为2,174美元，却对高收入预测产生负贡献。作者进一步查看跨样本散点图，而不是仅凭这张图推断原因。</p><Source href={shapSource}>原例与后续散点图</Source></div><aside><h4>界面该多解释哪一句？</h4><p>“贡献为负”不是说这个属性不好，也不是说改变它必然改善结果。如果用户想知道“我能怎么做”，还需要检查可行动性与真实影响，不能把归因当成承诺。</p></aside></div>
        <p className="atlas-limit">记住：SHAP 的分配性质不等于社会公平或因果证明。选定的模型、参考背景与解释设定，是读这张图的前提。</p>
      </div></details>
    </article>
  </section></Chapter>;
}
