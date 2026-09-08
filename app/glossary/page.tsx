/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { SiteHeader } from '../site-header';
import {
  allTerms,
  glossaryGroups,
  glossarySources,
  termById,
} from '../glossary-data';
export const metadata: Metadata = {
  title: 'Glossary · AI、LLM 与 XAI 中英术语词典',
  description:
    '从机器学习基础到 XAI、LLM、MLOps 与人机交互：中英定义、易混概念、例子及原始来源。',
};
export default function GlossaryPage() {
  const usedSources = [...new Set(allTerms.map((term) => term.source))];
  return (
    <>
      <a className="skip" href="#glossary-entries">
        跳到词条
      </a>
      <SiteHeader glossary />
      <main className="glossary-page" id="glossary-top">
        <header className="glossary-heading">
          <div>
            <span className="eyebrow">THE READING COMPANION</span>
            <h1>
              术语词典 <span>Glossary</span>
            </h1>
            <p>
              从最基础的 AI，到论文里反复出现的词。
              <br />
              按主题顺着读，或沿相关词条继续查；不用先懂技术才能开始。
            </p>
          </div>
          <div className="glossary-count">
            <b>{allTerms.length}</b>
            <span>中英词条 / {glossaryGroups.length} 个主题</span>
          </div>
        </header>
        <div className="glossary-context">
          <p>
            定义采用入门释义，并链接对应论文或官方资料；不同研究语境下的用法会单独说明。例子与应用提示为本页自拟。
          </p>
          <a href="/#methods">带着术语回看方法与案例 ↗</a>
        </div>
        <details className="alphabet-index">
          <summary>
            按英文名称查找 <span>A—Z 索引 ＋</span>
          </summary>
          <div>
            {[...allTerms]
              .sort((a, b) => a.en.localeCompare(b.en, 'en'))
              .map((term) => (
                <a key={term.id} href={'#' + term.id}>
                  {term.en}
                  <small>{term.zh}</small>
                </a>
              ))}
          </div>
        </details>
        <div className="glossary-layout">
          <aside className="glossary-sidebar">
            <nav aria-label="词典主题">
              {glossaryGroups.map((group, i) => (
                <a href={'#topic-' + group.id} key={group.id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {group.zh}
                    <small>{group.en}</small>
                  </span>
                  <em>{group.terms.length}</em>
                </a>
              ))}
            </nav>
            <a className="glossary-bibliography-link" href="#glossary-sources">
              定义来源 ↗
            </a>
          </aside>
          <div id="glossary-entries">
            {glossaryGroups.map((group, i) => (
              <section
                className="glossary-group"
                id={'topic-' + group.id}
                key={group.id}
              >
                <header>
                  <span className="eyebrow">
                    {String(i + 1).padStart(2, '0')} / {group.en}
                  </span>
                  <h2>{group.zh}</h2>
                  <p>{group.intro}</p>
                </header>
                <dl className="term-grid">
                  {group.terms.map((term) => (
                    <div className="term-entry" id={term.id} key={term.id}>
                      <dt>
                        <a
                          className="term-permalink"
                          href={'#' + term.id}
                          aria-label={'链接到' + term.zh}
                        >
                          {term.zh}
                          <span aria-hidden="true">#</span>
                        </a>
                        <span className="term-english">{term.en}</span>
                      </dt>
                      <dd>
                        <p>{term.definition}</p>
                        {term.note && <p className="term-note">{term.note}</p>}
                        <div className="term-links">
                          <a
                            href={glossarySources[term.source].url}
                            target="_blank"
                            rel="noreferrer"
                            title={glossarySources[term.source].title}
                          >
                            定义参考 ↗
                          </a>
                          {term.related.map((id) => (
                            <a href={'#' + id} key={id}>
                              {termById[id].zh} →
                            </a>
                          ))}
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
        <section className="glossary-sources" id="glossary-sources">
          <div className="subchapter">
            <span className="eyebrow">DEFINITION SOURCES</span>
            <h2>继续查阅原始资料。</h2>
            <p>
              各词条的“定义参考”直达下列来源。官方课程适合入门，方法论文适合继续核对定义、假设与具体计算。
            </p>
          </div>
          <details className="source-index">
            <summary>
              {usedSources.length} 项定义来源 <span>展开 ＋</span>
            </summary>
            <ol>
              {usedSources.map((key, i) => (
                <li key={key}>
                  <span className="ref-no">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <a
                      href={glossarySources[key].url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {glossarySources[key].title} ↗
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </details>
          <p className="caption">
            词典整理：2026.09.08 · 中文为学习用释义，英文原词保留以便检索。
            <a href="/">返回 XAI 学习指南 ↗</a>
          </p>
        </section>
      </main>
      <footer className="footer">
        <a href="/">XAI FIELDNOTES</a>
        <span>定义 · 联系 · 回到情境</span>
        <a href="#glossary-top">回到顶部 ↑</a>
      </footer>
    </>
  );
}
