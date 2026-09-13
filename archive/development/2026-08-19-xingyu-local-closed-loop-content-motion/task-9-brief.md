### Task 9: Navigation, Contextual Guardian, and Discoverable AI/Profile Routes

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/site-header.module.css`
- Modify: `src/app/guardian/[tripId]/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `tests/component/site-header.test.tsx`
- Modify: `tests/component/risk-timeline.test.tsx`

**Interfaces:**
- Produces: data-driven `/trips`, `/profile`, `/assistant`, and contextual guardian navigation.
- Consumes: trip hydration/selectors and existing guardian known-trip guard.

- [ ] **Step 1: Write failing desktop/mobile navigation and guardian fallback tests**

```tsx
it('never links My Trips to a fixed demo slug', () => {
  render(<SiteHeader variant="solid" />);
  expect(screen.getByRole('link', { name: '我的行程' })).toHaveAttribute('href', '/trips');
  expect(screen.getByRole('link', { name: '旅行助手' })).toHaveAttribute('href', '/assistant');
  expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/profile');
});
```

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx`

- [ ] **Step 3: Implement route discovery and contextual guardian behavior**

If no guarded trip exists, guardian navigation points to `/trips?intent=guardian` and the collection explains how to enable it. If one exists, link to its `sourcePostSlug`. Do not render unknown guardian IDs.

- [ ] **Step 4: Preserve mobile focus, Escape, and open/closed overflow behavior**

Add an explicit personal-center affordance while keeping menu labels readable at 390px. Reuse existing mobile menu state; do not add a second menu system.

- [ ] **Step 5: Run focused GREEN and build route inventory**

Run: `pnpm test tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx && pnpm build`

- [ ] **Step 6: Commit Task 9**

```bash
git add src/components/site-header.tsx src/components/site-header.module.css src/app/guardian src/app/sitemap.ts tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx
git commit -m "fix: connect navigation to real local journeys"
```

