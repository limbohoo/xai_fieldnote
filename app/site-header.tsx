'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { LangToggle, useT } from './i18n';

export function SiteHeader({ glossary = false, page }: { glossary?: boolean; page?: 'case' | 'model' }) {
  const t = useT();
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">
          x<span>ai</span>
        </span>
        <span>
          FIELDNOTES
          <span className="brand-sub">DESIGN × HUMAN–AI INTERACTION</span>
        </span>
      </a>
      <nav aria-label={t('主要导航', 'Main navigation')}>
        <a href="/#mapping">{t('领域与问题', 'Domain & questions')}</a>
        <a href="/#methods">{t('方法与案例', 'Methods & cases')}</a>
        <a href="/#atlas">{t('方法图鉴', 'Method atlas')}</a>
        <a href="/#process">{t('流程与验证', 'Process & validation')}</a>
        <a href="/#frontiers">{t('延伸阅读', 'Further reading')}</a>
        <a href="/case" aria-current={page === 'case' ? 'page' : undefined}>{t('案例实验室', 'Case lab')}</a>
        <a href="/model" aria-current={page === 'model' ? 'page' : undefined}>{t('模型图解', 'Model walkthrough')}</a>
      </nav>
      <a className="source-nav" href={glossary || page ? '/' : '/glossary'}>
        {glossary || page ? t('返回阅读指南 ↗', 'Back to the guide ↗') : t('术语词典 Glossary ↗', 'Glossary ↗')}
      </a>
      <LangToggle />
    </header>
  );
}
