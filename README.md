# WakaTime → SQL Server nightly sync

Runs every night at **9 PM IST**, pulls each developer's full day from WakaTime and stores it in SQL Server.

## What gets stored per developer per day

| Table | What it holds |
|---|---|
| `waka_daily_summary` | Total coding time, first/last activity, heartbeat count, full raw JSON |
| `waka_daily_breakdown` | Time per project, language, editor, category, OS, machine, dependency — plus **branch** and **file** per project |
| `waka_durations` | Timeline of continuous work blocks (start time + length) |
| `waka_heartbeats` | Raw events: file, branch, line number, write/read, AI vs human line changes |
| `waka_sync_log` | One row per developer/date per run: success, failure, error text |

Views `vw_waka_daily_hours` and `vw_waka_branch_hours` are ready for your dev app.

## Three things to know first

1. **API keys can't read data.** WakaTime API keys are write-only (for editor plugins). Reading needs an **OAuth token** per developer.
2. **9 PM misses the late evening.** Anyone coding after 9 PM would be lost. So each run collects **today and yesterday** — yesterday gets re-pulled complete. Re-running a day replaces it, never duplicates.
3. **Free plan = ~7 days.** Data older than that can't be fetched. Run the backfill on day one and never let the job stop for a week.

---

## Step 1 — Create the database

In SSMS:

```sql
CREATE DATABASE WakaSync;
GO
USE WakaSync;
CREATE LOGIN waka_sync WITH PASSWORD = 'StrongPassword!123';
CREATE USER waka_sync FOR LOGIN waka_sync;
ALTER ROLE db_datareader ADD MEMBER waka_sync;
ALTER ROLE db_datawriter ADD MEMBER waka_sync;
GO
```

Then open `sql/schema.sql` and run it against `WakaSync`.

## Step 2 — Install the project

On the server that will run the job (needs Node.js 18+ and network access to SQL Server):

```bash
cd wakatime-sync
npm install
cp .env.example .env
```

## Step 3 — Fill in `.env`

- `DB_*` — your SQL Server details.
- `TOKEN_SECRET` — generate once and keep it safe:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Tokens are stored encrypted with this. Lose it and every developer must be re-added.

## Step 4 — Each developer does this once

1. Log in at wakatime.com.
2. **Settings → Preferences → Timezone → Asia/Kolkata** (so days line up with IST).
3. Open **https://wakatime.com/oauth** and copy the token (starts with `waka_tok_`).
4. Send it to you privately.

## Step 5 — Register each developer

```bash
node src/add-developer.js --name "Ravi" --email ravi@embridgesolutions.in --token waka_tok_xxxx
```

The script checks the token with WakaTime before saving it, and warns if the timezone isn't IST. Repeat for all 10.

Token revoked later? Replace it:

```bash
node src/add-developer.js --update 3 --token waka_tok_new
```

## Step 6 — Backfill the last 7 days (do this today)

```bash
node src/run-once.js --days 7
```

Check results:

```sql
SELECT * FROM dbo.vw_waka_daily_hours ORDER BY activity_date DESC, dev_name;
SELECT TOP 50 * FROM dbo.waka_sync_log ORDER BY id DESC;
```

## Step 7 — Start the 9 PM scheduler

**Linux / DigitalOcean (PM2):**

```bash
npm install -g pm2
pm2 start src/index.js --name wakatime-sync
pm2 save
pm2 startup        # follow the printed command so it survives reboots
pm2 logs wakatime-sync
```

**Windows server (next to SQL Server):** skip `index.js` and use Task Scheduler:
- Trigger: daily, 9:00 PM
- Action: `node.exe`, arguments `src\run-once.js`, start in the project folder

Either way, a run collects today + yesterday.

## Other commands

```bash
node src/run-once.js                      # same as the nightly job, right now
node src/run-once.js --date 2026-10-16    # one specific day
node src/run-once.js --dev 3 --days 2     # one developer only
npm test                                  # mapping tests (no DB or API needed)
```

## Tuning (`.env`)

| Setting | Default | Meaning |
|---|---|---|
| `CRON_SCHEDULE` | `0 21 * * *` | 9 PM daily |
| `LOOKBACK_DAYS` | `1` | Also re-collect this many previous days |
| `FETCH_PROJECT_DETAILS` | `true` | Branch + file breakdown (needed for Zoho mapping) |
| `DURATION_SLICES` | `project` | Add `language,entity` for more timelines |
| `API_MIN_INTERVAL_MS` | `300` | Gap between API calls (WakaTime limit: under 10/sec) |

## Size and timing

Roughly 4–8 API calls per developer per day. For 10 developers × 2 days, a run takes about a minute. Heartbeats are the big table — a few thousand rows per developer per active day.

## Monitoring

Failed or expired tokens show up here:

```sql
SELECT d.dev_name, l.activity_date, l.status, l.error_message, l.finished_at
FROM dbo.waka_sync_log l JOIN dbo.waka_developers d ON d.dev_id = l.dev_id
WHERE l.status <> 'SUCCESS' AND l.started_at > DATEADD(day, -2, SYSUTCDATETIME());
```

`AUTH_ERROR` means that developer needs a new token (Step 5, `--update`).

## Next: Zoho Sprints

`vw_waka_branch_hours` gives hours per developer, per day, per branch. With a branch naming rule like `ES-123-oee-fix`, the next step reads that view, extracts `ES-123`, and creates draft time logs in Zoho Sprints for each developer to confirm.
