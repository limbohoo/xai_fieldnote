'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { sources } from './sources';
import { LearningContent } from './learning-content';
import { SiteHeader } from './site-header';
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
export function FieldGuide() {
  return (
    <>
      <a className="skip" href="#mapping">
        跳到研究地图
      </a>
      <SiteHeader />
      <main>
        <section className="hero" id="intro">
          <div className="hero-top">
            <span className="eyebrow">
              <i /> A FIELD GUIDE FOR DESIGNERS & RESEARCHERS
            </span>
            <span className="edition">学习手册 / 01</span>
          </div>
          <h1>
            让智能，
            <br />
            <span>变得可以理解。</span>
          </h1>
          <div className="hero-bottom">
            <p>
              可解释人工智能 <strong>Explainable AI</strong>
              <br />
              从模型依据到人的判断，从一次解释到一段协作。
              <br />
              面向工业产品设计与人机交互的学习指南。
            </p>
            <a className="primary-link" href="#mapping">
              展开学习地图 <span>↘</span>
            </a>
          </div>
          <div className="hero-footer">
            <span>4 个阅读章节</span>
            <span>{sources.length} 项文献与资料</span>
            <span>论文细读 · 十步参考 · 随读札记</span>
            <span className="right">阅读版 / 2026.09</span>
          </div>
        </section>
        <section id="mapping" className="section">
          <Head
            no="01"
            en="MAPPING THE FIELD"
            title="先找到问题，再选择解释。"
            desc="这是一张跨层次的学习地图。算法、人的理解与实际情境，共同决定解释是否有用。"
          />
          <div className="map-grid">
            {[
              {
                letter: 'A',
                kicker: '系统 / SYSTEM',
                title: '解释的依据是什么？',
                body: '数据、模型、预测、计划与知识边界。弄清系统怎样形成判断，以及解释能够覆盖多大范围。',
                terms: '透明性 Transparency · 忠实性 Faithfulness',
                ids: [1, 5],
              },
              {
                letter: 'B',
                kicker: '人 / HUMAN',
                title: '谁需要理解什么？',
                body: '开发者排错、使用者决定是否采纳、旁观者判断行动意图。相同信息，可能需要不同解释。',
                terms: '心智模型 Mental model · 解释需求 Explanation needs',
                ids: [2, 3],
              },
              {
                letter: 'C',
                kicker: '情境 / CONTEXT',
                title: '理解之后，能做什么？',
                body: '解释进入协作：预测下一步、发现错误、纠正概念或请求接管。评价应落到实际任务。',
                terms: '能动性 Agency · 适当依赖 Appropriate reliance',
                ids: [10, 11, 14],
              },
            ].map((c) => (
              <article className="map-card" key={c.letter}>
                <div className="map-top">
                  <span>{c.kicker}</span>
                  <span className="map-letter">{c.letter}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
                <div className="terms">{c.terms}</div>
                <Cite ids={c.ids} />
              </article>
            ))}
          </div>
          <div className="editor-note">
            <span>阅读立场 / READING LENS</span>
            <p>
              可以把 XAI
              想成一位“翻译官”：AI 在黑盒里用复杂的数学矩阵做决定，而 XAI 负责把这些数字，翻译成人类能听懂的逻辑和原因。
              先顺着案例看看这位翻译官能帮上什么忙，再回到具体方法，慢慢建立你的判断。
              <Cite ids={[1, 5]} />
            </p>
          </div>
          <div className="glossary-bridge">
            <span>从基础开始</span>
            <a href="/glossary#ai">人工智能 AI ↗</a>
            <a href="/glossary#supervised">监督学习 ↗</a>
            <a href="/glossary#llm">大语言模型 LLM ↗</a>
            <a href="/glossary#mlops">MLOps ↗</a>
            <a href="#sources">文献索引 ↗</a>
          </div>
        </section>
        <LearningContent />
      </main>
      <footer className="footer">
        <span>XAI FIELDNOTES</span>
        <span>理解 · 判断 · 行动</span>
      </footer>
    </>
  );
}
