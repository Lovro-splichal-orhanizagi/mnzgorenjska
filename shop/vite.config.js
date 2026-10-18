// SLFF Trgovina (shop.slff.eu): ločena Vite aplikacija, ista baza in računi kot
// slff.eu. `npm run dev:shop` (5175), `npm run build:shop` → dist-shop/.
// Okolje (VITE_SUPABASE_URL …) iz korena repozitorija, Tailwind svoj, da
// razredi trgovine ne pridejo v CSS slff.eu.
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
      // CI po objavi preveri, da shop.slff.eu res streže ta commit.
      name: 'slff-commit',
      transformIndexHtml: (html) => html.replace('</head>', `    <meta name="slff-commit" content="${sha}" />\n  </head>`),
    },
  ],
  css: { postcss: { plugins: [tailwindcss({ config: pot('./tailwind.config.js') }), autoprefixer()] } },
  server: { port: 5175 },
  build: { outDir: pot('../dist-shop'), emptyOutDir: true },
})
