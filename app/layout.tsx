import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XAI Fieldnotes · 可解释智能设计学习地图',
  icons: { icon: '/favicon.svg' },
  description:
    '面向工业产品设计与 HCI 的 XAI 学习地图：体系、技术、真实案例、设计流程、前沿与思考空间。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
