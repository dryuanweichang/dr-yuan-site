# Cloudflare 线索后台配置

这个站点已经内置三块能力：

- `/api/leads`：接收“获取完整报告”的手机号、答题内容和测算结果。
- `/admin/`：用后台访问 Token 查看记录，并导出 CSV。
- `migrations/0001_create_leads.sql`：创建 Cloudflare D1 表格数据库。

## 1. 创建 D1 数据库

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 找到 `D1 SQL Database`，新建数据库。
4. 数据库名称建议填写：`health_revenue_leads`。
5. 创建完成后，进入这个数据库的 `Console` 或 `Query` 页面。
6. 把 `migrations/0001_create_leads.sql` 里的 SQL 全部复制进去执行。

## 2. 把数据库绑定到 Pages 项目

1. 进入 `Workers & Pages`。
2. 打开 Pages 项目：`dr-yuan-site`。
3. 进入 `Settings`。
4. 找到 `Bindings`。
5. 添加 `D1 database binding`。
6. Variable name 必须填写：`LEADS_DB`。
7. D1 database 选择刚才创建的 `health_revenue_leads`。
8. 保存后重新部署一次项目。

## 3. 设置后台访问 Token

1. 在 `dr-yuan-site` 的 `Settings` 里，进入 `Variables and Secrets`。
2. 添加一个变量。
3. 变量名填写：`ADMIN_TOKEN`。
4. 值填写一串你自己保存的长密码，例如 20 位以上的英文数字组合。
5. 勾选或选择 `Encrypt`，把它作为 Secret 保存。
6. 保存后重新部署一次项目。

后台地址：

```text
https://dr-yuan.org/admin/
```

打开后输入 `ADMIN_TOKEN`，就可以查看记录和导出 CSV。

## 4. 自动邮件提醒

邮件提醒是可选项。不开启邮件时，数据依然会正常写入后台表格。

如果你的 Cloudflare 后台能看到 `Email Sending`：

1. 进入 `Email Sending`。
2. Onboard `dr-yuan.org`。
3. 按提示添加 Cloudflare 自动生成的 DNS 记录。
4. 等待域名验证完成。
5. 创建一个 Cloudflare API Token，用于调用 Email Sending API。
6. 在 Pages 项目 `dr-yuan-site` 的 `Variables and Secrets` 添加：

```text
CF_ACCOUNT_ID = 你的 Cloudflare Account ID
CF_EMAIL_API_TOKEN = 刚创建的 API Token，建议加密保存
EMAIL_FROM = report@dr-yuan.org
NOTIFY_EMAIL = 你接收提醒的邮箱
```

保存后重新部署。之后每次有人提交手机号，你的邮箱会收到提醒。

如果你的账号暂时没有 `Email Sending`，先只开启 D1 后台即可；后续可以再接 Resend、企业微信机器人或 Cloudflare Email Service。

## 5. 上线测试

1. 打开 `https://dr-yuan.org/tools/health-revenue/`。
2. 完成测算。
3. 点击 `获取完整报告`。
4. 填写一个测试手机号并提交。
5. 打开 `https://dr-yuan.org/admin/`。
6. 输入 `ADMIN_TOKEN` 查看是否出现记录。
7. 点击 `导出 CSV`，检查是否能下载表格。

## 6. 注意事项

- `ADMIN_TOKEN` 不要发给外部人员，也不要写进网页正文。
- 手机号属于线索隐私数据，导出的 CSV 不要随意转发。
- 如果之后投放量变大，再增加短信验证或 Cloudflare Turnstile 防刷。
