// Pošta klubom iz vrste (delovni tok *Pošta klubom*, vsakih 10 minut).
//
// Vrsto napolni scripts/vrsta-poste-klubom.mjs (`klub_stik.v_vrsti`). Vsak
// zagon pošlje največ `--najvec` mailov (privzeto 2, 60–150 s narazen):
// najprej opomnike, nato prve maile. Pravila kot v CLAUDE.md *Pošta klubom*:
//
// - pišemo le v oknu prejemnikove države (08–18, pon–sob, `OKNA`), največ
//   NA_DAN mailov na dan (dunajski dan, šteje klub_stik_posta tega pošiljatelja);
// - prvi mail: stanje `nov`, brez kakršnekoli pošte, `poslji_od` mimo,
//   liga aktivna (neaktivna liga čaka — tako Estonija do vklopa);
// - opomnik: en sam, ≥ 3 dni po našem prvem mailu, brez pošte drugih in brez
//   odgovora; pred njim pogledamo v nabiralnik (IMAP), ali je klub odgovoril
//   (→ `odgovor`) ali se je mail odbil (→ `napacen_mail`);
// - SMTP zavrne naslov → `napacen_mail`.
//
// Številke v mailu so sveže (igralci z nastopi letos, najboljši igralec,
// število človeških fantasy ekip z igralcem kluba). Besedila so po državi.
// SMTP in IMAP sta tu na roko prek node:tls (brez nove odvisnosti).
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LUKA_SMTP_GESLO
//   node scripts/posta-klubom.mjs [--najvec 2]
//   node scripts/posta-klubom.mjs --suho     (izpiše, kaj bi šlo; nič ne pošlje in ne piše, gesla ne rabi)
import tls from 'node:tls'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { vseVrstice } from './strani.mjs'

export const OD = 'luka@slff.eu'
export const POSLAL = 'Luka (luka@slff.eu)'
const GOSTITELJ = 'mail.slff.eu'
const NA_DAN = 100
const DNI_DO_OPOMNIKA = 3

// Okno pošiljanja po državi prejemnika; država brez okna (in besedil) ne dobi nič.
export const OKNA = { AT: 'Europe/Vienna', EE: 'Europe/Tallinn' }

/** Je čas `zdaj` v oknu države (08–18, pon–sob, krajevni čas)? */
export function vOknu(drzava, zdaj = new Date()) {
  const pas = OKNA[drzava]
  if (!pas) return false
  const d = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: pas, weekday: 'short', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(zdaj).map((p) => [p.type, p.value]),
  )
  return d.weekday !== 'Sun' && Number(d.hour) >= 8 && Number(d.hour) < 18
}

const danDunaj = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(d)

// --- besedila ----------------------------------------------------------------

const tocke = (n) => {
  n = Number(n ?? 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

// Nemška besedila so prenesena dobesedno iz prvega pošiljanja (posli.py), da
// opomnik ustreza že poslanim prvim mailom.
function nemsko(k, p, vrsta, url) {
  const { ime_lige: liga, klub } = k
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} Punkte` : null
  if (vrsta === 'prvi') {
    return {
      zadeva: `Spieler von ${klub} im Fantasy-Spiel der ${liga}`,
      telo: `Guten Tag,

ich bin Luka von SLFF, einem kostenlosen Fantasy-Fußballspiel für Amateurligen. Seit Kurzem ist auch die ${liga} dabei: Fans stellen ihr Team aus echten Spielern der Liga zusammen, die Punkte kommen aus den offiziellen Spielberichten auf oefb.at. ${p.igralcev} Spieler von ${klub} sind schon im Spiel:
${url}
${naj ? `
Bisher bester Spieler: ${naj}.
` : ''}
Wenn es Ihnen gefällt, teilen Sie den Link gerne in der Vereinsgruppe oder auf Facebook. Manche Vereine sehen das als kleine Extra-Motivation für die Spieler, weil man nach jeder Runde sieht, wer Punkte sammelt. Es ist kostenlos.

Möchte ein Spieler nicht namentlich aufscheinen oder wollen Sie keine weiteren E-Mails, genügt eine kurze Antwort.

Mit freundlichen Grüßen
Luka
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `${klub}: Ihre Spieler sind schon in ${ekip} Fantasy-Teams` : `${klub} im Fantasy-Spiel: so läuft es für Ihre Spieler`,
    telo: `Guten Tag,

vor ein paar Tagen habe ich Ihnen über SLFF geschrieben, das kostenlose Fantasy-Spiel für die ${liga}. Kurz: Die Spieler von ${klub} sind im Spiel und sammeln Punkte${ekip >= 5 ? `, und sie stehen schon in ${ekip} Fantasy-Teams` : ''}.${naj ? ` Bester bisher: ${naj}.` : ''}

Die Vereinsseite mit Statistiken und einem fertigen Bild zum Teilen:
${url}

Wenn Sie den Link in die Vereinsgruppe oder auf Facebook stellen, können sich Fans und auch die Spieler selbst messen. Es ist kostenlos.

Das ist meine letzte Nachricht dazu. Möchte ein Spieler nicht namentlich aufscheinen, genügt eine kurze Antwort.

Mit freundlichen Grüßen
Luka
slff.eu
`,
  }
}

// Estonščina sklanja, zato ime lige stoji samo za dvopičjem ali v oklepaju,
// klub za besedo "klubi"/"klubist" (glej CLAUDE.md *Estonija*). Brez pomišljajev.
// Besedila ne trdijo, da imamo dovoljenje zveze.
function estonsko(k, p, vrsta, url) {
  const { ime_lige: liga, klub } = k
  const naj = p.naj ? `${p.naj}, ${tocke(p.tocke)} ${Number(p.tocke) === 1 ? 'punkt' : 'punkti'}` : null
  if (vrsta === 'prvi') {
    return {
      zadeva: `Klubi ${klub} mängijad fantaasiajalgpallis (${liga})`,
      telo: `Tere!

Olen Luka SLFF-ist. See on tasuta fantaasiajalgpalli mäng amatöörliigadele. Nüüd on mängus ka uus liiga: ${liga}. Fännid panevad oma meeskonna kokku liiga päris mängijatest ja punktid tulevad ametlikest mänguprotokollidest lehel jalgpall.ee. Mängus on juba ${p.igralcev} ${p.igralcev === 1 ? 'mängija' : 'mängijat'} klubist ${klub}:
${url}
${naj ? `
Seni parim mängija: ${naj}.
` : ''}
Kui see Teile meeldib, jagage linki julgelt klubi grupis või Facebookis. Mõni klubi näeb selles mängijatele väikest lisamotivatsiooni, sest pärast iga vooru on näha, kes punkte kogub. See on tasuta.

Kui mõni mängija ei soovi oma nimega mängus olla või Te ei soovi rohkem kirju, piisab lühikesest vastusest.

Lugupidamisega
Luka
slff.eu
`,
    }
  }
  const ekip = p.ekip ?? 0
  return {
    zadeva: ekip >= 5 ? `Klubi ${klub} mängijad on juba ${ekip} fantaasiameeskonnas` : `Klubi ${klub} fantaasiamängus: nii läheb Teie mängijatel`,
    telo: `Tere!

Mõni päev tagasi kirjutasin Teile SLFF-ist, tasuta fantaasiajalgpallist (liiga: ${liga}). Lühidalt: klubi ${klub} mängijad on mängus ja koguvad punkte${ekip >= 5 ? ` ning nad on juba ${ekip} fantaasiameeskonnas` : ''}.${naj ? ` Seni parim: ${naj}.` : ''}

Klubi leht statistika ja jagamiseks valmis pildiga:
${url}

Kui panete lingi klubi gruppi või Facebooki, saavad fännid ja ka mängijad ise omavahel võistelda. See on tasuta.

See on minu viimane kiri sel teemal. Kui mõni mängija ei soovi oma nimega mängus olla, piisab lühikesest vastusest.

Lugupidamisega
Luka
slff.eu
`,
  }
}

const BESEDILA = { AT: { sestavi: nemsko, odjava: 'Abmelden' }, EE: { sestavi: estonsko, odjava: 'Loobu' } }

/**
 * Zadeva, telo in zadeva odjave za mail klubu, ali null za državo brez besedil.
 * `k`: { drzava, team_id, liga_slug, ime_lige, klub }; `p`: { igralcev, naj, tocke, ekip }.
 */
export function besedilo(k, p, vrsta) {
  const b = BESEDILA[k.drzava]
  if (!b) return null
  const { zadeva, telo } = b.sestavi(k, p, vrsta, `https://slff.eu/club/${k.team_id}?t=${k.liga_slug}`)
  return { zadeva, telo: telo.replace(/\n{3,}/g, '\n\n'), odjava: b.odjava }
}

// --- MIME --------------------------------------------------------------------

/** Glava po RFC 2047 (UTF-8, base64), v kosih po največ 45 bajtov. */
export function kodirajGlavo(s) {
  if (/^[\x20-\x7e]*$/.test(s)) return s
  const kosi = ['']
  for (const znak of s) {
    if (Buffer.byteLength(kosi.at(-1) + znak) > 45) kosi.push('')
    kosi[kosi.length - 1] += znak
  }
  return kosi.map((k) => `=?UTF-8?B?${Buffer.from(k).toString('base64')}?=`).join('\r\n ')
}

/** Celoten mail (CRLF, telo v base64). */
export function sporocilo({ na, zadeva, telo, odjava, zdaj = new Date(), id = randomUUID() }) {
  const b64 = Buffer.from(telo.replace(/\r?\n/g, '\r\n')).toString('base64').match(/.{1,76}/g) ?? []
  return [
    `From: "Luka (SLFF)" <${OD}>`,
    `To: <${na}>`,
    `Subject: ${kodirajGlavo(zadeva)}`,
    `Date: ${zdaj.toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${id}@slff.eu>`,
    `List-Unsubscribe: <mailto:${OD}?subject=${encodeURIComponent(odjava)}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    ...b64,
  ].join('\r\n')
}

// --- SMTP in IMAP (node:tls) ----------------------------------------------------

/** Povezava TLS z branjem po vrsticah: { vrstica(), pisi(t), zapri() }. */
export function povezi(host, port) {
  return new Promise((ok, ne) => {
    const s = tls.connect({ host, port, servername: host, timeout: 60000 })
    s.setEncoding('utf8')
    let buf = ''
    let napaka = null
    const cakajo = []
    const daj = () => {
      while (cakajo.length) {
        const i = buf.indexOf('\r\n')
        if (i < 0) break
        const v = buf.slice(0, i)
        buf = buf.slice(i + 2)
        cakajo.shift().ok(v)
      }
      if (napaka) while (cakajo.length) cakajo.shift().ne(napaka)
    }
    s.on('data', (d) => { buf += d; daj() })
    s.on('timeout', () => s.destroy(new Error(`${host}:${port}: časovna omejitev`)))
    s.on('error', (e) => { napaka = e; daj(); ne(e) })
    s.on('close', () => { napaka ??= new Error(`${host}:${port}: povezava zaprta`); daj() })
    s.once('secureConnect', () =>
      ok({
        vrstica: () => new Promise((ok_, ne_) => { cakajo.push({ ok: ok_, ne: ne_ }); daj() }),
        pisi: (t) => s.write(t),
        zapri: () => s.end(),
      }),
    )
  })
}

export class ZavrnjenNaslov extends Error {}
export class NapakaPrijave extends Error {}

/** Pošlje `sporocilo` prek odprte povezave `p` (SMTP, implicitni TLS). */
export async function posljiSmtp(p, { od, na, geslo, sporocilo: m }) {
  const ukaz = async (t, razred = 2, ime = t?.split(' ')[0] ?? 'pozdrav') => {
    if (t != null) p.pisi(t + '\r\n')
    const vrstice = []
    let v
    do vrstice.push((v = await p.vrstica()))
    while (/^\d{3}-/.test(v))
    const koda = Number(v.slice(0, 3))
    // V napaki je le ime ukaza in odgovor strežnika, nikoli geslo.
    if (Math.floor(koda / 100) !== razred) throw Object.assign(new Error(`SMTP ${ime}: ${vrstice.join(' | ')}`), { koda })
  }
  try {
    await ukaz(null)
    await ukaz('EHLO slff.eu')
    await ukaz(`AUTH PLAIN ${Buffer.from(`\0${od}\0${geslo}`).toString('base64')}`, 2, 'AUTH').catch((e) => {
      throw new NapakaPrijave(`SMTP prijava ${od} zavrnjena (${e.koda ?? e.message})`)
    })
    await ukaz(`MAIL FROM:<${od}>`)
    await ukaz(`RCPT TO:<${na}>`).catch((e) => {
      throw e.koda >= 500 ? new ZavrnjenNaslov(e.message) : e
    })
    await ukaz('DATA', 3)
    await ukaz(`${m.replace(/^\./gm, '..')}\r\n.`, 2, 'konec DATA')
    await ukaz('QUIT').catch(() => {})
  } finally {
    p.zapri()
  }
}

const navednice = (s) => `"${String(s).replace(/[\\"]/g, '\\$&')}"`
const MESECI = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const datumImap = (d) => `${d.getUTCDate()}-${MESECI[d.getUTCMonth()]}-${d.getUTCFullYear()}`

/** IMAP nad odprto povezavo: ukaz(t, literal?) vrne nepoimenovane vrstice odgovora. */
export function imap(p) {
  let n = 0
  return async function ukaz(t, literal = null) {
    const oznaka = `A${++n}`
    p.pisi(`${oznaka} ${t}\r\n`)
    if (literal != null) {
      const v = await p.vrstica()
      if (!v.startsWith('+')) throw new Error(`IMAP ${t.split(' ')[0]}: ${v}`)
      p.pisi(`${literal}\r\n`)
    }
    const vrstice = []
    // ponytail: literalov v odgovorih ne beremo — rabimo le SEARCH, SELECT in APPEND.
    for (;;) {
      const v = await p.vrstica()
      if (!v.startsWith(`${oznaka} `)) { vrstice.push(v); continue }
      if (!/^\S+ OK/i.test(v)) throw new Error(`IMAP ${t.split(' ')[0]}: ${v.slice(oznaka.length + 1)}`)
      return vrstice
    }
  }
}

const iskanje = (vrstice) => vrstice.filter((v) => /^\* SEARCH/i.test(v)).flatMap((v) => v.slice(8).trim().split(/\s+/)).filter(Boolean)

async function zImap(geslo, delo) {
  const p = await povezi(GOSTITELJ, 993)
  try {
    await p.vrstica() // pozdrav
    const ukaz = imap(p)
    await ukaz(`LOGIN ${navednice(OD)} ${navednice(geslo)}`).catch(() => {
      throw new NapakaPrijave(`IMAP prijava ${OD} zavrnjena`)
    })
    const out = await delo(ukaz)
    await ukaz('LOGOUT').catch(() => {})
    return out
  } finally {
    p.zapri()
  }
}

/** Je naslov od `od` odgovoril, se je mail nanj odbil? (INBOX in Junk) */
export async function preveriNabiralnik(ukaz, naslov, od) {
  const out = { odgovor: false, odboj: false }
  for (const mapa of ['INBOX', 'Junk']) {
    try {
      await ukaz(`EXAMINE ${navednice(mapa)}`)
    } catch {
      continue // mape ni
    }
    const s = datumImap(od)
    if (iskanje(await ukaz(`UID SEARCH FROM ${navednice(naslov)} SINCE ${s}`)).length) out.odgovor = true
    if (iskanje(await ukaz(`UID SEARCH OR FROM "MAILER-DAEMON" FROM "postmaster" BODY ${navednice(naslov)} SINCE ${s}`)).length) out.odboj = true
  }
  return out
}

// --- izbira in pošiljanje ------------------------------------------------------

/** Kandidati v vrstnem redu pošiljanja: najprej opomniki, nato prvi maili. */
export function kandidati(stiki, posta, aktivne, zdaj = new Date()) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  const opomniki = []
  const prvi = []
  for (const s of stiki) {
    if (!s.v_vrsti || !s.email || !BESEDILA[s.drzava] || !aktivne.has(s.liga_slug)) continue
    const r = poStiku.get(s.id) ?? []
    if (s.stanje === 'nov' && !r.length && (!s.poslji_od || Date.parse(s.poslji_od) <= zdaj.getTime())) prvi.push(s)
    if (s.stanje !== 'poslano') continue
    const p = r.filter((x) => x.vrsta === 'prvi')
    const tuji = r.some((x) => ['prvi', 'opomnik'].includes(x.vrsta) && x.poslal !== POSLAL)
    if (p.length !== 1 || p[0].poslal !== POSLAL || tuji || r.some((x) => ['opomnik', 'odgovor'].includes(x.vrsta))) continue
    if (Date.parse(p[0].poslano_at) > zdaj.getTime() - DNI_DO_OPOMNIKA * 86400e3) continue
    opomniki.push({ ...s, prvi_at: p[0].poslano_at })
  }
  opomniki.sort((a, b) => Date.parse(a.prvi_at) - Date.parse(b.prvi_at))
  return [...opomniki.map((s) => ({ s, vrsta: 'opomnik' })), ...prvi.map((s) => ({ s, vrsta: 'prvi' }))]
}

async function main() {
  const arg = (ime) => {
    const i = process.argv.indexOf(ime)
    return i >= 0 ? process.argv[i + 1] : undefined
  }
  const suho = process.argv.includes('--suho')
  const najvec = Number(arg('--najvec') ?? 2)
  const env = process.env
  const geslo = env.LUKA_SMTP_GESLO
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.')
    process.exit(1)
  }
  if (!suho && !geslo) {
    console.error('Manjka LUKA_SMTP_GESLO (geslo nabiralnika luka@slff.eu).')
    process.exit(1)
  }
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const preveri = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }

  const zdaj = new Date()
  const vceraj = new Date(zdaj.getTime() - 30 * 3600e3).toISOString()
  const danes = preveri(await db.from('klub_stik_posta').select('poslano_at').eq('poslal', POSLAL).in('vrsta', ['prvi', 'opomnik']).gte('poslano_at', vceraj))
    .filter((r) => danDunaj(new Date(r.poslano_at)) === danDunaj(zdaj)).length
  console.log(`Danes poslano: ${danes}/${NA_DAN}`)
  if (danes >= NA_DAN && !suho) return

  const lige = preveri(await db.from('competitions').select('id, slug, name, active'))
  const poSlugu = new Map(lige.map((l) => [l.slug, l]))
  const aktivne = new Set(lige.filter((l) => l.active).map((l) => l.slug))
  const stiki = await vseVrstice((od, do_) =>
    db.from('klub_stik').select('id, team_id, klub, drzava, liga_slug, email, stanje, v_vrsti, poslji_od')
      .eq('v_vrsti', true).in('stanje', ['nov', 'poslano']).order('id').range(od, do_),
  )
  const posta = await vseVrstice((od, do_) =>
    db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at').order('id').range(od, do_),
  )
  const vsi = kandidati(stiki, posta, aktivne, zdaj)
  const vOknuZdaj = vsi.filter(({ s }) => vOknu(s.drzava, zdaj))
  console.log(`V vrsti: ${vsi.filter((x) => x.vrsta === 'opomnik').length} opomnikov, ${vsi.filter((x) => x.vrsta === 'prvi').length} prvih; v oknu zdaj ${vOknuZdaj.length}`)
  // --suho pokaže naslednje maile tudi zunaj okna, da se besedilo da pregledati kadarkoli.
  const izbor = suho ? vsi : vOknuZdaj
  const sezone = new Map()

  async function podatki(s) {
    const liga = poSlugu.get(s.liga_slug)
    if (!sezone.has(liga.id)) sezone.set(liga.id, preveri(await db.rpc('sezona_lige', { p_competition_id: liga.id })))
    const st = preveri(await db.from('player_season_standings').select('id, points')
      .eq('competition_id', liga.id).eq('team_id', s.team_id).eq('season', sezone.get(liga.id)).gt('matches', 0)
      .order('points', { ascending: false, nullsFirst: false }).order('id'))
    const igralci = preveri(await db.from('players').select('id, first_name, last_name, anonimiziran_at')
      .eq('competition_id', liga.id).eq('team_id', s.team_id).order('id'))
    const poId = new Map(igralci.map((x) => [x.id, x]))
    const naj = st.find((x) => poId.get(x.id) && !poId.get(x.id).anonimiziran_at)
    const ekipe = new Set()
    for (let i = 0; i < igralci.length; i += 300) {
      const kos = igralci.slice(i, i + 300).map((x) => x.id)
      for (const r of await vseVrstice((od, do_) =>
        db.from('fantasy_roster').select('fantasy_team_id, player_id, fantasy_teams!inner(hisna)')
          .in('player_id', kos).eq('fantasy_teams.hisna', false).order('fantasy_team_id').order('player_id').range(od, do_),
      )) ekipe.add(r.fantasy_team_id)
    }
    const ime = naj ? `${poId.get(naj.id).first_name ?? ''} ${poId.get(naj.id).last_name ?? ''}`.trim() : null
    return { igralcev: st.length, naj: ime || null, tocke: naj?.points ?? 0, ekip: ekipe.size, ime_lige: liga.name }
  }

  let poslanih = 0
  for (const { s, vrsta } of izbor) {
    if (poslanih >= najvec || (!suho && danes + poslanih >= NA_DAN)) break
    const p = await podatki(s)
    if (!p.igralcev) {
      console.log(`preskok ${s.email}: klub nima igralcev z nastopi`)
      continue
    }
    if (vrsta === 'opomnik' && !suho) {
      const prvi = posta.find((r) => r.stik_id === s.id && r.vrsta === 'prvi')
      const n = await zImap(geslo, (ukaz) => preveriNabiralnik(ukaz, s.email, new Date(prvi.poslano_at)))
      if (n.odgovor) {
        preveri(await db.from('klub_stik_posta').insert({ stik_id: s.id, vrsta: 'odgovor', poslal: s.email, za: OD, opomba: 'odgovor v luka@slff.eu' }))
        console.log(`odgovor od ${s.email} — brez opomnika`)
        continue
      }
      if (n.odboj) {
        preveri(await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `odboj v luka@slff.eu (${danDunaj(zdaj)})` }).eq('id', s.id))
        console.log(`odboj za ${s.email} — napacen_mail`)
        continue
      }
    }
    const b = besedilo({ ...s, ime_lige: p.ime_lige }, p, vrsta)
    if (!b) continue
    if (suho) {
      console.log(`\n--- ${vrsta} → ${s.email} (${s.klub}, ${s.liga_slug})${vOknu(s.drzava, zdaj) ? '' : ' [zunaj okna]'}\n${b.zadeva}\n\n${b.telo}`)
      poslanih++
      continue
    }
    if (poslanih) await new Promise((r) => setTimeout(r, (60 + Math.random() * 90) * 1000))
    const m = sporocilo({ na: s.email, zadeva: b.zadeva, telo: b.telo, odjava: b.odjava })
    try {
      await posljiSmtp(await povezi(GOSTITELJ, 465), { od: OD, na: s.email, geslo, sporocilo: m })
    } catch (e) {
      if (!(e instanceof ZavrnjenNaslov)) throw e
      preveri(await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `SMTP zavrnil naslov: ${e.message.slice(0, 200)}` }).eq('id', s.id))
      console.log(`zavrnjen ${s.email} — napacen_mail`)
      continue
    }
    poslanih++
    // ponytail: mail je šel; če vpis po treh poskusih ne uspe, zagon pade in človek ga vpiše ročno (sicer bi šel še enkrat).
    let vpis
    for (let i = 0; i < 3; i++) {
      vpis = await db.from('klub_stik_posta').insert({ stik_id: s.id, vrsta, poslal: POSLAL, za: s.email, zadeva: b.zadeva, telo: b.telo })
      if (!vpis.error) break
      await new Promise((r) => setTimeout(r, 5000))
    }
    if (vpis.error) throw new Error(`POSLANO, A NI VPISANO (${vrsta} → ${s.email}): ${vpis.error.message}`)
    console.log(`${vrsta} → ${s.email} (${s.klub}, ${s.liga_slug})`)
    try {
      await zImap(geslo, (ukaz) => ukaz(`APPEND "Sent" (\\Seen) {${Buffer.byteLength(m)}}`, m))
    } catch (e) {
      console.log(`  (kopija v Sent ni uspela: ${e.message})`)
    }
  }
  console.log(suho ? `\n--suho: ${poslanih} mailov bi šlo (nič poslano, nič vpisano).` : `Poslano: ${poslanih}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof NapakaPrijave ? `Prijava v nabiralnik ni uspela: ${e.message}` : `Napaka: ${e.message}`)
    process.exit(1)
  })
}
