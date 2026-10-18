/**
 * ─── ESAB Forge · Fonts ─────────────────────────────────────────────────────
 * The ONLY place font families are chosen. To swap a font, change the import
 * and the loader call below — every page, table and chart picks it up.
 *
 *   body     → all running text, tables, inputs          (--font-body)
 *   heading  → h1–h4, KPI titles, sidebar brand          (--font-heading)
 *   numeric  → codes, IDs, `font-mono` utilities          (--font-numeric)
 */
import { Barlow, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const heading = Barlow({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

const numeric = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-numeric',
  display: 'swap',
});

/** Put on <html> so the CSS variables above exist app-wide. */
export const fontVariables = `${body.variable} ${heading.variable} ${numeric.variable}`;

/** Canvas-based charts (CanvasJS) can't read CSS variables — use this string. */
export const CHART_FONT_FAMILY = body.style.fontFamily;
