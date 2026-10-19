'use client';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';

export function Tex({ tex, block = true }: { tex: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(tex, { displayMode: block, throwOnError: false, strict: 'ignore', output: 'htmlAndMathml' }), [tex, block]);
  return <span className={block ? 'tex-block' : 'tex-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}
