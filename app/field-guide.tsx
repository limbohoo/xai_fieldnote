'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { sources } from './sources';
import { LearningContent } from './learning-content';
import { Chapter } from './chapter';
import { SiteHeader } from './site-header';
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
            <span className="edition">{t('学习手册 / 01', 'Field guide / 01')}</span>
          </div>
          <h1>
            {t('让智能，', 'Make intelligence')}
            <br />
            <span>{t('变得可以理解。', 'understandable.')}</span>
          </h1>
          <div className="hero-bottom">
            <p>
              {t('可解释人工智能', 'Explainable AI')} <strong>Explainable AI</strong>
              <br />
              {t('从模型依据到人的判断，从一次解释到一段协作。', 'From the model\'s basis to a person\'s judgement, from one explanation to a working partnership.')}
              <br />
              {t('面向工业产品设计与人机交互的学习指南。', 'A learning guide for industrial product design and human–computer interaction.')}
            </p>
            <a className="primary-link" href="#mapping">
              {t('展开学习地图', 'Open the learning map')} <span>↘</span>
            </a>
          </div>
          <div className="hero-footer">
            <span>{t('5 个阅读章节', '5 reading chapters')}</span>
            <span>{t(`${sources.length} 项文献与资料`, `${sources.length} sources`)}</span>
            <span>{t('论文细读 · 十步参考 · 随读札记', 'Close reading · ten-step reference · notes')}</span>
            <span className="right">{t('阅读版 / 2026.10', 'Reading edition / 2026.10')}</span>
          </div>
        </section>
        <a className="case-banner" href="/case">
          <span className="eyebrow"><i /> {t('案例实验室 · CASE LAB', 'Case lab · CASE LAB')}</span>
          <strong>{t('互动演示：AI 如何从一段猫的视频，推测它的行为与情绪', 'Interactive demo: how an AI, from a cat video, infers behaviour and mood')}</strong>
          <span className="case-banner-copy">
            {t('用我们小组的项目做例子，共 8 步：找到猫、量出耳朵和身体的变化、套规则得到行为标签，再给出“可能是专注 / 好奇 / 放松 / 想玩 / 紧张”的占比，并检验这些解释靠不靠谱。可以拖动、点击自己试。 →', 'Using our group project as the example, in 8 steps: find the cat, measure ear and body change, apply rules to get a behaviour label, give shares for “attentive / curious / relaxed / playful / tense”, and test whether the explanations hold. Drag and click to try it yourself. →')}
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
                body: t('AI 到底是靠什么拍板的？我们要摸清它肚子里有哪些数据和规则，确保它的解释不是在“胡说八道”，而是真正反映了它的思考过程。', 'What does the AI actually decide on? We need to find out which data and rules are inside, so its explanation is not nonsense but really reflects how it reasons.'),
                terms: 'Transparency · Faithfulness',
                ids: [1, 5],
              },
              {
                letter: 'B',
                kicker: t('人 / HUMAN', 'People / HUMAN'),
                title: t('谁需要理解什么？', 'Who needs to understand what?'),
                body: t('程序员想用它找 Bug，普通用户想看它靠不靠谱。面对同一个 AI，不同的人想听到的“大白话”是完全不一样的。', 'A programmer wants to find bugs with it; an ordinary user wants to know whether to trust it. For the same AI, different people need very different plain-language answers.'),
                terms: 'Mental model · Explanation needs',
                ids: [2, 3],
              },
              {
                letter: 'C',
                kicker: t('情境 / CONTEXT', 'Context / CONTEXT'),
                title: t('理解之后，能做什么？', 'Once understood, what can be done?'),
                body: t('听懂了解释，然后呢？是为了让人能在 AI 犯傻时去纠正它，或者在关键时刻踩刹车。解释好不好用，最终得看人机配合能不能把事办成。', 'Having understood, then what? So people can correct the AI when it goes wrong, or brake at a critical moment. Whether an explanation is useful is finally judged by whether the human–machine pair gets the job done.'),
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
          <div className="editor-note">
            <span>{t('阅读立场 / READING LENS', 'Reading lens / READING LENS')}</span>
            <p>
              {t('可以把 XAI 想成一位“翻译官”：AI 在黑盒里用复杂的数学矩阵做决定，而 XAI 负责把这些数字，翻译成人类能听懂的逻辑和原因。先顺着案例看看这位翻译官能帮上什么忙，再回到具体方法，慢慢建立你的判断。', 'Think of XAI as an interpreter: the AI decides inside a black box with complex matrices, and XAI turns those numbers into logic and reasons people can follow. Follow the case first to see what the interpreter can do, then return to the methods and build your own judgement.')}
              <Cite ids={[1, 5]} />
            </p>
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
      <footer className="footer">
        <span>XAI FIELDNOTES</span>
        <span>{t('理解 · 判断 · 行动', 'Understand · judge · act')}</span>
      </footer>
    </>
  );
}
