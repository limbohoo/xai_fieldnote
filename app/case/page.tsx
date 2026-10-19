/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { CasePage } from './case-page';
import './case.css';

export const metadata: Metadata = {
  title: '案例实验室 · 一只猫的判断过程 | XAI Fieldnotes',
  description:
    '用一段真实的猫咪视频，一步步拆开系统怎样找到猫、量特征、和它自己比、套规则、推测，并检验解释是不是真正的依据。每一步都可以动手改。',
};

export default function CaseRoute() {
  return <CasePage />;
}
