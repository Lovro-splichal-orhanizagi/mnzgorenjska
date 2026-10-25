// Predlogi za plačljivo ponovno vrednotenje cene (migracija 20261025193100).
//
// Delovni tok *Ponovne cene* (vsakih 15 minut) za vsak plačan zahtevek požene
// `ovrednoti-igralce.mjs --tedensko --igralec <id>` brez pisanja: isti
// algoritem in ista pravila kot tedenski zagon, percentili iz cele lige.
// Izid gre v `ponovna_cena_predlog` kot PREDLOG; ceno premakne šele admin
// (`admin_ponovna_cena_potrdi`). Izračun, ki pade, pusti zahtevek 'placano' in
// ga naslednji zagon poskusi znova.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/ponovne-cene.mjs          # le izpiše predloge
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/ponovne-cene.mjs --pisi   # zapiše predloge
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const IZIDI = ['premaknjena', 'brez_spremembe', 'borza', 'ta_teden', 'zaklenjena', 'ni_igralca']

/** Izid ovrednoti-igralce za enega igralca ali null, če izračun ni uspel. */
export function izracunaj(liga, igralec) {
  const mapa = mkdtempSync(join(tmpdir(), 'ponovna-cena-'))
  const pot = join(mapa, 'izid.json')
  try {
    const r = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./ovrednoti-igralce.mjs', import.meta.url)), '--tekmovanje', liga, '--tedensko', '--igralec', String(igralec), '--izid', pot],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024 },
    )
    if (r.status !== 0) return null
    return JSON.parse(readFileSync(pot, 'utf8'))
  } catch {
    return null
  } finally {
    rmSync(mapa, { recursive: true, force: true })
  }
}

/**
 * Obdela zahtevke. `izracun(liga, igralec)` vrne izid ovrednoti-igralce ali
 * null; `zapisi(zahtevek, izid)` ga shrani. Vrne {zapisanih, padlih}.
 */
export async function obdelaj(zahtevki, { izracun, zapisi }) {
  let zapisanih = 0
  let padlih = 0
  for (const z of zahtevki) {
    const izid = izracun(z.liga, z.player_id)
    if (!izid || !IZIDI.includes(izid.izid)) {
      padlih++
      console.warn(`::warning title=Ponovna cena::#${z.zahtevek} (${z.liga}, igralec ${z.player_id}): izračun ni uspel, poskusim znova`)
      continue
    }
    await zapisi(z.zahtevek, izid)
    zapisanih++
    console.log(`#${z.zahtevek} ${z.liga} igralec ${z.player_id}: ${izid.izid} ${izid.stara} → ${izid.nova}`)
  }
  return { zapisanih, padlih }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SERVICE) {
    console.error('Manjka SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }
  const pisi = process.argv.includes('--pisi')
  const db = createClient(process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321', SERVICE, { auth: { persistSession: false } })
  const { data, error } = await db.rpc('ponovne_cene_za_izracun')
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  console.log(`Plačanih zahtevkov brez predloga: ${data.length}`)
  const { padlih } = await obdelaj(data, {
    izracun: izracunaj,
    zapisi: async (zahtevek, izid) => {
      if (!pisi) return
      const { error: e } = await db.rpc('ponovna_cena_predlog', {
        p_zahtevek: zahtevek,
        p_izid: izid.izid,
        p_stara: izid.stara,
        p_nova: izid.nova,
        p_podlaga: izid.podlaga ?? null,
      })
      if (e) throw new Error(`ponovna_cena_predlog #${zahtevek}: ${e.message}`)
    },
  })
  if (!pisi) console.log('To je le predlog. Za zapis dodaj --pisi')
  if (padlih) process.exitCode = 1
}
