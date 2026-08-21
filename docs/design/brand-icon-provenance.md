# 行屿品牌图标来源记录

## 设计目标

- 用途：浏览器 favicon、Apple Touch Icon、PWA 图标与品牌母版。
- 识别：以山屿、路径与日点表达“从灵感到安心抵达”的自由行闭环。
- 色彩：松墨黑 `#26312B`、象牙白 `#F4F0E8`、砂金 `#B79A68`。
- 小尺寸约束：无文字、无细线、无摄影纹理，16 × 16 像素仍保留强轮廓。

## ImageGen 记录

- 模式：Codex 内置 ImageGen。
- 调用次数：2。
- 第一次结果：保留概念但拒绝用于生产；山水细节、描边与明暗层次在 favicon 尺寸下过于复杂。
- 第二次结果：针对第一次结果进行单项简化编辑，保留山屿、路径、日点，移除文字、细节与场景元素；被选为生产母版来源。
- 原始选中输出：`docs/design/generated-originals/xingyu-mark-imagegen.png`，1254 × 1254 PNG。

最终编辑提示：

> Use Image 1 as the concept reference, but make one targeted correction: simplify it radically for favicon use. Keep the deep pine-black square background, the ivory mountain/island idea, the winding forward path, and one small sand-gold sun. Replace every shaded, outlined, textured, watery, reflective, or thin detail with one bold flat ivory silhouette and a single thick flat negative-space path. Use only three solid flat colors (#26312B, #F4F0E8, #B79A68). No gradients, no shadows, no outlines, no texture, no extra dots, no internal scenery, no text, no letters, no watermark. Center the compact mark with generous padding and make it unmistakable at 16×16 pixels.

## 确定性后处理

`scripts/build-brand-icons.py` 将选中母版归一为三种品牌色、增强小尺寸轮廓，并生成：

- `public/brand/xingyu-mark.png` — 1024 × 1024 品牌母版。
- `src/app/icon.png` — 512 × 512 Next.js 应用图标。
- `src/app/apple-icon.png` — 180 × 180 Apple Touch Icon。
- `src/app/favicon.ico` — 16/32/48 多尺寸浏览器 favicon。
- `public/icon-192.png` 与 `public/icon-512.png` — PWA 图标。

`artifacts/brand-icon-2026-08-21/icon-size-board.png` 已逐级检查 16/32/64/128 像素呈现。最终资产无文字、商标、水印、人物或摄影缩略图。
