import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { ComparisonClient } from '@/features/comparison/comparison-client';
import {
  searchFromParams,
  type ComparisonSearchParams,
} from '@/features/comparison/search-params';

export const metadata: Metadata = {
  title: '透明比价',
  description: '统一比较机票、酒店与门票的含税总价、条件与数据更新时间。',
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<ComparisonSearchParams>;
}) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader activePath="/compare" />
      <ComparisonClient initialSearch={searchFromParams(params)} />
    </>
  );
}
