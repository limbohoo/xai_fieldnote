'use client';
import type { ReactNode } from 'react';
import { useT } from './i18n';

export function Chapter({
  id,
  number,
  title,
  summary,
  children,
}: {
  id: string;
  number: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <details id={id} className="chapter" open={false}>
      <summary>
        <span className="chapter-no">{number}</span>
        <span className="chapter-copy"><strong>{title}</strong><small>{summary}</small></span>
        <span className="chapter-action">{t('展开', 'Expand')} <b aria-hidden="true">⌄</b></span>
      </summary>
      <div className="chapter-body">{children}</div>
    </details>
  );
}
