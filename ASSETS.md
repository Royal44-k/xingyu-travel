# 行屿旅行资产总目录

归档日期：2026-09-13。仓库：[Royal44-k/xingyu-travel](https://github.com/Royal44-k/xingyu-travel)。

本目录连接从原始需求、设计选型、开发与评审，到测试、布局修复、Logo 和生产发布的现存项目资产。当前可运行应用保留在原目录；此前散落在本地的记录集中放入 `archive/`。完整提交历史继续保留在 Git 中。

## 从哪里开始

| 需要查看的内容 | 入口 |
| --- | --- |
| 应用规格、功能边界与使用方式 | [ReadMe.md](ReadMe.md) |
| 安装、部署、验收与回滚 | [deploy.md](deploy.md) |
| 原始需求原文 | [开发规格文档计划 v1.0](archive/requirements/original-platform-plan-v1.0.md) |
| 初版产品设计与实施计划 | [设计规格](docs/superpowers/specs/2026-08-16-xingyu-web-design.md)、[实施计划](docs/superpowers/plans/2026-08-16-xingyu-public-mvp.md) |
| 本地持久化、内容扩充与动效改进 | [设计规格](docs/superpowers/specs/2026-08-18-xingyu-local-closed-loop-content-motion-design.md)、[实施计划](docs/superpowers/plans/2026-08-19-xingyu-local-closed-loop-content-motion.md) |
| 逐项任务、报告、进度与评审 | [历史来源目录](archive/catalog.md)、[开发记录](archive/development/)、[早期评审](archive/reviews/) |
| 当前应用源码与自动化测试 | [src](src/)、[tests](tests/)、[package.json](package.json)、[锁文件](pnpm-lock.yaml) |
| 设计基准与未采用方案 | [docs/design](docs/design/)、[候选设计](archive/design-concepts/) |
| 目的地图片及生成提示词 | [生产图片](public/assets/)、[图片来源](docs/design/asset-provenance.md)、[完整提示词](docs/design/destination-asset-prompts.md) |
| 早期图片、淘汰候选与检查板 | [初版素材说明](public/assets/ASSET-LICENSES.md)、[淘汰图片](archive/imagegen/rejected/)、[检查板](archive/design-contact-sheets/) |
| Logo、favicon 与图标母版 | [品牌图标](public/brand/)、[ImageGen 母版](docs/design/generated-originals/)、[来源与生成说明](docs/design/brand-icon-provenance.md)、[生成脚本](scripts/build-brand-icons.py) |
| Design QA、移动端与布局修复 | [验收总记录](design-qa.md)、[截图及验证脚本](artifacts/)、[首页遮挡修复](artifacts/hero-layout-fix-2026-08-21/)、[图标验收](artifacts/brand-icon-2026-08-21/) |
| 生产发布、故障回归与回滚记录 | [发布报告](docs/reports/2026-08-19-xingyu-closed-loop.md)、[生产验证证据](artifacts/design-qa-2026-08-19/) |
| 早期终端测试证据 | [测试日志](archive/test-logs/) |
| 文件来源与完整性核验 | [来源映射](archive/source-ledger.json)、[SHA-256 清单](archive/asset-manifest.json)、[归档说明](archive/README.md) |

## 历程与版本含义

1. 原始计划提出商业旅游服务平台与阿里云后端方案，原文完整保存；它不代表当前应用已经接入这些服务。
2. 2026-08-16 初版建立 Next.js 应用、报价沙箱、攻略、行程、搭子、助手与守护的交互流程。
3. 2026-08-18 至 2026-08-19 的改进建立浏览器本地持久化闭环，补齐个人中心、兴趣、喜欢、报价收藏与行程集合，扩充八篇目的地攻略、四座发现城市与动效。
4. 2026-08-21 的发布阶段保存了 Design QA、状态回归、Vercel 验证、首页文字遮挡修复和浏览器 Logo 的证据。
5. 2026-08-24 源码与使用、部署文档上传 GitHub。此次归档基线为 `9bdfa5ca6bc885778567ae58e7a4be3687b70951`，之前 89 条提交的索引见 [git-history.json](archive/git-history.json)。
6. 2026-09-13 补充归档现存的早期记录、设计候选、生成来源与检查板。此次为资产整理；历史测试结果仍按当时的日期和代码版本理解。

## 下载与校验

在 GitHub 仓库中点击 **Code → Download ZIP**，或下载 [main 分支完整 ZIP](https://github.com/Royal44-k/xingyu-travel/archive/refs/heads/main.zip)，可获得应用与归档文件。需要提交历史时使用 `git clone`，GitHub ZIP 不包含 `.git` 历史。

在解压或克隆后的仓库根目录运行以下命令，不需要安装应用依赖：

```bash
node scripts/verify-assets-archive.mjs
```

校验内容包括文件集合、SHA-256、字节数、244 条来源映射、图片尺寸及历史提交索引。`asset-manifest.json` 不给自身计算哈希，防止自引用；Git 提交负责记录清单本身。

这是 2026-09-13 归档快照的校验清单。后续正常开发增删或修改文件后，旧清单会报告差异；验证原始归档时应检出此次归档提交，不能将旧清单的差异直接理解为新版本损坏。

## 归档范围与缺失记录

此次核对包括当前工作树、初始 checkout 的项目文件、两轮 SDD 记录、经项目提交哈希确认的早期评审、项目测试日志、原始上传附件、当前会话生成目录、来源记录明确引用的原图，以及按 SHA-256 找回的初版原图。共识别 556 条现存相关文件记录；相同图片字节通过来源映射指向仓库已有版本，避免重复存放。

两张用户截图的临时文件已经不在原路径。仓库保留了相关的修复前后截图，包括 [旧网址图标截图](artifacts/brand-icon-2026-08-21/before-url-favicon.png) 和首页修复证据；不能证明所有这些替代截图与失效临时文件逐字节相同。具体文件名见 [来源清单的 missing 字段](archive/source-ledger.json)。

在已检查的项目目录、原始附件和常用文档位置中，没有找到原计划所列 `旅行服务平台_开发规格说明书_v1.0.docx` 及其同名正式 Markdown 成品。因此归档保存的是原始计划、后续实际设计规格和使用说明，没有把重新撰写的内容冒充早期交付物。

凭据、`.env` 实值、SSH 私钥、`.vercel` 账户状态、浏览器个人数据、依赖和构建缓存不属于公开归档。被替换图片与早期失败日志只供过程追溯，在用版本以 `public/`、`src/` 和最新发布记录为准。
