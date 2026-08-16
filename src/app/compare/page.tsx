import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import type { ComparisonProductKind } from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { ComparisonClient } from '@/features/comparison/comparison-client';

export const metadata: Metadata = {
  title: '透明比价',
  description: '统一比较机票、酒店与门票的含税总价、条件与数据更新时间。',
};

function searchFromParams(
  params: Record<string, string | undefined>,
): ComparisonSearchInput {
  const kind: ComparisonProductKind = ['flight', 'hotel', 'ticket'].includes(
    params.kind ?? '',
  )
    ? (params.kind as ComparisonProductKind)
    : 'flight';
  const travelers = Number(params.travelers);

  return {
    kind,
    destination: params.destination?.trim() || '大理',
    ...(params.origin?.trim() ? { origin: params.origin.trim() } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(Number.isInteger(travelers) && travelers > 0 ? { travelers } : {}),
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader activePath="/compare" />
      <ComparisonClient initialSearch={searchFromParams(params)} />
    </>
  );
}
