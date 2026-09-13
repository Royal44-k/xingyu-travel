### Task 7: Square Discovery, Filters, Favorites, and Equal-Ratio Guide Gallery

**Files:**
- Create: `src/features/square/destination-filters.tsx`
- Create: `src/features/square/guide-gallery.tsx`
- Create: `tests/component/guide-gallery.test.tsx`
- Modify: `src/app/square/page.tsx`
- Modify: `src/app/square/[slug]/page.tsx`
- Modify: `src/features/square/post-card.tsx`
- Modify: `src/features/square/square.module.css`
- Modify: `tests/component/square-feed.test.tsx`

**Interfaces:**
- Produces: `DestinationFilters`, `GuideGallery`.
- Consumes: Task 1 preferences, Task 3 favorites, Task 6 posts/assets.

- [ ] **Step 1: Write failing filter and gallery behavior tests**

```tsx
it('filters by destination, theme, and maximum days without losing chronological mode', async () => {
  render(<SquarePage />);
  await user.selectOptions(screen.getByLabelText('目的地'), '三亚');
  await user.click(screen.getByRole('button', { name: '海岛' }));
  expect(screen.getByRole('link', { name: /三亚/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /川西/ })).not.toBeInTheDocument();
});

it('supports arrows, thumbnails, Home and End across four equal-ratio images', async () => {
  render(<GuideGallery images={postsBySlug['sanya-coast-rainforest'].media} title="三亚" />);
  await user.keyboard('{End}');
  expect(screen.getByText('4 / 4')).toBeInTheDocument();
  await user.keyboard('{Home}');
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx`

- [ ] **Step 3: Implement search/filter state with valid empty states**

Filters are browser-session UI state, not persisted preferences. Search title, excerpt, destination, tags, and location names; “clear filters” restores the current feed mode.

- [ ] **Step 4: Implement gallery controls, touch drag, loading geometry, and reduced motion**

Every display frame uses `aspect-ratio: 3 / 2`. Thumbnail buttons expose selected state; autoplay is not used on detail pages. Failed images retain the frame and show alt/retry without substituting another destination.

- [ ] **Step 5: Apply approved hover/selected treatment and route-level favorite state**

Limit image scale to 1.035 and lift to 8px; only hovered/selected cards receive sand edge glow. Use `FavoriteButton` on cards and details.

- [ ] **Step 6: Run focused GREEN, mobile component regression, and typecheck**

Run: `pnpm test tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx tests/component/favorite-sync.test.tsx && pnpm typecheck`

- [ ] **Step 7: Commit Task 7**

```bash
git add src/app/square src/features/square tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx
git commit -m "feat: enrich guide discovery and galleries"
```

