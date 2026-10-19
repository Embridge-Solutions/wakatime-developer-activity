# Developer Activity UI

Next.js 16 + React 19 + Redux Toolkit (RTK Query) + Tailwind 4 + recharts — the same stack as the earlier IoT UI.
Talks to the API in `../api`.

## Run

```bash
corepack enable           # once per machine — picks yarn 4.12 from package.json
yarn install
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:6689
yarn dev                  # http://localhost:3000
yarn build && yarn start  # production
```

The API's `RUNNING_ORIGIN` / `RUNNING_PORT` (or `CORS_ORIGINS`) must allow the UI's address.

## Screens

| Menu | Path | Scope |
|---|---|---|
| My Dashboard | `/developer-dashboard` | `mydashboard_view` — own activity (admins can pick any developer) |
| Team Dashboard | `/dashboard` | `teamdashboard_view` |
| Projects | `/projects`, `/projects/detail?name=` | `projectdashboard_view` — working now, branches + status, commits, files |
| AI Insights | `/ai-insights` | `aiinsights_view` |
| Reports | `/daily-report` … `/ai-report` | `report_view` (export: `report_export`) |
| Users | `/user`, `/user-creation` | `user_*` — login + role + teams + WakaTime tracking & token in one wizard |
| Teams | `/teams` | `team_*` |
| Roles | `/role` | `role_*` |
| WakaTime Tokens | `/wakatime-tokens` | `token_view` / `token_update` |
| Data Sync | `/data-sync` | `sync_view` / `sync_run` |
| Settings | `/mail-server`, `/weekly-report`, `/welcome-mail`, `/mail-history`, `/data-collection`, `/security-settings` | `settings_view` (changes: `settings_update`) |
| Profile › My WakaTime | `/my-wakatime` | every user — connect their own WakaTime token |

Data: with `activity_viewall` a user sees every developer; without it only their own (enforced by the API).
After login each user lands on the first screen they may open (`/start`): admins → Team Dashboard, developers → My Dashboard.

## Where things live

```
app/(auth)/login                 sign-in
app/(appPages)/(dashboards)/     dashboard, developer-dashboard, ai-insights
app/(appPages)/(reports)/        report tabs (layout.tsx) + 5 reports
app/(appPages)/projects | teams | user | user-creation | wakatime-tokens | data-sync
components/activity/             filter bar, KPI tile, panel, charts, token field, formatters, palette
redux/slice/                     developer.ts, wakatime.ts, activity.ts (+ auth, user, role, scopes, theme)
redux/slice/filterSlice.ts       date range / developer / team shared by every dashboard and report
config/brand.config.ts           product name, logo, colours, login text — the one file to rebrand
config/data-config.ts            sidebar menu and report tabs
```

Chart colours (`components/activity/palette.ts`) are a colour-vision-safe palette in a fixed order; a developer keeps
the same colour on every chart. Human vs AI is always blue vs orange.
