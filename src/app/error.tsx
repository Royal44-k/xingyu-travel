'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main>
      <p>页面暂时无法完成当前操作。</p>
      <h1>请重试，或返回核心功能继续浏览</h1>
      <button onClick={reset} type="button">重试当前页面</button>
      <Link href="/">返回首页</Link>
      <Link href="/compare">前往比价</Link>
    </main>
  );
}
