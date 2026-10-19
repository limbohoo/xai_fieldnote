'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { SiteHeader } from '../site-header';
import { allTerms, glossaryGroups, glossarySources, termById } from '../glossary-data';
import { GROUP_INTRO_EN, TERM_EN } from '../glossary-en';
import { useT } from '../i18n';

export function GlossaryView() {
  const t = useT();
  const usedSources = [...new Set(allTerms.map((term) => term.source))];
  const def = (id: string, zh: string) => TERM_EN[id]?.def ?? zh;
  const note = (id: string, zh?: string) => (zh ? TERM_EN[id]?.note ?? zh : undefined);
  return (
    <>
      <a className="skip" href="#glossary-entries">
        {t('跳到词条', 'Skip to entries')}
      </a>
      <SiteHeader glossary />
      <main className="glossary-page" id="glossary-top">
        <header className="glossary-heading">
          <div>
            <span className="eyebrow">THE READING COMPANION</span>
            <h1>
              {t('术语词典', 'Glossary')} <span>Glossary</span>
            </h1>
            <p>
              {t('从最基础的 AI，到论文里反复出现的词。', 'From the most basic AI terms to the words that keep recurring in papers.')}
              <br />
              {t('按主题顺着读，或沿相关词条继续查；不用先懂技术才能开始。', 'Read by topic, or follow related entries; you do not need technical knowledge to begin.')}
            </p>
          </div>
          <div className="glossary-count">
            <b>{allTerms.length}</b>
            <span>{t(`中英词条 / ${glossaryGroups.length} 个主题`, `bilingual entries / ${glossaryGroups.length} topics`)}</span>
          </div>
        </header>
        <div className="glossary-context">
          <p>
            {t(
              '定义采用入门释义，并链接对应论文或官方资料；不同研究语境下的用法会单独说明。例子与应用提示为本页自拟。',
              'Definitions are introductory and link to the corresponding papers or official sources; uses in particular research contexts are noted separately. Examples and application notes are written for this page.',
            )}
          </p>
          <a href="/#methods">{t('带着术语回看方法与案例 ↗', 'Return to the methods and cases with these terms ↗')}</a>
        </div>
        <details className="alphabet-index">
          <summary>
            {t('按英文名称查找', 'Find by English name')} <span>{t('A—Z 索引 ＋', 'A–Z index ＋')}</span>
          </summary>
          <div>
            {[...allTerms]
              .sort((a, b) => a.en.localeCompare(b.en, 'en'))
              .map((term) => (
                <a key={term.id} href={'#' + term.id}>
                  {term.en}
                  <small>{t(term.zh, term.en)}</small>
                </a>
              ))}
          </div>
        </details>
        <div className="glossary-layout">
          <aside className="glossary-sidebar">
            <nav aria-label={t('词典主题', 'Glossary topics')}>
              {glossaryGroups.map((group, i) => (
                <a href={'#topic-' + group.id} key={group.id}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {t(group.zh, group.en)}
                    <small>{t(group.en, group.zh)}</small>
                  </span>
                  <em>{group.terms.length}</em>
                </a>
              ))}
            </nav>
            <a className="glossary-bibliography-link" href="#glossary-sources">
              {t('定义来源 ↗', 'Definition sources ↗')}
            </a>
          </aside>
          <div id="glossary-entries">
            {glossaryGroups.map((group, i) => (
              <section className="glossary-group" id={'topic-' + group.id} key={group.id}>
                <header>
                  <span className="eyebrow">
                    {String(i + 1).padStart(2, '0')} / {group.en}
                  </span>
                  <h2>{t(group.zh, group.en)}</h2>
                  <p>{t(group.intro, GROUP_INTRO_EN[i] ?? group.intro)}</p>
                </header>
                <dl className="term-grid">
                  {group.terms.map((term) => (
                    <div className="term-entry" id={term.id} key={term.id}>
                      <dt>
                        <a className="term-permalink" href={'#' + term.id} aria-label={t('链接到', 'Link to ') + t(term.zh, term.en)}>
                          {t(term.zh, term.en)}
                          <span aria-hidden="true">#</span>
                        </a>
                        <span className="term-english">{t(term.en, term.zh)}</span>
                      </dt>
                      <dd>
                        <p>{t(term.definition, def(term.id, term.definition))}</p>
                        {term.note && <p className="term-note">{t(term.note, note(term.id, term.note) ?? term.note)}</p>}
                        <div className="term-links">
                          <a href={glossarySources[term.source].url} target="_blank" rel="noreferrer" title={glossarySources[term.source].title}>
                            {t('定义参考 ↗', 'Definition source ↗')}
                          </a>
                          {term.related.map((id) => (
                            <a href={'#' + id} key={id}>
                              {t(termById[id].zh, termById[id].en)} →
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
            <h2>{t('继续查阅原始资料。', 'Keep checking the original sources.')}</h2>
            <p>
              {t(
                '各词条的“定义参考”直达下列来源。官方课程适合入门，方法论文适合继续核对定义、假设与具体计算。',
                'Each entry’s “definition source” links straight to the sources below. Official courses suit beginners; method papers suit checking definitions, assumptions and the exact calculations.',
              )}
            </p>
          </div>
          <details className="source-index">
            <summary>
              {t(`${usedSources.length} 项定义来源`, `${usedSources.length} definition sources`)} <span>{t('展开 ＋', 'Expand ＋')}</span>
            </summary>
            <ol>
              {usedSources.map((key, i) => (
                <li key={key}>
                  <span className="ref-no">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <a href={glossarySources[key].url} target="_blank" rel="noreferrer">
                      {glossarySources[key].title} ↗
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </details>
          <p className="caption">
            {t('词典整理：2026.09.08 · 中文为学习用释义，英文原词保留以便检索。', 'Glossary compiled 2026.09.08 · the Chinese is for study; English terms are kept for search.')}
            <a href="/">{t('返回 XAI 学习指南 ↗', 'Back to the XAI guide ↗')}</a>
          </p>
        </section>
      </main>
      <footer className="footer">
        <a href="/">XAI FIELDNOTES</a>
        <span>{t('定义 · 联系 · 回到情境', 'Definitions · contact · back to context')}</span>
        <a href="#glossary-top">{t('回到顶部 ↑', 'Back to top ↑')}</a>
      </footer>
    </>
  );
}
