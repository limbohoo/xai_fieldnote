'use client';
/* oxlint-disable next/no-html-link-for-pages */
import { SiteHeader } from '../site-header';
import { SiteFooter } from '../site-footer';
import { useT } from '../i18n';
import { CaseLab } from './case-lab';

export function CasePage() {
  const t = useT();
  return (
    <>
      <a className="skip" href="#s1">{t('跳到第一步', 'Skip to step 1')}</a>
      <SiteHeader page="case" />
      <main className="cl-page">
        <CaseLab>
          <header className="cl-hero">
            <p className="cl-lead">
              {t(
                '这是我们小组做的一个系统：它看一段猫的视频，判断猫的耳朵和身体有没有变化，并说出为什么。这一页把它的每一步拆开，让你自己拖一拖、改一改。全程只用一段真实的 36 秒视频，从大概到细节一层层展开。页面里的规则是程序的逐行移植，1066 帧里有 1065 帧与程序的标签一致。',
                'This is a system our group built: it watches a cat video, judges whether the cat’s ears and body change, and says why. This page takes each step apart so you can drag and change things yourself. The whole page uses one real 36-second video, unfolding from the broad picture down to the detail. The rules on the page are a line-by-line port of the program; 1065 of 1066 frames match the program’s labels.',
              )}
            </p>
            <p className="cl-note">
              {t('想看完整的数学推导、并且自己运行代码：', 'For the full mathematical derivation and to run the code yourself: ')}
              <a className="cl-link" href="https://colab.research.google.com/drive/1e41NMDHYXqvHY0a6cdBD2_nSD2krZPar" target="_blank" rel="noreferrer">{t('打开我们的 Colab 笔记 ↗', 'open our Colab notebook ↗')}</a>
            </p>
            <ul className="cl-howto">
              <li><b>{t('拖动顶部的进度条。', 'Drag the progress bar at the top.')}</b>{t('所有步骤看的是同一帧。', 'Every step looks at the same frame.')}</li>
              <li><b>{t('每一步有一个可以动手的小工具。', 'Each step has a small tool you can use.')}</b>{t('改改数字，看判断怎么变。', 'Change the numbers and see how the judgement changes.')}</li>
              <li><b>{t('每一步底部可以展开“细节与验证”。', 'At the bottom of each step you can expand “details and checks”.')}</b>{t('给想细看的人，内容来自我们的 Colab 教程。', 'For those who want to look closer; the content comes from our Colab tutorial.')}</li>
            </ul>
            <div className="cl-legend" aria-label={t('证据等级', 'Evidence levels')}>
              <span className="cl-ev ev-ok">{t('已验证', 'Verified')}</span><small>{t('在固定的测试集或真实视频上检查过', 'checked on a fixed test set or real video')}</small>
              <span className="cl-ev ev-proto">{t('真实视频原型', 'Real-video prototype')}</span><small>{t('在真实视频上跑过，没有人工标注', 'run on real video, with no human annotation')}</small>
              <span className="cl-ev ev-hand">{t('手设假设', 'Hand-set hypothesis')}</span><small>{t('是我们自己定的数字，还没有数据检验', 'numbers we chose ourselves, not yet tested against data')}</small>
            </div>
            <p className="cl-note">
              {t('系统', 'The system ')}<b>{t('不读猫的情绪', 'does not read the cat’s emotions')}</b>{t('。它给出带把握程度的推测，把握不够就不说。', '. It gives guesses with a confidence level, and stays silent when unsure.')}
            </p>
          </header>
        </CaseLab>
      </main>
      <SiteFooter />
    </>
  );
}
