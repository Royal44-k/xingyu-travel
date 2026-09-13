# Task 9 恢复报告：AI 旅行助手与主动行程守护

## 恢复时状态

- 基线：`343263e3c3ca5c2286c6feed1b6ca111194178d1`。
- 工作树已有未提交的 TDD 中间态：`tests/unit/emergency-priority.test.ts`、`tests/component/assistant-client.test.tsx`，以及对 assistant schema/mock 的局部修改。
- 恢复时没有删除或重写这些有效工作。`emergency-priority` 已 GREEN；schema 既有测试为 GREEN；assistant client 因目标模块尚不存在而为预期 RED。
- 初始 `pnpm vitest` 在此 Windows 运行时未解析本地二进制；直接调用 `node_modules/.bin/vitest.cmd` 后，Vite 还需要在 `node_modules/.vite-temp` 写临时配置。受控写入后测试可复现执行。

## RED / GREEN 记录

1. 原有 emergency test：恢复后单 worker 运行，1/1 GREEN。
2. 原有 schema + client tests：schema 12/12 GREEN；client 因缺少 `features/assistant/assistant-client` RED。
3. 新增 assistant/guardian route contract：先因缺少 route imports RED，最小实现后 4/4 GREEN。
4. 新增 guardian timeline：先因缺少组件 RED；实现后发现本地保存确认文案不匹配的 RED，改为“方案已保存到本浏览器的旅行决策，未创建订单”后 2/2 GREEN。
5. 新增 critical schema safety contract：原 schema 错误地接受仅包含 110 的 critical 回答（RED）；加入 `requires_human_help` 与 110/120/119 覆盖约束后，schema + emergency 14/14 GREEN。

## 完成内容

- Assistant API：严格请求/响应校验、稳定 request id、无泄密的 invalid/unavailable 错误语义。
- Provider seam：仅在 `AI_PROVIDER=qwen` 且存在 `DASHSCOPE_API_KEY` 时实例化 Qwen OpenAI-compatible adapter；其他情况明确返回本地 demo provider。
- Demo safety：模型/演示标识、固定证据时间与数据新鲜度；critical 输出必须触发人工协助并涵盖 110/120/119 官方求助。
- Assistant UI：快捷问题、可提交输入、证据/模型标签、结构化 Plan A/B/C 与可访问状态反馈。
- Guardian：使用现有真实 guardian 静态资产、固定沙箱风险时间线、Plan A/B/C 成本/耗时/风险/动作；选择方案只持久化到本地行程决策，不会下单。
- `.env.example` 仅列出选择 provider 和 Qwen 模型/密钥变量，不含任何密钥。

## 验证证据

| 命令 | 结果 |
| --- | --- |
| `vitest ... emergency-priority` | 1 file / 1 test PASS |
| `vitest ... assistant-schema + assistant-client` | 恢复时：schema 12 PASS，client 缺模块 RED |
| `vitest ... assistant-routes` | 1 file / 4 tests PASS |
| `vitest ... assistant-client + risk-timeline` | 2 files / 2 tests PASS |
| focused Task 9 suite | 5 files / 19 tests PASS |
| `tsc --noEmit` | PASS |
| `eslint .` | PASS |
| full `vitest run --maxWorkers=1 --no-file-parallelism --reporter=dot` | 22 files / 180 tests PASS，230.19s |
| `next build` | PASS；assistant、guardian pages 和 API routes 均已编译 |
| `git diff --check` | PASS |

完整套件初次使用默认 reporter 时长时间只显示 `RUN`；同一命令改用 verbose/dot 后持续显示 suite 进度并完成。定位为 reporter 在 suite 完成前不刷新、以及 jsdom/import 总耗时较高（最终 import 131.97s、environment 56.47s），不是测试死锁或失败。

## 风险与已知边界

- 没有配置真实 Qwen 密钥，因此 adapter seam 已通过选择和编译验证，尚未进行网络端到端调用；无密钥时始终安全回退 demo。
- 沙箱风险、交通和天气不是实时事实；界面与 API 均明确标记固定 demo 数据。
- 本轮未创建订单、支付、真实救援请求或实时监测；方案选择仅写入浏览器本地状态。

## 审查修复补充（基线 `f3ef8bd`）

### 根因与 RED / GREEN

1. **Qwen safety boundary（Critical）**：原实现仅依赖提示词，且直接将 schema 合格的模型文本标为 `demo_mode: false`；上游 JSON/Zod/abort 异常也会暴露原始错误。新增 `qwen-provider.test.ts` 首次运行 6 项中 5 项 RED：危险输入仍发往模型、未验证航班/医疗断言被接受、异常 JSON/schema/timeout 不稳定。修复后输入危险分类直接返回本地官方应急 response；模型输出存在未验证实时、医疗、法律或救援断言时 fail closed；非 2xx、异常 JSON、schema 畸形和 abort 均归一为不泄密错误。GREEN：Qwen + emergency suites 11/11。
2. **即时危险分类（Critical）**：原 regex 漏掉“昏迷、胸痛且呼吸困难”和“持刀威胁”。扩展后测试首次为 5 项中 2 项 RED；加入确定性急症、暴力、火灾/被困/失联规则，且普通雨天行程不升级为 emergency。GREEN：5/5。
3. **Guardian isolation（Important）**：route 对未知 ID 返回 200 并把 demo event 改写为该 ID；store 对未知 ID 直接写入。route/store 首次 19 项中 2 项 RED。修复后 route 对未知 ID 返回稳定 404，守护页面使用 `notFound()`，store 只解析已接受的 trip 或其 source slug 且持久化时使用 canonical draft ID。组件测试还暴露 slug `dali-slow-5d` 与本地 `draft-dali-slow-5d` 的真实 ID 映射差异，已通过 canonical 解析修复。GREEN：route/store/component 21/21。
4. **Assistant 请求竞态（Important）**：原组件无 sequence，loading 时快捷按钮仍可发起新请求。新增 request gate 的 out-of-order unit test 和 pending shortcut component test，首次 RED（缺 gate 且快捷按钮未禁用）。修复后只接受最新 request token，只有该 token 才能结束 loading；快捷入口和提交均在 pending 时禁用。GREEN：3/3。
5. **Plan A/B/C contract（Important）**：schema 允许不足三方案与空 actions。新增 schema tests 首次 15 项中 2 项 RED；现要求 exactly 3 个唯一 id 的 alternatives，且每个 actions 至少一项；mock 常规回答同步为三方案。GREEN：schema + emergency 16/16。

### 本轮验证证据

| 命令 | 结果 |
| --- | --- |
| hardened Task 9 focused Vitest | 8 files / 49 tests PASS（53.28s） |
| `tsc --noEmit` | PASS |
| `eslint .` | PASS |
| final full `vitest run --maxWorkers=1 --no-file-parallelism --reporter=dot` | 24 files / 196 tests PASS（243.69s） |
| final `next build` | PASS；所有 assistant/guardian routes 编译成功 |

本轮仍未使用真实 Qwen 密钥或发出外部请求；所有 Qwen tests 均在 provider 的 fetch seam 上验证边界行为。生产 adapter 对高风险输入不调用上游模型，并对无法验证的高风险声明 fail closed。

## Round 2 审查修复补充（基线 `3b9d157`）

### 根因与 RED / GREEN

1. **C1 — Qwen 不可信自由文本（Critical）**：核验确认上轮安全门只检查 `parsed.answer`，而替代方案的标题/动作、证据和 freshness 会作为 `demo_mode: false` 的模型文本原样返回。新增恶意 payload test（把“已确诊肺炎，救援十分钟到达”放在 action、把航班时间放在 evidence、把“实时官方确认”放在 freshness）在修复前 RED：provider 成功 resolve 了整段不可信输出。根因修复不再扩大正则：Qwen 只可返回 strict 的 `plan` / `disruption` / `preparation` enum；所有用户可见 answer、Plan A/B/C、evidence、freshness 一律取自本地审计的固定模板。无效 enum、额外字段、异常 JSON 继续 fail closed；非 2xx 和 timeout 保持既有稳定错误。GREEN：Qwen + store focused 2 files / 24 tests PASS；Task 9 scoped 8 files / 53 tests PASS。
2. **Canonical trip keys（Important）**：核验确认 `getTrip` 允许 source slug，但 `updateTrip`、`updateItem`、reorder、toggle、vote、guardian 与 partner intent 仍以调用参数作为 map key。新增 store test 在修复前 RED：接受 draft 后经 slug 调用全部 mutator，`Object.entries(trips)` 出现 key 与 `trip.id` 不一致，持久化状态会被 hydration invariant 拒绝。所有写路径现使用已解析 trip 的 `trip.id`；同一测试确认 canonical map、localStorage 写入与新 store rehydrate 均 GREEN。

### Round 2 验证证据

| 命令 | 结果 |
| --- | --- |
| `vitest ... qwen-provider + trip-store` | 2 files / 24 tests PASS |
| Task 9 scoped Vitest（assistant schema/emergency/Qwen/routes/store/request sequence/client/timeline） | 8 files / 53 tests PASS（51.78s） |
| `tsc --noEmit` | PASS |
| `eslint .` | PASS |
| full `vitest run --maxWorkers=1 --no-file-parallelism --reporter=dot` | 24 files / 200 tests PASS（208.78s） |
| `next build` | PASS；assistant / guardian API 和页面均已编译 |
| `git diff --check` | PASS |

全量 Vitest 使用 dot reporter 和受控临时日志；默认 reporter 在本 Windows 环境会先只显示 `RUN` 并让宿主通道提前返回。每次检查均确认进程状态；全量完成后的两个本轮 Node worker 已按 PID 清理。该现象未改变测试结果，亦未通过修改生产逻辑规避。

### 风险与边界

- Qwen 在此 MVP 中只参与受限 intent 决策；没有 trusted tool context 时，它生成的任意自然语言不会抵达用户界面。固定模板仍明确为沙箱数据，并不声称实时航班、天气、景区或救援事实。
- 尚无真实 Qwen 密钥或外部工具调用的端到端测试；网络失败路径由 injected fetch seam 覆盖，默认配置仍是本地 demo。
