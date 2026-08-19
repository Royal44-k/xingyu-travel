import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { ProfileHub } from '@/features/profile/profile-hub';

export const metadata: Metadata = {
  title: '个人中心',
  description: '继续当前浏览器中保存的行程、喜欢、报价、搭子安全与兴趣偏好。',
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const initialTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;

  return (
    <>
      <SiteHeader activePath="/profile" variant="solid" />
      <ProfileHub initialTab={initialTab} />
    </>
  );
}
