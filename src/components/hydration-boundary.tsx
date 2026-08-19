import type { ReactNode } from 'react';

export interface HydrationDomain {
  id: string;
  label: string;
  hydrated: boolean;
  hydrationError: boolean;
  onReset?: () => void;
}

interface HydrationBoundaryProps {
  children: ReactNode;
  domains: readonly HydrationDomain[];
  loadingMessage?: string;
}

export function HydrationBoundary({
  children,
  domains,
  loadingMessage = '正在读取当前浏览器中的资料…',
}: HydrationBoundaryProps) {
  if (domains.some((domain) => !domain.hydrated)) {
    return (
      <section aria-live="polite" className="hydrationBoundaryState" role="status">
        <span aria-hidden className="hydrationBoundaryPulse" />
        <p>{loadingMessage}</p>
        <small>完成校验前，资料与操作会保持静止。</small>
      </section>
    );
  }

  const failedDomains = domains.filter((domain) => domain.hydrationError);

  return (
    <>
      {failedDomains.length > 0 ? (
        <aside className="hydrationBoundaryErrors" role="alert">
          <div>
            <strong>部分本地资料未能安全读取</strong>
            <p>相关原始浏览器数据已保留；其他区域仍可继续查看。</p>
          </div>
          <ul>
            {failedDomains.map((domain) => (
              <li key={domain.id}>
                <span>{domain.label}资料暂时无法读取</span>
                {domain.onReset ? <button onClick={domain.onReset} type="button">重置{domain.label}</button> : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      {children}
    </>
  );
}
