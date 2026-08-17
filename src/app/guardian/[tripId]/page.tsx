import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { brandAssets } from '@/data/assets';
import { isKnownGuardianTrip, riskEventsForTrip } from '@/data/risk-events';
import { RiskTimeline } from '@/features/guardian/risk-timeline';
import styles from '@/features/guardian/guardian.module.css';

export default async function GuardianPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (!isKnownGuardianTrip(tripId)) notFound();
  return <><SiteHeader activePath="/guardian/demo" /><main className={styles.page}><section className={styles.hero}><div className={styles.heroCopy}><p>TRIP GUARDIAN / DEMO</p><h1>先看风险，再决定下一步</h1><span>风险时间线与 Plan A/B/C 均来自固定演示事件；选择只会写入当前浏览器的行程决策。</span></div><Image alt={brandAssets.guardian.alt} className={styles.heroImage} height={brandAssets.guardian.height} priority src={brandAssets.guardian.src} width={brandAssets.guardian.width} /></section><RiskTimeline events={riskEventsForTrip(tripId)} tripId={tripId} /></main></>;
}
