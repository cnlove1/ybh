import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '图形大战',
  description: '几何生存、数学挑战、金币换肤与成就收集小游戏',
  icons: {
    icon: '/favicon.svg',
  },
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
      </body>
    </html>
  );
}
