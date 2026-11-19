'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { useEffect, useMemo, useState } from 'react';
import { SiteHeader } from '../site-header';
import { SiteFooter } from '../site-footer';
import { allTerms, glossaryGroups, glossarySources, termById, type Term } from '../glossary-data';
import { GROUP_INTRO_EN, TERM_EN } from '../glossary-en';
import { useT } from '../i18n';

function GlossaryTerm({ term }: { term: Term }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const detailsId = `${term.id}-details`;
  const definition = TERM_EN[term.id]?.def ?? term.definition;
  const note = term.note ? TERM_EN[term.id]?.note ?? term.note : undefined;
  const mechanism = TERM_EN[term.id]?.mechanism ?? term.mechanism;
  const goodFor = TERM_EN[term.id]?.goodFor ?? term.goodFor;
  const showDefinition = !term.mechanism || term.definition !== term.mechanism;

  useEffect(() => {
    const syncWithHash = () => setOpen(window.location.hash.slice(1) === term.id);
    syncWithHash();
    window.addEventListener('hashchange', syncWithHash);
    return () => window.removeEventListener('hashchange', syncWithHash);
  }, [term.id]);

  return (
    <div className="term-entry" id={term.id} data-open={open}>
      <dt>
        <div className="term-permalink">
          <button
            type="button"
            className="term-trigger"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="term-name">{t(term.zh, term.en)}</span>
            <span className="term-toggle" aria-hidden="true" />
          </button>
        </div>
        <span className="term-english">{t(term.en, term.zh)}</span>
      </dt>
      <p className="term-summary">{t(term.mechanism ?? term.definition, mechanism ?? definition)}</p>
      <dd id={detailsId} className="term-detail" data-open={open} inert={!open} aria-hidden={!open}>
        <div className="term-detail-inner">
          {goodFor && (
            <p className="term-good-for">
              <strong>{t('适用于', 'Good for')}</strong> {t(term.goodFor ?? '', goodFor)}
            </p>
          )}
          {term.mechanism && showDefinition && <p className="term-definition">{t(term.definition, definition)}</p>}
          {term.note && <p className="term-note">{t(term.note, note ?? term.note)}</p>}
          <div className="term-links">
            <a className="term-source" href={glossarySources[term.source].url} target="_blank" rel="noreferrer" title={glossarySources[term.source].title}>
              {t('定义来源 ↗', 'Source ↗')}
            </a>
            {term.related.length > 0 && <span className="term-links-label">{t('相关', 'Related')}</span>}
            {term.related.map((id) => (
              <a href={'#' + id} key={id}>
                {t(termById[id].zh, termById[id].en)}
              </a>
            ))}
          </div>
        </div>
      </dd>
    </div>
  );
}

function AzIndex() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const sorted = useMemo(() => [...allTerms].sort((a, b) => a.en.localeCompare(b.en, 'en')), []);
  const letters = useMemo(() => {
    const m = new Map<string, Term[]>();
    for (const term of sorted) {
      const c = term.en.trim()[0].toUpperCase();
      const k = /[A-Z]/.test(c) ? c : '#';
      m.set(k, [...(m.get(k) ?? []), term]);
    }
    return m;
  }, [sorted]);
  const q = query.trim().toLowerCase();
  const results = q
    ? sorted.filter((term) => (term.en + ' ' + term.zh).toLowerCase().includes(q))
    : letter
      ? letters.get(letter) ?? []
      : [];
  const open = Boolean(q || letter);
  return (
    <div className="az-index" data-open={open}>
      <div className="az-bar">
        <input
          type="search"
          className="az-search"
          placeholder={t('查找词条，中文或英文', 'Find a term, in English or Chinese')}
          aria-label={t('查找词条', 'Find a term')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setLetter(null); }}
        />
        <nav className="az-letters" aria-label={t('按首字母', 'By first letter')}>
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => (
            <button
              type="button"
              key={c}
              disabled={!letters.has(c)}
              aria-pressed={letter === c}
              onClick={() => { setQuery(''); setLetter(letter === c ? null : c); }}
            >
              {c}
            </button>
          ))}
        </nav>
      </div>
      <div className="az-panel" inert={!open} aria-hidden={!open}>
        <div className="az-panel-inner">
          {results.length === 0 && q && <p className="az-empty">{t('没有找到，换个说法试试。', 'Nothing found. Try another word.')}</p>}
          <ul className="az-results">
            {results.map((term) => (
              <li key={term.id}>
                <a href={'#' + term.id} onClick={() => { setQuery(''); setLetter(null); }}>
                  <span>{t(term.zh, term.en)}</span>
                  <small>{t(term.en, term.zh)}</small>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function useActiveTopic() {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('.glossary-group')];
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

export function GlossaryView() {
  const t = useT();
  const usedSources = [...new Set(allTerms.map((term) => term.source))];
  const active = useActiveTopic();
  return (
    <>
      <a className="skip" href="#glossary-entries">
        {t('跳到词条', 'Skip to entries')}
      </a>
      <SiteHeader glossary />
      <main className="glossary-page" id="glossary-top">
        <header className="glossary-heading">
          <span className="eyebrow">THE READING COMPANION</span>
          <h1>
            {t('术语词典', 'Glossary')} <span>{t('Glossary', '术语词典')}</span>
          </h1>
          <p className="glossary-lede">
            {t('从最基础的 AI，到论文里反复出现的词。按主题顺着读，或沿相关词条继续查。', 'From the most basic AI terms to the words that keep recurring in papers. Read by topic, or follow related entries.')}
          </p>
          <p className="glossary-note">
            {t('定义为入门释义，链接到原始论文或官方资料；例子为本页自拟。', 'Definitions are introductory and link to the original papers or official sources; examples are written for this page.')}{' '}
            <a href="/#methods">{t('回看方法与案例 ↗', 'Back to methods and cases ↗')}</a>
          </p>
        </header>
        <AzIndex />
        <div className="glossary-layout">
          <aside className="glossary-sidebar">
            <nav aria-label={t('词典主题', 'Glossary topics')}>
              {glossaryGroups.map((group, i) => (
                <a href={'#topic-' + group.id} key={group.id} aria-current={active === 'topic-' + group.id ? 'true' : undefined}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    {t(group.zh, group.en)}
                    <small>{t(group.en, group.zh)}</small>
                  </span>
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
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2>
                    {t(group.zh, group.en)}
                    <span className="group-alt">{t(group.en, group.zh)}</span>
                  </h2>
                  <p>{t(group.intro, GROUP_INTRO_EN[i] ?? group.intro)}</p>
                </header>
                <dl className="term-grid">
                  {group.terms.map((term) => (
                    <GlossaryTerm term={term} key={term.id} />
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
              {t('全部定义来源', 'All definition sources')} <span>{t('展开 ＋', 'Expand ＋')}</span>
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
      <SiteFooter />
    </>
  );
}
