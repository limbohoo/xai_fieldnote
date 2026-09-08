import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'XAI Fieldnotes · 可解释智能设计学习地图',
  icons: { icon: '/favicon.svg' },
  description:
    '面向工业产品设计与 HCI 的 XAI 学习指南：领域、方法与案例、流程与验证、延伸阅读及 AI／LLM 中英术语词典。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
