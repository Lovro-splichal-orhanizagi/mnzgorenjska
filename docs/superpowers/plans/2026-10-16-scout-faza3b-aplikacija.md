# SLFF Scout faza 3b: aplikacija scout.slff.eu in objava Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vmesnik `scout.slff.eu` (slovenščina in angleščina): prijava z istim računom kot slff.eu, račun kluba (preizkus, sedeži, plačilo, portal), iskanje, profil igralca s podobnimi, vrzeli in opazovalni seznam ter pogoji za klube; CI ga zgradi in objavi na Hetzner, Caddy ga streže; funkciji Stripe sta objavljeni in celoten tok je ročno preizkušen v testnem načinu Stripe. Pogoj faze (spec 5): 5 poskusnih klubov ga uporablja tedensko.

**Architecture:** Ločena Vite + React + TypeScript aplikacija v `scout/` istega repozitorija (`scout/index.html`, `scout/src/`, `scout/vite.config.js`, lasten Tailwind), sveženj v `dist-scout/`. Deli tipe baze (`src/lib/baza.types.ts`) in iste račune Supabase (`api.slff.eu`); lasten odjemalec s svojim `storageKey`, ker je izvor drug. Brez `src/i18n` (ta zahteva 14 jezikov in jezik po državi lige): lasten ploščat slovar `scout/src/besede.ts` (sl, en; angleščina tipizirana kot `Record<Kljuc, string>`, zato manjkajoč ključ javi `typecheck`). Podatke bere **le** prek RPC faze 3a. CI: korak `Scout` v poslu `preveri` (build + smoke) in posel `objavi-scout` (rsync v `/srv/slff-scout/releases/<sha>`, preklop `current`, preverba `slff-commit`), vklopljen s spremenljivko `SCOUT_OBJAVA=1` po pripravi strežnika. Caddy blok `scout.slff.eu` je ročen.

**Tech Stack:** React 18, react-router-dom 7, Vite 8, Tailwind 3, supabase-js 2, vite-node (smoke), GitHub Actions, Caddy 2.6, Stripe CLI (`stripe -p slff`).

**Spec:** docs/superpowers/specs/2026-10-16-scout-design.md

## Global Constraints

- Predpogoj: faza 3a (`docs/superpowers/plans/2026-10-16-scout-faza3a-zaledje.md`) je združena in njene migracije so na produkciji (tipi `scout_*` so v `src/lib/baza.types.ts`).
- Veja: `feat/scout-faza3b-aplikacija` iz `main`; en PR, commit na nalogo. Naloga 8 je operativna (po združitvi).
- Poti so angleške: `/` (iskanje), `/player/:id`, `/gaps`, `/watchlist`, `/account`, `/login`, `/terms`; vse ostalo → `/`.
- Komponente so poimenski izvozi (`export function`); privzeti izvoz ima le `scout/vite.config.js` in `scout/tailwind.config.js` (zahteva Vite/Tailwind, kot obstoječa `vite.config.js`).
- Vsi nizi za uporabnika so v `scout/src/besede.ts` (`SL`, `EN`), berejo se s `t('ključ', { … })`; brez nizov v komponentah. Datumi in števila prek `datum`, `stevilo` iz `besede.ts`.
- Besedišče (spec 2): "kazalniki iz podatkov tekem", nikoli ocena osebe; brez negativnih oznak (smoke zavrne `slab`, `šibk`, `povprečn`, `weak`, `poor`, `bad`, `below average`).
- Vmesnik nikoli ne bere sheme `scout` in ne tabel razen javnih `federations` (izbira regije, filtrirana po `country_id` kluba).
- Strani s podatki igralcev so za `ZahtevaSedez` (sedež + veljavna naročnina); baza to preveri še enkrat (3a).
- Brez Capacitorja, OTA, `src/lib/supabase.ts`, `useAuth`, `Povezava` (te so za slff.eu); brez novih odvisnosti.
- Za slff.eu se nič ne spremeni (`<Routes>`, `@ni_strani`, `STRANI_LIGE`, `PO_POTI` ostanejo).
- Caddyfile, funkcije, GoTrue in katalog Stripe CI ne objavi: ročni koraki v nalogi 8.
- Odločitve lastnika (16. 10.): cene so **brez DDV** (DDV doda Stripe Tax, `automatic_tax`); "sezona" je letna naročnina (odpoved kadarkoli, velja do konca obdobja); MVP **brez stika** klub → igralec (faza 4), zato vmesnik stika ne kaže; zapis DNS doda Claude prek lastnikovega prijavljenega brskalnika (Cloudflare) šele po lastnikovi izrecni potrditvi.
- Preklic naročnine mora biti vedno dosegljiv: gumb portala je na `/account` v vsakem stanju (tudi brez klubskega računa ali sedeža), kadar `scout_portal_kupec()` vrne kupca.
- **Živi ključi Stripe niso del tega načrta**: obvezen je ročni preizkus v testnem načinu (naloga 8); preklop v živo je odločitev lastnika in velja tudi za preverjene igralce (isti ključ).
- Commit sporočila: conventional, zadnja vrstica `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File Structure

| datoteka | sprememba |
|---|---|
| `scout/index.html` | nova: vstopna stran |
| `scout/vite.config.js` | nova: koren `scout/`, env iz korena repozitorija, lasten Tailwind, `slff-commit`, izhod `dist-scout/` |
| `scout/tailwind.config.js` | nova |
| `scout/src/main.tsx`, `scout/src/index.css` | novi |
| `scout/src/besede.ts` | nova: slovar sl/en, `t`, `jezik`, `izberiJezik`, `datum`, `stevilo`, `napaka` |
| `scout/src/baza.ts` | nova: odjemalec Supabase, tipi RPC |
| `scout/src/seja.tsx` | nova: `SejaProvider`, `useSeja`, `ZahtevaSedez`, `Nalaganje` |
| `scout/src/Okvir.tsx`, `scout/src/App.tsx` | novi: glava, noga, poti |
| `scout/src/strani/Prijava.tsx`, `Racun.tsx`, `Iskanje.tsx`, `Igralec.tsx`, `Vrzeli.tsx`, `Opazovani.tsx`, `Pogoji.tsx` | nove strani |
| `scout/smoke.tsx` | nova: izris strani, slovar, utemeljitev |
| `package.json` | `dev:scout`, `build:scout`, `smoke:scout` |
| `tsconfig.json` | `include` + `scout/src` |
| `.gitignore` | `dist-scout/` |
| `.github/workflows/ci.yml` | korak `Scout` v `preveri`, posel `objavi-scout` |
| `scripts/hetzner/Caddyfile` | blok `scout.slff.eu` |
| `docs/scout.md`, `CLAUDE.md` | aplikacija in objava (vrstica `scout.*` v `README.md` je iz faze 3a) |

---

### Task 1: Ogrodje, slovar, seja, prijava in smoke

**Files:**
- Create: `scout/index.html`, `scout/vite.config.js`, `scout/tailwind.config.js`, `scout/src/main.tsx`, `scout/src/index.css`, `scout/src/besede.ts`, `scout/src/baza.ts`, `scout/src/seja.tsx`, `scout/src/Okvir.tsx`, `scout/src/App.tsx`, `scout/src/strani/Prijava.tsx`, `scout/smoke.tsx`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`

**Interfaces:**
- Consumes: `Database` iz `src/lib/baza.types.ts`; RPC `uveljavi_klubski_racun()`, `scout_moj_klub()`.
- Produces:
  - `besede.ts`: `export const SL`, `export const EN: Record<Kljuc, string>`, `export type Kljuc = keyof typeof SL`, `export const jezik: 'sl' | 'en'`, `export function t(k: Kljuc, p?: Record<string, string | number>): string`, `export function izberiJezik(j: 'sl' | 'en'): void`, `export function datum(d: string): string`, `export function stevilo(n: number, mest?: number): string`, `export function napaka(e: { hint?: string | null; code?: string | null } | null): string`
  - `baza.ts`: `export const supabase`, `export type Zadetek`, `Podoben`, `Vrzel`, `Opazovan`, `Skupina`, `export const SKUPINE: Skupina[]`, `export interface Klub`, `SezonaIgralca`, `ProfilIgralca`
  - `seja.tsx`: `export function SejaProvider`, `export function useSeja(): { seja: Session | null; nalaga: boolean; klub: Klub | null; osvezi: () => Promise<void> }`, `export function ZahtevaSedez`, `export function Nalaganje`
  - `Okvir.tsx`: `export function Okvir({ children })`; `App.tsx`: `export function App()`; `strani/Prijava.tsx`: `export function Prijava()`
  - ukazi `npm run dev:scout`, `npm run build:scout`, `npm run smoke:scout`

- [ ] **Step 1: Veja**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git switch main && git pull --ff-only && git switch -c feat/scout-faza3b-aplikacija
grep -c "scout_isci" src/lib/baza.types.ts
```

Expected: število ≥ 1 (tipi iz faze 3a so tu). Če je 0, faza 3a še ni združena: ustavi se.

- [ ] **Step 2: `scout/smoke.tsx` (test najprej; pade, ker strani še ni)**

```tsx
// Smoke za scout.slff.eu: izris vseh strani brez brskalnika in baze, slovar
// (isti {parametri} v sl in en, brez negativnih oznak), utemeljitev in vrzeli.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SejaProvider } from './src/seja'
import { Okvir } from './src/Okvir'
import { Prijava } from './src/strani/Prijava'
import { Racun } from './src/strani/Racun'
import { Iskanje, utemeljitev } from './src/strani/Iskanje'
import { Igralec } from './src/strani/Igralec'
import { Vrzeli, opisVrzeli } from './src/strani/Vrzeli'
import { Opazovani } from './src/strani/Opazovani'
import { Pogoji } from './src/strani/Pogoji'
import { EN, SL, type Kljuc } from './src/besede'

let napak = 0
const preveri = (opis: string, ok: boolean, dodatno = '') => {
  if (!ok) napak++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${opis}${ok || !dodatno ? '' : ` (${dodatno})`}`)
}

const strani: [string, string, ReactNode][] = [
  ['/login', '/login', <Prijava />],
  ['/account', '/account', <Racun />],
  ['/', '/', <Iskanje />],
  ['/player/123', '/player/:id', <Igralec />],
  ['/gaps', '/gaps', <Vrzeli />],
  ['/watchlist', '/watchlist', <Opazovani />],
  ['/terms', '/terms', <Pogoji />],
]
for (const [pot, vzorec, stran] of strani) {
  try {
    const html = renderToString(
      <StaticRouter location={pot}>
        <SejaProvider>
          <Okvir>
            <Routes>
              <Route path={vzorec} element={stran} />
            </Routes>
          </Okvir>
        </SejaProvider>
      </StaticRouter>,
    )
    preveri(`izris ${pot}`, html.includes(SL['app.ime']))
  } catch (e) {
    preveri(`izris ${pot}`, false, String(e))
  }
}

const kljuci = Object.keys(SL) as Kljuc[]
const parametri = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const razlicni = kljuci.filter((k) => parametri(SL[k]) !== parametri(EN[k]))
preveri('besede: en ima iste {parametre} kot sl', razlicni.length === 0, razlicni.join(', '))
const prazni = kljuci.filter((k) => !SL[k].trim() || !EN[k].trim())
preveri('besede: brez praznih nizov', prazni.length === 0, prazni.join(', '))
const NEGATIVNO = /\b(slab|šibk|povprečn)|\b(weak|poor|bad|below average)\b/i
const negativni = kljuci.filter((k) => NEGATIVNO.test(SL[k]) || NEGATIVNO.test(EN[k]))
preveri('besede: brez negativnih oznak (spec 2)', negativni.length === 0, negativni.join(', '))

const u = utemeljitev({ percentil: 87.4, skupina: 'MID', minute: 900, delez_minut: 0.81, goli_90_pri_nas: 0.41 })
preveri('iskanje: utemeljitev s percentilom, deležem in projekcijo', u.includes('87.') && u.includes('81 %') && u.includes('0,41'), u)
const v = opisVrzeli({ vrsta: 'odvisnost', skupina: 'FWD', ime: 'Ana Novak', vrednost: 0.45 })
preveri('vrzeli: delež golov v odstotkih', v.includes('Ana Novak') && v.includes('45 %'), v)

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
```

V `package.json` med `"smoke": "vite-node scripts/smoke.jsx",` in `"typecheck"` dodaj:

```json
    "dev:scout": "vite --config scout/vite.config.js",
    "build:scout": "vite build --config scout/vite.config.js",
    "smoke:scout": "vite-node scout/smoke.tsx",
```

```bash
npm run smoke:scout 2>&1 | tail -3
```

Expected: napaka uvoza (`./src/seja` ne obstaja).

- [ ] **Step 3: Gradnja: `scout/vite.config.js`, `scout/tailwind.config.js`, `scout/index.html`, `scout/src/index.css`, `scout/src/main.tsx`**

`scout/vite.config.js`:

```js
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
```

`scout/tailwind.config.js`:

```js
// Tailwind za scout.slff.eu. Poti so relativne na to datoteko; .ts/.tsx morata
// biti zraven, sicer so strani brez slogov (glej CLAUDE.md, TypeScript).
/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{ts,tsx}'] },
  future: { hoverOnlyWhenSupported: true },
  theme: { extend: { fontFamily: { sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'] } } },
  plugins: [],
}
```

`scout/index.html`:

```html
<!doctype html>
<html lang="sl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SLFF Scout</title>
    <meta name="description" content="Iskanje igralcev za klube iz podatkov tekem. Player search for clubs from match data." />
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`scout/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`scout/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { jezik } from './besede'
import './index.css'

document.documentElement.lang = jezik
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

V `tsconfig.json` zamenjaj `"include": ["src", "api"]` z `"include": ["src", "api", "scout/src"]`. V `.gitignore` za vrstico `dist` dodaj vrstico `dist-scout/`.

- [ ] **Step 4: `scout/src/besede.ts`**

```ts
// Nizi scout.slff.eu (sl, en). Ločen slovar od src/i18n: Scout ima dva jezika
// in ne sledi državi lige. Angleščina je Record<Kljuc, string>: manjkajoč
// ključ javi typecheck; smoke primerja {parametre} in zavrne negativne oznake.
// Besedišče (spec 2): kazalniki iz podatkov tekem, nikoli ocena osebe.

export const SL = {
  'app.ime': 'SLFF Scout',
  'app.nalaganje': 'Nalagam …',
  'nav.iskanje': 'Iskanje',
  'nav.vrzeli': 'Vrzeli',
  'nav.seznam': 'Opazovani',
  'nav.racun': 'Račun kluba',
  'nav.odjava': 'Odjava',
  'noga.pogoji': 'Pogoji in zasebnost',
  'noga.vir': 'Podatki iz uradnih zapisnikov tekem prek slff.eu',
  'prijava.naslov': 'Prijava v SLFF Scout',
  'prijava.uvod': 'Scout je orodje za klube: iskanje igralcev, vrzeli v kadru, podobni igralci in opazovalni seznam. Prijaviš se z istim računom kot na slff.eu.',
  'prijava.eposta': 'E-pošta',
  'prijava.geslo': 'Geslo',
  'prijava.gumb': 'Prijava',
  'prijava.google': 'Prijava z Googlom',
  'prijava.napaka': 'Prijava ni uspela. Preveri e-pošto in geslo.',
  'prijava.brezRacuna': 'Še nimaš računa ali si pozabil geslo? Uredi to na slff.eu z uradnim e-naslovom kluba.',
  'prijava.slff': 'Na slff.eu',
  'racun.naslov': 'Račun kluba',
  'racun.niKlub': 'Ta račun ni uradni račun kluba. Scout lahko uporabljajo klubi, ki se prijavijo z uradnim e-naslovom kluba. Če kluba ne prepoznamo, zaprosi za klubski račun na slff.eu.',
  'racun.slffRacun': 'Klubski račun na slff.eu',
  'racun.drzavaZaprta': 'Scout v državi tvojega kluba še ni na voljo.',
  'racun.preizkusNaslov': 'Preizkusi Scout 14 dni brezplačno',
  'racun.preizkusOpis': 'Brez kartice. Po preizkusu izbereš mesečno ali sezonsko naročnino, sicer se dostop izteče sam.',
  'racun.sprejmem': 'Sprejemam pogoje uporabe SLFF Scout.',
  'racun.zacni': 'Začni preizkus',
  'racun.paket.preizkus': 'Preizkus',
  'racun.paket.klub': 'Paket Klub',
  'racun.veljaDo': '{paket}, velja do {datum}',
  'racun.potekla': 'Dostop je potekel. Izberi paket, da nadaljuješ.',
  'racun.niSedeza': 'Klub ima Scout. Zasedi prost sedež, da ga uporabljaš.',
  'racun.zasedi': 'Zasedi sedež',
  'racun.sedezi': 'Sedeži ({n} od 3)',
  'racun.sprosti': 'Sprosti',
  'racun.ti': '(ti)',
  'racun.placiNaslov': 'Paket Klub',
  'racun.placiOpis': 'Iskanje, vrzeli, podobni igralci in opazovalni seznam do 30 igralcev v državi kluba, do 3 sedeži.',
  'racun.mesec': '39 € na mesec',
  'racun.sezona': '290 € na sezono',
  'racun.ddv': 'Cene ne vključujejo DDV. Plačilo prek Stripe, prodajalec SPACE GUARDIAN d.o.o.',
  'racun.upravljaj': 'Upravljaj ali odpovej naročnino',
  'racun.placiloUspeh': 'Plačilo je prejeto. Naročnina se pokaže v nekaj sekundah.',
  'racun.placiloPreklic': 'Plačilo je preklicano.',
  'racun.naprej': 'Na iskanje',
  'skupina.GK': 'Vratarji',
  'skupina.DEF': 'Branilci',
  'skupina.MID': 'Vezisti',
  'skupina.FWD': 'Napadalci',
  'skupinaMed.GK': 'vratarji',
  'skupinaMed.DEF': 'branilci',
  'skupinaMed.MID': 'vezisti',
  'skupinaMed.FWD': 'napadalci',
  'iskanje.naslov': 'Iskanje igralcev',
  'iskanje.pozicija': 'Pozicija',
  'iskanje.vse': 'Vse',
  'iskanje.raven': 'Raven lige',
  'iskanje.raven.vse': 'Vse ravni',
  'iskanje.raven.ista_ali_nizja': 'Ista ali nižja od vaše',
  'iskanje.raven.nizja': 'Nižja od vaše',
  'iskanje.regije': 'Regija (zveza)',
  'iskanje.minMinut': 'Najmanj minut v sezoni',
  'iskanje.odprti': 'Samo odprti za prestop',
  'iskanje.isci': 'Išči',
  'iskanje.prazno': 'Za te pogoje ni igralcev.',
  'iskanje.vec': 'Naslednjih 25',
  'iskanje.razlog': '{percentil}. percentil med {skupina} v državi · {minute} min · {delez} % minut ekipe',
  'iskanje.goli': 'goli na 90 min na vaši ravni: {goli}',
  'iskanje.odprt': 'Odprt za prestop',
  'iskanje.opomba': 'Kazalniki iz podatkov tekem, prilagojeni moči lige. Niso ocena osebe; o igralcu odloči človek v klubu.',
  'igralec.ni': 'Igralec ni na voljo.',
  'igralec.povzetek': '{percentil}. percentil med {skupina} v državi · zaupanje v kazalnike {zaupanje} %',
  'igralec.opazuj': 'Dodaj na seznam',
  'igralec.neOpazuj': 'Odstrani s seznama',
  'igralec.odprt': 'Odprt za prestop',
  'igralec.letnik': 'Letnica rojstva: {letnik}',
  'igralec.regije': 'Želene regije: {regije}',
  'igralec.sezone': 'Kazalniki po sezonah',
  'igralec.st.sezona': 'Sezona',
  'igralec.st.liga': 'Liga',
  'igralec.st.klub': 'Klub',
  'igralec.st.minute': 'Min',
  'igralec.st.delez': '% minut',
  'igralec.st.zacetki': '% začetkov',
  'igralec.st.goli': 'Goli/90',
  'igralec.st.goliPriNas': 'Goli/90 pri vas',
  'igralec.st.onoff': 'Gol razlika na igrišču/90',
  'igralec.st.prejeti': 'Prejeti/90',
  'igralec.st.ciste': '% čistih mrež',
  'igralec.st.kartoni': 'Kartoni/90',
  'igralec.podobni': 'Podobni igralci',
  'igralec.pokaziPodobne': 'Pokaži podobne',
  'igralec.podobnost': 'podobnost {p} %',
  'igralec.niPodobnih': 'Podobnih igralcev ni.',
  'vrzeli.naslov': 'Vrzeli v kadru',
  'vrzeli.opis': 'Iz zapisnikov vašega kluba v tekoči sezoni. Za vsako vrzel poiščite igralce na tej poziciji.',
  'vrzeli.prazno': 'Izrazitih vrzeli ni.',
  'vrzeli.isci': 'Poišči igralce',
  'vrzeli.tanka': '{skupina}: malo rednih igralcev ({n})',
  'vrzeli.odvisnost': '{skupina}: {ime} prispeva {n} % golov ekipe',
  'vrzeli.padajoce_minute': '{skupina}: {ime} ima letos manj minut kot lani',
  'vrzeli.disciplina': '{skupina}: {ime} ima več kartonov, kot je v ligi običajno',
  'vrzeli.prejeti': '{skupina}: največ prejetih golov na igrišču',
  'seznam.naslov': 'Opazovani igralci',
  'seznam.opis': 'Do 30 igralcev za ves klub.',
  'seznam.prazno': 'Seznam je prazen. Igralca dodaš na njegovi strani.',
  'seznam.odstrani': 'Odstrani',
  'napaka.splosna': 'Nekaj je šlo narobe. Poskusi znova.',
  'napaka.dostop': 'Za to potrebuješ sedež kluba z veljavno naročnino.',
  'napaka.scout-meja': 'Klub je danes dosegel mejo ogledov. Jutri spet.',
  'napaka.scout-pogoji': 'Za preizkus sprejmi pogoje uporabe.',
  'napaka.scout-preizkus-porabljen': 'Klub je preizkus že uporabil.',
  'napaka.scout-drzava': 'Scout v državi kluba ni na voljo.',
  'napaka.scout-ni-narocnine': 'Klub še nima Scouta. Začni preizkus.',
  'napaka.scout-sedezi-polni': 'Vsi trije sedeži so zasedeni. Sprosti enega.',
  'napaka.scout-seznam-poln': 'Na seznamu je že 30 igralcev.',
  'napaka.scout-ni-igralca': 'Igralec ni na voljo.',
  'napaka.scout-ze-placano': 'Naročnina že teče.',
  'napaka.scout-filter': 'Neveljaven filter.',
  'pogoji.naslov': 'Pogoji uporabe in zasebnost SLFF Scout',
  'pogoji.zadnja': 'Zadnja sprememba: 17. 10. 2026.',
  'pogoji.h.kaj': 'Kaj je Scout',
  'pogoji.kaj': 'SLFF Scout je plačljivo orodje za nogometne klube. Iz uradnih zapisnikov tekem izračuna kazalnike igralcev članskih lig (delež minut, goli, vpliv na igrišču, prejeti goli, kartoni, pot čez sezone), prilagojene moči lige. To so kazalniki iz podatkov tekem, ne ocena osebe. O igralcu vedno odloči človek v klubu.',
  'pogoji.h.kdo': 'Kdo ga uporablja',
  'pogoji.kdo': 'Scout uporablja klub prek uradnih računov kluba na slff.eu (prijava z uradnim e-naslovom kluba), največ trije sedeži hkrati. Klub odgovarja za ravnanje vseh svojih uporabnikov.',
  'pogoji.h.raba': 'Dovoljena raba',
  'pogoji.raba': 'Scout se sme uporabljati le za iskanje igralcev za lastni klub. Prepovedano je preprodajati ali posredovati podatke iz Scouta tretjim, jih samodejno zajemati (strganje), objavljati kazalnike ali razvrstitve ter objavljati ali posredovati podatke, ki jih je igralec dal s privolitvijo (odprt za prestop, letnica, regije).',
  'pogoji.h.meje': 'Meje',
  'pogoji.meje': 'Klub si lahko na dan ogleda največ 500 profilov igralcev in opravi največ 300 drugih poizvedb (iskanja, podobni igralci, vrzeli, seznam). Na opazovalnem seznamu je lahko največ 30 igralcev.',
  'pogoji.h.dnevnik': 'Dnevnik',
  'pogoji.dnevnik': 'Vsak ogled profila in vsako iskanje zabeležimo (klub, uporabnik, čas, igralec oziroma igralci v rezultatih iskanja in med podobnimi) in hranimo 12 mesecev, da preprečimo zlorabo in da igralcu na zahtevo povemo, kateri klubi so ga videli.',
  'pogoji.h.cene': 'Cene in plačilo',
  'pogoji.cene': 'Preizkus traja 14 dni, je brezplačen, brez kartice in ga klub dobi enkrat. Paket Klub stane 39 € na mesec ali 290 € na sezono (letna naročnina); cene ne vključujejo DDV, ki ga obračunamo po veljavnih predpisih (pri veljavni davčni številki EU izven Slovenije obrnjena davčna obveznost). Naročnina se samodejno podaljša in jo lahko kadarkoli odpoveš. Plačilo obdela Stripe.',
  'pogoji.h.odpoved': 'Odpoved',
  'pogoji.odpoved': 'Naročnino lahko kadarkoli odpove plačnik ali kateri koli uradni račun kluba z gumbom Upravljaj ali odpovej naročnino na strani Račun kluba. Dostop ostane do konca plačanega obdobja; za začeto obdobje denarja ne vračamo.',
  'pogoji.h.krsitev': 'Kršitev',
  'pogoji.krsitev': 'Ob kršitvi teh pogojev klubu zapremo dostop in naročnino ustavimo, brez vračila za tekoče obdobje.',
  'pogoji.h.zasebnost': 'Zasebnost uporabnikov kluba',
  'pogoji.zasebnost': 'Za uporabnike kluba obdelujemo e-naslov, prikazno ime in dnevnik uporabe (izvajanje pogodbe s klubom in zakoniti interes). Podatke za račun obdeluje Stripe (Stripe Payments Europe, Irska). Kaj vidijo klubi o igralcih in kako igralec ugovarja, je v razdelku Scout na slff.eu/legal.',
  'pogoji.h.ponudnik': 'Ponudnik',
  'pogoji.ponudnik': 'SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenija, matična številka 9850538000, ID za DDV SI42765153. Kontakt: info@slff.eu.',
  'pogoji.h.pravo': 'Pravo',
  'pogoji.pravo': 'Pogoji veljajo za pravne osebe (klube), ne za potrošnike. Velja slovensko pravo, pristojno je sodišče v Ljubljani.',
  'pogoji.igralci': 'Obvestilo igralcem na slff.eu',
}

export type Kljuc = keyof typeof SL

export const EN: Record<Kljuc, string> = {
  'app.ime': 'SLFF Scout',
  'app.nalaganje': 'Loading …',
  'nav.iskanje': 'Search',
  'nav.vrzeli': 'Gaps',
  'nav.seznam': 'Watchlist',
  'nav.racun': 'Club account',
  'nav.odjava': 'Sign out',
  'noga.pogoji': 'Terms and privacy',
  'noga.vir': 'Data from official match reports via slff.eu',
  'prijava.naslov': 'Sign in to SLFF Scout',
  'prijava.uvod': 'Scout is a tool for clubs: player search, squad gaps, similar players and a watchlist. Sign in with the same account as on slff.eu.',
  'prijava.eposta': 'Email',
  'prijava.geslo': 'Password',
  'prijava.gumb': 'Sign in',
  'prijava.google': 'Sign in with Google',
  'prijava.napaka': 'Sign in failed. Check your email and password.',
  'prijava.brezRacuna': 'No account yet or forgot your password? Sort it out on slff.eu with the official club email address.',
  'prijava.slff': 'Go to slff.eu',
  'racun.naslov': 'Club account',
  'racun.niKlub': 'This is not an official club account. Scout is for clubs that sign in with the official club email address. If we do not recognise your club, request a club account on slff.eu.',
  'racun.slffRacun': 'Club account on slff.eu',
  'racun.drzavaZaprta': 'Scout is not available in your club country yet.',
  'racun.preizkusNaslov': 'Try Scout free for 14 days',
  'racun.preizkusOpis': 'No card needed. After the trial choose a monthly or season plan, otherwise access simply ends.',
  'racun.sprejmem': 'I accept the SLFF Scout terms of use.',
  'racun.zacni': 'Start trial',
  'racun.paket.preizkus': 'Trial',
  'racun.paket.klub': 'Club plan',
  'racun.veljaDo': '{paket}, valid until {datum}',
  'racun.potekla': 'Access has ended. Choose a plan to continue.',
  'racun.niSedeza': 'Your club has Scout. Take a free seat to use it.',
  'racun.zasedi': 'Take a seat',
  'racun.sedezi': 'Seats ({n} of 3)',
  'racun.sprosti': 'Release',
  'racun.ti': '(you)',
  'racun.placiNaslov': 'Club plan',
  'racun.placiOpis': 'Search, gaps, similar players and a watchlist of up to 30 players in your club country, up to 3 seats.',
  'racun.mesec': '€39 per month',
  'racun.sezona': '€290 per season',
  'racun.ddv': 'Prices exclude VAT. Payment via Stripe, seller SPACE GUARDIAN d.o.o.',
  'racun.upravljaj': 'Manage or cancel subscription',
  'racun.placiloUspeh': 'Payment received. Your subscription will appear in a few seconds.',
  'racun.placiloPreklic': 'Payment cancelled.',
  'racun.naprej': 'Go to search',
  'skupina.GK': 'Goalkeepers',
  'skupina.DEF': 'Defenders',
  'skupina.MID': 'Midfielders',
  'skupina.FWD': 'Forwards',
  'skupinaMed.GK': 'goalkeepers',
  'skupinaMed.DEF': 'defenders',
  'skupinaMed.MID': 'midfielders',
  'skupinaMed.FWD': 'forwards',
  'iskanje.naslov': 'Player search',
  'iskanje.pozicija': 'Position',
  'iskanje.vse': 'All',
  'iskanje.raven': 'League level',
  'iskanje.raven.vse': 'All levels',
  'iskanje.raven.ista_ali_nizja': 'Same as yours or lower',
  'iskanje.raven.nizja': 'Lower than yours',
  'iskanje.regije': 'Region (association)',
  'iskanje.minMinut': 'Minimum minutes this season',
  'iskanje.odprti': 'Open to a move only',
  'iskanje.isci': 'Search',
  'iskanje.prazno': 'No players match these filters.',
  'iskanje.vec': 'Next 25',
  'iskanje.razlog': '{percentil}th percentile among {skupina} in the country · {minute} min · {delez} % of team minutes',
  'iskanje.goli': 'goals per 90 at your level: {goli}',
  'iskanje.odprt': 'Open to a move',
  'iskanje.opomba': 'Match-data indicators adjusted for league strength. They are not an assessment of a person; a person at the club decides.',
  'igralec.ni': 'This player is not available.',
  'igralec.povzetek': '{percentil}th percentile among {skupina} in the country · confidence in indicators {zaupanje} %',
  'igralec.opazuj': 'Add to watchlist',
  'igralec.neOpazuj': 'Remove from watchlist',
  'igralec.odprt': 'Open to a move',
  'igralec.letnik': 'Year of birth: {letnik}',
  'igralec.regije': 'Preferred regions: {regije}',
  'igralec.sezone': 'Indicators by season',
  'igralec.st.sezona': 'Season',
  'igralec.st.liga': 'League',
  'igralec.st.klub': 'Club',
  'igralec.st.minute': 'Min',
  'igralec.st.delez': '% minutes',
  'igralec.st.zacetki': '% starts',
  'igralec.st.goli': 'Goals/90',
  'igralec.st.goliPriNas': 'Goals/90 at your level',
  'igralec.st.onoff': 'Goal difference on pitch/90',
  'igralec.st.prejeti': 'Conceded/90',
  'igralec.st.ciste': '% clean sheets',
  'igralec.st.kartoni': 'Cards/90',
  'igralec.podobni': 'Similar players',
  'igralec.pokaziPodobne': 'Show similar players',
  'igralec.podobnost': 'similarity {p} %',
  'igralec.niPodobnih': 'No similar players.',
  'vrzeli.naslov': 'Squad gaps',
  'vrzeli.opis': 'From your club match reports this season. For each gap, search for players in that position.',
  'vrzeli.prazno': 'No notable gaps.',
  'vrzeli.isci': 'Find players',
  'vrzeli.tanka': '{skupina}: few regular players ({n})',
  'vrzeli.odvisnost': '{skupina}: {ime} scores {n} % of team goals',
  'vrzeli.padajoce_minute': '{skupina}: {ime} has fewer minutes than last season',
  'vrzeli.disciplina': '{skupina}: {ime} receives more cards than is usual in the league',
  'vrzeli.prejeti': '{skupina}: most goals conceded while on the pitch',
  'seznam.naslov': 'Watchlist',
  'seznam.opis': 'Up to 30 players for the whole club.',
  'seznam.prazno': 'The watchlist is empty. Add a player on their page.',
  'seznam.odstrani': 'Remove',
  'napaka.splosna': 'Something went wrong. Please try again.',
  'napaka.dostop': 'You need a club seat with a valid subscription for this.',
  'napaka.scout-meja': 'Your club has reached today’s limit. Try again tomorrow.',
  'napaka.scout-pogoji': 'Accept the terms of use to start the trial.',
  'napaka.scout-preizkus-porabljen': 'Your club has already used its trial.',
  'napaka.scout-drzava': 'Scout is not available in your club country.',
  'napaka.scout-ni-narocnine': 'Your club does not have Scout yet. Start a trial.',
  'napaka.scout-sedezi-polni': 'All three seats are taken. Release one first.',
  'napaka.scout-seznam-poln': 'The watchlist already has 30 players.',
  'napaka.scout-ni-igralca': 'This player is not available.',
  'napaka.scout-ze-placano': 'A subscription is already active.',
  'napaka.scout-filter': 'Invalid filter.',
  'pogoji.naslov': 'SLFF Scout terms of use and privacy',
  'pogoji.zadnja': 'Last updated: 17 October 2026.',
  'pogoji.h.kaj': 'What Scout is',
  'pogoji.kaj': 'SLFF Scout is a paid tool for football clubs. From official match reports it computes indicators for players in senior leagues (share of minutes, goals, on-pitch impact, goals conceded, cards, path across seasons), adjusted for league strength. These are match-data indicators, not an assessment of a person. A person at the club always decides about a player.',
  'pogoji.h.kdo': 'Who uses it',
  'pogoji.kdo': 'A club uses Scout through its official club accounts on slff.eu (sign in with the official club email address), up to three seats at a time. The club is responsible for the conduct of all its users.',
  'pogoji.h.raba': 'Permitted use',
  'pogoji.raba': 'Scout may only be used to look for players for your own club. It is forbidden to resell or pass data from Scout to third parties, to collect it automatically (scraping), to publish indicators or rankings, and to publish or pass on data a player gave with consent (open to a move, year of birth, regions).',
  'pogoji.h.meje': 'Limits',
  'pogoji.meje': 'A club can open up to 500 player profiles and run up to 300 other queries (searches, similar players, gaps, watchlist) per day. The watchlist holds up to 30 players.',
  'pogoji.h.dnevnik': 'Log',
  'pogoji.dnevnik': 'We log every profile view and every search (club, user, time, and the player or the players shown in search results and among similar players) and keep it for 12 months to prevent abuse and to tell a player on request which clubs saw them.',
  'pogoji.h.cene': 'Prices and payment',
  'pogoji.cene': 'The trial lasts 14 days, is free, needs no card and is available once per club. The Club plan costs €39 per month or €290 per season (yearly subscription); prices exclude VAT, which is charged as required by law (reverse charge for a valid EU VAT number outside Slovenia). The subscription renews automatically and can be cancelled at any time. Payments are processed by Stripe.',
  'pogoji.h.odpoved': 'Cancellation',
  'pogoji.odpoved': 'The payer or any official club account can cancel at any time with Manage or cancel subscription on the Club account page. Access continues until the end of the paid period; we do not refund a started period.',
  'pogoji.h.krsitev': 'Breach',
  'pogoji.krsitev': 'If these terms are breached we close the club access and stop the subscription, without a refund for the current period.',
  'pogoji.h.zasebnost': 'Privacy of club users',
  'pogoji.zasebnost': 'For club users we process the email address, display name and usage log (performance of the contract with the club and legitimate interest). Billing data is processed by Stripe (Stripe Payments Europe, Ireland). What clubs see about players and how a player objects is in the Scout section of slff.eu/legal.',
  'pogoji.h.ponudnik': 'Provider',
  'pogoji.ponudnik': 'SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Slovenia, registration number 9850538000, VAT ID SI42765153. Contact: info@slff.eu.',
  'pogoji.h.pravo': 'Law',
  'pogoji.pravo': 'These terms apply to legal entities (clubs), not to consumers. Slovenian law applies; the court in Ljubljana has jurisdiction.',
  'pogoji.igralci': 'Notice for players on slff.eu',
}

type Jezik = 'sl' | 'en'
const SHRAMBA = 'slff-scout-jezik'

function izberi(): Jezik {
  if (typeof window === 'undefined') return 'sl'
  try {
    const j = localStorage.getItem(SHRAMBA)
    if (j === 'sl' || j === 'en') return j
  } catch {}
  return navigator.language.toLowerCase().startsWith('sl') ? 'sl' : 'en'
}

/** Jezik se izbere ob nalaganju; zamenjava stran naloži znova. */
export const jezik: Jezik = izberi()
const SLOVAR: Record<Kljuc, string> = jezik === 'sl' ? SL : EN
const LOKALE = jezik === 'sl' ? 'sl-SI' : 'en-GB'

export function t(k: Kljuc, p?: Record<string, string | number>): string {
  return SLOVAR[k].replace(/\{(\w+)\}/g, (cel, ime: string) => (p && ime in p ? String(p[ime]) : cel))
}

export function izberiJezik(j: Jezik): void {
  try {
    localStorage.setItem(SHRAMBA, j)
  } catch {}
  location.reload()
}

export const datum = (d: string): string =>
  new Date(d).toLocaleDateString(LOKALE, { day: 'numeric', month: 'long', year: 'numeric' })

export const stevilo = (n: number, mest = 0): string =>
  n.toLocaleString(LOKALE, { minimumFractionDigits: mest, maximumFractionDigits: mest })

/** Sporočilo napake RPC: koda v hint (scout-…), 42501 = brez sedeža ali naročnine. */
export function napaka(e: { hint?: string | null; code?: string | null } | null): string {
  const k = e?.code === '42501' ? 'napaka.dostop' : `napaka.${e?.hint ?? 'splosna'}`
  return k in SL ? t(k as Kljuc) : t('napaka.splosna')
}
```

- [ ] **Step 5: `scout/src/baza.ts` in `scout/src/seja.tsx`**

`scout/src/baza.ts`:

```ts
// Ista baza in isti računi kot slff.eu (api.slff.eu). Seja je svoja, ker je
// izvor drug: na scout.slff.eu se prijaviš posebej. Shema scout ni v API;
// vse gre prek RPC scout_* (faza 3a), ki preverijo sedež in naročnino.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/baza.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  { auth: { flowType: 'implicit', storageKey: 'slff-scout-seja' } },
)

type Fn = Database['public']['Functions']
export type Zadetek = Fn['scout_isci']['Returns'][number]
export type Podoben = Fn['scout_podobni']['Returns'][number]
export type Vrzel = Fn['scout_vrzeli']['Returns'][number]
export type Opazovan = Fn['scout_opazovani']['Returns'][number]
export type Skupina = 'GK' | 'DEF' | 'MID' | 'FWD'
export const SKUPINE: Skupina[] = ['GK', 'DEF', 'MID', 'FWD']

/** scout_moj_klub() */
export interface Klub {
  team_id: number
  klub: string
  country_id: number
  drzava_odprta: boolean
  sedez: boolean
  narocnina: {
    paket: 'preizkus' | 'klub'
    obdobje: 'mesec' | 'sezona' | null
    velja_do: string
    velja: boolean
  } | null
  sedezi: { user_id: string; ime: string | null }[]
}

export interface SezonaIgralca {
  sezona: string
  liga: string
  klub: string
  minute: number
  delez_minut: number
  zacetki_delez: number
  cele_delez: number
  goli_ref_90: number
  goli_90_pri_nas: number | null
  delez_golov: number
  enajstm: number
  onoff_ref_90: number
  prejeti_ref_90: number
  ciste_delez: number
  kartoni_90: number
  vratar_ref_90: number
  stalnost: number
  trend_minut: number | null
  zaupanje: number
}

/** scout_igralec(id) */
export interface ProfilIgralca {
  player_id: number
  ime: string
  klub: string
  liga: string
  skupina: Skupina
  indeks: number
  percentil: number
  zaupanje: number
  moc_lige: number | null
  moc_kluba: number | null
  opazujem: boolean
  /** Le pri "odprt za prestop"; stika ni (faza 4). */
  privolitev: { letnik: number; regije: string[] } | null
  sezone: SezonaIgralca[] | null
}
```

`scout/src/seja.tsx`:

```tsx
import type { Session } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, type Klub } from './baza'
import { t } from './besede'

interface Seja {
  seja: Session | null
  /** Seja še ni znana ali stanje kluba prijavljenega še ni prebrano. */
  nalaga: boolean
  klub: Klub | null
  osvezi: () => Promise<void>
}

const Kontekst = createContext<Seja>({ seja: null, nalaga: true, klub: null, osvezi: async () => {} })

export function SejaProvider({ children }: { children: ReactNode }) {
  const [seja, setSeja] = useState<Session | null>(null)
  const [sejaZnana, setSejaZnana] = useState(false)
  const [klub, setKlub] = useState<Klub | null>(null)
  const [klubZa, setKlubZa] = useState<string | null>(null)
  const uid = seja?.user.id ?? null

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSeja(data.session)
      setSejaZnana(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_dogodek, s) => setSeja(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const osvezi = useCallback(async () => {
    const { data } = await supabase.rpc('scout_moj_klub')
    setKlub((data as unknown as Klub | null) ?? null)
  }, [])

  useEffect(() => {
    if (!uid) {
      setKlub(null)
      return
    }
    let velja = true
    void (async () => {
      // Klubski račun nastane ob prvi prijavi z uradnim naslovom kluba, kot na slff.eu.
      await supabase.rpc('uveljavi_klubski_racun')
      const { data } = await supabase.rpc('scout_moj_klub')
      if (!velja) return
      setKlub((data as unknown as Klub | null) ?? null)
      setKlubZa(uid)
    })()
    return () => {
      velja = false
    }
  }, [uid])

  const nalaga = !sejaZnana || (uid !== null && klubZa !== uid)
  return <Kontekst.Provider value={{ seja, nalaga, klub, osvezi }}>{children}</Kontekst.Provider>
}

export const useSeja = (): Seja => useContext(Kontekst)

export function Nalaganje() {
  return <p className="text-slate-500">{t('app.nalaganje')}</p>
}

/** Strani s podatki igralcev: sedež kluba z veljavno naročnino (baza to preveri še enkrat). */
export function ZahtevaSedez({ children }: { children: ReactNode }) {
  const { seja, nalaga, klub } = useSeja()
  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login" replace />
  if (!klub?.sedez || !klub.narocnina?.velja) return <Navigate to="/account" replace />
  return <>{children}</>
}
```

- [ ] **Step 6: `scout/src/Okvir.tsx`, `scout/src/App.tsx`, `scout/src/strani/Prijava.tsx`**

`scout/src/Okvir.tsx`:

```tsx
import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { supabase } from './baza'
import { izberiJezik, jezik, t } from './besede'
import { useSeja } from './seja'

const povezava = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 ${isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'}`

export function Okvir({ children }: { children: ReactNode }) {
  const { seja, klub } = useSeja()
  const dostop = Boolean(klub?.sedez && klub.narocnina?.velja)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="font-semibold tracking-tight">{t('app.ime')}</Link>
          {klub && <span className="text-sm text-slate-500">{klub.klub}</span>}
          <nav className="ml-auto flex flex-wrap gap-1 text-sm">
            {dostop && (
              <>
                <NavLink to="/" end className={povezava}>{t('nav.iskanje')}</NavLink>
                <NavLink to="/gaps" className={povezava}>{t('nav.vrzeli')}</NavLink>
                <NavLink to="/watchlist" className={povezava}>{t('nav.seznam')}</NavLink>
              </>
            )}
            {seja && <NavLink to="/account" className={povezava}>{t('nav.racun')}</NavLink>}
            {seja && (
              <button type="button" onClick={() => void supabase.auth.signOut()} className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200">
                {t('nav.odjava')}
              </button>
            )}
            <button type="button" onClick={() => izberiJezik(jezik === 'sl' ? 'en' : 'sl')} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-200">
              {jezik === 'sl' ? 'EN' : 'SL'}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 text-sm text-slate-500">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-4 px-4 py-4">
          <Link to="/terms" className="hover:underline">{t('noga.pogoji')}</Link>
          <a href="https://slff.eu" className="hover:underline">{t('noga.vir')}</a>
        </div>
      </footer>
    </div>
  )
}
```

`scout/src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { Okvir } from './Okvir'
import { SejaProvider, ZahtevaSedez } from './seja'
import { Igralec } from './strani/Igralec'
import { Iskanje } from './strani/Iskanje'
import { Opazovani } from './strani/Opazovani'
import { Pogoji } from './strani/Pogoji'
import { Prijava } from './strani/Prijava'
import { Racun } from './strani/Racun'
import { Vrzeli } from './strani/Vrzeli'

export function App() {
  return (
    <SejaProvider>
      <Okvir>
        <Routes>
          <Route path="/" element={<ZahtevaSedez><Iskanje /></ZahtevaSedez>} />
          <Route path="/player/:id" element={<ZahtevaSedez><Igralec /></ZahtevaSedez>} />
          <Route path="/gaps" element={<ZahtevaSedez><Vrzeli /></ZahtevaSedez>} />
          <Route path="/watchlist" element={<ZahtevaSedez><Opazovani /></ZahtevaSedez>} />
          <Route path="/account" element={<Racun />} />
          <Route path="/login" element={<Prijava />} />
          <Route path="/terms" element={<Pogoji />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Okvir>
    </SejaProvider>
  )
}
```

`scout/src/strani/Prijava.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../baza'
import { t } from '../besede'
import { useSeja } from '../seja'

// Brez registracije in ponastavitve gesla: obe sta na slff.eu (tam tudi
// nastane klubski račun ob prvi prijavi z uradnim naslovom).
export function Prijava() {
  const { seja } = useSeja()
  const [eposta, setEposta] = useState('')
  const [geslo, setGeslo] = useState('')
  const [neuspeh, setNeuspeh] = useState(false)
  const [poteka, setPoteka] = useState(false)
  if (seja) return <Navigate to="/account" replace />

  async function prijava(e: FormEvent) {
    e.preventDefault()
    setPoteka(true)
    const { error } = await supabase.auth.signInWithPassword({ email: eposta.trim(), password: geslo })
    setNeuspeh(Boolean(error))
    setPoteka(false)
  }

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{t('prijava.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('prijava.uvod')}</p>
      <form onSubmit={(e) => void prijava(e)} className="space-y-3">
        <label className="block text-sm">
          {t('prijava.eposta')}
          <input type="email" required autoComplete="email" value={eposta} onChange={(e) => setEposta(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="block text-sm">
          {t('prijava.geslo')}
          <input type="password" required autoComplete="current-password" value={geslo} onChange={(e) => setGeslo(e.target.value)} className="mt-1 w-full rounded border border-slate-300 px-2 py-1" />
        </label>
        {neuspeh && <p className="text-sm text-red-700">{t('prijava.napaka')}</p>}
        <button disabled={poteka} className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">{t('prijava.gumb')}</button>
      </form>
      <button
        type="button"
        onClick={() => void supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/account` } })}
        className="w-full rounded border border-slate-300 px-4 py-2"
      >
        {t('prijava.google')}
      </button>
      <p className="text-sm text-slate-600">
        {t('prijava.brezRacuna')} <a href="https://slff.eu/login" className="underline">{t('prijava.slff')}</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 7: Začasne strani, da se ogrodje prevede**

Naloge 2–6 jih zamenjajo; do takrat naj vsaka vrne le naslov. Ustvari `scout/src/strani/Racun.tsx`:

```tsx
import { t } from '../besede'

export function Racun() {
  return <h1 className="text-xl font-semibold">{t('racun.naslov')}</h1>
}
```

`scout/src/strani/Iskanje.tsx`:

```tsx
import type { Zadetek } from '../baza'
import { t } from '../besede'

export function Iskanje() {
  return <h1 className="text-xl font-semibold">{t('iskanje.naslov')}</h1>
}

export function utemeljitev(_z: Pick<Zadetek, 'percentil' | 'skupina' | 'minute' | 'delez_minut' | 'goli_90_pri_nas'>): string {
  return ''
}
```

`scout/src/strani/Igralec.tsx`:

```tsx
import { t } from '../besede'

export function Igralec() {
  return <h1 className="text-xl font-semibold">{t('igralec.sezone')}</h1>
}
```

`scout/src/strani/Vrzeli.tsx`:

```tsx
import type { Vrzel } from '../baza'
import { t } from '../besede'

export function Vrzeli() {
  return <h1 className="text-xl font-semibold">{t('vrzeli.naslov')}</h1>
}

export function opisVrzeli(_v: Pick<Vrzel, 'vrsta' | 'skupina' | 'ime' | 'vrednost'>): string {
  return ''
}
```

`scout/src/strani/Opazovani.tsx`:

```tsx
import { t } from '../besede'

export function Opazovani() {
  return <h1 className="text-xl font-semibold">{t('seznam.naslov')}</h1>
}
```

`scout/src/strani/Pogoji.tsx`:

```tsx
import { t } from '../besede'

export function Pogoji() {
  return <h1 className="text-xl font-semibold">{t('pogoji.naslov')}</h1>
}
```

- [ ] **Step 8: Preveri**

```bash
npm run typecheck
npm run build:scout && ls dist-scout/index.html && grep -c 'slff-commit' dist-scout/index.html
npm run smoke:scout 2>&1 | tail -6
npm run build && npm run smoke 2>&1 | tail -1
```

Expected: `typecheck` zelen; `dist-scout/index.html` obstaja z eno `slff-commit`; v smoke Scouta so izrisi, slovar in negativne oznake `PASS`, `FAIL` le `iskanje: utemeljitev …` in `vrzeli: delež golov …` (začasni strani); build in smoke slff.eu nespremenjena (`VSE OK`).

- [ ] **Step 9: Commit**

```bash
git add scout/index.html scout/vite.config.js scout/tailwind.config.js scout/src scout/smoke.tsx package.json tsconfig.json .gitignore
git commit -F - <<'MSG'
feat(scout): ogrodje aplikacije scout.slff.eu (sl, en), seja in prijava

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 2: Račun kluba (preizkus, sedeži, plačilo, portal)

**Files:**
- Modify: `scout/src/strani/Racun.tsx`

**Interfaces:**
- Consumes: `useSeja().klub/osvezi`, RPC `scout_zacni_preizkus(p_sprejmem_pogoje)`, `scout_zasedi_sedez()`, `scout_sprosti_sedez(p_user)`, `scout_portal_kupec()`, funkcija `scout-placilo` (`checkout`, `portal`; napaka nosi `hint` v telesu 400), `napaka`, `datum`.
- Produces: `export function Racun()` (stran `/account`; `?placilo=uspeh|preklic` po vrnitvi s Stripe).

- [ ] **Step 1: `scout/src/strani/Racun.tsx`**

```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../baza'
import { datum, jezik, napaka, t, type Kljuc } from '../besede'
import { Nalaganje, useSeja } from '../seja'

type Odziv = { error: { hint?: string | null; code?: string | null } | null }
type Stripe = { akcija: 'checkout'; obdobje: 'mesec' | 'sezona' } | { akcija: 'portal' }

function Okno({ children }: { children: ReactNode }) {
  return <section className="space-y-3 rounded border border-slate-200 bg-white p-4">{children}</section>
}

function Gumb({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">
      {children}
    </button>
  )
}

export function Racun() {
  const { seja, nalaga, klub, osvezi } = useSeja()
  const [q] = useSearchParams()
  const placilo = q.get('placilo')
  const [sprejmem, setSprejmem] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)
  const [portal, setPortal] = useState(false)

  // Webhook zapiše plačilo v nekaj sekundah po vrnitvi s Stripe.
  useEffect(() => {
    if (placilo !== 'uspeh') return
    const ure = [3000, 8000, 15000].map((ms) => setTimeout(() => void osvezi(), ms))
    return () => ure.forEach(clearTimeout)
  }, [placilo, osvezi])

  // Preklic mora biti vedno dosegljiv: plačnik ali kateri koli uradni račun
  // kluba, ne glede na sedež in naročnino (scout_portal_kupec v 3a).
  const uid = seja?.user.id
  useEffect(() => {
    if (!uid) return
    void supabase.rpc('scout_portal_kupec').then(({ data }) => setPortal(typeof data === 'string'))
  }, [uid, klub])

  if (nalaga) return <Nalaganje />
  if (!seja) return <Navigate to="/login" replace />

  async function klic(fn: () => PromiseLike<Odziv>) {
    setPoteka(true)
    setSporocilo(null)
    const { error } = await fn()
    if (error) setSporocilo(napaka(error))
    else await osvezi()
    setPoteka(false)
  }

  async function stripe(telo: Stripe) {
    setPoteka(true)
    setSporocilo(null)
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('scout-placilo', { body: { ...telo, jezik } })
    if (error || !data?.url) {
      // Napaka 400 nosi kodo baze v telesu ({ error, hint }); brez nje splošna.
      const telo: unknown = error && 'context' in error ? await (error.context as Response).json().catch(() => null) : null
      setSporocilo(napaka((telo as { hint?: string | null } | null) ?? null))
      setPoteka(false)
      return
    }
    location.assign(data.url)
  }

  const n = klub?.narocnina ?? null
  const jaz = seja.user.id
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">{t('racun.naslov')}</h1>
      {placilo === 'uspeh' && <p className="rounded bg-emerald-50 p-3 text-emerald-900">{t('racun.placiloUspeh')}</p>}
      {placilo === 'preklic' && <p className="rounded bg-slate-100 p-3">{t('racun.placiloPreklic')}</p>}
      {sporocilo && <p className="text-red-700">{sporocilo}</p>}
      {!klub ? (
        <Okno>
          <p>{t('racun.niKlub')}</p>
          <a className="underline" href="https://slff.eu/account">{t('racun.slffRacun')}</a>
        </Okno>
      ) : !n && !klub.drzava_odprta ? (
        <Okno>
          <p>{t('racun.drzavaZaprta')}</p>
        </Okno>
      ) : !n ? (
        <Okno>
          <h2 className="font-semibold">{t('racun.preizkusNaslov')}</h2>
          <p>{t('racun.preizkusOpis')}</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={sprejmem} onChange={(e) => setSprejmem(e.target.checked)} className="mt-1" />
            <span>
              {t('racun.sprejmem')} <Link to="/terms" className="underline">{t('noga.pogoji')}</Link>
            </span>
          </label>
          <Gumb disabled={!sprejmem || poteka} onClick={() => void klic(() => supabase.rpc('scout_zacni_preizkus', { p_sprejmem_pogoje: sprejmem }))}>
            {t('racun.zacni')}
          </Gumb>
        </Okno>
      ) : (
        <>
          <Okno>
            <p className="font-medium">{t('racun.veljaDo', { paket: t(`racun.paket.${n.paket}` as Kljuc), datum: datum(n.velja_do) })}</p>
            {!n.velja && <p>{t('racun.potekla')}</p>}
            {klub.sedez && n.velja && <Link to="/" className="underline">{t('racun.naprej')}</Link>}
            {!klub.sedez && (
              <>
                <p>{t('racun.niSedeza')}</p>
                <Gumb disabled={poteka} onClick={() => void klic(() => supabase.rpc('scout_zasedi_sedez'))}>{t('racun.zasedi')}</Gumb>
              </>
            )}
          </Okno>
          <Okno>
            <h2 className="font-semibold">{t('racun.sedezi', { n: klub.sedezi.length })}</h2>
            <ul className="divide-y divide-slate-200">
              {klub.sedezi.map((s) => (
                <li key={s.user_id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {s.ime ?? '?'} {s.user_id === jaz && t('racun.ti')}
                  </span>
                  {(klub.sedez || s.user_id === jaz) && (
                    <button type="button" disabled={poteka} className="text-sm underline" onClick={() => void klic(() => supabase.rpc('scout_sprosti_sedez', { p_user: s.user_id }))}>
                      {t('racun.sprosti')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Okno>
          {klub.sedez && (n.paket !== 'klub' || !n.velja) && (
            <Okno>
              <h2 className="font-semibold">{t('racun.placiNaslov')}</h2>
              <p>{t('racun.placiOpis')}</p>
              <div className="flex flex-wrap gap-2">
                <Gumb disabled={poteka} onClick={() => void stripe({ akcija: 'checkout', obdobje: 'mesec' })}>{t('racun.mesec')}</Gumb>
                <Gumb disabled={poteka} onClick={() => void stripe({ akcija: 'checkout', obdobje: 'sezona' })}>{t('racun.sezona')}</Gumb>
              </div>
              <p className="text-xs text-slate-500">{t('racun.ddv')}</p>
            </Okno>
          )}
        </>
      )}
      {portal && (
        <button type="button" disabled={poteka} className="text-sm underline" onClick={() => void stripe({ akcija: 'portal' })}>
          {t('racun.upravljaj')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Preveri**

```bash
npm run typecheck && npm run smoke:scout 2>&1 | grep -E 'account|NAPAK|VSE OK'
```

Expected: `PASS izris /account`; ostane le `FAIL` za utemeljitev in vrzeli (nalogi 3 in 5).

- [ ] **Step 3: Ročno lokalno (lokalni stack, klubski račun)**

```bash
npx supabase start
docker exec -i supabase_db_mnzgorenjska psql -U postgres -d postgres -c "insert into klubski_racuni (user_id, team_id) select u.id, (select t.id from teams t where t.country_id = (select id from countries where code = 'SI') order by t.id limit 1) from auth.users u order by u.created_at limit 1 on conflict do nothing returning user_id, team_id"
npm run dev:scout
```

V brskalniku `http://localhost:5174/login` se prijavi s prvim lokalnim uporabnikom (izpisan `user_id`), na `/account` sprejmi pogoje in začni preizkus, sprosti in znova zasedi sedež. Expected: stanje se osveži brez napake. Gumbov za plačilo lokalno ne preizkušaj (funkcija ni lokalno nastavljena; tok s Stripe je v nalogi 8).

- [ ] **Step 4: Commit**

```bash
git add scout/src/strani/Racun.tsx
git commit -F - <<'MSG'
feat(scout): račun kluba s preizkusom, sedeži, plačilom in portalom

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 3: Iskanje

**Files:**
- Modify: `scout/src/strani/Iskanje.tsx`

**Interfaces:**
- Consumes: RPC `scout_isci(p_skupina, p_raven, p_regije, p_min_minut, p_samo_odprti, p_od)`, tabela `federations(id, name, country_id)` (javno branje), `useSeja().klub.country_id`.
- Produces: `export function Iskanje()` (filtri v poizvedbi naslova: `skupina`, `raven`, `regije` = id-ji z vejico, `min`, `odprti=1`; povezave iz Vrzeli jih uporabijo), `export function utemeljitev(z): string`.

- [ ] **Step 1: `scout/src/strani/Iskanje.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SKUPINE, supabase, type Zadetek } from '../baza'
import { napaka, stevilo, t, type Kljuc } from '../besede'
import { Nalaganje, useSeja } from '../seja'

const RAVNI = ['vse', 'ista_ali_nizja', 'nizja'] as const
const STRAN = 25
const NAJVEC = 200 // baza vrne največ prvih 200

/** Enovrstična utemeljitev: razvrstitev in prednosti, brez negativnih oznak (spec 2). */
export function utemeljitev(z: Pick<Zadetek, 'percentil' | 'skupina' | 'minute' | 'delez_minut' | 'goli_90_pri_nas'>): string {
  const deli = [
    t('iskanje.razlog', {
      percentil: Math.round(z.percentil),
      skupina: t(`skupinaMed.${z.skupina}` as Kljuc),
      minute: z.minute,
      delez: Math.round(z.delez_minut * 100),
    }),
  ]
  if (z.goli_90_pri_nas != null && z.goli_90_pri_nas > 0) deli.push(t('iskanje.goli', { goli: stevilo(z.goli_90_pri_nas, 2) }))
  return deli.join(' · ')
}

export function Iskanje() {
  const { klub } = useSeja()
  const [q, setQ] = useSearchParams()
  const [zveze, setZveze] = useState<{ id: number; name: string }[]>([])
  const drzava = klub?.country_id
  const izbrane = (q.get('regije') ?? '').split(',').filter(Boolean).map(Number)

  useEffect(() => {
    if (!drzava) return
    void supabase
      .from('federations')
      .select('id, name')
      .eq('country_id', drzava)
      .order('name')
      .then(({ data }) => setZveze(data ?? []))
  }, [drzava])

  function isci(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const novo = new URLSearchParams()
    const skupina = String(f.get('skupina') ?? '')
    const raven = String(f.get('raven') ?? 'vse')
    const min = Number(f.get('min') ?? 0)
    const regije = f.getAll('regije').map(String)
    if (skupina) novo.set('skupina', skupina)
    if (raven !== 'vse') novo.set('raven', raven)
    if (min > 0) novo.set('min', String(min))
    if (regije.length) novo.set('regije', regije.join(','))
    if (f.get('odprti')) novo.set('odprti', '1')
    setQ(novo)
  }

  const iskanje = q.toString()
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('iskanje.naslov')}</h1>
      <form key={iskanje} onSubmit={isci} className="grid gap-4 rounded border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1">
          {t('iskanje.pozicija')}
          <select name="skupina" defaultValue={q.get('skupina') ?? ''} className="rounded border border-slate-300 px-2 py-1">
            <option value="">{t('iskanje.vse')}</option>
            {SKUPINE.map((s) => (
              <option key={s} value={s}>{t(`skupina.${s}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.raven')}
          <select name="raven" defaultValue={q.get('raven') ?? 'vse'} className="rounded border border-slate-300 px-2 py-1">
            {RAVNI.map((r) => (
              <option key={r} value={r}>{t(`iskanje.raven.${r}` as Kljuc)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          {t('iskanje.minMinut')}
          <input name="min" type="number" min={0} step={90} defaultValue={q.get('min') ?? '0'} className="rounded border border-slate-300 px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 self-end">
          <input type="checkbox" name="odprti" defaultChecked={q.get('odprti') === '1'} />
          {t('iskanje.odprti')}
        </label>
        {zveze.length > 1 && (
          <fieldset className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
            <legend className="mb-1">{t('iskanje.regije')}</legend>
            {zveze.map((z) => (
              <label key={z.id} className="flex items-center gap-1">
                <input type="checkbox" name="regije" value={z.id} defaultChecked={izbrane.includes(z.id)} />
                {z.name}
              </label>
            ))}
          </fieldset>
        )}
        <button className="justify-self-start rounded bg-slate-900 px-4 py-2 text-white sm:col-span-2 lg:col-span-4">{t('iskanje.isci')}</button>
      </form>
      <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
      <Rezultati key={iskanje} iskanje={iskanje} />
    </div>
  )
}

function Rezultati({ iskanje }: { iskanje: string }) {
  const [od, setOd] = useState(0)
  const [vrstice, setVrstice] = useState<Zadetek[]>([])
  const [stanje, setStanje] = useState<'nalaga' | 'ok' | 'konec'>('nalaga')
  const [napakaI, setNapakaI] = useState<string | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(iskanje)
    let velja = true
    setStanje('nalaga')
    void supabase
      .rpc('scout_isci', {
        p_skupina: q.get('skupina') || undefined,
        p_raven: q.get('raven') ?? 'vse',
        p_regije: (q.get('regije') ?? '').split(',').filter(Boolean).map(Number),
        p_min_minut: Number(q.get('min') ?? 0),
        p_samo_odprti: q.get('odprti') === '1',
        p_od: od,
      })
      .then(({ data, error }) => {
        if (!velja) return
        if (error) {
          setNapakaI(napaka(error))
          setStanje('konec')
          return
        }
        const nove = data ?? []
        setVrstice((prej) => (od === 0 ? nove : [...prej, ...nove]))
        setStanje(nove.length < STRAN || od + STRAN >= NAJVEC ? 'konec' : 'ok')
      })
    return () => {
      velja = false
    }
  }, [iskanje, od])

  if (napakaI) return <p className="text-red-700">{napakaI}</p>
  if (stanje !== 'nalaga' && vrstice.length === 0) return <p className="text-slate-500">{t('iskanje.prazno')}</p>
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {vrstice.map((z) => (
          <li key={z.player_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
            <Link to={`/player/${z.player_id}`} className="font-medium hover:underline">{z.ime}</Link>
            <span className="text-sm text-slate-600">{z.klub} · {z.liga}</span>
            {z.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
            <span className="w-full text-sm text-slate-700">{utemeljitev(z)}</span>
          </li>
        ))}
      </ul>
      {stanje === 'nalaga' && <Nalaganje />}
      {stanje === 'ok' && (
        <button type="button" onClick={() => setOd(od + STRAN)} className="rounded border border-slate-300 px-3 py-1 text-sm">
          {t('iskanje.vec')}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Preveri**

```bash
npm run typecheck && npm run smoke:scout 2>&1 | grep -E 'utemeljitev|izris /|NAPAK|VSE OK'
```

Expected: `PASS iskanje: utemeljitev …` in `PASS izris /`; `FAIL` le še `vrzeli: delež golov …`.

- [ ] **Step 3: Commit**

```bash
git add scout/src/strani/Iskanje.tsx
git commit -F - <<'MSG'
feat(scout): iskanje igralcev s filtri in enovrstično utemeljitvijo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

---

### Task 4: Profil igralca in podobni

**Files:**
- Modify: `scout/src/strani/Igralec.tsx`

**Interfaces:**
- Consumes: RPC `scout_igralec(p_player_id)` (`ProfilIgralca`), `scout_podobni(p_player_id)`, `scout_opazuj(p_player_id, p_opazuj)`; `utemeljitev` ni potrebna.
- Produces: `export function Igralec()` (stran `/player/:id`).

- [ ] **Step 1: `scout/src/strani/Igralec.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase, type Podoben, type ProfilIgralca, type SezonaIgralca } from '../baza'
import { napaka, stevilo, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

const st = (x: number | null | undefined, mest = 2) => (x == null ? '–' : stevilo(x, mest))
const odst = (x: number | null | undefined) => (x == null ? '–' : `${Math.round(x * 100)} %`)

const STOLPCI: [Kljuc, (s: SezonaIgralca) => string][] = [
  ['igralec.st.sezona', (s) => s.sezona],
  ['igralec.st.liga', (s) => s.liga],
  ['igralec.st.klub', (s) => s.klub],
  ['igralec.st.minute', (s) => String(s.minute)],
  ['igralec.st.delez', (s) => odst(s.delez_minut)],
  ['igralec.st.zacetki', (s) => odst(s.zacetki_delez)],
  ['igralec.st.goli', (s) => st(s.goli_ref_90)],
  ['igralec.st.goliPriNas', (s) => st(s.goli_90_pri_nas)],
  ['igralec.st.onoff', (s) => st(s.onoff_ref_90)],
  ['igralec.st.prejeti', (s) => st(s.prejeti_ref_90)],
  ['igralec.st.ciste', (s) => odst(s.ciste_delez)],
  ['igralec.st.kartoni', (s) => st(s.kartoni_90)],
]

export function Igralec() {
  const { id } = useParams()
  const pid = Number(id)
  const [profil, setProfil] = useState<ProfilIgralca | null | undefined>(undefined)
  const [podobni, setPodobni] = useState<Podoben[] | null>(null)
  const [napakaI, setNapakaI] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isInteger(pid)) return
    let velja = true
    setProfil(undefined)
    setPodobni(null)
    void supabase.rpc('scout_igralec', { p_player_id: pid }).then(({ data, error }) => {
      if (!velja) return
      if (error) setNapakaI(napaka(error))
      else setProfil((data as unknown as ProfilIgralca | null) ?? null)
    })
    return () => {
      velja = false
    }
  }, [pid])

  async function opazuj(p: ProfilIgralca) {
    const { error } = await supabase.rpc('scout_opazuj', { p_player_id: p.player_id, p_opazuj: !p.opazujem })
    if (error) setNapakaI(napaka(error))
    else setProfil({ ...p, opazujem: !p.opazujem })
  }

  async function naloziPodobne() {
    const { data, error } = await supabase.rpc('scout_podobni', { p_player_id: pid })
    if (error) setNapakaI(napaka(error))
    else setPodobni(data ?? [])
  }

  if (napakaI) return <p className="text-red-700">{napakaI}</p>
  if (profil === undefined) return <Nalaganje />
  if (profil === null) return <p>{t('igralec.ni')}</p>
  const p = profil
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">{p.ime}</h1>
        <p className="text-slate-600">{p.klub} · {p.liga} · {t(`skupina.${p.skupina}` as Kljuc)}</p>
        <p className="text-sm text-slate-700">
          {t('igralec.povzetek', { percentil: Math.round(p.percentil), skupina: t(`skupinaMed.${p.skupina}` as Kljuc), zaupanje: Math.round(p.zaupanje * 100) })}
        </p>
        <button type="button" onClick={() => void opazuj(p)} className="rounded border border-slate-300 px-3 py-1 text-sm">
          {p.opazujem ? t('igralec.neOpazuj') : t('igralec.opazuj')}
        </button>
      </header>

      {p.privolitev && (
        <section className="space-y-1 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
          <p className="font-medium text-emerald-900">{t('igralec.odprt')}</p>
          <p>{t('igralec.letnik', { letnik: p.privolitev.letnik })}</p>
          {p.privolitev.regije.length > 0 && <p>{t('igralec.regije', { regije: p.privolitev.regije.join(', ') })}</p>}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">{t('igralec.sezone')}</h2>
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left">
              <tr>{STOLPCI.map(([k]) => <th key={k} className="whitespace-nowrap px-2 py-1 font-medium">{t(k)}</th>)}</tr>
            </thead>
            <tbody>
              {(p.sezone ?? []).map((s) => (
                <tr key={`${s.sezona}-${s.liga}`} className="border-t border-slate-200">
                  {STOLPCI.map(([k, f]) => <td key={k} className="whitespace-nowrap px-2 py-1">{f(s)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">{t('iskanje.opomba')}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{t('igralec.podobni')}</h2>
        {podobni === null ? (
          <button type="button" onClick={() => void naloziPodobne()} className="rounded border border-slate-300 px-3 py-1 text-sm">
            {t('igralec.pokaziPodobne')}
          </button>
        ) : podobni.length === 0 ? (
          <p className="text-slate-500">{t('igralec.niPodobnih')}</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
            {podobni.map((o) => (
              <li key={o.player_id} className="flex flex-wrap items-baseline gap-x-3 p-3 text-sm">
                <Link to={`/player/${o.player_id}`} className="font-medium hover:underline">{o.ime}</Link>
                <span className="text-slate-600">{o.klub} · {o.liga}</span>
                <span className="text-slate-500">{t('igralec.podobnost', { p: Math.round(o.podobnost * 100) })}</span>
                {o.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

Podobni se naložijo šele na klik: vsak klic gre v dnevnik in šteje v dnevno mejo.

- [ ] **Step 2: Preveri in commit**

```bash
npm run typecheck && npm run smoke:scout 2>&1 | grep -E 'player|NAPAK|VSE OK'
git add scout/src/strani/Igralec.tsx
git commit -F - <<'MSG'
feat(scout): profil igralca s kazalniki po sezonah in podobnimi

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: `PASS izris /player/123`.

---

### Task 5: Vrzeli in opazovalni seznam

**Files:**
- Modify: `scout/src/strani/Vrzeli.tsx`, `scout/src/strani/Opazovani.tsx`

**Interfaces:**
- Consumes: RPC `scout_vrzeli()`, `scout_opazovani()`, `scout_opazuj(p_player_id, false)`; filtri naslova `/` iz naloge 3 (`skupina`, `raven`).
- Produces: `export function Vrzeli()`, `export function opisVrzeli(v): string`, `export function Opazovani()`.

- [ ] **Step 1: `scout/src/strani/Vrzeli.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Vrzel } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

/** Opis vrzeli po poziciji; o igralcu le dejstvo iz tekem, brez oznake osebe. */
export function opisVrzeli(v: Pick<Vrzel, 'vrsta' | 'skupina' | 'ime' | 'vrednost'>): string {
  const n = v.vrsta === 'odvisnost' ? Math.round(v.vrednost * 100) : Math.round(v.vrednost)
  return t(`vrzeli.${v.vrsta}` as Kljuc, {
    skupina: v.skupina ? t(`skupina.${v.skupina}` as Kljuc) : '',
    ime: v.ime ?? '',
    n,
  })
}

export function Vrzeli() {
  const [vrzeli, setVrzeli] = useState<Vrzel[] | null>(null)
  const [napakaV, setNapakaV] = useState<string | null>(null)

  useEffect(() => {
    void supabase.rpc('scout_vrzeli').then(({ data, error }) => {
      if (error) setNapakaV(napaka(error))
      else setVrzeli(data ?? [])
    })
  }, [])

  if (napakaV) return <p className="text-red-700">{napakaV}</p>
  if (!vrzeli) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('vrzeli.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('vrzeli.opis')}</p>
      {vrzeli.length === 0 ? (
        <p className="text-slate-500">{t('vrzeli.prazno')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {vrzeli.map((v, i) => (
            <li key={`${v.liga}-${v.vrsta}-${v.skupina}-${v.player_id ?? i}`} className="flex flex-wrap items-baseline justify-between gap-2 p-3">
              <span>
                {opisVrzeli(v)} <span className="text-xs text-slate-500">{v.liga}</span>
              </span>
              {v.skupina && (
                <Link to={`/?skupina=${v.skupina}&raven=ista_ali_nizja`} className="text-sm underline">{t('vrzeli.isci')}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `scout/src/strani/Opazovani.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, type Opazovan } from '../baza'
import { napaka, t, type Kljuc } from '../besede'
import { Nalaganje } from '../seja'

export function Opazovani() {
  const [seznam, setSeznam] = useState<Opazovan[] | null>(null)
  const [napakaS, setNapakaS] = useState<string | null>(null)

  useEffect(() => {
    void supabase.rpc('scout_opazovani').then(({ data, error }) => {
      if (error) setNapakaS(napaka(error))
      else setSeznam(data ?? [])
    })
  }, [])

  async function odstrani(id: number) {
    const { error } = await supabase.rpc('scout_opazuj', { p_player_id: id, p_opazuj: false })
    if (error) setNapakaS(napaka(error))
    else setSeznam((s) => (s ?? []).filter((x) => x.player_id !== id))
  }

  if (napakaS) return <p className="text-red-700">{napakaS}</p>
  if (!seznam) return <Nalaganje />
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('seznam.naslov')}</h1>
      <p className="text-sm text-slate-600">{t('seznam.opis')}</p>
      {seznam.length === 0 ? (
        <p className="text-slate-500">{t('seznam.prazno')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {seznam.map((o) => (
            <li key={o.player_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3 text-sm">
              <Link to={`/player/${o.player_id}`} className="font-medium hover:underline">{o.ime}</Link>
              <span className="text-slate-600">{o.klub} · {o.liga} · {t(`skupina.${o.skupina}` as Kljuc)}</span>
              {o.odprt_za_prestop && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{t('iskanje.odprt')}</span>}
              <button type="button" onClick={() => void odstrani(o.player_id)} className="ml-auto underline">{t('seznam.odstrani')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Preveri in commit**

```bash
npm run typecheck && npm run smoke:scout 2>&1 | tail -3
git add scout/src/strani/Vrzeli.tsx scout/src/strani/Opazovani.tsx
git commit -F - <<'MSG'
feat(scout): vrzeli v kadru s predlogi in opazovalni seznam

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: smoke `VSE OK`.

---

### Task 6: Pogoji uporabe in zasebnost

**Files:**
- Modify: `scout/src/strani/Pogoji.tsx`

**Interfaces:**
- Consumes: ključi `pogoji.*` iz `besede.ts`.
- Produces: `export function Pogoji()` (stran `/terms`, sidra `#kaj`, `#raba`, `#cene`, `#odpoved` …).

- [ ] **Step 1: `scout/src/strani/Pogoji.tsx`**

```tsx
import { t, type Kljuc } from '../besede'

// Pogoji za klube (spec 2): pred prvim plačilom morajo biti objavljeni.
const RAZDELKI = ['kaj', 'kdo', 'raba', 'meje', 'dnevnik', 'cene', 'odpoved', 'krsitev', 'zasebnost', 'ponudnik', 'pravo'] as const

export function Pogoji() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t('pogoji.naslov')}</h1>
      <p className="text-sm text-slate-500">{t('pogoji.zadnja')}</p>
      {RAZDELKI.map((r) => (
        <section key={r} id={r} className="space-y-1">
          <h2 className="font-semibold">{t(`pogoji.h.${r}` as Kljuc)}</h2>
          <p className="text-slate-700">{t(`pogoji.${r}` as Kljuc)}</p>
        </section>
      ))}
      <a href="https://slff.eu/legal#scout" className="underline">{t('pogoji.igralci')}</a>
    </article>
  )
}
```

- [ ] **Step 2: Preveri in commit**

```bash
npm run typecheck && npm run smoke:scout 2>&1 | tail -1
git add scout/src/strani/Pogoji.tsx
git commit -F - <<'MSG'
feat(scout): pogoji uporabe in zasebnost za klube (sl, en)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: `VSE OK`.

---

### Task 7: CI, Caddy, dokumentacija, PR

**Files:**
- Modify: `.github/workflows/ci.yml`, `scripts/hetzner/Caddyfile`, `docs/scout.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `npm run build:scout`, `npm run smoke:scout`, skrivnost `DEPLOY_SSH_KEY`, spremenljivke `DEPLOY_KNOWN_HOSTS`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, nova spremenljivka `SCOUT_OBJAVA`.
- Produces: posel CI `objavi-scout`; Caddy blok `scout.slff.eu` (root `/srv/slff-scout/current`).

- [ ] **Step 1: `.github/workflows/ci.yml`: korak v `preveri`**

Zamenjaj

```yaml
      - name: Izris vseh strani + pravila
        run: npm run smoke
        env:
          VITE_SUPABASE_URL: https://primer.supabase.co
          VITE_SUPABASE_ANON_KEY: sb_publishable_ci_ni_pravi_kljuc

  varnost:
```

z

```yaml
      - name: Izris vseh strani + pravila
        run: npm run smoke
        env:
          VITE_SUPABASE_URL: https://primer.supabase.co
          VITE_SUPABASE_ANON_KEY: sb_publishable_ci_ni_pravi_kljuc

      # SLFF Scout (scout/): sveženj in izris strani brez baze.
      - name: Scout
        run: npm run build:scout && npm run smoke:scout
        env:
          VITE_SUPABASE_URL: https://primer.supabase.co
          VITE_SUPABASE_ANON_KEY: sb_publishable_ci_ni_pravi_kljuc

  varnost:
```

- [ ] **Step 2: `.github/workflows/ci.yml`: posel `objavi-scout`**

Zamenjaj

```yaml
          echo "  - projekt je zaustavljen (Settings -> General)"
          exit 1
```

z

```yaml
          echo "  - projekt je zaustavljen (Settings -> General)"
          exit 1

  # SLFF Scout (scout.slff.eu): isti tok kot objavi-vm, svoja mapa
  # /srv/slff-scout. Teče šele, ko je strežnik pripravljen in lastnik nastavi
  # spremenljivko repozitorija SCOUT_OBJAVA=1 (docs/scout.md, Objava aplikacije).
  objavi-scout:
    name: Objava Scout na Hetzner VM
    needs: [preveri, varnost, migracije]
    if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch') && vars.SCOUT_OBJAVA == '1'
    runs-on: ubuntu-latest
    timeout-minutes: 15
    concurrency: objava-scout
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - run: npm ci --ignore-scripts

      - name: Build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}
        run: |
          test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY"
          npm run build:scout

      - name: Prenos in preklop
        env:
          KLJUC: ${{ secrets.DEPLOY_SSH_KEY }}
          ZNANI: ${{ vars.DEPLOY_KNOWN_HOSTS }}
        run: |
          install -m 700 -d ~/.ssh
          printf '%s\n' "$KLJUC" > ~/.ssh/id_ed25519 && chmod 600 ~/.ssh/id_ed25519
          printf '%s\n' "$ZNANI" > ~/.ssh/known_hosts
          CILJ=/srv/slff-scout/releases/$GITHUB_SHA
          rsync -a --delete dist-scout/ "deploy@2.31.6.53:$CILJ/"
          # mv -T je atomaren; obdrži zadnjih 5 izdaj. Scout je en sveženj brez
          # kosov, zato sredstev starih izdaj ne prenašamo (kot pri slff.eu).
          ssh deploy@2.31.6.53 "ln -sfn $CILJ /srv/slff-scout/current.nov && mv -Tf /srv/slff-scout/current.nov /srv/slff-scout/current \
            && cd /srv/slff-scout/releases && ls -1t | tail -n +6 | xargs -r rm -rf"

      - name: Je nova različica v zraku?
        run: |
          for i in $(seq 1 20); do
            NAJDEN=$(curl -sS -m 20 -H 'Cache-Control: no-cache' "https://scout.slff.eu/?ci=$(date +%s)" \
              | grep -o 'name="slff-commit" content="[a-f0-9]*"' | grep -o '[a-f0-9]\{40\}' || true)
            if [ "$NAJDEN" = "$GITHUB_SHA" ]; then echo "OK — scout.slff.eu streže $NAJDEN"; exit 0; fi
            echo "  poskus $i/20: v zraku je ${NAJDEN:-<brez znamke>}"
            sleep 15
          done
          echo "NAPAKA: scout.slff.eu po 5 minutah ne streže $GITHUB_SHA (Caddy blok, DNS, /srv/slff-scout?)."
          exit 1
```

- [ ] **Step 3: `scripts/hetzner/Caddyfile`: blok `scout.slff.eu`**

Zamenjaj

```
# www is the same site twice for search engines: one address, a permanent redirect.
```

z

```
# SLFF Scout (docs/scout.md): SPA that CI rsyncs to /srv/slff-scout/releases/<sha> and
# switches `current`. Proxied A record `scout` in Cloudflare; the origin cert must cover
# it (*.slff.eu). The API stays at api.slff.eu (cross-origin, like the mobile app).
# Only the landing page and the terms may be indexed.
scout.slff.eu {
	import origin_tls
	root * /srv/slff-scout/current
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Frame-Options DENY
		Content-Security-Policy "frame-ancestors 'none'"
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
		?Cache-Control "no-cache"
	}
	header -Server
	header /assets/* Cache-Control "public, max-age=31536000, immutable"
	@zasebne not path / /terms
	header @zasebne X-Robots-Tag "noindex"
	try_files {path} /index.html
	file_server
}

# www is the same site twice for search engines: one address, a permanent redirect.
```

- [ ] **Step 4: Dokumentacija**

`docs/scout.md`: za razdelkom `## Klubi (faza 3)` (pred `## Spomin`) vstavi:

````markdown
## Aplikacija scout.slff.eu (faza 3b)

Vite + React + TypeScript v `scout/` (`scout/src/`, `scout/vite.config.js`,
lasten Tailwind), sveženj `dist-scout/`. Ukazi: `npm run dev:scout` (5174,
lokalni stack), `npm run build:scout`, `npm run smoke:scout`. Isti računi kot
slff.eu, seja je svoja (`storageKey` `slff-scout-seja`). Registracija,
ponastavitev gesla in prošnja za klubski račun ostanejo na slff.eu; ob vsaki
prijavi aplikacija pokliče `uveljavi_klubski_racun`. Bere le RPC `scout_*` in
`federations` (regije države kluba). Nizi v `scout/src/besede.ts` (sl, en),
ne v `src/i18n`. Poti: `/`, `/player/:id`, `/gaps`, `/watchlist`,
`/account`, `/login`, `/terms`.

### Objava aplikacije

CI (`objavi-scout`) zgradi in prenese `dist-scout/` v
`/srv/slff-scout/releases/<sha>` in premakne `current`, a le ob
`SCOUT_OBJAVA=1`. Ročno (enkrat ali ob spremembi): DNS `scout` (Cloudflare,
proxied), mapa `/srv/slff-scout/releases` (lastnik `deploy`), Caddy blok
`scout.slff.eu` (Caddyfile ni v CI), `https://scout.slff.eu/**` v
`ADDITIONAL_REDIRECT_URLS` (`/opt/supabase/.env`, za prijavo z Googlom) in
funkciji `scout-placilo`, `stripe-webhook` (`scripts/hetzner/objavi-funkcije.sh`).
Katalog Stripe: izdelek "SLFF Scout" (metadata `app=slff-scout`), ceni z
`lookup_key` `slff_scout_klub_mesec` (3900, mesečno) in
`slff_scout_klub_sezona` (29000, letno), `tax_behavior=exclusive`; obstoječi
webhook in portal zadoščata. Koraki: načrt 3b, naloga 8.
````

`CLAUDE.md`: pred vrstico `## Poti` (za razdelkom `## SLFF Scout (stroj)`) vstavi:

```markdown
## SLFF Scout (klubi, scout.slff.eu)

Plačljivo orodje za klube; stroj, tabele, dostop, plačila in objava so v
`docs/scout.md`. Vmesnik je ločena Vite aplikacija v `scout/`
(`npm run dev:scout`, `build:scout` → `dist-scout/`, `smoke:scout`), ista baza
in računi, seja svoja. Bere **le** RPC `scout_*` (nikoli sheme `scout`) in le
zadnji **objavljeni** model; vsaka nova funkcija Scouta gre skozi
`scout.dostop` (sedež, naročnina, država, meja, dnevnik) in `scout.vidni` ter
dobi test v `supabase/tests/varnost.sql`. Nizi so v `scout/src/besede.ts`
(sl, en), besedišče "kazalniki iz podatkov tekem", brez negativnih oznak. CI
ga objavi ob `SCOUT_OBJAVA=1`; Caddy blok, funkcije in katalog Stripe so
ročni.

```

- [ ] **Step 5: Preveri vse in commit**

```bash
npm run typecheck && npm run build && npm run smoke 2>&1 | tail -1
npm run build:scout && npm run smoke:scout 2>&1 | tail -1
npx --yes js-yaml@4.1.0 .github/workflows/ci.yml > /dev/null && echo YAML OK
git add .github/workflows/ci.yml scripts/hetzner/Caddyfile docs/scout.md CLAUDE.md
git commit -F - <<'MSG'
ci(scout): build, smoke in objava scout.slff.eu; Caddy blok in dokumentacija

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
MSG
```

Expected: oba smoka `VSE OK`; `YAML OK`.

- [ ] **Step 6: PR**

```bash
git push -u origin feat/scout-faza3b-aplikacija
gh pr create --title "feat: SLFF Scout faza 3b — aplikacija scout.slff.eu" --body-file - <<'MSG'
Faza 3b SLFF Scout (načrt `docs/superpowers/plans/2026-10-16-scout-faza3b-aplikacija.md`).

- `scout/`: prijava, račun kluba (preizkus, sedeži, plačilo, portal), iskanje, profil s podobnimi, vrzeli, opazovalni seznam, pogoji; sl in en
- CI: korak `Scout` (build + smoke) in posel `objavi-scout` (le ob `SCOUT_OBJAVA=1`)
- Caddy blok `scout.slff.eu` (ročna objava po združitvi, naloga 8)

Po združitvi: naloga 8 (strežnik, funkcije, Stripe testni način, obvezen ročni preizkus). Živi ključi niso del PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
```

Počakaj na neodvisen pregled in zelen CI (`objavi-scout` je preskočen, dokler `SCOUT_OBJAVA` ni `1`).

---

### Task 8: Objava in obvezen ročni preizkus v testnem načinu Stripe

**Files:** brez (operativni koraki po združitvi; lastnik pri korakih, označenih *lastnik*).

**Interfaces:**
- Consumes: združena 3a in 3b, `ssh slff`, Cloudflare, `stripe -p slff` (testni način), `gh`.
- Produces: `https://scout.slff.eu` v zraku, funkciji objavljeni, katalog Stripe (test), zapisnik ročnega preizkusa.

- [ ] **Step 1: DNS (Claude prek lastnikovega brskalnika, po izrecni potrditvi) in certifikat**

Zapis doda Claude (kontroler) v lastnikovem prijavljenem brskalniku (Claude in Chrome, `mcp__claude-in-chrome__*`), ne prek API ključa:

1. Odpri `https://dash.cloudflare.com` → domena `slff.eu` → DNS → Records in preberi zapis za ime `slff.eu` (vrsta in vsebina, pričakovano `A` → `2.31.6.53`, Proxied).
2. Lastniku pokaži točen zapis, ki ga boš dodal: ime `scout`, ista vrsta in vsebina kot `slff.eu`, Proxy status **Proxied**, TTL Auto. **Počakaj na lastnikovo izrecno potrditev v pogovoru**; brez nje ne klikaj Save.
3. Po potrditvi Add record → vpiši zgornje → Save; preveri, da je zapis na seznamu oranžen (Proxied).

```bash
dig +short scout.slff.eu
```

Expected: naslova Cloudflare (ne `2.31.6.53`, ker je zapis proxied). Nato preveri, da origin certifikat pokrije poddomeno:

```bash
ssh slff 'openssl x509 -in /etc/caddy/certs/slff-origin.pem -noout -ext subjectAltName'
```

Expected: `DNS:*.slff.eu` (ali izrecno `scout.slff.eu`). Sicer v Cloudflare izdaj nov origin certifikat za `slff.eu, *.slff.eu` in ga zamenjaj, preden nadaljuješ.

- [ ] **Step 2: Mapa za izdaje**

```bash
ssh slff 'install -d -o deploy -g deploy /srv/slff-scout /srv/slff-scout/releases && ls -ld /srv/slff-scout/releases'
```

Expected: lastnik `deploy`.

- [ ] **Step 3: Caddy (ročno, CI ga ne objavi)**

```bash
cd /Users/lukazlatecan/Work/SLFF/mnzgorenjska
git switch main && git pull --ff-only
ssh slff 'cat /etc/caddy/Caddyfile' | diff - scripts/hetzner/Caddyfile
scp scripts/hetzner/Caddyfile slff:/tmp/Caddyfile
ssh slff 'set -o pipefail; caddy validate --config /tmp/Caddyfile --adapter caddyfile && cp /etc/caddy/Caddyfile /opt/slff/backup-konfig/Caddyfile.$(date +%Y%m%d-%H%M%S) && cp /tmp/Caddyfile /etc/caddy/Caddyfile && systemctl reload caddy'
```

Expected: `diff` pokaže le blok `scout.slff.eu` (če pokaže še kaj, je strežnik razlikovan od repozitorija: uskladi najprej); `Valid configuration`.

- [ ] **Step 4: Prijava z Googlom na scout.slff.eu**

```bash
ssh slff "cd /opt/supabase && cp .env .env.bak-scout && grep '^ADDITIONAL_REDIRECT_URLS=' .env"
ssh slff "cd /opt/supabase && sed -i 's#^ADDITIONAL_REDIRECT_URLS=\(.*\)\$#ADDITIONAL_REDIRECT_URLS=\1,https://scout.slff.eu/**#' .env && grep '^ADDITIONAL_REDIRECT_URLS=' .env && docker compose -f docker-compose.yml -f docker-compose.slff.yml up -d auth"
```

Expected: druga vrstica je prva + `,https://scout.slff.eu/**`; `auth` se znova zažene.

- [ ] **Step 5: Vklop objave v CI**

```bash
gh variable set SCOUT_OBJAVA --body 1
gh workflow run ci.yml --ref main
sleep 5
gh run watch "$(gh run list --workflow ci.yml --branch main --limit 1 --json databaseId -q '.[0].databaseId')"
curl -sI https://scout.slff.eu/ | grep -iE '^HTTP|x-robots'
curl -sI https://scout.slff.eu/watchlist | grep -iE '^HTTP|x-robots'
```

Expected: posel `Objava Scout na Hetzner VM` zelen ("OK — scout.slff.eu streže …"); `/` 200 brez `x-robots-tag`, `/watchlist` 200 z `x-robots-tag: noindex`.

- [ ] **Step 6: Funkciji**

```bash
bash scripts/hetzner/objavi-funkcije.sh stripe-webhook
bash scripts/hetzner/objavi-funkcije.sh scout-placilo
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.slff.eu/functions/v1/stripe-webhook -H 'Stripe-Signature: t=1,v1=x' -d '{}'
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.slff.eu/functions/v1/scout-placilo -d '{}'
```

Expected: obe objavi `OPTIONS → 200`; webhook `400` (podpis, ne 401); `scout-placilo` brez JWT `401`.

- [ ] **Step 7: Katalog Stripe (testni način)**

```bash
stripe -p slff prices list --lookup-keys slff_scout_klub_mesec --lookup-keys slff_scout_klub_sezona
IZDELEK=$(stripe -p slff products create --name="SLFF Scout" -d "metadata[app]=slff-scout" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
stripe -p slff prices create -d product="$IZDELEK" -d currency=eur -d unit_amount=3900 -d "recurring[interval]=month" -d lookup_key=slff_scout_klub_mesec -d tax_behavior=exclusive
stripe -p slff prices create -d product="$IZDELEK" -d currency=eur -d unit_amount=29000 -d "recurring[interval]=year" -d lookup_key=slff_scout_klub_sezona -d tax_behavior=exclusive
stripe -p slff prices list --lookup-keys slff_scout_klub_mesec --lookup-keys slff_scout_klub_sezona | grep -E '"lookup_key"|"unit_amount"|"livemode"'
```

Expected: prvi `list` prazen (če ni, izdelka ne ustvarjaj znova); na koncu dve ceni, `"livemode": false`, `"interval": "year"` pri sezoni. Webhook endpoint `https://api.slff.eu/functions/v1/stripe-webhook` že obstaja za preverjene igralce; dogodki so isti.

Portal Scouta (lastna konfiguracija, da kupec ne more preklopiti na drugo ceno ali izdelek; privzete konfiguracije na produkciji ni treba preverjati). Ustvari se ročno enkrat na način, kot katalog, ker je enkratna nastavitev računa; funkcija jo le poišče po metapodatku:

```bash
stripe -p slff get /v1/billing_portal/configurations -d active=true -d limit=100 | grep -c '"app": "slff-scout"'
stripe -p slff post /v1/billing_portal/configurations \
  -d "metadata[app]=slff-scout" \
  -d "business_profile[headline]=SLFF Scout" \
  -d "features[subscription_cancel][enabled]=true" \
  -d "features[subscription_cancel][mode]=at_period_end" \
  -d "features[subscription_update][enabled]=false" \
  -d "features[payment_method_update][enabled]=true" \
  -d "features[invoice_history][enabled]=true" \
  -d "features[customer_update][enabled]=true" \
  -d "features[customer_update][allowed_updates][]=address" \
  -d "features[customer_update][allowed_updates][]=tax_id"
stripe -p slff get /v1/billing_portal/configurations -d active=true -d limit=100 | grep -c '"app": "slff-scout"'
```

Expected: prvi `grep` `0` (sicer ne ustvarjaj znova), zadnji `1`.

DDV: Stripe Tax mora biti vklopljen, sicer Checkout z `automatic_tax` zavrne sejo (pri preverjenih igralcih je že v rabi):

```bash
stripe -p slff get /v1/tax/settings | grep -E '"status"|"country"'
```

Expected: `"status": "active"` in `"country": "SI"`. Če ni `active`, ustavi se: lastnik v Stripe (Settings → Tax) vklopi Stripe Tax z izvorom SI (registracija SI, za EU OSS); brez tega Scout ne zaračuna DDV in plačila ni.

- [ ] **Step 8: Obvezen ročni preizkus (testni ključi; pred živimi ključi ga ni mogoče preskočiti)**

Predpogoj: na produkciji je objavljen model (sicer klub ne vidi nikogar):

```bash
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(*), max(ustvarjen_at) from scout.modeli where objavljen"'
```

Expected: število ≥ 1. Če je 0 (backtest `padel`), se ustavi in javi lastniku: Scout brez objavljenega modela nima vsebine (`docs/scout.md`, *Backtest*).

Testni klub za lastnikov račun (e-naslov se vpiše ob zagonu, ne v git ali zgodovino ukazov):

```bash
printf 'E-naslov tvojega računa na slff.eu: '; read -r SCOUT_TEST_EMAIL
ssh slff "docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -v email='$SCOUT_TEST_EMAIL'" <<'SQL'
insert into teams (name, short_name, country_id)
values ('SLFF Scout preizkus', 'SSP', (select id from countries where code = 'SI')) returning id as klub \gset
insert into klubski_racuni (user_id, team_id) select id, :klub from auth.users where email = :'email';
select :klub as testni_klub, (select count(*) from klubski_racuni where team_id = :klub) as racunov;
SQL
```

Expected: `racunov = 1`. Nato v brskalniku na `https://scout.slff.eu` odkljukaj vsak korak:

1. `/login` z e-pošto in geslom → `/account` pokaže "SLFF Scout preizkus" in ponudbo preizkusa; odjava, nato prijava z Googlom vrne na `/account`.
2. Brez kljukice pogojev je gumb onemogočen; s kljukico → "Preizkus, velja do …" (14 dni), sedež "(ti)", v glavi Iskanje, Vrzeli, Opazovani.
3. Iskanje brez filtrov vrne slovenske igralce z utemeljitvijo; filter Napadalci + Samo odprti za prestop vrne le odprte (ali "Za te pogoje ni igralcev."); "Naslednjih 25" doda vrstice.
4. Profil: tabela sezon, "Pokaži podobne" vrne seznam; "Dodaj na seznam" → `/watchlist` ga pokaže; "Odstrani" ga odstrani.
5. `/gaps` se odpre brez napake ("Izrazitih vrzeli ni." je pričakovano: testni klub nima tekem).
6. Jezik EN: vsi nizi angleški, številke `0.41`, datumi `17 October 2026`.
7. "39 € na mesec" → Stripe Checkout (testni način): cena 39,00 € + vrstica DDV (22 % za naslov v Sloveniji brez davčne številke), polje za davčno številko → kartica `4242 4242 4242 4242`, poljuben datum in CVC → vrnitev na `/account?placilo=uspeh` → v 15 s "Paket Klub, velja do …" (mesec + 3 dni), gumbov za plačilo ni več.
8. "Upravljaj ali odpovej naročnino" odpre portal z naslovom "SLFF Scout" in **brez** menjave paketa; "Cancel subscription" → vrnitev; dostop ostane do konca obdobja.
9. V nadzorni plošči Stripe (test) naročnino prekliči takoj ("Cancel immediately") → po nekaj sekundah (webhook) **osveži stran**: `/` preusmeri na `/account` z "Dostop je potekel." (aplikacija stanja kluba ne bere sama v ozadju); gumb "Upravljaj ali odpovej naročnino" ostane.
10. Kartica `4000 0000 0000 0002` (zavrnjena) na "290 € na sezono" → Checkout javi zavrnitev, naročnina se ne spremeni.

Preveri bazo in dnevnik webhooka:

```bash
ssh slff "docker exec -i supabase-db psql -U supabase_admin -d postgres -X" <<'SQL'
select n.paket, n.obdobje, n.velja_do <= now() as konec, n.stripe_subscription_id is not null as stripe
  from scout.narocnine n join teams t on t.id = n.team_id where t.name = 'SLFF Scout preizkus';
select vrsta, count(*), bool_or(parametri ? 'igralci') as igralci from scout.dnevnik d join teams t on t.id = d.team_id
 where t.name = 'SLFF Scout preizkus' group by vrsta order by vrsta;
select tip, obdelano_at is not null as obdelano from stripe_dogodki order by created_at desc limit 8;
SQL
ssh slff 'docker logs --since 1h supabase-edge-functions 2>&1 | grep -E "stripe-webhook|scout-placilo" | tail -10'
```

Expected: `klub | mesec | t | t`; dnevnik ima `igralec`, `isci`, `opazovani`, `opazuj`, `podobni`, `vrzeli`, vrstice `isci` imajo `parametri.igralci`; zadnji dogodki obdelani; v dnevniku funkcij `checkout.session.completed … → aktivna` in `customer.subscription.deleted … → koncano`, brez napak. Če kateri korak pade: popravek kot nov PR, nato ta korak znova.

Počisti testni klub (Stripe testni kupci ostanejo v testnem načinu):

```bash
ssh slff "docker exec -i supabase-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1" <<'SQL'
select id as klub from teams where name = 'SLFF Scout preizkus' \gset
delete from scout.dnevnik where team_id = :klub;
delete from scout.narocnine where team_id = :klub;
delete from klubski_racuni where team_id = :klub;
delete from teams where id = :klub;
SQL
```

- [ ] **Step 9: Živi način (ni del tega načrta)**

Preklop `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` na žive ključe velja hkrati za preverjene igralce in Scout, zato ga sproži le lastnik, ko: (a) je Step 8 v celoti uspel, (b) so odprte točke preverjenih igralcev zaprte (`docs/podatkovni-model.md`, *Pred vklopom v živo*), (c) je lastnik potrdil besedilo pogojev, (d) je Stripe Tax v živem načinu aktiven (SI, OSS). Ob preklopu se v živem načinu ustvari isti katalog in ista konfiguracija portala (Step 7 z `--live`).

- [ ] **Step 10: Merilo faze**

Ko je pet poskusnih klubov začelo preizkus, enkrat na teden:

```bash
ssh slff 'docker exec supabase-db psql -U supabase_admin -d postgres -Atc "select count(distinct team_id) from scout.dnevnik where created_at > now() - interval '"'"'7 days'"'"'"'
```

Pogoj za fazo 4 (spec 5): vrednost ≥ 5.

---

## Spec coverage

| spec | naloga / odločitev |
|---|---|
| 4: vmesnik Vite + React + TS v `scout/`, deli `src/lib`, lasten oblikovni sistem | 1 (deli tipe baze; Tailwind svoj, trezen slate videz brez maskote) |
| 1: slovenščina in angleščina | 1 (`besede.ts`, typecheck in smoke za popolnost) |
| 4: Caddy streže `scout.slff.eu`, CI zgradi in objavi ob obstoječi strani | 7, 8 |
| 5 faza 3: prijava | 1 (isti računi; registracija in klubski račun ostaneta na slff.eu) |
| 5 faza 3: iskanje, profil, vrzeli, podobni, opazovalni seznam | 3, 4, 5 |
| 5 faza 3: Stripe | 2 (Checkout, portal), 8 (katalog, ročni preizkus); zaledje 3a |
| 5 faza 3: dnevnik, meje | 3a; pogoji jih razložijo (6), napaka `scout-meja` (1) |
| 2: pogoji za klube pred prvim plačilom | 6, kljukica ob preizkusu (2) |
| 2: besedišče, brez negativnih oznak | 1 (smoke), 3 (`utemeljitev`), 5 (`opisVrzeli`) |
| 5 preizkusi: typecheck, smoke izris vseh strani | 1–7 |
| 5 preizkusi: Playwright od preizkusa do seznama proti Stripe v testnem načinu | **namesto skripte obvezen ročni preizkus (8)**: tok gre čez Stripe Checkout (tuja stran) in potrebuje objavljen model in klubski račun; avtomatizacija sodi v pilot (faza 4), ko je tok ustaljen |
| 5 merilo: 5 poskusnih klubov tedensko | 8 (Step 10) |
| odprta točka: ali `authenticated` bere `federations` | da (privzete pravice `20260828100000`, politika "zveze so javne"); test v 3a nalogi 2 |
| odprta točka: ali privzeti portal na produkciji dovoli menjavo paketa | ni pomembno: Scout uporablja lastno konfiguracijo portala (8, Step 7) |
| lastnik: cene brez DDV, DDV prek Stripe Tax | 3a (`tax_behavior=exclusive`, `automatic_tax`), 6 (pogoji), 8 (Step 7 preveri Stripe Tax) |
| sporočila, tedensko poročilo, vaba, Pro, PDF, primerjava, CSV | **ni v fazi 3** (glej *Spec coverage* v načrtu 3a) |
