/**
 * ─── Brand configuration ────────────────────────────────────────────────────
 * The ONLY file to edit when rolling this application out to a new customer.
 *
 *   1. Drop the customer's files into `public/brand/` (logo, login image…).
 *   2. Update the values below — names, logos, colors, print and copyright.
 *
 * Every screen — login page, sidebar, top bar, modals, buttons, print
 * reports, mail preview, browser tab title and copyright footers — reads
 * from here. Colors are injected as CSS variables by app/layout.tsx, so
 * Tailwind classes such as `bg-action`, `bg-theme-primary` and
 * `text-brand-600` follow them automatically.
 *
 * Fonts are the one exception: Next.js needs them declared as literals, so
 * they live in `theme/fonts.ts` (one file, three lines to change).
 *
 * Paths are relative to `public/` (e.g. "/brand/logo.png").
 * A logo uploaded from the in-app Appearance page (stored in the DB) still
 * takes priority over `logo.primary` at runtime.
 */

export const BRAND = {
  /** Company that owns this deployment. */
  company: {
    name: "Embridge",
  },

  /** The product as shown to users. */
  product: {
    name: "Developer Activity",
    shortName: "Dev Activity",
    /** One-line description — used on the login page and in <meta>. */
    tagline: "Coding time, projects and AI vs human work for every developer, from WakaTime.",
  },

  /** Logos. Use transparent PNG/SVG where possible. */
  logo: {
    /** Full logo — login page, expanded sidebar, top bar. */
    primary: "/brand/logo.svg",
    /** Square/compact mark for the collapsed sidebar. Falls back to primary. */
    compact: "/brand/logo-mark.svg",
    /** Logo printed in the report header (sits on a dark band). */
    print: "/brand/logo.svg",
    /** Faint watermark behind printed reports. Set to "" to disable. */
    watermark: "/brand/logo-mark.svg",
    /** Default logo in the mail header when none is uploaded. */
    mail: "/brand/logo.svg",
    /** Alt text for screen readers. */
    alt: "Developer Activity logo",
  },

  /**
   * Colors. Pick them from the customer's logo.
   *   brand      – the logo color. Sidebar highlight, step markers, accents.
   *   brandText  – text/icon color that sits ON a brand fill (dark on yellow,
   *                white on a dark blue…).
   *   action     – every Save / Submit button, link, checkbox and focus ring.
   *                Must read well with white text (contrast ≥ 4.5:1).
   *   actionSoft – light tint behind selected items, chips and focus glows.
   *                Leave "" to derive it from `action`.
   *   shell      – sidebar background.
   *   topbar     – top bar background.
   *   canvas     – page background behind the cards.
   */
  colors: {
    brand: "#4f6bed",
    brandText: "#ffffff",
    action: "#1f2a44",
    actionHover: "#111827",
    actionSoft: "rgb(79 107 237 / 0.14)",
    shell: "#0f1422",
    topbar: "#151b2c",
    canvas: "#f4f5f8",
  },

  /** Login screen content. */
  login: {
    /** Large image on the left panel. Leave "" for the built-in code-activity panel. */
    heroImage: "",
    heroAlt: "",
    heroEyebrow: "Developer Intelligence",
    heroTitle: "Every developer's day, measured honestly.",
    /** Short value points shown under the hero title. Keep to 3. */
    highlights: [
      "Coding time per developer, project, language and editor",
      "AI vs human code, AI tools, models, tokens and cost",
      "Daily collection from WakaTime with team and developer reports",
    ],
    formTitle: "Sign in",
    formSubtitle: "Use your company credentials to continue.",
    /** Shown under the form. Set to "" to hide. */
    supportText: "Trouble signing in? Contact your system administrator.",
  },

  /** Home page (first screen after login). */
  home: {
    /** Image on the right side of the welcome banner. Leave "" for none. */
    bannerImage: "",
    subtitle: "Here is how the team is coding.",
  },

  /** Printed reports (tables, dashboards). */
  print: {
    /** Appended to the product name in the report header: "Developer Activity Report". */
    titleSuffix: "Report",
  },

  /** Implementation partner credited in footers. */
  vendor: {
    name: "Embridge Solutions Pvt Ltd.",
  },
} as const;

/** "© 2026 Embridge Solutions Pvt Ltd. All rights reserved." */
export const COPYRIGHT_TEXT = `© ${new Date().getFullYear()} ${BRAND.vendor.name} All rights reserved.`;

/** Browser tab / document title, e.g. "Embridge · Developer Activity". */
export const APP_TITLE = `${BRAND.company.name} · ${BRAND.product.name}`;

/** Report header title, e.g. "Developer Activity Report". */
export const PRINT_TITLE = `${BRAND.product.name} ${BRAND.print.titleSuffix}`;

/**
 * CSS that applies `BRAND.colors` to the whole app. Injected once in
 * app/layout.tsx. `html:root` outranks the defaults in theme/tokens.css.
 * The brand ramp (50–950) is mixed from the single brand color.
 */
export const BRAND_CSS = (() => {
  const c = BRAND.colors;
  const tint = (pct: number) => `color-mix(in oklab, ${c.brand} ${pct}%, white)`;
  const shade = (pct: number) => `color-mix(in oklab, ${c.brand} ${pct}%, black)`;
  return `html:root{
--color-brand-50:${tint(8)};--color-brand-100:${tint(22)};--color-brand-200:${tint(45)};
--color-brand-300:${tint(75)};--color-brand-400:${c.brand};--color-brand-500:${shade(90)};
--color-brand-600:${shade(76)};--color-brand-700:${shade(58)};--color-brand-800:${shade(40)};
--color-brand-900:${shade(26)};--color-brand-950:${shade(15)};
--theme-active-text:${c.brandText};
--action:${c.action};--action-hover:${c.actionHover};
--action-soft:${c.actionSoft || `color-mix(in oklab, ${c.action} 9%, transparent)`};
--theme-sidebar-bg:${c.shell};--theme-topbar-bg:${c.topbar};
--app-canvas:${c.canvas};
}`;
})();
