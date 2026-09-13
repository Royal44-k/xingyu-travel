## Task 12: 浏览器视觉对照与 Design QA

**Files:**
- Create: `artifacts/home-desktop-1440x1024.png`
- Create: `artifacts/home-mobile-390x844.png`
- Create: `artifacts/design-comparison.png`
- Create: `design-qa.md`
- Modify: visual files reported by QA

**Interfaces:**
- Consumes: `docs/design/selected-homepage-option-1.png` 与浏览器实拍。
- Produces: `design-qa.md`，最终一行必须是 `final result: passed`。

- [ ] **Step 1: 启动本地预览并用 Codex 内置浏览器打开**

Run: `pnpm dev -- --hostname 0.0.0.0 --port 4173`

在内置浏览器中打开对应本地地址，确认首页、比价、广场、搭子、助手和守护可导航；记录控制台错误。

- [ ] **Step 2: 以 1440×1024 和 390×844 捕获实现截图**

桌面截图必须与视觉真值保持同一视口、相同首页初始状态；移动端另行检查内容重排，不与桌面真值做像素级误判。

- [ ] **Step 3: 把源图和实现图合成一个并排比较输入**

```text
左侧：docs/design/selected-homepage-option-1.png
右侧：artifacts/home-desktop-1440x1024.png
输出：artifacts/design-comparison.png
```

- [ ] **Step 4: 按五个必查面写首轮 `design-qa.md`**

必须逐项写字体、间距节奏、颜色令牌、图像质量、文案内容；每个 P0/P1/P2 包含位置、证据、影响和具体修复。

- [ ] **Step 5: 修复 P0/P1/P2 后重复截图与比较**

每轮在 `design-qa.md` 记录旧问题、修复和新证据；P3 可列入后续润色，但不能用来阻止交付。

- [ ] **Step 6: 确认视觉门槛并提交**

Run: `rg -n "final result: passed" design-qa.md && pnpm verify && pnpm test:e2e`

Expected: 找到唯一通过结果，全部测试 PASS。

```powershell
git add artifacts design-qa.md src public tests
git commit -m "fix: pass responsive design qa"
```
