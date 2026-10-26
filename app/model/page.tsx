/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { SiteHeader } from '../site-header';
import { SiteFooter } from '../site-footer';
import { Explorer } from './explorer';
import '../case/case.css';
import './model.css';

export const metadata: Metadata = {
  title: '模型的 3D 图解 · catpose | XAI Fieldnotes',
  description: '把 catpose 的九个步骤排成一摞 3D 实体：画面从下往上流过整个系统，点任何一层看它的公式、维度、参数和动手视图。',
};

export default function ModelPage() {
  return (
    <>
      <SiteHeader page="model" />
      <Explorer />
      <SiteFooter />
    </>
  );
}
