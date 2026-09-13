### Task 8: Signature Destination Film and Rich Home Story

**Files:**
- Create: `src/features/home/destination-film-carousel.tsx`
- Create: `src/features/home/home-story-sections.tsx`
- Create: `tests/component/destination-film-carousel.test.tsx`
- Modify: `src/features/home/featured-destinations.tsx`
- Modify: `src/features/home/featured-destinations.module.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/component/home-shell.test.tsx`

**Interfaces:**
- Produces: `DestinationFilmCarousel({ destinations, intervalMs?: number })` and `HomeStorySections`.
- Consumes: Task 6 destination registry/posts and existing Hero/SearchComposer.

- [ ] **Step 1: Write failing timing, pause, keyboard, and reduced-motion tests**

```tsx
it('advances every six seconds and pauses while focus remains inside', () => {
  vi.useFakeTimers();
  render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByText('2 / 12')).toBeInTheDocument();
  screen.getByRole('link', { name: /杭州/ }).focus();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByText('2 / 12')).toBeInTheDocument();
});
```

Add tests for hover, pointer drag, arrow/Home/End, `visibilitychange`, and reduced motion disabling autoplay/parallax.

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx`

- [ ] **Step 3: Implement the signature carousel with Motion and DOM-native controls**

Current city is enlarged, adjacent cards remain partially visible, and route metadata is real text. Do not use CSS drawings, handcrafted SVGs, or fake map lines. Use Phosphor arrows and accessible pagination.

- [ ] **Step 4: Implement the home narrative modules**

Compose: destination film, four guide themes, true-price explanation, guide-to-trip example, AI/guardian scenario, trusted-partner boundary, and local recent-trip/liked content when hydrated. Every CTA routes to an existing page.

- [ ] **Step 5: Self-critique against the approved visual targets**

Remove decorative numbering where content is not sequential, keep one signature interaction, and ensure the dark editorial sections do not become a generic black-dashboard theme.

- [ ] **Step 6: Run focused GREEN, reduced-motion regression, lint, and typecheck**

Run: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx tests/component/search-composer.test.tsx && pnpm lint && pnpm typecheck`

- [ ] **Step 7: Commit Task 8**

```bash
git add src/features/home src/app/page.tsx src/app/globals.css tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx
git commit -m "feat: add cinematic destination discovery"
```

