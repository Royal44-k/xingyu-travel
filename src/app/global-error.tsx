'use client';

import Link from 'next/link';

export default function GlobalErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main>
          <p>行屿 XINGYU</p>
          <h1>页面暂时不可用</h1>
          <p>请重试，或回到首页继续查看公开演示内容。</p>
          <button onClick={reset} type="button">重试</button>
          <Link href="/">返回首页</Link>
        </main>
      </body>
    </html>
  );
}
