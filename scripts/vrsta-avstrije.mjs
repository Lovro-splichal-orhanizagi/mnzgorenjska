// Vrsta uvozov avstrijskih lig: ena liga za drugo, brez človeka.
//
// Teče vsakih 15 minut (delovni tok *Uvoz Avstrije (vrsta)*) in si med
// zagoni ne zapomni ničesar: stanje razbere vsakič znova iz zgodovine zagonov
// `uvoz-lige.yml` (naslov "Uvoz lige <slug>") in iz baze (`competitions.active`).
// Šteje vsak zagon, tudi ročnega ali z drugega računalnika.
//
// Na vsak tik:
//   1. če kak uvoz `at-` lige še teče ali čaka, ne zažene novega;
//   2. sicer zažene PRVO nevklopljeno ligo iz scripts/avstrija-vrsta.txt, ki še
//      nima zagona ali ji je padel le enkrat (ponovitev); po dveh padcih jo
//      preskoči in to enkrat javi na Discord;
//   3. ligo, katere zadnji uvoz je uspel od prejšnjega tika, vklopi
//      (`vklopi_ligo_sredi_sezone`) in zažene hišne ekipe in grbe; zavrnjen
//      vklop javi enkrat in ga ne ponavlja — odloči človek.
// Ko je vsaka liga vklopljena ali preskočena: "Avstrija končana".
//
//   node scripts/vrsta-avstrije.mjs --suho   # samo izpiše, kaj bi naredil
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const NASLOV = /^Uvoz lige (at-\S+)$/

export function preberiVrsto(besedilo) {
  return besedilo
    .split('\n')
    .map((v) => v.trim())
    .filter((v) => v && !v.startsWith('#'))
    .map((v) => {
      const [slug, arhiv = ''] = v.split(/\s+/)
      return { slug, arhiv }
    })
}

// Čista odločitev tika. `zagoni`: [{ slug, status, conclusion, createdAt, updatedAt }],
// `lige`: Map slug → active, `od`: ISO čas prejšnjega tika (kar je končano
// pozneje, je novo in se vklopi ali javi enkrat).
export function odloci({ vrsta, zagoni, lige, od }) {
  const tece = zagoni.some((z) => z.status !== 'completed')
  const izid = { tece, zazeni: null, vklopi: [], novi: [], javi: [], log: [], koncano: false }
  let odprtih = 0
  for (const liga of vrsta) {
    const aktivna = lige.get(liga.slug)
    if (aktivna === undefined) {
      izid.log.push(`${liga.slug}: ni v bazi, preskočim`)
      continue
    }
    if (aktivna) continue
    const moji = zagoni.filter((z) => z.slug === liga.slug).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    if (moji.some((z) => z.status !== 'completed')) {
      odprtih++
      continue
    }
    const zadnji = moji[0]
    // Vsak neuspeh šteje, tudi preklican ali prekinjen zagon.
    const padli = moji.filter((z) => z.conclusion !== 'success').length
    if (zadnji?.conclusion === 'success') {
      // Vklop poskusi vsak tik (funkcija je idempotentna), da liga, ki je uspela
      // pred prvim tikom ali med izpadom urnika, ne obvisi. Zavrnitev se javi
      // le za uspeh, novejši od prejšnjega tika.
      izid.vklopi.push(liga.slug)
      if (zadnji.updatedAt > od) izid.novi.push(liga.slug)
      continue
    }
    if (padli >= 2) {
      if (zadnji.updatedAt > od) izid.javi.push(`${liga.slug}: uvoz je padel ${padli}-krat, preskočim`)
      izid.log.push(`${liga.slug}: ${padli} padcev, preskočena`)
      continue
    }
    odprtih++
    if (!tece && !izid.zazeni) izid.zazeni = { ...liga, ponovitev: padli === 1 }
  }
  izid.koncano = odprtih === 0 && !tece && izid.novi.length === 0
  return izid
}

async function javi(besedilo) {
  console.log(besedilo)
  if (!process.env.DISCORD_WEBHOOK) return
  try {
    await fetch(process.env.DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `🇦🇹 **Uvoz Avstrije**\n${besedilo}`.slice(0, 1900) }),
    })
  } catch (e) {
    console.error(`Discord ni dosegljiv: ${e.message}`)
  }
}

async function main() {
  const suho = process.argv.includes('--suho')
  const { GITHUB_REPOSITORY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env
  const repo = GITHUB_REPOSITORY ? ['-R', GITHUB_REPOSITORY] : []
  const gh = (...a) => execFileSync('gh', [...a, ...repo], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const ghJson = (...a) => JSON.parse(gh(...a))

  const vrsta = preberiVrsto(readFileSync(new URL('./avstrija-vrsta.txt', import.meta.url), 'utf8'))

  const { createClient } = await import('@supabase/supabase-js')
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('competitions').select('slug, active').in('slug', vrsta.map((l) => l.slug))
  if (error) throw new Error(`Lig ni mogoče prebrati: ${error.message}`)
  const lige = new Map(data.map((l) => [l.slug, l.active]))

  const zagoni = ghJson('run', 'list', '--workflow', 'uvoz-lige.yml', '--limit', '1000',
    '--json', 'status,conclusion,displayTitle,createdAt,updatedAt')
    .map((z) => ({ ...z, slug: NASLOV.exec(z.displayTitle ?? '')?.[1] }))
    .filter((z) => z.slug)

  // Prejšnji uspeli tik; prvič (ali če toka še ni na main) zadnjih 20 minut.
  let prejsnji = null
  try {
    prejsnji = ghJson('run', 'list', '--workflow', 'uvoz-avstrije.yml', '--status', 'success', '--limit', '1',
      '--json', 'createdAt')[0]?.createdAt
  } catch {}
  const od = prejsnji ?? new Date(Date.now() - 20 * 60_000).toISOString()

  const izid = odloci({ vrsta, zagoni, lige, od })
  for (const v of izid.log) console.log(v)
  if (suho) {
    console.log(JSON.stringify({ od, ...izid }, null, 2))
    return
  }

  for (const v of izid.javi) await javi(v)

  const vklopljene = []
  for (const slug of izid.vklopi) {
    const { data: r, error: e } = await db.rpc('vklopi_ligo_sredi_sezone', { p_slug: slug })
    if (e) throw new Error(`Vklop ${slug}: ${e.message}`)
    console.log(`${slug}: ${JSON.stringify(r)}`)
    if (r.vklopljena) vklopljene.push(slug)
    // Ligo je medtem vklopil kdo drug (ročno ali stara zanka) — ni kaj javiti.
    else if (izid.novi.includes(slug) && r.razlog !== 'Liga je že vklopljena.') {
      await javi(`${slug}: vklop zavrnjen — ${r.razlog} (prvi krog ${r.prvi_krog ?? '–'}, izidi − goli ${r.razlika ?? '–'}). Odloči človek.`)
    }
  }
  if (vklopljene.length) {
    gh('workflow', 'run', 'hisne-ekipe.yml', '-f', 'drzava=AT', '-f', 'pisi=true')
    // `grbi` hrani le en čakajoči zagon: več lig naenkrat = vse aktivne at- lige.
    const tekmovanje = vklopljene.length === 1 ? vklopljene[0] : ''
    gh('workflow', 'run', 'grbi.yml', '-f', 'vir=oefb', '-f', 'pisi=true', '-f', `tekmovanje=${tekmovanje}`)
    console.log(`Vklopljene: ${vklopljene.join(', ')}; zagnani hišne ekipe in grbi.`)
  }

  if (izid.zazeni) {
    const { slug, arhiv, ponovitev } = izid.zazeni
    gh('workflow', 'run', 'uvoz-lige.yml', '-f', `liga=${slug}`, '-f', `arhiv=${arhiv}`, '-f', 'cene=true')
    console.log(`Zagnan uvoz ${slug}${ponovitev ? ' (ponovitev)' : ''}.`)
  } else if (izid.tece) {
    console.log('Uvoz at- lige še teče — čakam.')
  }
  if (izid.koncano) console.log('Avstrija končana.')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(`::error::${e.message}`)
    process.exit(1)
  })
}
