// SLFF Scout (scout.slff.eu): ločena Vite aplikacija, ista baza in računi kot
// slff.eu. `npm run dev:scout` (5174), `npm run build:scout` → dist-scout/.
// Okolje (VITE_SUPABASE_URL …) iz korena repozitorija, Tailwind svoj, da
// razredi Scouta ne pridejo v CSS slff.eu.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'node:url'

const pot = (p) => fileURLToPath(new URL(p, import.meta.url))
const sha = process.env.GITHUB_SHA ?? ''

export default defineConfig({
  root: pot('.'),
  // Grb in ikona sta ista kot na slff.eu.
  publicDir: pot('../public/logo'),
  envDir: pot('..'),
  plugins: [
    react(),
    {
      // CI po objavi preveri, da scout.slff.eu res streže ta commit.
      name: 'slff-commit',
      transformIndexHtml: (html) => html.replace('</head>', `    <meta name="slff-commit" content="${sha}" />\n  </head>`),
    },
  ],
  css: { postcss: { plugins: [tailwindcss({ config: pot('./tailwind.config.js') }), autoprefixer()] } },
  server: { port: 5174 },
  build: { outDir: pot('../dist-scout'), emptyOutDir: true },
})
