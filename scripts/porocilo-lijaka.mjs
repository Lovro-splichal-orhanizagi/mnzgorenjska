// Dnevno poročilo lijaka — na Discord, vsako jutro za včeraj.
//
// Kje se ljudje ustavijo: obisk → registracija → ekipa → prvi krog → drugi
// krog, in kje denar: klik na pivo → pivo, trgovina, preverjeni, ponovna
// cena. Številke pripravi `porocilo_lijaka()` v bazi (seštevki, brez
// uporabnikov); tu jih le razporedimo in označimo največji padec.
//
// Uporaba:
//   SUPABASE_SERVICE_ROLE_KEY=... node scripts/porocilo-lijaka.mjs [--dan 2026-10-29]
//   ... --discord        pošlje na Discord (sicer samo izpiše)
import { createClient } from '@supabase/supabase-js'

const BASE = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const WEBHOOK = process.env.DISCORD_WEBHOOK_LIJAK || process.env.DISCORD_WEBHOOK_TEDENSKO
const naDiscord = process.argv.includes('--discord')
const i = process.argv.indexOf('--dan')
const dan = i > 0 ? process.argv[i + 1] : undefined

async function poslji(content) {
  if (!naDiscord) return console.log(content)
  if (!WEBHOOK) return console.log('Ni DISCORD_WEBHOOK_LIJAK — ne pošiljam.\n\n' + content)
  const r = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 1990) }),
  })
  if (!r.ok) throw new Error(`Discord ${r.status}`)
}

/** Delež kot "54 %", brez deljenja z nič. */
export function odstotek(del, celota) {
  return celota ? `${Math.round((100 * del) / celota)} %` : '—'
}

/** Sprememba proti povprečju zadnjih 7 dni: "▲ 12 %" / "▼ 40 %". */
export function proti(danes, povprecje) {
  if (!povprecje) return ''
  const p = Math.round((100 * (danes - povprecje)) / povprecje)
  if (Math.abs(p) < 5) return '≈'
  return p > 0 ? `▲ ${p} %` : `▼ ${-p} %`
}

/** Koraki lijaka skupine z deležem prehoda; najšibkejši prehod dobi ⚠. */
export function stopnice(s) {
  const koraki = [
    ['Registrirani', s.registriranih],
    ['Sestavil ekipo', s.z_ekipo],
    ['Igral 1. krog', s.krog_1],
    ['Igral 2. krog', s.krog_2],
  ]
  const prehodi = koraki.slice(1).map(([, n], j) => (koraki[j][1] ? n / koraki[j][1] : 1))
  const najslabsi = prehodi.indexOf(Math.min(...prehodi)) + 1
  return koraki.map(([ime, n], j) =>
    `${j === najslabsi ? '⚠' : '•'} ${ime}: **${n}**${j ? ` (${odstotek(n, koraki[j - 1][1])} prejšnjega)` : ''}`)
}

export function sestavi(p) {
  const o = p.obiski ?? {}, o7 = p.obiski_7 ?? {}
  const k = p.koraki ?? {}, k7 = p.koraki_7 ?? {}
  const s = p.skupina, d = p.denar
  const vrstica = (ime, kljuc, a = k, b = k7) => `${ime}: **${a[kljuc] ?? 0}** ${proti(a[kljuc] ?? 0, b[kljuc] ?? 0)}`
  const vodic = k.vodic_zacetek ? odstotek(k.vodic_preskok ?? 0, k.vodic_zacetek) : '—'

  return [
    `📊 **Lijak ${p.dan}** (proti povprečju 7 dni)`,
    '',
    '**Včeraj**',
    `• Obiski: ${vrstica('neprijavljeni', 'neprijavljen', o, o7)} · ${vrstica('novi', 'nov', o, o7)} · ${vrstica('stari', 'star', o, o7)}`,
    `• Registracije: **${p.registracije}** · nove ekipe: **${p.nove_ekipe}**`,
    `• ${vrstica('Osnutek brez prijave', 'osnutek_brez_prijave')} → ${vrstica('osnutek shranjen', 'osnutek_shranjen')}`,
    `• ${vrstica('Prazna ekipa', 'prazna_ekipa')} → ${vrstica('predlog', 'predlog')} → ${vrstica('prva shramba', 'prva_shramba')}`,
    `• Vodič: začelo ${k.vodic_zacetek ?? 0}, preskočilo ${vodic}, končalo ${k.vodic_konec ?? 0}`,
    '',
    `**Skupina ${s.od} – ${s.do}** (registrirani pred 15–21 dnevi)`,
    ...stopnice(s),
    `• Aktiven zadnji teden: **${s.vrnjenih}** (${odstotek(s.vrnjenih, s.registriranih)})`,
    `• Push: ${odstotek(s.push, s.registriranih)} · aplikacija s push: ${odstotek(s.aplikacija, s.registriranih)} · mini liga: ${odstotek(s.mini_liga, s.z_ekipo)} · povabil prijatelja: ${s.povabil}`,
    '',
    '**Denar (30 dni)**',
    `• Pivo: ${d.pivo_klikov_30} klikov → **${d.piva_30}** piv (${odstotek(d.piva_30, d.pivo_klikov_30)}) · včeraj ${d.piva_dan}`,
    `• Okno piva včeraj: ${k.pivo_okno ?? 0} prikazov → ${(k.pivo_klik_krog ?? 0) + (k.pivo_klik_ekipa ?? 0)} klikov`,
    `• Trgovina: ${d.trgovina_zacetih_30} začetih → **${d.trgovina_placanih_30}** plačanih (${d.trgovina_eur_30.toFixed(2)} €)`,
    `• Preverjeni: **${d.preverjeni_aktivni}** aktivnih · ponovna cena: ${d.ponovne_cene_zacete_30} začetih → ${d.ponovne_cene_placane_30} plačanih`,
  ].join('\n')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!SERVICE) { console.error('Manjka SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
  const db = createClient(BASE, SERVICE, { auth: { persistSession: false } })
  try {
    const { data, error } = await db.rpc('porocilo_lijaka', dan ? { p_dan: dan } : {})
    if (error) throw new Error(error.message)
    await poslji(sestavi(data))
  } catch (e) {
    console.error(e.message)
    // Tiho odpovedano poročilo je slabše od nobenega: povej na Discord.
    await poslji(`🔴 **Poročila lijaka ni bilo mogoče sestaviti**\n\`${e.message}\``).catch(() => {})
    process.exit(1)
  }
}
