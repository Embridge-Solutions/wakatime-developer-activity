# Developer Activity API

Node.js + Express backend: login, developers, WakaTime collection (nightly + manual), and later dashboards and report mails. SQL Server, stored procedures, all tables `E2M_*`.

## Setup (first time)

1. **Database** — in SSMS: `CREATE DATABASE E2M_Developer_Activity;` (SQL Server 2016+).
2. **Settings** — copy `env.txt` to `.env` and fill in DB, token secrets and `WAKA_TOKEN_SECRET`.
3. **Install** — `npm install` (the API uses npm; yarn is only for the UI).
4. **Login tables** (users, roles, scopes, sessions) and default users:
   ```bash
   npm run migrate
   npm run seed:all
   ```
5. **Developer activity tables + procedures** — run in SSMS, in order:
   ```
   sql/01_E2M_WakaTime_Tables.sql
   sql/02_E2M_Developer_Procedures.sql
   sql/03_E2M_WakaTime_Sync_Procedures.sql
   sql/04_E2M_Activity_Dashboard_Procedures.sql
   sql/05_E2M_Access_Scopes_Roles.sql        ← after step 4 (needs the login tables)
   ```
   All four are re-runnable. On a database created with an earlier 01, re-running 01 adds the AI columns and new tables in place.
6. **Start** — `npm run dev` (nodemon) or `npm start`. Check `GET /health`.
7. `npm test` — WakaTime mapping tests (no DB or API needed).

## Folder structure

```
api/
├── server.js                 Express app, routes from global-config, starts the WakaTime scheduler
├── config/                   env.js (all .env settings), db.js
├── communications/           Sequelize: models, migrations, seeders (users / roles / scopes)
│   └── middleware/           auth.js (JWT cookies), adminOnly.js
├── global-config/config.js   service list → URL path
├── middleware/               errorHandler.js (timeout + global error handler)
├── data/                     statusMessage.js (all response messages), theme-config.json
├── utils/                    logger, procedure.js (execProc), safeParam, upload
├── services/
│   ├── auth-services/        /auth       login, logout, password
│   ├── user-services/        /user       app users
│   ├── role-services/        /role
│   ├── scope-services/       /scope
│   ├── common-services/      /common/theme   organisation theme / logo
│   ├── developer-services/   /developer  developer master + WakaTime tokens
│   ├── wakatime-services/    /wakatime   sync now, sync status, runs, logs
│   ├── activity-services/    /activity   dashboards, reports, projects, working now
│   └── team-services/        /team       teams + members
│       └── helpers/          wakaClient, collector, transform, store, scheduler, crypto, dates
├── sql/                      E2M_* tables and PRC_* procedures (run in SSMS)
└── test/
```

Adding a service: create `services/<name>-services/{router,controller}` like the others and add it to `global-config/config.js`. SQL goes in a stored procedure called through `utils/procedure.js`.

## Access — scopes, not role names

Every screen and endpoint checks a scope (`<page>_<action>`), given to roles on the Roles screen.
`sql/05_E2M_Access_Scopes_Roles.sql` adds them and three roles:

| Role | Gets |
|---|---|
| Super_Admin | everything (also always full access by role name) |
| Admin | everything except creating / changing / deleting roles |
| Developer | `mydashboard_view`, `report_view`, `report_export` — **own data only** |

`activity_viewall` = see every developer's data. Without it the API returns only the developer linked to the
user's own login, whatever filter is sent.

## Users = login + WakaTime + teams

`POST /user/addUser` and `PUT /user/updateUser/:id` also take
`teamIds: [1,4]` and `wakatime: { track, developerCode, designation, apiKey? }`.
The developer row (`E2M_Developer_M`) is created / linked / updated in the backend; a token is verified with
WakaTime before anything is created. Deleting a user stops collection (activity is kept) and removes team memberships.

## Endpoints (developer activity)

Each endpoint needs its scope (see Access above). `/activity` data is limited to the user's own developer
unless they have `activity_viewall`.

| Method | Path | Body / query |
|---|---|---|
| GET | `/developer/getDevelopers` | `?status=ALL\|ACTIVE\|INACTIVE&search=` |
| GET | `/developer/getDeveloper/:id` | |
| POST | `/developer/addDeveloper` | `{ developerName, email, developerCode?, phone?, designation?, team?, userId?, apiKey? }` |
| PUT | `/developer/updateDeveloper/:id` | same fields, no `apiKey` |
| PUT | `/developer/updateStatus/:id` | `{ isActive: true \| false }` |
| DELETE | `/developer/deleteDeveloper/:id` | soft delete, activity kept |
| POST | `/developer/verifyApiKey` | `{ apiKey }` — test only, nothing saved |
| PUT | `/developer/updateApiKey/:id` | `{ apiKey }` — verified with WakaTime, stored encrypted |
| DELETE | `/developer/removeApiKey/:id` | |
| POST | `/wakatime/syncNow` | `{ developerId?, date? \| days? (0–14) }` — runs in background |
| GET | `/wakatime/getSyncStatus` | running run + last run result |
| GET | `/wakatime/getSyncRuns` | `?top=50` — run history from every API instance |
| GET | `/wakatime/getSyncLogs` | `?top=&developerId=&syncStatus=&fromDate=&runId=` |
| GET | `/activity/getScope` | admin, or the linked developer |
| GET | `/activity/getSummary` | KPIs + previous period · common query: `fromDate, toDate, developerId, team` |
| GET | `/activity/getDaily` | one row per developer per day |
| GET | `/activity/getBreakdown` | `dimension` = project / language / editor / category / operating_system / machine / dependency / branch / entity, `projectName`, `top` |
| GET | `/activity/getDevelopers` | one row per developer |
| GET | `/activity/getAiModels` | lines, tokens, cost per AI model |
| GET | `/activity/getAgents` | editors / AI tools with AI vs human lines |
| GET | `/activity/getHourly` | weekday × hour |
| GET | `/activity/getTimeline` | `developerId, date, sliceBy` |
| GET | `/activity/getLive` | who is working now (activity within `WAKA_ACTIVE_MINUTES`) and on which project |
| GET | `/activity/getProjects` | every project: time, developers, AI, branches, commits, working now |
| GET | `/activity/getProjectDevelopers` · `getProjectDaily` · `getProjectBranches` · `getProjectCommits` | `projectName` (+ `branch`, `top` for commits) |
| GET/POST/PUT/DELETE | `/team/getTeams` · `addTeam` · `updateTeam/:id` · `deleteTeam/:id` | `{ teamName, description, isActive, memberIds }` |

## WakaTime

- Each developer gives their **personal access token** from https://wakatime.com/oauth (starts with `waka_tok_`).
  The secret API key in WakaTime settings is **write-only** per WakaTime's docs — the API says so when one is entered.
- Ask every developer to set **Timezone = Asia/Kolkata** in WakaTime settings; the API warns when it differs.
- Nightly at 9 PM (`WAKA_SYNC_CRON`) it collects today + yesterday, so late-evening work is picked up complete the next night. Re-collecting a day replaces it.
- Free WakaTime plans keep about 7 days of history — run `syncNow` with `{ "days": 7 }` on day one.
- A rejected token is marked `INVALID` and skipped until a new one is saved.
- **No duplicates:** `PRC_Start_Waka_Sync_Run` allows one run at a time across all API instances (a stuck run is closed after 4 h);
  each developer-day is replaced in one locked transaction; rows are grouped before insert.

## What is collected per developer per day

| From WakaTime | Stored in |
|---|---|
| Total time, first / last activity, AI vs human lines, AI tokens, sessions, prompts, cost | `E2M_Waka_Daily_Summary_T` |
| Time per project, language, editor, category (incl. *AI Coding*), OS, machine, dependency, branch, file — with AI lines per project / editor / file | `E2M_Waka_Daily_Breakdown_T` |
| Work blocks with AI vs human lines | `E2M_Waka_Durations_T` |
| Raw heartbeats: file, branch, line, write, AI line changes, AI session / tokens | `E2M_Waka_Heartbeats_T` |
| Per-model lines, tokens, cost | `E2M_Waka_AI_Model_Daily_T` |
| Editors / plugins / AI tools and detected AI model | `E2M_Waka_User_Agent_T` |
| Every run and every developer-day result | `E2M_Waka_Sync_Run_T`, `E2M_Waka_Sync_Log_T` |
| Each developer's projects: repository + last activity (refreshed every 10 min → "working now") | `E2M_Waka_Project_T` |
| Commit messages, branch, author, coding time (repositories connected in WakaTime) | `E2M_Waka_Commit_T` |
| Teams and members (a user in many teams) | `E2M_Team_M`, `E2M_Team_User_T` |
