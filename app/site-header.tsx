import Link from 'next/link';
export function SiteHeader({ glossary = false }: { glossary?: boolean }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">
          x<span>ai</span>
        </span>
        <span>
          FIELDNOTES
          <span className="brand-sub">DESIGN × HUMAN–AI INTERACTION</span>
        </span>
      </Link>
      <nav aria-label="主要导航">
        <Link href="/#mapping">领域与问题</Link>
        <Link href="/#methods">方法与案例</Link>
        <Link href="/#process">流程与验证</Link>
        <Link href="/#frontiers">延伸阅读</Link>
      </nav>
      <Link className="source-nav" href={glossary ? '/' : '/glossary'}>
        {glossary ? '返回阅读指南 ↗' : '术语词典 Glossary ↗'}
      </Link>
    </header>
  );
}
