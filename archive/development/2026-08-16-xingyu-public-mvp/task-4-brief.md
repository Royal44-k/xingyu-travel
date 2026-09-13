## Task 4: 沉浸式首页与统一搜索入口

**Files:**
- Create: `src/components/site-header.tsx`
- Create: `src/components/site-header.module.css`
- Create: `src/features/home/hero.tsx`
- Create: `src/features/home/hero.module.css`
- Create: `src/features/home/search-composer.tsx`
- Create: `src/features/home/search-composer.module.css`
- Create: `src/features/home/featured-destinations.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/component/search-composer.test.tsx`
- Create: `tests/component/site-header.test.tsx`

**Interfaces:**
- Produces: `SearchComposer`，提交后导航至 `/compare?kind=flight&destination=大理&from=2026-08-22&to=2026-08-27&travelers=2`。
- Consumes: `brandAssets` 和全局令牌。

- [ ] **Step 1: 写标签切换与提交失败测试**

```tsx
it('changes fields by product kind and submits a comparable search', async () => {
  render(<SearchComposer onSubmit={onSubmit} />);
  await user.click(screen.getByRole('tab', { name: '酒店' }));
  expect(screen.getByLabelText('入住地')).toBeInTheDocument();
  await user.type(screen.getByLabelText('入住地'), '大理');
  await user.click(screen.getByRole('button', { name: '开始规划' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hotel', destination: '大理' }));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/component/search-composer.test.tsx`

Expected: FAIL，因为组件不存在。

- [ ] **Step 3: 实现可访问的搜索组件**

```tsx
'use client';
const kinds = [
  { id: 'flight', label: '机票' },
  { id: 'hotel', label: '酒店' },
  { id: 'ticket', label: '门票' },
] as const;

export function SearchComposer({ onSubmit = navigateToComparison }: Props) {
  const [kind, setKind] = useState<ProductKind>('flight');
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(readSearchForm(event.currentTarget, kind)); }}>
      <div role="tablist" aria-label="比价类型">
        {kinds.map((item) => <button key={item.id} role="tab" aria-selected={kind === item.id} onClick={() => setKind(item.id)} type="button">{item.label}</button>)}
      </div>
      <SearchFields kind={kind} />
      <button type="submit">开始规划</button>
    </form>
  );
}
```

- [ ] **Step 4: 按视觉真值实现 Hero、导航和目的地带**

```tsx
// src/features/home/hero.tsx
<section className={styles.hero} aria-labelledby="hero-title">
  <Image src={brandAssets.hero.src} alt={brandAssets.hero.alt} fill priority sizes="100vw" className={styles.image} />
  <div className={styles.scrim} />
  <div className={styles.copy}>
    <h1 id="hero-title">把远方，<br />变成一段安心抵达的旅程</h1>
    <p>真实比价，严选资源，行程守护<br />每一步，都有可靠的答案</p>
  </div>
  <SearchComposer />
</section>
```

CSS 使用 `min-height: 820px`、Hero 左边距 `clamp(24px, 7.5vw, 112px)`、搜索台底部距视口 90px；移动端将搜索字段改为纵向并取消视差。

- [ ] **Step 5: 验证首页与提交**

Run: `pnpm vitest run tests/component/search-composer.test.tsx tests/component/site-header.test.tsx && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app src/components src/features/home tests/component
git commit -m "feat: build immersive xingyu home search"
```
