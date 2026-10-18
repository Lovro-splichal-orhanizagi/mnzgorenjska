// Tailwind za scout.slff.eu. Poti so relativne na to datoteko; .ts/.tsx morata
// biti zraven, sicer so strani brez slogov (glej CLAUDE.md, TypeScript).
// Tema (barve gnl, pisava) je ista kot na slff.eu, da sta aplikaciji videti enako.
import slff from '../tailwind.config.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  // Značke pozicij se sestavijo ob izrisu (`poz-${skupina}`), zato jih Tailwind v kodi ne najde.
  safelist: ['poz-GK', 'poz-DEF', 'poz-MID', 'poz-FWD'],
  future: { hoverOnlyWhenSupported: true },
  theme: slff.theme,
  plugins: [],
}
