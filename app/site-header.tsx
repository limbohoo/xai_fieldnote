'use client';
/* oxlint-disable next/no-html-link-for-pages */
/* Site navigation in two groups: the learning path (the five chapters, in reading order) and the
   worked example (the case lab and the model walkthrough), plus the glossary. Desktop shows two
   dropdowns; narrow screens get one menu panel with the same groups. */
import { useEffect, useRef, useState } from 'react';
import { LangToggle, useT } from './i18n';

type Page = 'guide' | 'glossary' | 'case' | 'model';
type Menu = 'path' | 'example' | 'mobile' | null;

const PATH = [
  { href: '/#mapping', no: '01', zh: '领域与问题', en: 'Field & questions' },
  { href: '/#methods', no: '02', zh: '方法与论文案例', en: 'Methods & papers' },
  { href: '/#atlas', no: '03', zh: '方法图鉴', en: 'Method atlas' },
  { href: '/#process', no: '04', zh: '流程与验证', en: 'Process & validation' },
  { href: '/#frontiers', no: '05', zh: '延伸阅读', en: 'Further reading' },
];

const EXAMPLE = [
  { href: '/case', page: 'case' as Page, zh: '案例实验室', en: 'Case lab', dzh: '用一段猫的视频，一步步看系统怎样判断', den: 'Follow one cat video through every step' },
  { href: '/model', page: 'model' as Page, zh: '模型图解', en: 'Model walkthrough', dzh: '3D 拆开整个模型，看每一层的公式和参数', den: 'The whole model in 3D, with formulas and parameters' },
];

export function SiteHeader({ glossary = false, page }: { glossary?: boolean; page?: 'case' | 'model' }) {
  const t = useT();
  const current: Page = glossary ? 'glossary' : page ?? 'guide';
  const [open, setOpen] = useState<Menu>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = (m: Menu) => setOpen((o) => (o === m ? null : m));
  const close = () => setOpen(null);

  const pathList = (
    <ol className="nav-path">
      {PATH.map((c) => (
        <li key={c.href}>
          <a href={c.href} onClick={close}><span className="nav-no">{c.no}</span>{t(c.zh, c.en)}</a>
        </li>
      ))}
    </ol>
  );
  const exampleList = (
    <ul className="nav-example">
      {EXAMPLE.map((e) => (
        <li key={e.href}>
          <a href={e.href} onClick={close} aria-current={current === e.page ? 'page' : undefined}>
            <strong>{t(e.zh, e.en)}</strong>
            <small>{t(e.dzh, e.den)}</small>
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <header className="topbar" ref={ref}>
      <a className="brand" href="/">
        <span className="brand-mark">
          x<span>ai</span>
        </span>
        <span>
          FIELDNOTES
          <span className="brand-sub">DESIGN × HUMAN–AI INTERACTION</span>
        </span>
      </a>

      <nav className="nav-main" aria-label={t('主要导航', 'Main navigation')}>
        <div className="nav-group">
          <button type="button" className="nav-trigger" aria-expanded={open === 'path'} aria-controls="nav-path-panel"
            data-current={current === 'guide' ? 'true' : undefined} onClick={() => toggle('path')}>
            {t('学习路径', 'Learning path')}<span className="nav-caret" aria-hidden="true">⌄</span>
          </button>
          <div id="nav-path-panel" className="nav-panel" hidden={open !== 'path'}>
            <p className="nav-hint">{t('第一次接触 XAI，按 01 → 05 读', 'New to XAI? Read 01 → 05 in order')}</p>
            {pathList}
          </div>
        </div>
        <div className="nav-group">
          <button type="button" className="nav-trigger" aria-expanded={open === 'example'} aria-controls="nav-example-panel"
            data-current={current === 'case' || current === 'model' ? 'true' : undefined} onClick={() => toggle('example')}>
            {t('学习案例', 'Worked example')}<span className="nav-caret" aria-hidden="true">⌄</span>
          </button>
          <div id="nav-example-panel" className="nav-panel" hidden={open !== 'example'}>
            <p className="nav-hint">{t('一个真实项目：会解释自己的猫咪机器人', 'One real project: a cat robot that explains itself')}</p>
            {exampleList}
          </div>
        </div>
        <a className="nav-link" href="/glossary" aria-current={current === 'glossary' ? 'page' : undefined}>
          {t('术语词典', 'Glossary')}
        </a>
      </nav>

      <LangToggle />

      <button type="button" className="nav-burger" aria-expanded={open === 'mobile'} aria-controls="nav-mobile-panel"
        aria-label={t('打开菜单', 'Open menu')} onClick={() => toggle('mobile')}>
        <span aria-hidden="true">{open === 'mobile' ? '✕' : '☰'}</span>
        <span>{t('菜单', 'Menu')}</span>
      </button>
      <div id="nav-mobile-panel" className="nav-mobile" hidden={open !== 'mobile'}>
        <p className="nav-mobile-head">{t('学习路径', 'Learning path')}</p>
        {pathList}
        <p className="nav-mobile-head">{t('学习案例', 'Worked example')}</p>
        {exampleList}
        <a className="nav-mobile-link" href="/glossary" onClick={close} aria-current={current === 'glossary' ? 'page' : undefined}>
          {t('术语词典', 'Glossary')}
        </a>
      </div>
    </header>
  );
}
