## Task 10: 账户偏好、透明度、安全反馈与全局错误

**Files:**
- Create: `src/app/profile/page.tsx`
- Create: `src/features/profile/preference-settings.tsx`
- Create: `src/stores/profile-store.ts`
- Create: `src/components/demo-banner.tsx`
- Create: `src/components/report-dialog.tsx`
- Create: `src/components/external-booking-dialog.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/manifest.ts`
- Create: `src/app/api/v1/health/route.ts`
- Modify: `next.config.ts`
- Create: `tests/component/preference-settings.test.tsx`
- Create: `tests/unit/security-headers.test.ts`

**Interfaces:**
- Produces: 推荐开关、兴趣标签删除、演示身份状态、统一错误/举报/外跳体验。

- [ ] **Step 1: 写推荐关闭和安全响应头失败测试**

```tsx
it('clears interest labels and disables personalized recommendations', async () => {
  render(<PreferenceSettings />);
  await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
  await user.click(screen.getByRole('button', { name: '清除兴趣标签' }));
  expect(screen.getByText('当前使用按时间排序')).toBeInTheDocument();
});
```

- [ ] **Step 2: 实现 profileStore 与反馈组件**

```ts
export const useProfileStore = create<ProfileState>()(persist(
  (set) => ({
    demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
    personalizedFeed: true,
    interestTags: ['山野', '人文', '慢旅行'],
    setPersonalizedFeed: (value) => set({ personalizedFeed: value }),
    clearInterestTags: () => set({ interestTags: [] }),
  }),
  { name: 'xingyu-profile-demo-v1' },
));
```

- [ ] **Step 3: 配置响应头、SEO 和错误边界**

```ts
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];
export default { async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; } };
```

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/component/preference-settings.test.tsx tests/unit/security-headers.test.ts && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app/profile src/features/profile src/stores/profile-store.ts src/components src/app/error.tsx src/app/global-error.tsx src/app/not-found.tsx src/app/robots.ts src/app/sitemap.ts src/app/manifest.ts src/app/api/v1/health next.config.ts tests
git commit -m "feat: add privacy controls and production safeguards"
```
