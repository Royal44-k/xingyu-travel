import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main>
      <p>404 · XINGYU</p>
      <h1>这里还没有一段可抵达的旅程</h1>
      <p>返回首页、攻略广场或透明比价，继续规划下一站。</p>
      <Link href="/">返回首页</Link>
      <Link href="/square">前往攻略广场</Link>
      <Link href="/compare">前往透明比价</Link>
    </main>
  );
}
