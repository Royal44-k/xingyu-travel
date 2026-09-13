# Task 6 report — 目的地内容契约与 ImageGen 素材包

## 交付结果

- 新增 8 篇完整目的地攻略：大理、桂林、川西、三亚、杭州、南京、上海、贵州。
- 每篇攻略注册 4 张互不重复的本地 PNG，共 32 张；实际文件均为 1536×1024、3:2 横图，32 个 SHA-256 均不同。
- 每篇攻略的 `itinerary.length` 等于 `days`，并包含预算、至少 2 张地点卡片、标签、作者、发布时间/更新时间和明确的 AI 生成/改写标记。
- `postsBySlug` 只暴露上述 8 个真实详情 slug；当前广场卡片从该数据源生成，因此没有指向缺失攻略详情页的链接。北京、西安、重庆、厦门尚未在当前 Task 6 UI 中生成详情入口，后续发现入口必须链接到有效的比价或广场筛选 URL。
- Review round 1 将所有攻略锁定在 3–6 日；川西攻略由 7 日整理为 6 日且行程仍与 `days` 严格相等。旧的 `rainy-mountain-notes` 不重新进入发现流或 `postsBySlug`，详情服务器路由会重定向到当前川西攻略，本地已持久化行程的来源链接也会解析到该规范 URL。
- 三亚第 1 日现在明确说明“前一晚抵达”，消除了“第 1 日黎明”与抵达时间的顺序矛盾。

## TDD 记录

- 实现者先添加 `tests/unit/content-invariants.test.ts` 和 `tests/unit/assets.test.ts` 的内容/文件系统不变量；交接记录称预期 RED 来自缺失目的地与缺失 PNG。
- 交接记录称聚焦 GREEN、typecheck、lint、build 均已通过。由于原始终端会话不可访问，本报告不把该聚焦测试记录冒充为本轮新鲜终端证据。
- Review round 1 先扩展 4 个聚焦测试文件；新鲜 RED 为 4 个预期失败（川西仍为 7 日、三亚顺序文案不明确、已接收行程缺少来源攻略链接，以及同一 7 日范围不变量失败），其余 18 个测试通过。资产精确路径集、SHA-256 唯一性和 8 篇发现顺序在 RED 阶段即通过，说明这些测试捕获并锁定现有正确数据。
- 修复后第一次 GREEN 尝试为 21/22；唯一失败来自新增链接把既有“本地演示工作台”标签拆成混合文本节点。将标签恢复为独立元素后，同一命令为 4 个文件、22/22 PASS。
- Review round 2 用 `mkdtemp` 创建完全位于系统临时目录的测试资产树，包含 2 个预期 PNG、1 个未注册的深层 stale PNG 和 1 个应忽略的非 PNG；未修改任何最终资产。新鲜 RED 为 `tests/unit/assets.test.ts` 1 failed / 2 passed，失败准确显示旧的 registry-only 视角返回空清单而没有发现 3 个磁盘 PNG。随后实现测试内递归枚举器，将操作系统路径分隔符归一化为 public-root URL 路径；真实目录、32 条预期路径和 32 条注册路径现在必须三方精确相等，任何额外 PNG 都会失败，非 PNG 文件不计入契约。
- Review round 3 的结构性 RED 是复审指出 `expectedDestinationPaths` 仍由 8 个目的地与 4 个编号的 `flatMap`/模板字符串生成，未形成 32 条可逐项审阅的独立契约。现已替换为 32 个完整、规范化的 `/assets/destinations/<slug>/<shot>.png` 字符串字面量；递归磁盘枚举、三方精确相等、SHA-256 唯一性和临时 stale PNG 测试均保持不变。
- 恢复任务时，疑似上一轮完整 Vitest 的 Node PID `4256`（2026-08-20 09:17:52 +08:00）和 `11180`（09:18:06 +08:00）仍存在。Review round 1 结束前再次只读检查，两者仍存在且启动时间不变；没有可访问的会话或终止输出。未终止未知进程，也未启动重叠的完整 Vitest。
- 因此，上一轮完整 Vitest 状态为 **未验证**；只有在这两个准确 PID 自然退出后，才可安全地重新运行一次完整套件。

## 图片生成与检查证据

- 生成方式：Codex 内置 ImageGen，`photorealistic-natural`，每个场景一次独立调用；没有使用 CLI、外部图片 API、拼图或 sprite 裁切。
- 总调用数：39 次；最终注册/接受 32 张，拒绝 7 张。
- 拒绝明细：`dali/03` 两次、`hangzhou/04` 一次、`nanjing/03` 一次、`shanghai/01` 一次、`shanghai/04` 一次，以及被 review 替换的旧 `guizhou/03` 一次。
- `docs/design/destination-asset-prompts.md` 包含 32 个逐字最终提示词条目，每条均记录 1536×1024、3:2 与共同限制。
- `docs/design/asset-provenance.md` 包含 32 条最终注册路径、原始内置输出路径、实际尺寸、接受说明，以及 7 条拒绝原因与修正结果。
- 恢复检查通过 PNG 头部读取全部 32 张实际尺寸并计算 SHA-256：文件数 32、尺寸全部 1536×1024、独立哈希数 32。
- 初轮代表性视觉矩阵覆盖每个目的地，并特意包含修正风险较高的 `dali/03`、`hangzhou/04`、`nanjing/03`、`shanghai/04`；另检查 `guilin/01`、`sichuan/04`、`sanya/03`、`guizhou/03`。其初轮结论后来被更严格的 `guizhou/03` 季节性复审取代，详见下一条。
- Review round 1 认定旧 `guizhou/03` 的大面积反光积水和稀疏秧苗更像春季灌水期，不满足初秋成熟稻田。使用内置 ImageGen 仅调用一次生成定向替代图，逐图检查后接受；最终文件仍为 1536×1024，SHA-256 为 `984dc6b62c78ef9d3ffb0f9d01df4cf99a5f67cfa8c75e13e52d44accb2b80e6`，成熟绿金稻穗占主导、仅有细小灌溉反光，无文字、标志、水印、人物或可识别面孔。逐字提示词和原始输出路径均已更新到两份设计文档。

## 本轮新鲜验证

- `pnpm typecheck` — PASS，退出码 0。
- `pnpm lint` — PASS，退出码 0。
- `pnpm build` — 首次在沙箱内因 `.next/trace` 写入 `EPERM` 失败；只读诊断确认该文件可读、ACL 授予 Modify、Task 6 未修改 `.next`，但写打开被拒绝。随后在获批的非沙箱执行中 PASS，退出码 0；Next.js 16.2.12 编译成功，14/14 静态页面生成完成，路由清单包含 `/square` 与 `/square/[slug]`。
- Review round 1 的 `pnpm typecheck` — 沙箱内只因 `tsconfig.tsbuildinfo` 写入 `EPERM` 未执行完成；在获批的非沙箱执行中 PASS，退出码 0。
- Review round 1 的 `pnpm lint` — PASS，退出码 0。
- Review round 1 的 `pnpm build` — 在获批的非沙箱执行中 PASS，退出码 0；Next.js 16.2.12 编译成功，14/14 静态页面生成完成。
- Review round 1 聚焦 Vitest — `pnpm exec vitest run --maxWorkers=1 tests/unit/extract-trip-draft.test.ts tests/unit/content-invariants.test.ts tests/unit/assets.test.ts tests/component/trip-workbench.test.tsx`，4 个文件、22/22 PASS，退出码 0，耗时 35.73 秒。
- Review round 2 聚焦 Vitest — `pnpm exec vitest run --maxWorkers=1 tests/unit/assets.test.ts tests/unit/content-invariants.test.ts`，2 个文件、6/6 PASS，退出码 0，耗时 9.19 秒。
- Review round 2 `pnpm lint` — PASS，退出码 0。
- Review round 2 `pnpm typecheck` — PASS，退出码 0。
- Review round 2 仅修改测试契约，未改生产代码、配置或资产，因此按复审范围未重复 build。
- Review round 3 聚焦 Vitest — `pnpm exec vitest run --maxWorkers=1 tests/unit/assets.test.ts tests/unit/content-invariants.test.ts`，2 个文件、6/6 PASS，退出码 0，耗时 8.24 秒。
- Review round 3 `pnpm lint` — PASS，退出码 0。
- Review round 3 `pnpm typecheck` — PASS，退出码 0。
- Review round 3 仅将生成式预期清单改为 32 条显式字面量，未改生产代码、配置或资产，因此按复审范围未运行 build 或完整 Vitest。
- 完整 Vitest — 未验证；继承运行没有可访问的终端结果，本轮未重跑。

## 关注事项

- 唯一未关闭的验证关注是完整 Vitest 缺少可信终止证据；不能把仍存活且无输出的继承进程记为通过。
- 沙箱内的 build/typecheck `EPERM` 均为构建缓存写入限制，不是 Task 6 源码或素材缺陷；相同源代码在获批的非沙箱执行中成功。
- 新图片均为生成式素材，并在详情页通过 `AI 生成 · 已人工改写` 标签披露；真实上线前仍应按产品的内容审校流程复核地域细节。
