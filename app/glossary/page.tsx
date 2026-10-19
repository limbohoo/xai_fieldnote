/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { GlossaryView } from './glossary-view';

export const metadata: Metadata = {
  title: 'Glossary · AI、LLM 与 XAI 中英术语词典',
  description:
    '从机器学习基础到 XAI、LLM、MLOps 与人机交互：中英定义、易混概念、例子及原始来源。',
};

export default function GlossaryPage() {
  return <GlossaryView />;
}
