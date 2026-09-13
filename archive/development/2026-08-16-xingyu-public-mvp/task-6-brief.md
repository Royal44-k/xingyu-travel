## Task 6: 攻略广场与攻略转行程

**Files:**
- Create: `src/data/posts.ts`
- Create: `src/domain/trips/extract-draft.ts`
- Create: `src/app/square/page.tsx`
- Create: `src/app/square/[slug]/page.tsx`
- Create: `src/features/square/feed-controls.tsx`
- Create: `src/features/square/post-card.tsx`
- Create: `src/features/square/convert-to-trip.tsx`
- Create: `src/features/square/square.module.css`
- Create: `tests/unit/extract-trip-draft.test.ts`
- Create: `tests/component/square-feed.test.tsx`

**Interfaces:**
- Produces: `extractTripDraft(post): TripDraft` 和 `/trips/dali-slow-5d` 草稿。
- Feed 支持 `recommended | chronological`，并显示推荐关闭与兴趣偏好清除入口。

- [ ] **Step 1: 写抽取和非个性化 Feed 失败测试**

```ts
it('extracts a reviewable itinerary draft from a guide', () => {
  const draft = extractTripDraft(postsBySlug['dali-slow-5d']);
  expect(draft).toMatchObject({ destination: '大理', days: 5, budget: 5200 });
  expect(draft.items).toHaveLength(5);
  expect(draft.status).toBe('review');
});
```

```tsx
it('lets users switch off recommendations', async () => {
  render(<FeedControls mode="recommended" onModeChange={change} />);
  await user.click(screen.getByRole('button', { name: '按时间排序' }));
  expect(change).toHaveBeenCalledWith('chronological');
});
```

- [ ] **Step 2: 运行失败测试并实现纯领域抽取**

Run: `pnpm vitest run tests/unit/extract-trip-draft.test.ts tests/component/square-feed.test.tsx`

Expected: FAIL 后实现：

```ts
export function extractTripDraft(post: TravelPost): TripDraft {
  return {
    id: `draft-${post.slug}`,
    destination: post.destination,
    days: post.days,
    budget: post.budget,
    items: post.itinerary.map((item, index) => ({ ...item, id: `${post.slug}-${index + 1}` })),
    sourcePostSlug: post.slug,
    status: 'review',
  };
}
```

- [ ] **Step 3: 实现广场和详情页**

广场使用编辑式瀑布布局但维持 DOM 阅读顺序；卡片包含图片、地点、作者、收藏和举报入口。详情页最多展示九图位、地点节点、商品卡和 AI 内容标签；“转为行程”先打开审核抽屉，确认后写入 `tripStore` 并导航。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/extract-trip-draft.test.ts tests/component/square-feed.test.tsx && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app/square src/features/square src/domain/trips src/data/posts.ts tests
git commit -m "feat: add guide square and trip conversion"
```
