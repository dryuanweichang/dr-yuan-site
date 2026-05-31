const ANSWER_LABELS = {
  stores: "门店规模",
  storeType: "门店类型",
  active: "单店活跃顾客",
  spend: "顾客年消费",
  age: "年龄结构",
  dual: "双美/医美占比",
  channel: "渠道合作空间"
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeJson(value) {
  const text = JSON.stringify(value || {});
  return text.length > 40000 ? text.slice(0, 40000) : text;
}

function formatWan(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${(number / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}万`;
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return `${(number * 100).toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailText(payload, id) {
  const result = payload.result || {};
  const answers = Object.entries(payload.answers || {})
    .map(([key, value]) => `${ANSWER_LABELS[key] || key}: ${value || "-"}`)
    .join("\n");

  return [
    "有新的健康业务营收潜力测算线索。",
    "",
    `记录编号: ${id || "-"}`,
    `手机号: ${payload.phone}`,
    `提交时间: ${payload.submittedAt}`,
    "",
    `初步结论: ${result.judgement || "-"}`,
    `当前年营收估算: ${formatWan(result.currentRevenue)}`,
    `本地诊所基准业绩: ${formatWan(result.localRevenueMid)}`,
    `含渠道合作总盘: ${formatWan(result.channelTotal)}`,
    `客户池内渗透率: ${percent(result.basePenetration)}`,
    "",
    "答题内容:",
    answers || "-",
    "",
    "后台查看: https://dr-yuan.org/admin/"
  ].join("\n");
}

function buildEmailHtml(payload, id) {
  const result = payload.result || {};
  const answerRows = Object.entries(payload.answers || {})
    .map(([key, value]) => `<tr><td>${escapeHtml(ANSWER_LABELS[key] || key)}</td><td>${escapeHtml(value || "-")}</td></tr>`)
    .join("");

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;color:#1f2621;line-height:1.7;">
      <h2 style="margin:0 0 12px;">新的健康业务营收潜力测算线索</h2>
      <p><strong>记录编号：</strong>${escapeHtml(id || "-")}</p>
      <p><strong>手机号：</strong>${escapeHtml(payload.phone)}</p>
      <p><strong>提交时间：</strong>${escapeHtml(payload.submittedAt)}</p>
      <hr style="border:none;border-top:1px solid #ddd7c9;margin:18px 0;">
      <p><strong>初步结论：</strong>${escapeHtml(result.judgement || "-")}</p>
      <p><strong>当前年营收估算：</strong>${escapeHtml(formatWan(result.currentRevenue))}</p>
      <p><strong>本地诊所基准业绩：</strong>${escapeHtml(formatWan(result.localRevenueMid))}</p>
      <p><strong>含渠道合作总盘：</strong>${escapeHtml(formatWan(result.channelTotal))}</p>
      <p><strong>客户池内渗透率：</strong>${escapeHtml(percent(result.basePenetration))}</p>
      <h3 style="margin:18px 0 8px;">答题内容</h3>
      <table style="border-collapse:collapse;width:100%;max-width:680px;">
        ${answerRows || "<tr><td>-</td><td>-</td></tr>"}
      </table>
      <p style="margin-top:18px;"><a href="https://dr-yuan.org/admin/">打开后台查看完整记录</a></p>
    </div>
  `;
}

async function sendNotification(env, payload, id) {
  if (!env.CF_ACCOUNT_ID || !env.CF_EMAIL_API_TOKEN || !env.EMAIL_FROM || !env.NOTIFY_EMAIL) {
    return { configured: false, sent: false, error: "" };
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.CF_EMAIL_API_TOKEN}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: env.NOTIFY_EMAIL,
      from: env.EMAIL_FROM,
      subject: `新的测算线索：${payload.phone}`,
      text: buildEmailText(payload, id),
      html: buildEmailHtml(payload, id)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText.slice(0, 500));
  }

  return { configured: true, sent: true, error: "" };
}

export async function onRequestPost({ request, env }) {
  if (!env.LEADS_DB) {
    return jsonResponse({ ok: false, message: "后台数据库还没有绑定。" }, 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > 60000) {
    return jsonResponse({ ok: false, message: "提交内容过大。" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    return jsonResponse({ ok: false, message: "提交内容格式不正确。" }, 400);
  }

  const phone = normalizePhone(body.phone);
  if (!/^1\d{10}$/.test(phone)) {
    return jsonResponse({ ok: false, message: "请填写有效的11位手机号。" }, 400);
  }

  const now = new Date().toISOString();
  const result = body.result && typeof body.result === "object" ? body.result : {};
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const submittedAt = typeof body.submittedAt === "string" ? body.submittedAt : now;
  const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath.slice(0, 300) : new URL(request.url).pathname;
  const ip = request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const payload = { phone, submittedAt, answers, result };

  const insert = await env.LEADS_DB.prepare(`
    INSERT INTO leads (
      phone, submitted_at, source_path, answers_json, result_json, judgement,
      current_revenue, customer_base, target_pool, base_penetration,
      local_revenue_mid, channel_total, mid_share, ip, user_agent, email_sent
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).bind(
    phone,
    submittedAt,
    sourcePath,
    safeJson(answers),
    safeJson(result),
    String(result.judgement || ""),
    asNumber(result.currentRevenue),
    asNumber(result.customerBase),
    asNumber(result.targetPool),
    asNumber(result.basePenetration),
    asNumber(result.localRevenueMid),
    asNumber(result.channelTotal),
    asNumber(result.midShare),
    ip,
    userAgent.slice(0, 500)
  ).run();

  const id = insert.meta?.last_row_id || null;
  let emailStatus = { configured: false, sent: false, error: "" };

  try {
    emailStatus = await sendNotification(env, payload, id);
  } catch (error) {
    emailStatus = { configured: true, sent: false, error: error.message || "Email send failed" };
    console.error("Lead notification email failed", error);
  }

  if (id && emailStatus.configured) {
    await env.LEADS_DB.prepare("UPDATE leads SET email_sent = ?, email_error = ? WHERE id = ?")
      .bind(emailStatus.sent ? 1 : 0, emailStatus.error, id)
      .run();
  }

  return jsonResponse({
    ok: true,
    id,
    emailSent: emailStatus.sent,
    emailConfigured: emailStatus.configured
  }, 201);
}

export function onRequest() {
  return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
}
