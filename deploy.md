# 行屿旅行部署说明

本文档说明如何在本地验证、推送到 GitHub，并将行屿旅行发布到 Vercel。当前生产站点为 [xingyu-travel.vercel.app](https://xingyu-travel.vercel.app)。

> 本项目以演示环境为目标。上线真实支付、出票、身份核验、地理位置、供应商库存或大模型服务前，必须另行完成安全、合规、数据处理与业务验收。

## 1. 发布前条件

### 本地工具

- Node.js `>= 24`
- pnpm `10`
- Git
- Vercel CLI（可通过 `pnpm dlx vercel` 使用）
- 用于端到端测试的本机 Chromium 或 Chrome

### 必要访问权限

- GitHub 仓库 `Royal44-k/xingyu-travel` 的写入权限
- Vercel 项目及其团队的部署权限
- Preview 环境的访问保护保持开启；Production 保持公开访问

### 不应提交的内容

`.gitignore` 已排除以下内容：

- `.env*`（但保留 `.env.example`）
- `.vercel/`
- `node_modules/`、`.next/`、测试报告与临时工作区

不得提交 API Key、Vercel Token、GitHub Token、SSH 私钥、真实用户数据或浏览器本地存储导出文件。

## 2. 本地安装与验证

在项目根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test --maxWorkers=1
pnpm test:e2e
pnpm build
```

说明：

- `pnpm verify` 会运行 lint、typecheck、Vitest 与生产构建；它不包含 Playwright，因此发布前仍应单独运行 `pnpm test:e2e`。
- 在 Windows 环境，测试与构建可能需要对缓存目录（如 `.next/` 或 Vite 临时目录）具有写权限。
- 若使用受限网络，Next.js 字体下载与 Vercel/GitHub 连接需要可访问外网的执行环境。

## 3. 环境变量

以 `.env.example` 为模板创建本地 `.env.local`：

```dotenv
AI_PROVIDER=mock
DASHSCOPE_API_KEY=
QWEN_PLUS_MODEL=
QWEN_MAX_MODEL=
QWEN_FLASH_MODEL=
```

### 建议配置

| 环境 | `AI_PROVIDER` | 密钥策略 |
| --- | --- | --- |
| 开发 | `mock` | 不需要外部密钥 |
| Preview | `mock` 或经过评测的受控配置 | 仅在 Vercel 环境变量中保存 |
| Production | 默认 `mock`，或经过上线评测的配置 | 最小权限、轮换、审计，绝不入库 |

若设置 `DASHSCOPE_API_KEY` 等敏感值，请在 Vercel Dashboard 或 Vercel CLI 的环境变量管理命令中配置，不要把值写入 `.env.example` 或提交到 Git。

## 4. GitHub 推送

当前仓库地址：

```text
https://github.com/Royal44-k/xingyu-travel
```

### HTTPS 不可用时的 SSH-over-443

某些网络会阻断 Git HTTPS 上传。可以改用 GitHub 的 SSH-over-443：

```bash
# 先在 GitHub Settings → SSH and GPG keys 中添加本机公钥
ssh -T -p 443 git@ssh.github.com

# 将 origin 切换到 SSH-over-443 URL
git remote set-url origin ssh://git@ssh.github.com:443/Royal44-k/xingyu-travel.git

# 通过专用私钥推送（Windows PowerShell 示例）
$env:GIT_SSH_COMMAND = 'ssh -i C:\Users\<用户名>\.ssh\id_ed25519_xingyu_travel -o IdentitiesOnly=yes -o BatchMode=yes -p 443'
git push -u origin HEAD:main
```

推送后进行只读核验：

```bash
git ls-remote --symref origin HEAD refs/heads/main
```

预期 `HEAD` 与 `refs/heads/main` 指向同一提交。请不要使用 `git push --force` 覆盖远端历史。

## 5. Vercel 发布流程

### 5.1 关联与拉取配置

在项目根目录确认 `.vercel/` 已存在。首次关联时：

```bash
pnpm dlx vercel link
pnpm dlx vercel pull --yes
```

确认当前账号和团队正确，避免把项目关联到错误团队。

### 5.2 创建 Preview

推荐先部署 Preview，而不是直接发布 Production：

```bash
pnpm dlx vercel deploy --yes --archive=tgz
```

保存 CLI 输出的 Preview URL。Preview 保持 Vercel SSO 访问保护；不要为了测试而关闭保护。

可使用 Vercel CLI 的受保护访问能力进行健康检查：

```bash
pnpm dlx vercel curl /api/v1/health --deployment <preview-url>
```

预期响应包含：

```json
{ "status": "ok", "demo_mode": true }
```

### 5.3 Preview 验收

至少检查：

- 首页、比价、灵感广场、攻略详情、行程、搭子、助手、守护与个人中心可访问
- `/api/v1/health` 返回 `200`
- 浏览器图标、`/manifest.webmanifest` 与图片资源可加载
- “攻略 → 行程 → 搭子 → 守护”本地闭环可完成
- 外部跳转确认、举报、联系方式同意、兴趣清空后重新选择可用
- 移动端宽度下导航与主要操作无横向溢出
- 浏览器控制台没有未处理错误，页面没有 `HTTP >= 400` 资源错误

### 5.4 Promote 到 Production

通过 Preview 验收后，将同一构建产物提升到生产，避免重新构建造成差异：

```bash
pnpm dlx vercel promote <preview-url>
```

然后用未登录/无保护绕过凭据的浏览器窗口验证公开 Production：

```text
https://xingyu-travel.vercel.app
```

Production 应公开访问；Preview 的 SSO 保护不应因此被关闭或弱化。

## 6. 回滚

如 Production 验收失败：

1. 通过 Vercel Dashboard 找到上一条已验证的 READY Production 部署；
2. 在确认无误后执行：

   ```bash
   pnpm dlx vercel rollback <known-good-production-url>
   ```

3. 重新访问生产域名，确认路由、图标、健康检查与关键闭环恢复；
4. 保留失败部署与验证记录，排查后再创建新的 Preview，不要直接覆盖历史部署。

## 7. 发布验收清单

| 项目 | 验收标准 |
| --- | --- |
| Git 工作树 | 无未提交的非预期改动 |
| 代码质量 | lint、typecheck、Vitest 通过 |
| 浏览器验收 | Playwright 通过，关键页面无控制台/页面错误 |
| 构建 | `pnpm build` 成功 |
| Preview | READY，受 SSO 保护，健康检查与关键流程可用 |
| Production | 由已验收 Preview promote，公开域名可访问 |
| 图标与 SEO | favicon、应用图标、manifest、robots、sitemap 可访问 |
| 发布记录 | 保存 Preview / Production URL、部署 ID、验证时间与回滚候选 |

## 8. 常见问题

### GitHub HTTPS 推送超时或被重置

确认网络可访问 GitHub；若 HTTPS 上传被网络策略阻断，按第 4 节改用 SSH-over-443。SSH 公钥需先添加到 GitHub 帐号。私钥只能保存在当前用户的 `.ssh` 目录，不能入库。

### SSH 报 `Permission denied (publickey)`

确认：

1. GitHub 帐号已添加匹配的公钥；
2. 使用的是对应私钥；
3. `ssh -T -p 443 git@ssh.github.com` 能识别正确 GitHub 用户；
4. `GIT_SSH_COMMAND` 中没有错误的密钥路径。

### Preview 打开后进入 Vercel 登录页

这是 Preview SSO 保护的预期行为。使用所属 Vercel 帐号登录，或用 `vercel curl` 执行受保护的健康检查；不要关闭 Preview 保护。

### 浏览器仍显示旧 favicon

浏览器会缓存站点图标。关闭旧标签页、重新打开生产域名，或使用 `Ctrl + F5` 强制刷新。

### 本地数据消失

行程、喜欢和偏好保存在浏览器 Local Storage。清除站点数据、切换浏览器或使用无痕窗口会重置演示状态；这是当前产品边界，不是服务器数据丢失。
