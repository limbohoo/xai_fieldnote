/* oxlint-disable next/no-html-link-for-pages */
import type { Metadata } from 'next';
import { SiteHeader } from '../site-header';
import { CaseLab } from './case-lab';
import './case.css';

export const metadata: Metadata = {
  title: '案例实验室 · 一只猫的判断过程 | XAI Fieldnotes',
  description:
    '用一段真实的猫咪视频，一步步拆开系统怎样找到猫、量特征、和它自己比、套规则、推测，并检验解释是不是真正的依据。每一步都可以动手改。',
};

export default function CasePage() {
  return (
    <>
      <a className="skip" href="#s1">跳到第一步</a>
      <SiteHeader page="case" />
      <main className="cl-page">
        <header className="cl-hero">
          <div className="hero-top">
            <span className="eyebrow"><i /> CASE LAB · 案例实验室</span>
            <span className="edition">交互案例 / 01</span>
          </div>
          <h1>
            一只猫的耳朵压低了，
            <br />
            <span>系统是怎么判断的？</span>
          </h1>
          <p className="cl-lead">
            这是我们小组做的一个系统：它看一段猫的视频，判断猫的耳朵和身体有没有变化，并说出为什么。这一页把它的每一步拆开，让你自己拖一拖、改一改。做法借鉴 Transformer Explainer：全程只用<b>一个例子</b>（一段真实的 36 秒视频），从大概到细节一层层展开。页面里的计算和程序里的是同一套，我们逐帧核对过。
          </p>
          <p className="cl-note">
            想看完整的数学推导、并且自己运行代码：<a className="cl-link" href="https://colab.research.google.com/drive/1e41NMDHYXqvHY0a6cdBD2_nSD2krZPar" target="_blank" rel="noreferrer">打开我们的 Colab 笔记 ↗</a>
          </p>
          <ul className="cl-howto">
            <li><b>拖动顶部的进度条。</b>所有步骤看的是同一帧。</li>
            <li><b>每一步有一个可以动手的小工具。</b>改改数字，看判断怎么变。</li>
            <li><b>每一步底部可以展开“细节与验证”。</b>给想细看的人，内容来自我们的 Colab 教程。</li>
          </ul>
          <div className="cl-legend" aria-label="证据等级">
            <span className="cl-ev ev-ok">已验证</span><small>在固定的测试集或真实视频上检查过</small>
            <span className="cl-ev ev-proto">真实视频原型</span><small>只在一段视频上跑过，没有人工标注</small>
            <span className="cl-ev ev-hand">手设假设</span><small>是我们自己定的数字，还没有数据检验</small>
          </div>
          <p className="cl-note">系统<b>不会“读出猫的情绪”</b>。最后给出的只是带把握程度的猜测，把握不够就不说。</p>
        </header>
        <CaseLab />
      </main>
      <footer className="footer">
        <span>XAI FIELDNOTES · 案例实验室</span>
        <span>理解 · 判断 · 行动</span>
      </footer>
    </>
  );
}
