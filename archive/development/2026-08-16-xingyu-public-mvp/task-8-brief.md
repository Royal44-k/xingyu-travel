## Task 8: 可信搭子匹配、双向同意与模拟聊天

**Files:**
- Create: `src/data/partners.ts`
- Create: `src/stores/partner-store.ts`
- Create: `src/app/partners/page.tsx`
- Create: `src/app/chat/[matchId]/page.tsx`
- Create: `src/features/partners/intent-form.tsx`
- Create: `src/features/partners/match-list.tsx`
- Create: `src/features/chat/chat-room.tsx`
- Create: `src/components/safety-consent.tsx`
- Create: `tests/unit/partner-eligibility.test.ts`
- Create: `tests/component/partner-flow.test.tsx`

**Interfaces:**
- Produces: `isPartnerEligible(profile): EligibilityResult` 和 `partnerStore`。
- Gate: `age >= 18 && identityVerified && riskStatus === 'clear'`。

- [ ] **Step 1: 写未成年人、未实名和匹配解释失败测试**

```ts
it.each([
  [{ age: 17, identityVerified: true, riskStatus: 'clear' }, 'AGE_RESTRICTED'],
  [{ age: 24, identityVerified: false, riskStatus: 'clear' }, 'IDENTITY_REQUIRED'],
])('blocks ineligible partner actions', (profile, code) => {
  expect(isPartnerEligible(profile)).toEqual({ allowed: false, code });
});
```

- [ ] **Step 2: 实现硬过滤和用户可理解的前三项理由**

```ts
export function isPartnerEligible(profile: PartnerProfile): EligibilityResult {
  if (profile.age < 18) return { allowed: false, code: 'AGE_RESTRICTED' };
  if (!profile.identityVerified) return { allowed: false, code: 'IDENTITY_REQUIRED' };
  if (profile.riskStatus !== 'clear') return { allowed: false, code: 'RISK_RESTRICTED' };
  return { allowed: true };
}
```

- [ ] **Step 3: 实现主交互**

意愿表包含目的地、日期、预算、节奏、兴趣、路线、住宿边界、作息和社交偏好。匹配卡显示三项理由；点击“愿意认识”后进入 `pending_mutual`，演示对方确认后才出现聊天入口。聊天页包含举报、拉黑、可信联系人、行程分享和平安签到；联系方式输入被本地正则拦截并说明需双方确认。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/partner-eligibility.test.ts tests/unit/score-match.test.ts tests/component/partner-flow.test.tsx`

Expected: PASS。

```powershell
git add src/app/partners src/app/chat src/features/partners src/features/chat src/components/safety-consent.tsx src/stores/partner-store.ts src/data/partners.ts tests
git commit -m "feat: add explainable safe partner matching"
```
