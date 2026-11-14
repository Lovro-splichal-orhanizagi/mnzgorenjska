// Slike trgovine z motivom na nosilcu: naslovne fotografije za /personalised
// (hero-<scena>.webp) in kataloški sliki nosilcev (katalog-<nosilec>.webp).
// Motiv je pravi: isti risar kot v trgovini (shop/src/risba.ts) in izmišljen
// primer iz semena v migraciji. Nalepi ga na cono hrbta s perspektivo
// (4 koti) in senčenjem fotografije (svetlost × tisk), kot mockup v trgovini.
//
// Uporaba (potrebuje rsvg-convert in magick):
//   npx vite-node scripts/trgovina-hero.mjs                 # vse slike (slovensko)
//   npx vite-node scripts/trgovina-hero.mjs igrisce         # le ena
//   npx vite-node scripts/trgovina-hero.mjs --jezik de      # v jeziku (de, hr … ali vsi)
//   npx vite-node scripts/trgovina-hero.mjs --pregled x.jpg # še kontaktni list
//
// Jeziki: napisi motiva so v jeziku (motivi/napisi.ts), primer je domač
// (prevodi.<jezik>.primeri iz migracije 20261031150100_trgovina_jeziki). Slovenska
// slika je hero-<scena>.webp (2000 px in -1000), druge hero-<scena>-<jezik>.webp
// (le 1000 px); Katalog in vitrina vzameta sliko jezika, brez nje angleško.
//
// vite-node zato, ker predloge motivov pridejo kot `?raw` uvozi.
// Izvirne fotografije scen (prazen nosilec, brez napisov) so v
// scripts/trgovina-hero/; rezultat gre v shop/nosilci/ (build ga prepiše v
// dist-shop/nosilci/). Koti so v px izvirne fotografije: TL, TR, BR, BL.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { narisiMotiv } from '../shop/src/risba.ts'
import { JEZIKI } from '../shop/src/jezik.ts'

const R = new URL('..', import.meta.url).pathname
const IZHOD = join(R, 'shop/nosilci')

// Pisava: pango na macOS sicer bere CoreText in Antona iz repozitorija ne vidi
// (tiho pade na Impact in širine se ne ujemajo). Zato fontconfig z mapo motivov.
const tmp = mkdtempSync(join(tmpdir(), 'slff-hero-'))
writeFileSync(join(tmp, 'fonts.conf'), `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><include ignore_missing="yes">/opt/homebrew/etc/fonts/fonts.conf</include><include ignore_missing="yes">/etc/fonts/fonts.conf</include>
<dir>${join(R, 'shop/src/motivi')}</dir><cachedir>${join(tmp, 'cache')}</cachedir></fontconfig>`)
const env = { ...process.env, PANGOCAIRO_BACKEND: 'fc', FONTCONFIG_FILE: join(tmp, 'fonts.conf') }
const magick = (...a) => execFileSync('magick', a.flat(), { env })

// Seme motivov iz migracije (isti vzorec kot shop/smoke.tsx): sheme in primeri.
const sql = readFileSync(join(R, 'supabase/migrations/20261019080000_trgovina_motivi.sql'), 'utf8')
const seme = Object.fromEntries([...sql.slice(sql.indexOf('insert into trgovina.motivi (slug'))
  .matchAll(/^\('([a-z0-9-]+)',[\s\S]*?\n '[a-z]+',\n '\[[\s\S]*?\]',\n '(\[[\s\S]*?\])',\n '(\[[\s\S]*?\])',/gm)]
  .map((m) => [m[1], { sheme: JSON.parse(m[2]), primeri: JSON.parse(m[3]) }]))
// Primeri drugih jezikov: prevodi motiva v migraciji jezikov.
const sqlJ = readFileSync(join(R, 'supabase/migrations/20261031150100_trgovina_jeziki.sql'), 'utf8')
const prevodi = Object.fromEntries([...sqlJ.matchAll(/^update trgovina\.motivi set prevodi = \$p\$(.*?)\$p\$::jsonb,[\s\S]*?where slug = '([a-z0-9-]+)';/gm)]
  .map((m) => [m[2], JSON.parse(m[1])]))
const primeriJezika = (slug, jezik) => (jezik === 'sl' ? seme[slug].primeri : prevodi[slug]?.[jezik]?.primeri)

/**
 * Scene. `primer`: [motiv, polja izmišljenega primera iz semena, shema].
 * `ton`: barva, s katero se tisk pomnoži (svetloba scene; bel tisk v zatemnjeni
 * gostilni ni bel kot v studiu). `mehko`: zameglitev tiska v px izhoda.
 */
const SCENE = [
  {
    ime: 'hero-igrisce', vir: 'scripts/trgovina-hero/igrisce.jpg', sirina: 2000,
    koti: [[600, 185], [915, 185], [915, 605], [600, 605]],
    primer: ['retro-dres', 0, 'klasika'], ton: '#e4e6e2', mehko: 0.7,
  },
  {
    ime: 'hero-gostilna', vir: 'scripts/trgovina-hero/gostilna.jpg', sirina: 2000,
    koti: [[603, 310], [937, 310], [996, 775], [636, 775]],
    primer: ['hangover-xi', 2, 'nocna'], ton: '#e8c9a0', mehko: 0.7,
  },
  {
    ime: 'hero-slacilnica', vir: 'scripts/trgovina-hero/slacilnica.jpg', sirina: 2000,
    koti: [[668, 220], [900, 220], [900, 530], [668, 530]],
    primer: ['kapetan', 0, 'kapetanska'], ton: '#e9e3d8', mehko: 0.6,
  },
  // Kataloški sliki nosilcev: koti = trgovina.cone (hrbet) iz migracije.
  {
    ime: 'katalog-majica', vir: 'shop/nosilci/majica-crna-hrbet.webp', sirina: 1200,
    koti: [[530, 330], [1070, 330], [1070, 1050], [530, 1050]],
    primer: ['retro-dres', 1, 'retro'], ton: '#ffffff', mehko: 0.5,
  },
  {
    ime: 'katalog-pulover', vir: 'shop/nosilci/pulover-crn-hrbet.webp', sirina: 1200,
    koti: [[593, 470], [1013, 470], [1013, 1030], [593, 1030]],
    primer: ['kralj-kafane', 2, 'nocna'], ton: '#ffffff', mehko: 0.5,
  },
]

function izdelaj(s0, jezik) {
  // Druge jezike rišemo le v 1000 px (brez srcset): slik je 19-krat toliko.
  const s = jezik === 'sl' ? s0 : { ...s0, ime: `${s0.ime}-${jezik}`, sirina: Math.min(s0.sirina, 1000) }
  const [slug, i, shema] = s.primer
  const m = seme[slug]
  if (!m) throw new Error(`motiva ${slug} ni v semenu`)
  const primeri = primeriJezika(slug, jezik)
  if (!primeri?.[i]) throw new Error(`motiv ${slug} nima primera ${i} v jeziku ${jezik}`)
  const barve = m.sheme.find((x) => x.kljuc === shema).barve
  const vir = join(R, s.vir)
  const [sw] = magick(vir, '-format', '%w', 'info:').toString().split(' ').map(Number)
  const f = s.sirina / sw
  const k = s.koti.map(([x, y]) => [x * f, y * f])
  const [tl, tr, br, bl] = k
  // Tisk 2× večji od cone, da je po perspektivi še oster.
  const W = Math.round(2 * Math.max(tr[0] - tl[0], br[0] - bl[0])), H = Math.round(2 * Math.max(bl[1] - tl[1], br[1] - tr[1]))
  const p = (n) => join(tmp, `${s.ime}-${n}`)
  writeFileSync(p('m.svg'), narisiMotiv(slug, primeri[i].polja, barve, 'hrbet', { sirina: 300, visina: 400 }, { jezik }))
  execFileSync('rsvg-convert', ['-w', String(W), '-h', String(H), '-o', p('m.png'), p('m.svg')], { env })
  magick(vir, '-filter', 'Lanczos', '-resize', `${s.sirina}x`, p('o.png'))
  const [ow, oh] = magick(p('o.png'), '-format', '%w %h', 'info:').toString().split(' ').map(Number)
  const tocke = [[0, 0, tl], [W, 0, tr], [W, H, br], [0, H, bl]].map(([x, y, c]) => `${x},${y} ${c[0]},${c[1]}`).join('  ')
  magick('-size', `${ow}x${oh}`, 'xc:none', '(', p('m.png'), '-virtual-pixel', 'transparent', '+distort', 'Perspective', tocke, ')',
    '-background', 'none', '-layers', 'flatten', '-modulate', '100,90', '-channel', 'RGBA', '-blur', `0x${s.mehko}`, '+channel', p('t.png'))
  // Tisk DTF na blagu je malo manj nasičen kot zaslon (-modulate zgoraj).
  // Senčenje: svetlost fotografije / povprečje cone, mehčano (0.45 + 0.55·x),
  // največ 1 (gube in senca potemnijo tisk, nič ga ne posvetli), krat ton scene.
  const x0 = Math.round(Math.min(tl[0], bl[0])), y0 = Math.round(Math.min(tl[1], tr[1]))
  const cw = Math.round(Math.max(tr[0], br[0])) - x0, ch = Math.round(Math.max(bl[1], br[1])) - y0
  const povp = Number(magick(p('o.png'), '-colorspace', 'gray', '-crop', `${cw}x${ch}+${x0}+${y0}`, '-format', '%[fx:mean]', 'info:').toString())
  magick(p('o.png'), '-colorspace', 'gray', '-evaluate', 'Multiply', String(1 / povp), '+level', '45%,100%', '-colorspace', 'sRGB',
    '(', '+clone', '-fill', s.ton, '-colorize', '100', ')', '-compose', 'Multiply', '-composite', p('s.png'))
  magick(p('t.png'), p('s.png'), '-compose', 'Multiply', '-composite', '(', p('t.png'), '-alpha', 'extract', ')', '-compose', 'CopyOpacity', '-composite', p('ts.png'))
  const izhod = join(IZHOD, `${s.ime}.webp`)
  magick(p('o.png'), p('ts.png'), '-compose', 'Over', '-composite', '-quality', jezik === 'sl' ? '82' : '74', '-define', 'webp:method=6', izhod)
  // Manjša različica za telefone (srcset).
  if (s.sirina > 1200) magick(izhod, '-resize', '1000x', '-quality', jezik === 'sl' ? '80' : '72', '-define', 'webp:method=6', join(IZHOD, `${s.ime}-1000.webp`))
  return izhod
}

const args = process.argv.slice(2)
const pi = args.indexOf('--pregled')
const pregled = pi >= 0 ? args.splice(pi, 2)[1] : null
const ji = args.indexOf('--jezik')
const jezik = ji >= 0 ? args.splice(ji, 2)[1] : 'sl'
const jeziki = jezik === 'vsi' ? JEZIKI.filter((j) => j !== 'sl') : [jezik]
if (!jeziki.every((j) => JEZIKI.includes(j))) throw new Error(`neznan jezik ${jezik}`)
const izbrane = SCENE.filter((s) => !args.length || args.some((a) => s.ime.includes(a)))
try {
  const slike = jeziki.flatMap((j) => izbrane.map((s) => { const f = izdelaj(s, j); console.log('ok', f); return f }))
  if (pregled) magick(...slike.map((f) => ['(', f, '-resize', 'x600', ')']), '+append', '-quality', '85', pregled)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
