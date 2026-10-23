import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'project',
  description: 'A awesome project project',
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