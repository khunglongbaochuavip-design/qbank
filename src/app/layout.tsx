import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import './globals.css';

export const metadata: Metadata = {
  title: 'QBank - Ngân hàng Câu hỏi',
  description: 'Hệ thống quản lý ngân hàng câu hỏi và thi trực tuyến',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* MathJax 3 — render both LaTeX ($...$, $$...$$, \(...\), \[...\]) and MathML 3.0 (<math>...</math>) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
    displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
    processEscapes: true
  },
  options: { skipHtmlTags: ['script','noscript','style','textarea','pre','code'] },
  startup: { typeset: false }
};`
          }}
        />
        <script
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          async
        />
      </head>
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
