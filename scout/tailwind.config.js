// Tailwind za scout.slff.eu. Poti so relativne na to datoteko; .ts/.tsx morata
// biti zraven, sicer so strani brez slogov (glej CLAUDE.md, TypeScript).
/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  future: { hoverOnlyWhenSupported: true },
  theme: { extend: { fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] } } },
  plugins: [],
}
