---
title: Google Ads 关键词规划师设置
description: 为 Ideon 的关键词规划师工具配置 Google Ads API 凭据的分步指南。
keywords: [ideon, google ads, 关键词规划师, mcp, 设置, 凭据]
---

# Google Ads 关键词规划师设置

Ideon 包含三个 Google 关键词规划师（GKP）MCP 工具，可从 Google Ads 获取真实关键词数据：

- `gkp_generate_ideas` — 从种子关键词或 URL 查找相关关键词
- `gkp_get_historical_data` — 获取关键词的历史搜索量和竞争数据
- `gkp_get_forecast_data` — 预测关键词的展示量、点击量和费用

本指南将引导你完成所有设置步骤，从创建 Google Ads 账号到在 Ideon 中配置凭据。

---

## 快速设置

最快的方式是使用 `ideon gads` 命令：

```bash
ideon gads login          # 交互式引导设置，包含 OAuth 流程
ideon gads status         # 检查哪些凭据已配置
ideon gads test           # 通过测试 API 调用验证凭据
```

`gads login` 命令会提示输入每个凭据，逐步保存，并打开浏览器进行 Google OAuth 授权。无需手动运行 curl 命令或编辑配置文件。

**其他 `gads` 命令：**

| 命令 | 用途 |
|---|---|
| `ideon gads login --force` | 即使已存在刷新令牌也重新授权 |
| `ideon gads logout` | 清除刷新令牌（保留其他凭据） |
| `ideon gads logout --all` | 清除所有 6 个 Google Ads 凭据 |

对于 CI/CD 或非交互式环境，请使用下面第 8 步中的凭据与环境变量配置流程。

---

## 使用 CLI（`ideon gkp`）

配置好凭据后，可直接从 CLI 查询关键词数据：

```bash
# 生成关键词建议
ideon gkp ideas --keywords seo,marketing
ideon gkp ideas --url https://example.com --country US,GB

# 获取历史指标
ideon gkp historical --keywords seo,marketing --country US

# 获取预测数据
ideon gkp forecast --keywords seo --match-type EXACT --country US
```

三个子命令都支持 `--json` 输出机器可读格式：

```bash
ideon gkp ideas --keywords seo --json
```

完整详情请参阅 [ideon gkp 命令参考](../reference/commands/ideon-gkp.md)。

---

## 前置条件清单

你总共需要 **六个凭据**。以下是每个凭据的说明和获取位置：

| # | 凭据 | 获取位置 | 必需 |
|---|---|---|---|
| 1 | 开发者令牌 | Google Ads API Center | 是 |
| 2 | OAuth2 客户端 ID | Google Cloud Console | 是 |
| 3 | OAuth2 客户端密钥 | Google Cloud Console | 是 |
| 4 | OAuth2 刷新令牌 | 一次性授权流程 | 是 |
| 5 | 客户 ID | Google Ads 账号编号 | 是 |
| 6 | 登录客户 ID | 管理器（MCC）账号编号 | 仅当使用子账号时需要 |

---

## 步骤 1：创建 Google Ads 管理器账号（MCC）

开发者令牌 **仅发放给管理器账号**，而非普通 Google Ads 账号。

1. 访问 [Google Ads 管理器账号](https://ads.google.com/home/tools/manager-accounts/)
2. 点击 **创建管理器账号**
3. 填写所需信息并完成设置
4. 记下右上角的账号编号 — 这就是你的 **管理器账号 ID**（格式：`XXX-XXX-XXXX`）

---

## 步骤 2：获取开发者令牌

1. 登录你的管理器账号 [ads.google.com](https://ads.google.com)
2. 前往 **工具和设置 → 设置 → API Center**（或直接访问 `https://ads.google.com/aw/apicenter`）
3. 找到你的 **开发者令牌** 并复制
4. 保存它 — 你将需要它作为 `googleAdsDeveloperToken`

> **⚠️ 新令牌默认处于测试模式。** 全新的开发者令牌只能调用 [Google Ads 测试账号](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)的 API。调用任何真实账号都会返回 `DEVELOPER_TOKEN_NOT_APPROVED`。
>
> **申请基础访问权限：** 在 API Center 中点击 **申请基础访问权限** 并填写表格。Google 会在几天内审核请求。基础访问权限足以使用关键词规划师 API — 你不需要标准访问权限。

---

## 步骤 3：设置 Google Cloud 项目

你需要一个启用了 Google Ads API 的 Google Cloud（GCP）项目。

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google Ads API：
   - 前往 [API 库](https://console.cloud.google.com/apis/library/googleads.googleapis.com)
   - 搜索 **Google Ads API**
   - 点击 **启用**

---

## 步骤 4：配置 OAuth 同意屏幕

1. 前往 [OAuth 同意屏幕](https://console.cloud.google.com/apis/credentials/consent)
2. 选择 **外部** 用户类型
3. 填写：
   - **应用名称**：任意（例如"Ideon Keyword Planner"）
   - **用户支持电子邮件**：你的邮箱
   - **开发者联系电子邮件**：你的邮箱
4. 点击 **保存并继续** 通过范围和测试用户屏幕
5. 将应用保留在 **测试** 模式
6. 添加你自己的 Google 账号为 **测试用户**：
   - 前往 [OAuth 同意屏幕](https://console.cloud.google.com/apis/credentials/consent) → **测试用户**
   - 点击 **添加用户** 并输入你的 Google 邮箱

---

## 步骤 5：创建 OAuth2 凭据

1. 前往 [凭据](https://console.cloud.google.com/apis/credentials)
2. 点击 **+ 创建凭据 → OAuth 客户端 ID**
3. 选择 **应用类型：桌面应用**
4. 给它一个名称（例如"Ideon GKP"）
5. 点击 **创建**
6. 复制 **客户端 ID** 和 **客户端密钥** — 你两个都需要

---

## 步骤 6：获取刷新令牌

这是一个 **一次性** 的授权流程。刷新令牌让 Ideon 能够自动获取新的访问令牌。

### 选项 A：使用浏览器（最简单）

1. 在浏览器中打开此 URL，替换 `YOUR_CLIENT_ID`：
   ```
   https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:9876&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent
   ```
2. 使用有权访问你的 Google Ads 账号的 Google 账号登录
3. 授予请求的权限
4. 浏览器将重定向到 `http://localhost:9876?code=...` — 从 URL 中复制 `code` 值

### 选项 B：使用命令行（macOS/Linux）

```bash
CLIENT_ID="YOUR_CLIENT_ID"
CLIENT_SECRET="YOUR_CLIENT_SECRET"
REDIRECT_URI="http://localhost:9876"

# 在浏览器中打开授权 URL
open "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fadwords&access_type=offline&prompt=consent"

# 启动临时 HTTP 服务器捕获重定向
CODE=$(python3 -c "
import http.server, urllib.parse, sys
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        print(params['code'][0], end='')
        self.send_response(200); self.end_headers()
        self.wfile.write(b'Auth complete! Close this tab.')
        sys.exit(0)
    def log_message(self, *a): pass
http.server.HTTPServer(('', 9876), H).handle_request()
")

# 交换令牌
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${CODE}&grant_type=authorization_code&redirect_uri=${REDIRECT_URI}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['refresh_token'])"
```

### 选项 C：使用 PowerShell（Windows）

```powershell
$clientId = "YOUR_CLIENT_ID"
$clientSecret = "YOUR_CLIENT_SECRET"
$redirectUri = "http://localhost:9876"
$authUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=$clientId&redirect_uri=$([Uri]::EscapeDataString($redirectUri))&response_type=code&scope=$([Uri]::EscapeDataString('https://www.googleapis.com/auth/adwords'))&access_type=offline&prompt=consent"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("$redirectUri/")
$listener.Start()

Start-Process $authUrl

$context = $listener.GetContext()
$rawUrl = $context.Request.RawUrl
$responseText = "<html><body><h2>Auth complete! You can close this tab.</h2></body></html>"
$buffer = [System.Text.Encoding]::UTF8.GetBytes($responseText)
$context.Response.ContentLength64 = $buffer.Length
$context.Response.OutputStream.Write($buffer, 0, $buffer.Length)
$context.Response.Close()
$listener.Stop()

$code = ($rawUrl -split "[?&]" | Where-Object { $_ -like "code=*" }) -replace "^code=", ""

$body = "client_id=$clientId&client_secret=$clientSecret&code=$([Uri]::EscapeDataString($code))&grant_type=authorization_code&redirect_uri=$([Uri]::EscapeDataString($redirectUri))"
$result = Invoke-RestMethod -Method Post -Uri "https://oauth2.googleapis.com/token" -Body $body -ContentType "application/x-www-form-urlencoded"
Write-Host "Refresh token: $($result.refresh_token)"
```

> **⚠️ 立即保存你的刷新令牌。** 你无法再次获取它。如果丢失，你必须重新运行授权流程。

---

## 步骤 7：查找你的客户 ID

1. 登录 [Google Ads](https://ads.google.com)
2. **账号编号** 显示在右上角（格式：`XXX-XXX-XXXX`）
3. 这就是你的 **客户 ID** — 使用已配置账单的账号

> **账单要求：** Google Ads 关键词规划师 API 需要配置了有效付款方式的账号。你不需要投放广告或花钱 — 只需要有付款方式记录在案。

---

## 步骤 8：在 Ideon 中配置凭据

获得所有六个凭据后，在 Ideon 中配置它们：

```bash
# 必需凭据
ideon config set googleAdsDeveloperToken "your-developer-token"
ideon config set googleAdsClientId "your-client-id.apps.googleusercontent.com"
ideon config set googleAdsClientSecret "your-client-secret"
ideon config set googleAdsRefreshToken "your-refresh-token"
ideon config set googleAdsCustomerId "123-456-7890"

# 仅当通过管理器账号访问时需要
ideon config set googleAdsLoginCustomerId "123-456-7890"
```

或设置为环境变量：

```bash
export TELEPAT_GOOGLE_ADS_DEVELOPER_TOKEN="your-developer-token"
export TELEPAT_GOOGLE_ADS_CLIENT_ID="your-client-id.apps.googleusercontent.com"
export TELEPAT_GOOGLE_ADS_CLIENT_SECRET="your-client-secret"
export TELEPAT_GOOGLE_ADS_REFRESH_TOKEN="your-refresh-token"
export TELEPAT_GOOGLE_ADS_CUSTOMER_ID="123-456-7890"
export TELEPAT_GOOGLE_ADS_LOGIN_CUSTOMER_ID="123-456-7890"  # 仅当需要时
```

---

## 步骤 9：验证设置

通过运行简单的关键词查询来测试你的凭据是否有效：

```bash
# 启动 MCP 服务器
ideon mcp serve
```

或验证凭据是否已配置：

```bash
ideon config list --json
```

你应该在 secrets 部分看到 `googleAdsDeveloperToken: true`、`googleAdsClientId: true` 等。

---

## 理解管理器账号和子账号

`googleAdsLoginCustomerId` 凭据是你的 **管理器/MCC 账号 ID**。仅当你的 `googleAdsCustomerId` 账号是通过管理器账号管理的子账号时才需要。

| 场景 | `googleAdsCustomerId` | `googleAdsLoginCustomerId` |
|---|---|---|
| 直接访问账号 | 账号自身的 ID | 不需要 |
| 通过管理器访问 | 子账号的 ID | 管理器账号 ID |

**如果不确定：** 将 `googleAdsLoginCustomerId` 设置为你的管理器账号 ID。即使不是严格需要，包含它也不会有问题。

---

## 常见错误和修复方法

| 错误 | 含义 | 修复方法 |
|---|---|---|
| `DEVELOPER_TOKEN_NOT_APPROVED` | 开发者令牌处于测试模式 | 在 [API Center](https://ads.google.com/aw/apicenter) 申请基础访问权限并等待批准 |
| `USER_PERMISSION_DENIED`（提及 `login-customer-id`） | 账号是子账号但缺少登录客户 ID | 将 `googleAdsLoginCustomerId` 设置为管理器账号 ID |
| `USER_PERMISSION_DENIED`（未提及 `login-customer-id`） | OAuth 用户无权访问该账号 | 以拥有 Ads 账号的 Google 账号重新运行 OAuth 流程 |
| `DEVELOPER_TOKEN_INVALID` | 开发者令牌错误或格式不正确 | 从 [API Center](https://ads.google.com/aw/apicenter) 重新复制并通过 `ideon config set googleAdsDeveloperToken` 设置 |
| `invalid_grant` | 刷新令牌已过期 | 重新运行 OAuth 授权流程获取新的刷新令牌 |
| `CUSTOMER_NOT_FOUND` | 账号 ID 错误或未配置 | 从 Google Ads UI 右上角验证客户 ID |
| `NOT_ADS_USER` | Google 账号未关联任何 Ads 账号 | 在 [ads.google.com](https://ads.google.com) 创建或关联 Google Ads 账号 |

---

## 相关资源

- [Google Ads API 文档](https://developers.google.com/google-ads/api/docs/)
- [Google Ads API 测试账号](https://developers.google.com/google-ads/api/docs/best-practices/test-accounts)
- [Google Ads API Center](https://ads.google.com/aw/apicenter)
- [Google Cloud Console](https://console.cloud.google.com/)
