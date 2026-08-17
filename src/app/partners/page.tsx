import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { PartnerMatchExperience } from '@/features/partners/match-list';

export const metadata: Metadata = {
  title: '可信搭子匹配',
  description: '浏览公开搭子卡片，以明确边界、可解释分数和双方同意开始一次本地演示匹配。',
};

export default function PartnersPage() {
return <><SiteHeader activePath="/partners" variant="solid" /><PartnerMatchExperience /></>;
}
