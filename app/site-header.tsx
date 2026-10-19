/* oxlint-disable next/no-html-link-for-pages */
export function SiteHeader({ glossary = false, page }: { glossary?: boolean; page?: 'case' }) {
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
      <nav aria-label="主要导航">
        <a href="/#mapping">领域与问题</a>
        <a href="/#methods">方法与案例</a>
        <a href="/#atlas">方法图鉴</a>
        <a href="/#process">流程与验证</a>
        <a href="/#frontiers">延伸阅读</a>
        <a href="/case" aria-current={page === 'case' ? 'page' : undefined}>案例实验室</a>
      </nav>
      <a className="source-nav" href={glossary || page ? '/' : '/glossary'}>
        {glossary || page ? '返回阅读指南 ↗' : '术语词典 Glossary ↗'}
      </a>
    </header>
  );
}
