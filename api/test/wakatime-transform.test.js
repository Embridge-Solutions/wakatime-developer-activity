// Sanity test of the WakaTime JSON -> procedure row mapping and IST dates (no DB or API needed).
//   node test/wakatime-transform.test.js
const assert = require('assert');
process.env.WAKA_TIMEZONE = 'Asia/Kolkata';
const T = require('../services/wakatime-services/helpers/transform');
const { datesToCollect, shiftDay } = require('../services/wakatime-services/helpers/dates');

const day = {
  grand_total: { total_seconds: 12600, text: '3 hrs 30 mins' },
  projects: [{ name: 'E2M', total_seconds: 9000, percent: 71.4 }, { name: 'CarbonIQ', total_seconds: 3600, percent: 28.6 }],
  languages: [{ name: 'TypeScript', total_seconds: 8000, percent: 63 }],
  editors: [{ name: 'VS Code', total_seconds: 12600, percent: 100 }],
  categories: [{ name: 'Coding', total_seconds: 12000, percent: 95 }],
};
const projectDetails = [{
  project: 'E2M',
  day: {
    branches: [{ name: 'ES-123-oee-fix', total_seconds: 7000, percent: 77 }],
    entities: [{ name: '/src/oee/calc.ts', total_seconds: 5000, percent: 55 }],
  },
}];

const b = T.breakdownRows(day, projectDetails);
assert.strictEqual(b.filter((r) => r.dimension === 'project').length, 2);
const branch = b.find((r) => r.dimension === 'branch');
assert.strictEqual(branch.projectName, 'E2M');
assert.strictEqual(branch.itemName, 'ES-123-oee-fix');

const hb = T.heartbeatRows([
  { time: 1760600000.123, entity: '/src/a.ts', type: 'file', project: 'E2M', branch: 'main', is_write: true, lines: 120, lineno: 7 },
  { time: 1760600600, entity: '/src/b.ts', type: 'file', project: 'E2M', branch: 'main' },
]);
// UTC, no 'T'/'Z' — the format SQL Server's OPENJSON reads into datetime2(3)
assert.strictEqual(hb[0].hbTimeUtc, '2025-10-16 07:33:20.123');
assert.strictEqual(hb[0].lineNo, 7);
assert.strictEqual(hb[1].isWrite, null);

const s = T.summaryRow(day, hb);
assert.strictEqual(s.totalSeconds, 12600);
assert.strictEqual(s.heartbeatCount, 2);
assert.strictEqual(s.firstActivityUtc, '2025-10-16 07:33:20.123');
assert.strictEqual(s.lastActivityUtc, '2025-10-16 07:43:20.000');
assert.strictEqual(T.summaryRow(null, []).firstActivityUtc, null);

const d = T.durationRows([{ project: 'E2M', time: 1760600000, duration: 1800 }], 'project');
assert.strictEqual(d[0].sliceValue, 'E2M');
assert.strictEqual(d[0].durationSeconds, 1800);

// 2026-10-17 22:00 IST = 16:30 UTC -> today is 17th, yesterday 16th
assert.deepStrictEqual(datesToCollect(1, new Date('2026-10-17T16:30:00Z')), ['2026-10-16', '2026-10-17']);
// 2026-10-17 00:30 IST is still 16th in UTC — must resolve to the IST day
assert.deepStrictEqual(datesToCollect(0, new Date('2026-10-16T19:00:00Z')), ['2026-10-17']);
assert.strictEqual(shiftDay('2026-03-01', -1), '2026-02-28');

// GenAI fields (WakaTime summaries grand_total / projects / editors, durations, user agents)
const aiDay = {
  grand_total: {
    total_seconds: 3600, ai_additions: 120, ai_deletions: 10, human_additions: 40, human_deletions: 5,
    ai_input_tokens: 9000, ai_output_tokens: 1500, ai_sessions: 3, ai_prompt_events_total: 12,
    ai_model_costs: { 'claude-sonnet': 0.3, 'gpt-5': 0.2 },
    ai_model_breakdown: [{ name: 'claude-sonnet', lines: 100, input_tokens: 8000, output_tokens: 1200, cost: 0.3 }],
  },
  editors: [{ name: 'Claude Code', total_seconds: 1800, ai_additions: 120, human_additions: 0 }],
};
const aiSummary = T.summaryRow(aiDay, []);
assert.strictEqual(aiSummary.aiAdditions, 120);
assert.strictEqual(aiSummary.aiPromptEvents, 12);
assert.strictEqual(aiSummary.aiCostUsd, 0.5); // no total → sum of ai_model_costs
assert.strictEqual(T.breakdownRows(aiDay).find((r) => r.dimension === 'editor').aiAdditions, 120);
assert.deepStrictEqual(T.aiModelRows(aiDay).map((m) => [m.modelName, m.lineChanges, m.costUsd]), [['claude-sonnet', 100, 0.3]]);
// only the maps → one row per model from line changes + costs
const mapsOnly = T.aiModelRows({ grand_total: { ai_model_line_changes: { a: 5 }, ai_model_costs: { a: 0.1, b: 0.2 } } });
assert.deepStrictEqual(mapsOnly.map((m) => [m.modelName, m.lineChanges, m.costUsd]), [['a', 5, 0.1], ['b', null, 0.2]]);
assert.deepStrictEqual(T.aiModelRows(null), []);
assert.strictEqual(T.summaryRow(null, []).aiAdditions, null); // no data stays NULL, not 0

const ua = T.userAgentRows({ id: 'ua1', editor: 'Cursor', ai_model: 'claude', last_seen_at: '2026-10-18T09:12:00Z', is_desktop_app: false });
assert.deepStrictEqual([ua[0].agentId, ua[0].editor, ua[0].aiModel, ua[0].lastSeenUtc, ua[0].isDesktopApp], ['ua1', 'Cursor', 'claude', '2026-10-18 09:12:00', false]);
assert.strictEqual(T.userAgentRows([{ value: 'no id' }]).length, 0);
assert.strictEqual(T.durationRows([{ project: 'E2M', time: 1, duration: 5, ai_sessions: 2, ai_model_total_cost: 0.04 }], 'project')[0].aiCostUsd, 0.04);

// Projects (last activity + repository) and commits
const pr = T.projectRows([{ id: 'p1', name: 'E2M', last_heartbeat_at: '2026-10-18T09:40:00Z', repository: { html_url: 'https://github.com/org/e2m', provider: 'github', default_branch: 'main', full_name: 'org/e2m' } }, { id: 'x' }]);
assert.deepStrictEqual([pr.length, pr[0].projectName, pr[0].repositoryProvider, pr[0].lastHeartbeatUtc], [1, 'E2M', 'github', '2026-10-18 09:40:00']);
const cr = T.commitRows([{ hash: 'abcdef1234567', message: 'Fix OEE calc', branch: 'ES-12', author_email: 'Ravi@X.in', author_date: '2026-10-17T10:00:00Z', total_seconds: 1800 }, { message: 'no hash' }]);
assert.deepStrictEqual([cr.length, cr[0].truncatedHash, cr[0].authorEmail, cr[0].authorDateUtc, cr[0].totalSeconds], [1, 'abcdef1', 'ravi@x.in', '2026-10-17 10:00:00', 1800]);

console.log('All WakaTime transform tests passed');
