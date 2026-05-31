# Dr Yuan Site

Dr Yuan personal website for `dr-yuan.org`.

## Pages

- `index.html`: personal home page
- `tools/health-revenue/index.html`: longevity business revenue calculator
- `tools/health-revenue/assessment.html`: self-build readiness assessment placeholder
- `admin/index.html`: private lead table viewer
- `functions/api/leads.js`: lead capture endpoint for the calculator
- `functions/api/admin/leads.js`: protected lead list and CSV export endpoint
- `migrations/0001_create_leads.sql`: D1 table setup

## Cloudflare Pages

- Framework preset: None
- Build command: leave empty
- Build output directory: `/`

After connecting this repository to Cloudflare Pages, bind:

- `dr-yuan.org`
- `www.dr-yuan.org`

## Lead Backend

See `docs/cloudflare-leads-backend.md`.

Required Cloudflare settings:

- D1 binding: `LEADS_DB`
- Secret: `ADMIN_TOKEN`

Optional email notification settings:

- `CF_ACCOUNT_ID`
- `CF_EMAIL_API_TOKEN`
- `EMAIL_FROM`
- `NOTIFY_EMAIL`
