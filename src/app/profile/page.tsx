import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { PreferenceSettings } from '@/features/profile/preference-settings';

export const metadata: Metadata = {
  title: '演示账户与偏好',
  description: '管理浏览器本地保存的演示推荐偏好与透明度说明。',
};

export default function ProfilePage() {
  return (
    <>
      <SiteHeader activePath="/profile" />
      <main className="profilePage">
        <section aria-labelledby="profile-title" className="profileIntro">
          <p>XINGYU · DEMO PROFILE</p>
          <h1 id="profile-title">演示账户与偏好</h1>
          <p>演示身份状态仅用于说明安全边界，不等同于实名核验，也不收集证件、人脸、联系方式或支付信息。</p>
          <dl className="profileStatusList">
            <div><dt>年龄边界</dt><dd>26 岁演示账户（仅作 18+ 功能边界展示）</dd></div>
            <div><dt>身份状态</dt><dd>演示已验证，不是实名认证结果</dd></div>
            <div><dt>风险状态</dt><dd>演示状态清晰，不构成安全担保</dd></div>
          </dl>
        </section>
        <PreferenceSettings />
      </main>
    </>
  );
}
