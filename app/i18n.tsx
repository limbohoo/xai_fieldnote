'use client';
/* Site-wide language: Chinese (default, the original) or English. The choice is remembered per browser. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';
const KEY = 'xai-fieldnotes-lang';

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (zh: string, en: string) => string }
const LangContext = createContext<Ctx>({ lang: 'zh', setLang: () => {}, t: (zh) => zh });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s === 'en' || s === 'zh') setLangState(s);
    } catch { /* storage may be blocked; keep the default */ }
  }, []);
  useEffect(() => { document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'; }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  };
  return <LangContext.Provider value={{ lang, setLang, t: (zh, en) => (lang === 'en' ? en : zh) }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
export const useT = () => useContext(LangContext).t;

/* The toggle: a globe with the other language's name, so the action is clear. */
export function LangToggle() {
  const { lang, setLang } = useLang();
  const next: Lang = lang === 'zh' ? 'en' : 'zh';
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLang(next)}
      aria-label={lang === 'zh' ? 'Switch to English' : '切换到中文'}
      title={lang === 'zh' ? 'Switch to English' : '切换到中文'}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z" />
      </svg>
      <span>{lang === 'zh' ? 'EN' : '中文'}</span>
    </button>
  );
}
