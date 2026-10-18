// Pure functions: WakaTime JSON -> rows for PRC_Save_Waka_Developer_Day. No I/O, easy to unit test.
// Keys match the procedure's OPENJSON columns; timestamps are UTC 'YYYY-MM-DD HH:mm:ss.SSS'.

const DAY_DIMENSIONS = {
  projects: 'project',
  languages: 'language',
  editors: 'editor',
  categories: 'category',
  operating_systems: 'operating_system',
  machines: 'machine',
  dependencies: 'dependency',
};

const toSqlTime = (date) => date.toISOString().replace('T', ' ').slice(0, 23);
const epochToSql = (t) => toSqlTime(new Date(Math.round(Number(t) * 1000)));
const isoToSql = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? toSqlTime(d).slice(0, 19) : null;
};
const int = (v) => (v === undefined || v === null || Number.isNaN(Number(v)) ? null : Math.trunc(Number(v)));
const num = (v) => (v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v));
const str = (v, max) => (v === undefined || v === null ? null : String(v).slice(0, max));

/** WakaTime's estimated USD cost: ai_model_total_cost, else the sum of ai_model_costs { model: usd }. */
const aiCost = (o) => {
  if (!o) return null;
  if (o.ai_model_total_cost !== undefined && o.ai_model_total_cost !== null) return num(o.ai_model_total_cost);
  const costs = o.ai_model_costs && typeof o.ai_model_costs === 'object' ? Object.values(o.ai_model_costs) : [];
  return costs.length ? costs.reduce((s, c) => s + (Number(c) || 0), 0) : null;
};

/** GenAI line + token fields shared by grand_total, projects, editors, entities and durations. */
const aiFields = (o) => ({
  aiAdditions: int(o?.ai_additions),
  aiDeletions: int(o?.ai_deletions),
  humanAdditions: int(o?.human_additions),
  humanDeletions: int(o?.human_deletions),
  aiInputTokens: int(o?.ai_input_tokens),
  aiOutputTokens: int(o?.ai_output_tokens),
  aiCostUsd: aiCost(o),
});

const breakdownRow = (dimension, projectName, item) => ({
  dimension,
  projectName,
  itemName: str(item.name, 1000),
  totalSeconds: Number(item.total_seconds) || 0,
  pct: item.percent ?? null,
  ...aiFields(item),
});

const breakdownRows = (day, projectDetails = []) => {
  const rows = [];
  if (!day) return rows;

  for (const [key, dimension] of Object.entries(DAY_DIMENSIONS)) {
    for (const item of day[key] || []) {
      if (!item || !item.name) continue;
      rows.push(breakdownRow(dimension, '', item));
    }
  }

  for (const { project, day: pDay } of projectDetails) {
    if (!pDay) continue;
    for (const [key, dimension] of [['branches', 'branch'], ['entities', 'entity']]) {
      for (const item of pDay[key] || []) {
        if (!item || !item.name) continue;
        rows.push(breakdownRow(dimension, str(project, 400), item));
      }
    }
  }
  return rows;
};

const durationRows = (durations, sliceBy) =>
  (durations || []).map((d) => ({
    sliceBy,
    sliceValue: str(d[sliceBy] ?? d.name ?? d.project, 1000),
    startUtc: epochToSql(d.time),
    durationSeconds: Number(d.duration) || 0,
    ...aiFields(d),
    aiSessions: int(d.ai_sessions),
    aiPromptEvents: int(d.ai_prompt_events_total),
  }));

const heartbeatRows = (heartbeats) =>
  (heartbeats || []).map((h) => ({
    hbTimeUtc: epochToSql(h.time),
    entity: str(h.entity, 1000),
    entityType: str(h.type, 20),
    category: str(h.category, 40),
    project: str(h.project, 400),
    branch: str(h.branch, 400),
    language: str(h.language, 100),
    isWrite: h.is_write === undefined || h.is_write === null ? null : Boolean(h.is_write),
    lines: int(h.lines),
    lineNo: int(h.lineno),
    machineNameId: str(h.machine_name_id, 64),
    aiLineChanges: int(h.ai_line_changes),
    humanLineChanges: int(h.human_line_changes),
    aiSession: str(h.ai_session, 100),
    aiInputTokens: int(h.ai_input_tokens),
    aiOutputTokens: int(h.ai_output_tokens),
    aiPromptLength: int(h.ai_prompt_length),
    aiSubscriptionPlan: str(h.ai_subscription_plan, 50),
  }));

// hbRows timestamps are fixed-width strings, so string order = time order
const summaryRow = (day, hbRows) => {
  const gt = day?.grand_total;
  const times = hbRows.map((r) => r.hbTimeUtc).sort();
  return {
    totalSeconds: Number(gt?.total_seconds) || 0,
    totalText: str(gt?.text, 50),
    heartbeatCount: hbRows.length,
    firstActivityUtc: times[0] || null,
    lastActivityUtc: times[times.length - 1] || null,
    ...aiFields(gt),
    aiSessions: int(gt?.ai_sessions),
    aiPromptEvents: int(gt?.ai_prompt_events_total),
    aiPromptLengthSum: int(gt?.ai_prompt_length_sum),
  };
};

/**
 * AI model usage for the day: grand_total.ai_model_breakdown [{ name, lines, input_tokens, … cost }],
 * or — when only the maps are sent — ai_model_line_changes { model: lines } + ai_model_costs { model: usd }.
 */
const aiModelRows = (day) => {
  const gt = day?.grand_total;
  if (!gt) return [];

  if (Array.isArray(gt.ai_model_breakdown) && gt.ai_model_breakdown.length) {
    return gt.ai_model_breakdown
      .filter((m) => m && m.name)
      .map((m) => ({
        modelName: str(m.name, 200),
        lineChanges: int(m.lines),
        inputTokens: int(m.input_tokens),
        outputTokens: int(m.output_tokens),
        cachedInputTokens: int(m.cached_input_tokens),
        costUsd: num(m.cost),
      }));
  }

  const lines = gt.ai_model_line_changes && typeof gt.ai_model_line_changes === 'object' ? gt.ai_model_line_changes : {};
  const costs = gt.ai_model_costs && typeof gt.ai_model_costs === 'object' ? gt.ai_model_costs : {};
  return [...new Set([...Object.keys(lines), ...Object.keys(costs)])].map((name) => ({
    modelName: str(name, 200),
    lineChanges: int(lines[name]),
    inputTokens: null,
    outputTokens: null,
    cachedInputTokens: null,
    costUsd: num(costs[name]),
  }));
};

/** /users/current/user_agents → rows for PRC_Save_Waka_User_Agents (data may be a list or one object). */
const userAgentRows = (data) =>
  (Array.isArray(data) ? data : data ? [data] : [])
    .filter((a) => a && a.id)
    .map((a) => ({
      agentId: str(a.id, 64),
      agentValue: str(a.value, 1000),
      editor: str(a.editor, 100),
      os: str(a.os, 100),
      agentVersion: str(a.version, 100),
      aiModel: str(a.ai_model, 100),
      aiModelVersion: str(a.ai_model_version, 100),
      aiModelComplexity: str(a.ai_model_complexity, 50),
      isBrowserExtension: a.is_browser_extension === undefined ? null : Boolean(a.is_browser_extension),
      isDesktopApp: a.is_desktop_app === undefined ? null : Boolean(a.is_desktop_app),
      lastSeenUtc: isoToSql(a.last_seen_at),
      createdUtc: isoToSql(a.created_at),
    }));

/** /users/current/projects → rows for PRC_Save_Waka_Projects */
const projectRows = (data) =>
  (Array.isArray(data) ? data : [])
    .filter((p) => p && p.name)
    .map((p) => ({
      projectName: str(p.name, 400),
      wakaProjectId: str(p.id, 64),
      repositoryUrl: str(p.repository?.html_url ?? p.repository?.url, 500),
      repositoryName: str(p.repository?.full_name ?? p.repository?.name, 300),
      repositoryProvider: str(p.repository?.provider, 50),
      defaultBranch: str(p.repository?.default_branch, 200),
      firstHeartbeatUtc: isoToSql(p.first_heartbeat_at),
      lastHeartbeatUtc: isoToSql(p.last_heartbeat_at),
    }));

/** /users/current/projects/:project/commits → rows for PRC_Save_Waka_Commits */
const commitRows = (commits) =>
  (Array.isArray(commits) ? commits : [])
    .filter((c) => c && c.hash)
    .map((c) => ({
      commitHash: str(c.hash, 64),
      truncatedHash: str(c.truncated_hash ?? String(c.hash).slice(0, 7), 16),
      branch: str(c.branch, 400),
      message: str(c.message, 2000),
      authorName: str(c.author_name, 200),
      authorEmail: str(c.author_email ? String(c.author_email).toLowerCase() : null, 200),
      authorUsername: str(c.author_username, 100),
      authorDateUtc: isoToSql(c.author_date ?? c.committer_date ?? c.created_at),
      totalSeconds: num(c.total_seconds),
      htmlUrl: str(c.html_url ?? c.url, 500),
    }));

module.exports = {
  projectRows,
  commitRows,
  breakdownRows,
  durationRows,
  heartbeatRows,
  summaryRow,
  aiModelRows,
  userAgentRows,
  epochToSql,
};
