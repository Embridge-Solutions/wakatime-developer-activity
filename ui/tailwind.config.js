/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1535px', // ultra-wide / large TV — 4-column machine grid
      },
      colors: {
        'default-bg': '#52AC50',
        // Sidebar-exclusive dark blue theme
        'sidebar-bg': '#0A1628', // deep navy background
        'sidebar-surface': '#0F2040', // slightly lighter surface
        'sidebar-border': '#1B3460', // subtle border/divider
        'sidebar-hover': '#162B52', // hover state
        'sidebar-active': '#1D6FE8', // electric blue active item
        'sidebar-active-glow': '#1D6FE820', // active glow (20% opacity)
        'sidebar-muted': '#8BA3C7', // muted text (labels, subtitles)
        'iot-border-color': '#374151',
        'custom-green': '#05DF72',
        'custom-Color': '#995400',
        'custom-Color-content': '#F2F2F2',
        'theme-primary': 'var(--theme-primary)',
        'theme-gradient-from': 'var(--theme-gradient-from)',
        'theme-gradient-to': 'var(--theme-gradient-to)',
        'theme-glow': 'var(--theme-glow)',
        'theme-glow-border': 'var(--theme-glow-border)',
        'theme-sidebar-bg': 'var(--theme-sidebar-bg)',
        'theme-topbar-bg': 'var(--theme-topbar-bg)',
        'theme-border': 'var(--theme-border)',
        'theme-active-text': 'var(--theme-active-text)',
        'theme-sidebar-text': 'var(--theme-sidebar-text)',
        'theme-topbar-text': 'var(--theme-topbar-text)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
