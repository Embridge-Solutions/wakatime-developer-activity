// E-mail HTML — tables + inline styles only, so Outlook, Gmail and phone mail apps render it the same.
const ENV = require('../../../config/env');

const BRAND = '#4f6bed';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const AI = '#eb6834';
const HUMAN = '#2a78d6';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 13500 → "3h 45m" */
const dur = (seconds) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`);
const usd = (v) => `$${(Number(v) || 0).toFixed(2)}`;
const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const day = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }) : '—';
const time = (t) => (t ? String(t).slice(11, 16) : '—');
/** "2026-10-12" → "12 Oct" */
const shortDay = (d) =>
  new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const range = (from, to) => `${shortDay(from)} – ${shortDay(to)} ${String(to).slice(0, 4)}`;
/** Change vs previous week, e.g. "▲ 12% vs last week" */
const change = (cur, prev) => {
  const c = Number(cur) || 0;
  const p = Number(prev) || 0;
  if (!p) return '';
  const d = ((c - p) / p) * 100;
  return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(0)}% vs previous week`;
};

/* ─── Building blocks ─────────────────────────────────────────────────────── */

const button = (label, url) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0"><tr><td style="background:${BRAND};border-radius:8px">
     <a href="${esc(url)}" style="display:inline-block;padding:11px 20px;font:600 14px Arial,sans-serif;color:#ffffff;text-decoration:none">${esc(label)} →</a>
   </td></tr></table>`;

const section = (title, html) =>
  `<tr><td style="padding:22px 28px 4px"><p style="margin:0 0 10px;font:700 15px Arial,sans-serif;color:${INK}">${esc(title)}</p>${html}</td></tr>`;

/** KPI tiles, up to 3 per row */
const kpis = (items) => {
  const rows = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (k) => `<td width="33%" valign="top" style="padding:4px">
              <div style="border:1px solid ${LINE};border-radius:10px;padding:12px 14px">
                <div style="font:600 11px Arial,sans-serif;color:${MUTED};text-transform:uppercase;letter-spacing:.04em">${esc(k.label)}</div>
                <div style="font:700 22px Arial,sans-serif;color:${INK};margin-top:4px">${esc(k.value)}</div>
                <div style="font:12px Arial,sans-serif;color:${MUTED};margin-top:2px">${esc(k.sub || '')}&nbsp;</div>
              </div></td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</table>`;
};

/** columns: [{ label, align? }], rows: [[cellHtml…]] — cells are already escaped by the caller */
const table = (columns, rows, emptyText = 'No data for this week.') =>
  rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font:13px Arial,sans-serif;color:${INK}">
        <tr>${columns
          .map((c) => `<th align="${c.align || 'left'}" style="padding:8px 8px;border-bottom:2px solid ${LINE};font:600 11px Arial,sans-serif;color:${MUTED};text-transform:uppercase">${esc(c.label)}</th>`)
          .join('')}</tr>
        ${rows
          .map((r) => `<tr>${r.map((cell, i) => `<td align="${columns[i].align || 'left'}" style="padding:8px 8px;border-bottom:1px solid ${LINE}">${cell}</td>`).join('')}</tr>`)
          .join('')}
      </table>`
    : `<p style="margin:0;font:13px Arial,sans-serif;color:${MUTED}">${esc(emptyText)}</p>`;

/** Proportional bar for a share (0–100) */
const bar = (share, color = HUMAN) =>
  `<div style="background:#eef2f7;border-radius:4px;height:6px;width:120px"><div style="background:${color};border-radius:4px;height:6px;width:${Math.max(2, Math.min(100, share))}%"></div></div>`;

/** Small "share of the week" bar + percentage, as a table so every mail client draws it the same */
const shareBar = (share) => {
  const w = Math.round(Math.max(2, Math.min(100, share)) * 0.6);
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${HUMAN};height:6px;width:${w}px;border-radius:3px 0 0 3px"></td>
        <td style="background:#eef2f7;height:6px;width:${60 - w}px;border-radius:0 3px 3px 0"></td>
        <td style="padding-left:6px;font:bold 12px Arial,sans-serif;color:${INK}">${esc(share.toFixed(1))}%</td></tr></table>`;
};

/** AI vs human split bar */
const aiBar = (aiPct) =>
  aiPct === null || aiPct === undefined
    ? '—'
    : `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${AI};height:6px;width:${Math.round(aiPct)}px;border-radius:3px 0 0 3px"></td>
        <td style="background:${HUMAN};height:6px;width:${100 - Math.round(aiPct)}px;border-radius:0 3px 3px 0"></td>
        <td style="padding-left:6px;font:12px Arial,sans-serif;color:${INK}">${pct(aiPct)}</td></tr></table>`;

/** The whole mail. body = <tr>…</tr> sections */
const layout = ({ preheader, title, subtitle, body, footerNote }) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f8">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f8;padding:24px 8px"><tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${LINE}">
  <tr><td style="background:#0f1422;padding:20px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td><span style="display:inline-block;background:${BRAND};color:#fff;border-radius:7px;padding:4px 7px;font:700 13px Arial,sans-serif">&lt;/&gt;</span>
          <span style="font:700 15px Arial,sans-serif;color:#ffffff;margin-left:8px">${esc(ENV.MAIL_FROM_NAME || 'Developer Activity')}</span></td>
    </tr></table>
    <p style="margin:16px 0 0;font:700 21px Arial,sans-serif;color:#ffffff">${esc(title)}</p>
    ${subtitle ? `<p style="margin:4px 0 0;font:13px Arial,sans-serif;color:#aab4cf">${esc(subtitle)}</p>` : ''}
  </td></tr>
  ${body}
  <tr><td style="padding:24px 28px 26px;border-top:1px solid ${LINE};margin-top:16px">
    <p style="margin:0;font:12px Arial,sans-serif;color:${MUTED};line-height:1.6">${footerNote || ''}
    This is an automatic mail from ${esc(ENV.MAIL_FROM_NAME || 'Developer Activity')} · data from WakaTime · times in IST.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

/* ─── Weekly report — one developer ───────────────────────────────────────── */

const weeklyDeveloper = (d) => {
  const s = d.summary || {};
  const subject = `Your week in code · ${range(d.fromDate, d.toDate)} · ${dur(s.totalSeconds)}`;
  const activeDays = d.daily.filter((r) => r.totalSeconds > 0);
  const totalProject = d.projects.reduce((a, p) => a + p.totalSeconds, 0) || 1;
  const totalLang = d.languages.reduce((a, p) => a + p.totalSeconds, 0) || 1;

  const body = [
    `<tr><td style="padding:22px 28px 0"><p style="margin:0;font:14px Arial,sans-serif;color:${INK};line-height:1.6">Hi ${esc(d.developer.developerName)},<br>here is your coding activity for <b>${esc(range(d.fromDate, d.toDate))}</b>.</p></td></tr>`,
    section(
      'Your week at a glance',
      kpis([
        { label: 'Coding time', value: dur(s.totalSeconds), sub: change(s.totalSeconds, s.prevTotalSeconds) },
        { label: 'Active days', value: `${activeDays.length} / 7`, sub: activeDays.length ? `${dur(s.totalSeconds / activeDays.length)} per active day` : '' },
        { label: 'AI share of code', value: pct(s.aiLinePct), sub: `${num((s.aiAdditions || 0) + (s.aiDeletions || 0))} AI · ${num((s.humanAdditions || 0) + (s.humanDeletions || 0))} human lines` },
        { label: 'AI coding time', value: dur(s.aiCodingSeconds), sub: s.aiCodingPct != null ? `${pct(s.aiCodingPct)} of coding time` : '' },
        { label: 'Projects', value: String(d.projects.length), sub: d.projects[0] ? `most time: ${d.projects[0].itemName}` : '' },
        { label: 'AI cost (est.)', value: usd(s.aiCostUsd), sub: `${num(s.aiSessions)} AI sessions` },
      ]),
    ),
    section(
      'Day by day',
      table(
        [{ label: 'Day' }, { label: 'Time', align: 'right' }, { label: 'First' }, { label: 'Last' }, { label: 'Main project' }, { label: 'AI' }],
        d.daily.map((r) => [esc(day(r.activityDate)), `<b>${esc(dur(r.totalSeconds))}</b>`, esc(time(r.firstActivity)), esc(time(r.lastActivity)), esc(r.topProject || '—'), aiBar(r.aiLinePct)]),
        'No coding activity recorded this week.',
      ),
    ),
    section(
      'Your work per project',
      table(
        [
          { label: 'Project' },
          { label: 'Time', align: 'right' },
          { label: '% of your week', align: 'right' },
          { label: 'Days', align: 'right' },
          { label: 'Main branch' },
          { label: 'AI' },
        ],
        d.projects.map((p) => {
          const share = (p.totalSeconds / totalProject) * 100;
          const mainBranch = d.branches.find((b) => b.projectName === p.itemName);
          return [
            `<b>${esc(p.itemName)}</b>`,
            `<b>${esc(dur(p.totalSeconds))}</b>`,
            shareBar(share),
            esc(p.dayCount),
            esc(mainBranch?.itemName || '—'),
            aiBar(p.aiLinePct),
          ];
        }),
        'No project activity this week.',
      ),
    ),
    section(
      'Branches',
      table(
        [{ label: 'Branch' }, { label: 'Project' }, { label: 'Time', align: 'right' }],
        d.branches.slice(0, 6).map((b) => [esc(b.itemName), esc(b.projectName), `<b>${esc(dur(b.totalSeconds))}</b>`]),
        'No branch activity this week.',
      ),
    ),
    section(
      'Languages & tools',
      table(
        [{ label: 'Language' }, { label: 'Time', align: 'right' }, { label: 'Share' }],
        d.languages.slice(0, 5).map((l) => [esc(l.itemName), `<b>${esc(dur(l.totalSeconds))}</b>`, bar((l.totalSeconds / totalLang) * 100)]),
      ) +
        (d.agents.length
          ? `<p style="margin:10px 0 0;font:13px Arial,sans-serif;color:${MUTED}">Editors &amp; AI tools: ${d.agents
              .slice(0, 5)
              .map((a) => `<b style="color:${INK}">${esc(a.editor)}</b>${a.isAiTool ? ' (AI)' : ''} ${esc(dur(a.totalSeconds))}`)
              .join(' · ')}</p>`
          : ''),
    ),
    `<tr><td style="padding:18px 28px 4px">${button('Open My Dashboard', `${ENV.APP_URL}/developer-dashboard`)}</td></tr>`,
  ].join('');

  return {
    subject,
    html: layout({
      preheader: `${dur(s.totalSeconds)} coded, ${activeDays.length} active days, AI ${pct(s.aiLinePct)}`,
      title: 'Your week in code',
      subtitle: range(d.fromDate, d.toDate),
      body,
      footerNote: 'You get this because your coding activity is tracked. Only your own data is in this mail.<br>',
    }),
    text: `${subject}\nCoding time: ${dur(s.totalSeconds)}\nActive days: ${activeDays.length}/7\nAI share: ${pct(s.aiLinePct)}\n${ENV.APP_URL}/developer-dashboard`,
  };
};

/* ─── Weekly report — whole team (admins) ─────────────────────────────────── */

const weeklyTeam = (t) => {
  const s = t.summary || {};
  const devs = s.activeDevelopers || 0;
  const subject = `Team coding report · ${range(t.fromDate, t.toDate)} · ${dur(s.totalSeconds)} by ${devs} developer${devs === 1 ? '' : 's'}`;
  const active = t.developers.filter((d) => !d.isDeleted && d.isActive);
  const idle = active.filter((d) => !d.totalSeconds);
  const tokenIssues = active.filter((d) => d.keyStatus !== 'VALID');
  const totalProject = t.projects.reduce((a, p) => a + p.totalSeconds, 0) || 1;

  const attention = [
    ...idle.map((d) => `<li><b>${esc(d.developerName)}</b> — no coding activity this week</li>`),
    ...tokenIssues.map(
      (d) => `<li><b>${esc(d.developerName)}</b> — WakaTime token ${d.keyStatus === 'INVALID' ? 'rejected by WakaTime (needs a new token)' : 'not set'}</li>`,
    ),
  ];

  const body = [
    `<tr><td style="padding:22px 28px 0"><p style="margin:0;font:14px Arial,sans-serif;color:${INK};line-height:1.6">Hi,<br>here is the team's coding activity for <b>${esc(range(t.fromDate, t.toDate))}</b>.</p></td></tr>`,
    section(
      'Team at a glance',
      kpis([
        { label: 'Coding time', value: dur(s.totalSeconds), sub: change(s.totalSeconds, s.prevTotalSeconds) },
        { label: 'Active developers', value: `${s.activeDevelopers || 0} / ${s.registeredDevelopers || 0}`, sub: `${s.activeDeveloperDays || 0} developer-days` },
        { label: 'Avg per active day', value: s.avgHoursPerActiveDay != null ? `${s.avgHoursPerActiveDay}h` : '—', sub: 'per developer' },
        { label: 'AI share of code', value: pct(s.aiLinePct), sub: s.prevAiLinePct != null ? `was ${pct(s.prevAiLinePct)}` : 'of line changes' },
        { label: 'AI coding time', value: dur(s.aiCodingSeconds), sub: s.aiCodingPct != null ? `${pct(s.aiCodingPct)} of coding time` : '' },
        { label: 'AI cost (est.)', value: usd(s.aiCostUsd), sub: `${s.aiModelCount || 0} models · ${s.aiToolCount || 0} AI tools` },
      ]),
    ),
    attention.length
      ? section(
          'Needs attention',
          `<ul style="margin:0;padding-left:18px;font:13px Arial,sans-serif;color:${INK};line-height:1.7">${attention.join('')}</ul>`,
        )
      : '',
    section(
      'Developers',
      table(
        [
          { label: 'Developer' },
          { label: 'Time', align: 'right' },
          { label: '% of team', align: 'right' },
          { label: 'Days', align: 'right' },
          { label: 'Avg / day', align: 'right' },
          { label: 'AI share' },
          { label: 'Main project' },
        ],
        active.map((d) => [
          `<b>${esc(d.developerName)}</b><br><span style="color:${MUTED};font-size:11px">${esc(d.team || '')}</span>`,
          `<b>${esc(dur(d.totalSeconds))}</b>`,
          esc(`${(((d.totalSeconds || 0) / (s.totalSeconds || 1)) * 100).toFixed(1)}%`),
          esc(d.activeDays),
          esc(d.avgHoursPerActiveDay != null ? `${d.avgHoursPerActiveDay}h` : '—'),
          aiBar(d.aiLinePct),
          esc(d.topProject || '—'),
        ]),
      ),
    ),
    section(
      'Projects — share of team time',
      table(
        [
          { label: 'Project' },
          { label: 'Time', align: 'right' },
          { label: '% of team time', align: 'right' },
          { label: 'Developers', align: 'right' },
          { label: 'AI share' },
        ],
        t.projects.map((p) => {
          const share = (p.totalSeconds / totalProject) * 100;
          return [
            `<b>${esc(p.itemName)}</b>`,
            `<b>${esc(dur(p.totalSeconds))}</b>`,
            shareBar(share),
            esc(p.developerCount),
            aiBar(p.aiLinePct),
          ];
        }),
      ) +
        `<p style="margin:8px 0 0;font:12px Arial,sans-serif;color:${MUTED}">Percentages add up to 100% of the team's coding time this week.</p>`,
    ),
    t.aiModels.length
      ? section(
          'AI models',
          table(
            [{ label: 'Model' }, { label: 'Lines', align: 'right' }, { label: 'Developers', align: 'right' }, { label: 'Cost', align: 'right' }],
            t.aiModels.slice(0, 5).map((m) => [esc(m.modelName), esc(num(m.lineChanges)), esc(m.developerCount), esc(usd(m.costUsd))]),
          ),
        )
      : '',
    `<tr><td style="padding:18px 28px 4px">${button('Open Team Dashboard', `${ENV.APP_URL}/dashboard`)}</td></tr>`,
  ].join('');

  return {
    subject,
    html: layout({
      preheader: `${dur(s.totalSeconds)} coded by ${s.activeDevelopers || 0} developers, AI ${pct(s.aiLinePct)}`,
      title: 'Team coding report',
      subtitle: range(t.fromDate, t.toDate),
      body,
      footerNote: 'You get this because you can see every developer\'s activity in Developer Activity.<br>',
    }),
    text: `${subject}\nActive developers: ${s.activeDevelopers}/${s.registeredDevelopers}\nAI share: ${pct(s.aiLinePct)}\n${ENV.APP_URL}/dashboard`,
  };
};

/* ─── Welcome mail — with the next steps ──────────────────────────────────── */

const welcome = (u, { extraNote = '' } = {}) => {
  const login = `${ENV.APP_URL}/login`;
  const tokenDone = u.keyStatus === 'VALID';
  const link = (href, text) => `<a href="${esc(href)}" style="color:${BRAND}">${esc(text)}</a>`;
  // Every user gets every step — the ones already done say so.
  const steps = [
    `<b>Sign in</b> at ${link(login, login)} with the username <b>${esc(u.username)}</b> and the password your administrator gave you.`,
    `<b>Change your password</b>: click your name (top right) → <b>Login &amp; Password</b> → enter the old and a new password → Save.`,
    `<b>Check your profile</b>: click your name → <b>Personal Information</b> and correct your name, e-mail and phone if needed.`,
    `<b>Create a WakaTime account</b> (free) at ${link('https://wakatime.com/signup', 'wakatime.com/signup')} with your work e-mail — skip if you already have one.`,
    `<b>Install the WakaTime plugin</b> in every editor you use — VS Code: Extensions → search “WakaTime” → Install; other editors: ${link('https://wakatime.com/plugins', 'wakatime.com/plugins')}. When the plugin asks for a key, paste your <b>secret API key</b> from ${link('https://wakatime.com/settings/api-key', 'wakatime.com/settings/api-key')}. This records your coding.`,
    `<b>Set your WakaTime timezone</b> to <b>Asia/Kolkata</b> at ${link('https://wakatime.com/settings/preferences', 'wakatime.com/settings/preferences')}, so your days match our reports.`,
    tokenDone
      ? `<b>WakaTime access token</b>: already connected for you ✔ — nothing to do now.`
      : `<b>Connect WakaTime to this app</b>: open ${link('https://wakatime.com/oauth', 'wakatime.com/oauth')} while signed in to WakaTime and copy the <b>access token</b> (starts with <code>waka_tok_</code>). In this app click your name → <b>My WakaTime</b> → paste it → <b>Test</b> → enter your login password → <b>Save</b>. (If self-service is switched off, send the token privately to your administrator.)`,
    `<b>When your token changes later</b> (new token, revoked, new WakaTime account): repeat the previous step in <b>My WakaTime</b> → <b>Replace your token</b>. You and the Super Admins get an e-mail every time a token is changed.`,
    `<b>See your activity</b>: data is collected every night at 9 PM — open <b>My Dashboard</b> the next day for your time per day, projects, branches, languages and AI use.`,
    `<b>Weekly summary</b>: every Monday morning you get an e-mail with your last week — time per project and day.`,
  ];
  const body = [
    `<tr><td style="padding:22px 28px 0"><p style="margin:0;font:14px Arial,sans-serif;color:${INK};line-height:1.6">Hi ${esc(u.name || u.username)},<br>your account for <b>${esc(ENV.MAIL_FROM_NAME || 'Developer Activity')}</b> is ready.</p></td></tr>`,
    section(
      'Your account',
      table(
        [{ label: 'Item' }, { label: 'Value' }],
        [
          ['Sign-in page', `<a href="${esc(login)}" style="color:${BRAND}">${esc(login)}</a>`],
          ['Username', `<b>${esc(u.username)}</b>`],
          ['Role', esc(u.roles || '—')],
          ['Teams', esc(u.teams || '—')],
          ['WakaTime', tokenDone ? 'Connected ✔' : 'Not connected yet — see step 7'],
        ],
      ),
    ),
    section(
      'What to do next',
      `<ol style="margin:0;padding-left:20px;font:13.5px Arial,sans-serif;color:${INK};line-height:1.65">${steps.map((s) => `<li style="margin-bottom:8px">${s}</li>`).join('')}</ol>`,
    ),
    extraNote ? section('Note from your administrator', `<p style="margin:0;font:13.5px Arial,sans-serif;color:${INK};line-height:1.6">${esc(extraNote).replace(/\n/g, '<br>')}</p>`) : '',
    `<tr><td style="padding:14px 28px 4px">${button('Sign in now', login)}</td></tr>`,
  ].join('');

  return {
    subject: `Welcome to ${ENV.MAIL_FROM_NAME || 'Developer Activity'} — your account is ready`,
    html: layout({
      preheader: `Sign in with ${u.username} and follow the next steps.`,
      title: 'Welcome aboard',
      subtitle: 'Your account is ready — here is what to do next',
      body,
      footerNote: 'Never share your password or tokens in chat or e-mail. Your administrator will never ask for your password.<br>',
    }),
    text: `Welcome!\nSign in: ${login}\nUsername: ${u.username}\nNext: change your password, create a WakaTime account, install the WakaTime plugin, set timezone Asia/Kolkata, paste your access token from https://wakatime.com/oauth in My WakaTime.`,
  };
};

/* ─── Security notices ─────────────────────────────────────────────────────── */

const ACTION_TEXT = { SET: 'connected (new token)', REPLACED: 'replaced', REMOVED: 'removed' };

/** e: { developerName, action, hint, wakaUsername, changedBy, via, when } */
const tokenChanged = (e) => {
  const subject = `WakaTime token ${ACTION_TEXT[e.action] || 'changed'} — ${e.developerName}`;
  const body = [
    `<tr><td style="padding:22px 28px 0"><p style="margin:0;font:14px Arial,sans-serif;color:${INK};line-height:1.6">The WakaTime token of <b>${esc(e.developerName)}</b> was <b>${esc(ACTION_TEXT[e.action] || 'changed')}</b>.</p></td></tr>`,
    section(
      'Details',
      table(
        [{ label: 'Item' }, { label: 'Value' }],
        [
          ['Developer', `<b>${esc(e.developerName)}</b>`],
          ['Change', esc(ACTION_TEXT[e.action] || e.action)],
          ['Token', e.action === 'REMOVED' ? 'removed — activity is no longer collected' : `••••${esc(e.hint)}`],
          ['WakaTime user', e.wakaUsername ? `@${esc(e.wakaUsername)}` : '—'],
          ['Changed by', esc(e.changedBy || '—')],
          ['Through', esc(e.via)],
          ['When (IST)', esc(e.when)],
        ],
      ),
    ),
    `<tr><td style="padding:16px 28px 0"><p style="margin:0;padding:12px 14px;border-radius:8px;background:#fff7ed;font:13px Arial,sans-serif;color:#9a3412;line-height:1.6">
      If you did not expect this change, tell your administrator right away. Never share tokens or passwords in chat or e-mail.</p></td></tr>`,
  ].join('');
  return {
    subject,
    html: layout({ preheader: subject, title: 'WakaTime token changed', subtitle: e.developerName, body }),
    text: `${subject}\nChanged by: ${e.changedBy}\nThrough: ${e.via}\nWhen: ${e.when}`,
  };
};

/** e: { what: 'set' | 'changed', changedBy, when } */
const securityChanged = (e) => {
  const subject = `Token protection password ${e.what}`;
  const body = [
    `<tr><td style="padding:22px 28px 0"><p style="margin:0;font:14px Arial,sans-serif;color:${INK};line-height:1.6">The password that protects WakaTime token changes was <b>${esc(e.what)}</b> by <b>${esc(e.changedBy)}</b> at ${esc(e.when)} (IST).</p>
      <p style="margin:12px 0 0;font:13px Arial,sans-serif;color:${MUTED};line-height:1.6">From now on only people who know the new password can set, replace or remove developers' tokens.</p></td></tr>`,
    `<tr><td style="padding:16px 28px 0"><p style="margin:0;padding:12px 14px;border-radius:8px;background:#fff7ed;font:13px Arial,sans-serif;color:#9a3412;line-height:1.6">
      If you did not expect this change, check Settings › Security now.</p></td></tr>`,
  ].join('');
  return { subject, html: layout({ preheader: subject, title: subject, subtitle: '', body }), text: `${subject} by ${e.changedBy} at ${e.when}` };
};

module.exports = { weeklyDeveloper, weeklyTeam, welcome, tokenChanged, securityChanged, dur };
