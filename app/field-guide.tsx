'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { sources } from './sources';
import { LearningContent } from './learning-content';
import { Chapter } from './chapter';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { ChapterHashOpener } from './chapter-hash';
import { useT } from './i18n';
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
  const t = useT();
  return (
    <>
      <a className="skip" href="#mapping">
        {t('跳到研究地图', 'Skip to the map')}
      </a>
      <SiteHeader />
      <ChapterHashOpener />
      <main>
        <section className="hero" id="intro">
          <div className="hero-top">
            <span className="eyebrow">
              <i /> A FIELD GUIDE FOR DESIGNERS & RESEARCHERS
            </span>
          </div>
          <h1>
            {t('让智能，', 'Make intelligence')}
            <br />
            <span>{t('变得可以理解。', 'understandable.')}</span>
          </h1>
          <div className="hero-bottom">
            <p>
              {t('可解释人工智能', '')} <strong>Explainable AI</strong>
              <br />
              {t('给第一次接触这个领域的工业设计与人机交互学习者：五章按顺序读，再用一个真实项目把方法串起来。', 'For industrial-design and HCI learners new to the field: read the five chapters in order, then follow one real project that ties the methods together.')}
            </p>
            <a className="primary-link" href="#mapping">
              {t('从 01 开始读', 'Start with 01')} <span>↘</span>
            </a>
          </div>
        </section>
        <a className="case-banner" href="/case">
          <span className="eyebrow"><i /> {t('学习案例 · 读完五章后再看', 'Worked example · after the five chapters')}</span>
          <strong>{t('互动演示：AI 如何从一段猫的视频，推测它的行为与情绪', 'Interactive demo: how an AI, from a cat video, infers behaviour and mood')}</strong>
          <span className="case-banner-copy">
            {t('我们小组的项目，8 步：找到猫，量耳朵和身体的变化，用规则得到行为标签，推测可能的状态，再检验解释是不是真正的依据。每一步都能动手改。还有一页 3D 模型图解。 →', 'Our group project in 8 steps: find the cat, measure ear and body change, get a behaviour label from rules, guess a possible state, and check that the explanation states the real evidence. Every step is hands-on. A 3D model walkthrough goes with it. →')}
          </span>
        </a>
        <Chapter id="mapping" number="01" title={t('领域、问题与阅读坐标', 'Domain, questions and reading coordinates')} summary={t('从系统依据、人的理解到真实情境，建立选择解释方法前的判断框架。', 'From the system\'s basis, to people\'s understanding, to real situations: the judgement frame to set before choosing an explanation method.')}>
          <Head
            no="01"
            en="MAPPING THE FIELD"
            title={t('先建立领域坐标，再选择解释。', 'Map the field first, then choose the explanation.')}
            desc={t('这是一张跨层次的学习地图。算法、人的理解与实际情境，共同决定解释是否有用。', 'A learning map across levels. The algorithm, people\'s understanding and the real situation together decide whether an explanation is useful.')}
          />
          <div className="map-grid">
            {[
              {
                letter: 'A',
                kicker: t('系统 / SYSTEM', 'System / SYSTEM'),
                title: t('解释的依据是什么？', 'What is the explanation based on?'),
                body: t('模型依据哪些数据和规则做出判断？解释要如实反映模型实际的计算。', 'Which data and rules does the model use to decide? An explanation has to reflect what the model actually computed.'),
                terms: 'Transparency · Faithfulness',
                ids: [1, 5],
              },
              {
                letter: 'B',
                kicker: t('人 / HUMAN', 'People / HUMAN'),
                title: t('谁需要理解什么？', 'Who needs to understand what?'),
                body: t('开发者用解释找错误，使用者用它决定信不信。同一个模型，不同的人需要不同的解释。', 'Developers use explanations to find errors; users use them to decide whether to trust the output. The same model needs different explanations for different people.'),
                terms: 'Mental model · Explanation needs',
                ids: [2, 3],
              },
              {
                letter: 'C',
                kicker: t('情境 / CONTEXT', 'Context / CONTEXT'),
                title: t('理解之后，能做什么？', 'Once understood, what can be done?'),
                body: t('理解之后，人要能纠正错误、在关键时刻接管。解释是否有用，看人和系统一起能不能完成任务。', 'After understanding, people need to be able to correct errors and take over at critical moments. An explanation is useful if people and the system complete the task together.'),
                terms: 'Agency · Appropriate reliance',
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
          <div className="glossary-bridge">
            <span>{t('从基础开始', 'Start from the basics')}</span>
            <a href="/glossary#ai">{t('人工智能 AI ↗', 'Artificial intelligence AI ↗')}</a>
            <a href="/glossary#supervised">{t('监督学习 ↗', 'Supervised learning ↗')}</a>
            <a href="/glossary#llm">{t('大语言模型 LLM ↗', 'Large language model LLM ↗')}</a>
            <a href="/glossary#mlops">MLOps ↗</a>
            <a href="#sources">{t('文献索引 ↗', 'Source index ↗')}</a>
          </div>
        </Chapter>
        <LearningContent />
      </main>
      <SiteFooter />
    </>
  );
}
