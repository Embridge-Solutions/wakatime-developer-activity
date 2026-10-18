/**
 * Chart colors — the dataviz reference palette (validated for colour-vision
 * deficiency in this fixed order). Never cycle past 8: fold the rest into "Other".
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const;

/** Grey for the folded "Other" series. */
export const OTHER = '#a3a39e';

/** Human vs AI — slots 1 and 2, used everywhere the two are compared. */
export const HUMAN_COLOR = SERIES[0];
export const AI_COLOR = SERIES[1];

/** Sequential blue ramp (light → dark) for the hourly heatmap. */
export const HEAT = ['#f1f5fb', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'] as const;

/**
 * A developer keeps the same colour on every chart and filter: by developerId,
 * never by rank (filtering must not repaint the others).
 */
export const developerColor = (developerId: number) => SERIES[(Math.max(1, developerId) - 1) % SERIES.length];

/** Stable colour for any name (project, editor…) — same name, same colour on every screen. */
export const nameColor = (name: string) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return SERIES[h % SERIES.length];
};
