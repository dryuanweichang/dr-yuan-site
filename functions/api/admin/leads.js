function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text || "{}");
  } catch (error) {
    return {};
  }
}

function authorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token && token === expected;
}

function normalizeRow(row) {
  return {
    id: row.id,
    phone: row.phone,
    submittedAt: row.submitted_at,
    sourcePath: row.source_path,
    answers: parseJson(row.answers_json),
    result: parseJson(row.result_json),
    judgement: row.judgement,
    currentRevenue: row.current_revenue,
    customerBase: row.customer_base,
    targetPool: row.target_pool,
    basePenetration: row.base_penetration,
    localRevenueMid: row.local_revenue_mid,
    channelTotal: row.channel_total,
    midShare: row.mid_share,
    emailSent: Boolean(row.email_sent),
    emailError: row.email_error || "",
    createdAt: row.created_at
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows) {
  const header = [
    "提交时间",
    "手机号",
    "结论",
    "门店规模",
    "门店类型",
    "单店活跃顾客",
    "顾客年消费",
    "年龄结构",
    "双美/医美占比",
    "渠道合作空间",
    "当前年营收估算",
    "本地诊所基准业绩",
    "含渠道合作总盘",
    "客户池内渗透率",
    "邮件提醒"
  ];

  const lines = rows.map(row => [
    row.submittedAt,
    row.phone,
    row.judgement,
    row.answers.stores,
    row.answers.storeType,
    row.answers.active,
    row.answers.spend,
    row.answers.age,
    row.answers.dual,
    row.answers.channel,
    row.currentRevenue,
    row.localRevenueMid,
    row.channelTotal,
    row.basePenetration,
    row.emailSent ? "已发送" : "未发送"
  ].map(csvCell).join(","));

  return `\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`;
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) {
    return jsonResponse({ ok: false, message: "未授权，请输入后台访问 Token。" }, 401);
  }

  if (!env.LEADS_DB) {
    return jsonResponse({ ok: false, message: "后台数据库还没有绑定。" }, 503);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 300);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const result = await env.LEADS_DB.prepare(`
    SELECT id, phone, submitted_at, source_path, answers_json, result_json, judgement,
           current_revenue, customer_base, target_pool, base_penetration,
           local_revenue_mid, channel_total, mid_share, email_sent, email_error, created_at
    FROM leads
    ORDER BY submitted_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  const rows = (result.results || []).map(normalizeRow);

  if (url.searchParams.get("format") === "csv") {
    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="health-revenue-leads.csv"`,
        "cache-control": "no-store"
      }
    });
  }

  return jsonResponse({ ok: true, rows, limit, offset });
}

export function onRequest() {
  return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
}
