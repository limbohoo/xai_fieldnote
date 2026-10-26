'use client';
/* Site-wide footer: who made the site, where the worked example comes from, and whose material it uses. */
import { useT } from './i18n';

const UPDATED = '2026-10-26';

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <strong>XAI FIELDNOTES</strong>
          <p>{t('可解释 AI 的学习指南，写给第一次接触这个领域的工业设计与人机交互学习者。', 'A learning guide to explainable AI for industrial-design and HCI learners new to the field.')}</p>
        </div>
        <div>
          <h2>{t('制作', 'Credits')}</h2>
          <p>{t('内容与网站：Limbo。', 'Content and site: Limbo.')}</p>
          <p>
            {t('学习案例来自 TU/e 课程项目 AI Interactive Robot for Cats，小组成员 Kaitian Guo、Ningbo Hu、Anlu Xie、Amanda Liang、Haiyue Chen。代码：', 'The worked example comes from the TU/e course project AI Interactive Robot for Cats, by Kaitian Guo, Ningbo Hu, Anlu Xie, Amanda Liang and Haiyue Chen. Code: ')}
            <a href="https://github.com/limbohoo/catpose-robot">catpose-robot</a>
            {t('。', '.')}
          </p>
          <p>{t('编写与核对借助了 Claude Code。', 'Written and checked with the help of Claude Code.')}</p>
        </div>
        <div>
          <h2>{t('版权与来源', 'Copyright and sources')}</h2>
          <p>{t('论文、图表和产品资料的版权归原作者。本站以转述呈现，编号链接到原始来源；引用的论文原图和官方示例图只用于学习说明。', 'Papers, figures and product material belong to their authors. This site paraphrases them and links each number to the original; reproduced paper figures and official examples are used for teaching only.')}</p>
          <p>{t('案例视频是 YouTube 官方嵌入，版权归 Kiki The Dream Cat；本站只发布从视频算出的关键点和数字。', 'The case video is an official YouTube embed, owned by Kiki The Dream Cat; this site publishes only keypoints and numbers computed from it.')}</p>
          <p>{t('随读札记只保存在你的浏览器里。本站用 Vercel Web Analytics 统计访问量，不收集札记内容。', 'Reading notes stay in your browser. The site counts visits with Vercel Web Analytics and never collects your notes.')}</p>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>{t('© 2026 Limbo。网站文字与图解保留所有权利，引用请注明出处。', '© 2026 Limbo. Site text and diagrams: all rights reserved; please credit when quoting.')}</span>
        <span>{t(`最近更新：${UPDATED}`, `Last updated: ${UPDATED}`)}</span>
      </div>
    </footer>
  );
}
