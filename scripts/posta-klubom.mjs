// Pošta klubom iz vrste (delavec `slff-posta` na strežniku, scripts/hetzner/posta/).
//
// NE v GitHub Actions: dnevniki javnega repozitorija bi pokazali naslove.
// Vrsto napolni scripts/vrsta-poste-klubom.mjs (`klub_stik.v_vrsti`). Vsak
// krog (z --zanka vsakih 10 minut) pošlje največ `--najvec` mailov (privzeto 2, 60–150 s narazen):
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
// - klub (isti team_id ali isto ime v državi) je v zadnjih 3 dneh dobil
//   pošto od kogarkoli ali v 7 dneh od drugega pošiljatelja → čaka;
// - pred SMTP vrstico prevzamemo (`v_vrsti = false`), v vrsto se vrne šele po
//   vpisu v klub_stik_posta. Napaka po začetku DATA ali neuspel vpis jo pusti
//   zunaj vrste z opombo "poslano? preveri ročno" — nikoli samodejno znova;
// - v dnevniku ni naslovov (stik #id, klub).
//
// Številke v mailu so sveže (igralci z nastopi letos, najboljši igralec,
// število človeških fantasy ekip z igralcem kluba). Besedila so po državi.
// SMTP in IMAP sta tu na roko prek node:tls (brez nove odvisnosti).
//
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LUKA_SMTP_GESLO
//   node scripts/posta-klubom.mjs --zanka   (delavec: krog vsakih 10 minut, do zavrnjene prijave)
//   node scripts/posta-klubom.mjs [--najvec 2]   (en krog)
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

/** Glava po RFC 2047 (UTF-8, base64), v kosih po največ 39 bajtov (vrstica z "Subject: " ostane ≤ 78 znakov). */
export function kodirajGlavo(s) {
  if (/^[\x20-\x7e]*$/.test(s)) return s
  const kosi = ['']
  for (const znak of s) {
    if (Buffer.byteLength(kosi.at(-1) + znak) > 39) kosi.push('')
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
// Napaka po začetku DATA nosi `poDATA`: mail je morda šel, zato ga ne pošiljamo znova.
export async function posljiSmtp(p, { od, na, geslo, sporocilo: m }) {
  let poDATA = false
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
    poDATA = true
    await ukaz('DATA', 3)
    await ukaz(`${m.replace(/^\./gm, '..')}\r\n.`, 2, 'konec DATA')
    await ukaz('QUIT').catch(() => {})
  } catch (e) {
    if (!(e instanceof NapakaPrijave) && !(e instanceof ZavrnjenNaslov)) e.poDATA = poDATA
    throw e
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

/**
 * Je klub odgovoril (mail z naslova ali mail, ki citira povezavo na stran
 * kluba) ali se je mail odbil? INBOX in Junk, od dneva prvega maila.
 */
export async function preveriNabiralnik(ukaz, { naslov, povezava, od }) {
  const out = { odgovor: false, odboj: false }
  const s = datumImap(od)
  for (const mapa of ['INBOX', 'Junk']) {
    try {
      await ukaz(`EXAMINE ${navednice(mapa)}`)
    } catch {
      continue // mape ni
    }
    if (iskanje(await ukaz(`UID SEARCH OR FROM "MAILER-DAEMON" FROM "postmaster" BODY ${navednice(naslov)} SINCE ${s}`)).length) out.odboj = true
    if (iskanje(await ukaz(`UID SEARCH FROM ${navednice(naslov)} SINCE ${s}`)).length) out.odgovor = true
    if (iskanje(await ukaz(`UID SEARCH BODY ${navednice(povezava)} NOT FROM "MAILER-DAEMON" NOT FROM "postmaster" SINCE ${s}`)).length) out.odgovor = true
  }
  return out
}

// --- izbira in pošiljanje ------------------------------------------------------

/** Naslov v dnevniku: "k***@domena". */
export const zakrij = (t) => String(t ?? '').replace(/([^\s<>"'(),;:@]+)@([^\s<>"'(),;:@]+\.[a-z]{2,})/gi, (_, u, d) => `${u[0]}***@${d}`)

const DAN = 86400e3
const normKlub = (ime) => String(ime ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** Vrstice istega kluba: isti team_id ali isto ime (brez šumnikov in ločil) v isti državi. */
export function istiKlub(s, vsi) {
  const ime = normKlub(s.klub)
  return vsi.filter((o) => o.id === s.id || (s.team_id != null && o.team_id === s.team_id) || (ime && o.drzava === s.drzava && normKlub(o.klub) === ime))
}

/**
 * Pošta istega kluba blokira: v zadnjih 3 dneh kdorkoli, v zadnjih 7 dneh drug
 * pošiljatelj. Prvi mail pa le, če klub (na katerikoli naslov) še ni dobil
 * nobenega prvega maila ali opomnika — en stik na klub.
 */
function klubBlokiran(s, vsi, poStiku, zdaj, prviMail) {
  for (const o of istiKlub(s, vsi)) {
    for (const r of poStiku.get(o.id) ?? []) {
      const starost = zdaj.getTime() - Date.parse(r.poslano_at)
      if (starost < 3 * DAN) return true
      if (starost < 7 * DAN && r.vrsta !== 'odgovor' && r.poslal !== POSLAL) return true
      if (prviMail && o.id !== s.id && ['prvi', 'opomnik'].includes(r.vrsta)) return true
    }
  }
  return false
}

/**
 * Stare avstrijske vrstice (prvi mail poslan pred vrsto, lokalno) za opomnik iz
 * vrste. Le brez pošiljatelja (vrsta ga vpiše ob prevzemu v vrsto, zato
 * pozneje parkirana vrstica nikoli več ne ustreza), stanje `poslano`, brez
 * opombe "poslano…" in le, če je vso pošto poslal Luka.
 */
export function stareZaOpomnik(stiki, posta) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  return stiki.filter((s) => {
    const r = (poStiku.get(s.id) ?? []).filter((x) => x.vrsta !== 'odgovor')
    return s.drzava === 'AT' && !s.v_vrsti && s.posiljatelj == null && s.stanje === 'poslano' && !/^poslano/i.test(s.opomba ?? '') &&
      r.some((x) => x.vrsta === 'prvi') && r.every((x) => x.poslal === POSLAL)
  })
}

/**
 * Kandidati v vrstnem redu pošiljanja: najprej opomniki, nato prvi maili.
 * `vrsta`: vrstice v vrsti; `vsi`: vse vrstice klub_stik (pravilo kluba).
 */
export function kandidati(vrsta, posta, aktivne, zdaj = new Date(), vsi = vrsta) {
  const poStiku = new Map()
  for (const r of posta) (poStiku.get(r.stik_id) ?? poStiku.set(r.stik_id, []).get(r.stik_id)).push(r)
  const opomniki = []
  const prvi = []
  for (const s of vrsta) {
    if (!s.v_vrsti || !s.email || !BESEDILA[s.drzava] || !aktivne.has(s.liga_slug)) continue
    if (klubBlokiran(s, vsi, poStiku, zdaj, s.stanje === 'nov')) continue
    const r = poStiku.get(s.id) ?? []
    if (s.stanje === 'nov') {
      if (!r.length && (!s.poslji_od || Date.parse(s.poslji_od) <= zdaj.getTime())) prvi.push(s)
      continue
    }
    if (s.stanje !== 'poslano') continue
    const p = r.filter((x) => x.vrsta === 'prvi')
    // Vsaka pošta drugega pošiljatelja (tudi klic, drugo) za vedno zapre opomnik.
    if (p.length !== 1 || r.some((x) => x.vrsta !== 'odgovor' && x.poslal !== POSLAL) || r.some((x) => ['opomnik', 'odgovor'].includes(x.vrsta))) continue
    if (Date.parse(p[0].poslano_at) > zdaj.getTime() - DNI_DO_OPOMNIKA * DAN) continue
    opomniki.push({ ...s, prvi_at: p[0].poslano_at })
  }
  opomniki.sort((a, b) => Date.parse(a.prvi_at) - Date.parse(b.prvi_at))
  return [...opomniki.map((s) => ({ s, vrsta: 'opomnik' })), ...prvi.map((s) => ({ s, vrsta: 'prvi' }))]
}

// V dnevnik nikoli naslov kluba: stik #id (klub, liga).
const log = (t) => console.log(zakrij(t))
const oznaka = (s) => `stik #${s.id} (${s.klub}, ${s.liga_slug})`
const cakaj = (ms) => new Promise((r) => setTimeout(r, ms))

/** En krog: največ `najvec` mailov. Vrne true, če je kaj ostalo neurejeno (opozorilo). */
async function krog(db, { geslo, suho, najvec }) {
  const preveri = ({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  }
  let opozorilo = false
  const zdaj = new Date()
  const vceraj = new Date(zdaj.getTime() - 30 * 3600e3).toISOString()
  const danes = preveri(await db.from('klub_stik_posta').select('poslano_at').eq('poslal', POSLAL).in('vrsta', ['prvi', 'opomnik']).gte('poslano_at', vceraj))
    .filter((r) => danDunaj(new Date(r.poslano_at)) === danDunaj(zdaj)).length +
    // Parkirani "morda poslani" maili današnjega dne štejejo v mejo.
    preveri(await db.from('klub_stik').select('updated_at').ilike('opomba', 'poslano%').gte('updated_at', vceraj))
      .filter((r) => danDunaj(new Date(r.updated_at)) === danDunaj(zdaj)).length
  if (danes >= NA_DAN && !suho) {
    log(`Danes poslano: ${danes}/${NA_DAN} — dnevna meja`)
    return false
  }

  const lige = preveri(await db.from('competitions').select('id, slug, name, active'))
  const poSlugu = new Map(lige.map((l) => [l.slug, l]))
  const aktivne = new Set(lige.filter((l) => l.active).map((l) => l.slug))
  const vsi = await vseVrstice((od, do_) =>
    db.from('klub_stik').select('id, team_id, klub, drzava, liga_slug, email, stanje, v_vrsti, poslji_od').order('id').range(od, do_),
  )
  const vrsta = vsi.filter((s) => s.v_vrsti && ['nov', 'poslano'].includes(s.stanje))
  const posta = await vseVrstice((od, do_) =>
    db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at').order('id').range(od, do_),
  )
  const vsiKandidati = kandidati(vrsta, posta, aktivne, zdaj, vsi)
  const vOknuZdaj = vsiKandidati.filter(({ s }) => vOknu(s.drzava, zdaj))
  // --suho pokaže naslednje maile tudi zunaj okna, da se besedilo da pregledati kadarkoli.
  const izbor = suho ? vsiKandidati : vOknuZdaj
  if (suho || izbor.length)
    log(`Danes ${danes}/${NA_DAN}; v vrsti ${vsiKandidati.filter((x) => x.vrsta === 'opomnik').length} opomnikov, ${vsiKandidati.filter((x) => x.vrsta === 'prvi').length} prvih; v oknu zdaj ${vOknuZdaj.length}`)
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

  // Vrstica, ki je ne smemo poslati znova, ostane zunaj vrste z opombo za človeka.
  async function parkiraj(s, opomba) {
    const { error } = await db.from('klub_stik').update({ v_vrsti: false, opomba: opomba.slice(0, 500) }).eq('id', s.id)
    if (error) log(`  ! ${oznaka(s)}: opombe ni bilo mogoče zapisati (${error.message}); vrstica je že zunaj vrste`)
  }
  async function vrniVVrsto(s) {
    const { error } = await db.from('klub_stik').update({ v_vrsti: true }).eq('id', s.id)
    if (error) log(`  ! ${oznaka(s)}: vrnitev v vrsto ni uspela (${error.message}); mail NI šel`)
  }

  let poslanih = 0
  for (const { s, vrsta: vrstaMaila } of izbor) {
    if (poslanih >= najvec || (!suho && danes + poslanih >= NA_DAN)) break
    // Pred prevzemom vrstice: nič ni poslano, napaka le preskoči kandidata.
    let b
    try {
      const p = await podatki(s)
      if (!p.igralcev) {
        log(`preskok ${oznaka(s)}: klub nima igralcev z nastopi`)
        continue
      }
      if (vrstaMaila === 'opomnik' && !suho) {
        const prvi = posta.find((r) => r.stik_id === s.id && r.vrsta === 'prvi')
        const n = await zImap(geslo, (ukaz) => preveriNabiralnik(ukaz, {
          naslov: s.email, povezava: `slff.eu/club/${s.team_id}?t=${s.liga_slug}`, od: new Date(prvi.poslano_at),
        }))
        if (n.odgovor) {
          const zapis = { stik_id: s.id, vrsta: 'odgovor', poslal: s.email, za: OD, opomba: 'odgovor v luka@slff.eu' }
          preveri(await db.from('klub_stik_posta').insert(zapis))
          posta.push({ ...zapis, poslano_at: new Date().toISOString() })
          log(`odgovor: ${oznaka(s)} — brez opomnika`)
          continue
        }
        if (n.odboj) {
          preveri(await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `odboj v luka@slff.eu (${danDunaj(zdaj)})` }).eq('id', s.id))
          log(`odboj: ${oznaka(s)} — napacen_mail`)
          continue
        }
      }
      b = besedilo({ ...s, ime_lige: p.ime_lige }, p, vrstaMaila)
    } catch (e) {
      if (e instanceof NapakaPrijave) throw e
      log(`preskok ${oznaka(s)}: ${e.message}`)
      continue
    }
    if (!b) continue
    if (suho) {
      log(`\n--- ${vrstaMaila} → ${oznaka(s)} ${s.email}${vOknu(s.drzava, zdaj) ? '' : ' [zunaj okna]'}\n${b.zadeva}\n\n${b.telo}`)
      poslanih++
      continue
    }
    if (poslanih) await cakaj((60 + Math.random() * 90) * 1000)
    // Tik pred pošiljanjem znova: okno, pošta kluba (tudi tega kroga), prevzem vrstice.
    // Pošta kluba sveže iz baze (drug pošiljatelj je morda pisal med krogom).
    let sveze
    try {
      const vrsticeDrzave = await vseVrstice((od, do_) =>
        db.from('klub_stik').select('id, team_id, klub, drzava').eq('drzava', s.drzava).order('id').range(od, do_))
      const idji = istiKlub(s, vrsticeDrzave).map((o) => o.id)
      const postaKluba = preveri(await db.from('klub_stik_posta').select('id, stik_id, vrsta, poslal, poslano_at').in('stik_id', idji).order('id'))
      sveze = kandidati([s], postaKluba, aktivne, new Date(), vrsticeDrzave).length > 0
    } catch (e) {
      log(`preskok ${oznaka(s)}: sveža pošta kluba ni prebrana (${e.message})`)
      continue
    }
    if (!vOknu(s.drzava, new Date()) || !sveze) {
      log(`preskok ${oznaka(s)}: zunaj okna ali klub je medtem dobil pošto`)
      continue
    }
    const prevzem = await db.from('klub_stik').update({ v_vrsti: false }).eq('id', s.id).eq('v_vrsti', true).in('stanje', ['nov', 'poslano']).select('id')
    if (prevzem.error || !prevzem.data?.length) {
      log(`preskok ${oznaka(s)}: ${prevzem.error ? `prevzem ni uspel (${prevzem.error.message})` : 'vrstico je vzel drug zagon'}`)
      continue
    }
    const m = sporocilo({ na: s.email, zadeva: b.zadeva, telo: b.telo, odjava: b.odjava })
    try {
      await posljiSmtp(await povezi(GOSTITELJ, 465), { od: OD, na: s.email, geslo, sporocilo: m })
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        await vrniVVrsto(s)
        throw e
      }
      if (e instanceof ZavrnjenNaslov) {
        const { error } = await db.from('klub_stik').update({ stanje: 'napacen_mail', opomba: `SMTP zavrnil naslov: ${e.message}`.slice(0, 500) }).eq('id', s.id)
        log(`zavrnjen naslov: ${oznaka(s)} — napacen_mail${error ? ` (zapis ni uspel: ${error.message}; vrstica zunaj vrste)` : ''}`)
        continue
      }
      if (e.poDATA) {
        // Mail je morda šel: nikoli samodejno znova.
        await parkiraj(s, `poslano? preveri ročno (${vrstaMaila}, ${danDunaj(new Date())}): ${e.message}`)
        log(`NEZNANO, ali je šel: ${oznaka(s)} — zunaj vrste, preveri Sent (${e.message})`)
        opozorilo = true
        continue
      }
      if (e.koda >= 500) {
        await parkiraj(s, `SMTP zavrnil (${vrstaMaila}): ${e.message}`)
        log(`zavrnjeno: ${oznaka(s)} — zunaj vrste (${e.message})`)
        continue
      }
      // Pred DATA (povezava, 4xx): nič ni šlo — vrstica nazaj v vrsto, krog konča.
      await vrniVVrsto(s)
      log(`SMTP ni dosegljiv (${e.message}) — konec kroga`)
      return true
    }
    poslanih++
    const zapis = { stik_id: s.id, vrsta: vrstaMaila, poslal: POSLAL, za: s.email, zadeva: b.zadeva, telo: b.telo }
    let vpis
    for (let i = 0; i < 3; i++) {
      vpis = await db.from('klub_stik_posta').insert(zapis)
      if (!vpis.error) break
      await cakaj(5000)
    }
    if (vpis.error) {
      await parkiraj(s, `poslano (${vrstaMaila}, ${danDunaj(new Date())}), a vpis v klub_stik_posta ni uspel — vpiši ročno`)
      log(`POSLANO, A NI VPISANO: ${oznaka(s)} (${vpis.error.message}) — zunaj vrste`)
      opozorilo = true
      continue
    }
    posta.push({ ...zapis, poslano_at: new Date().toISOString() })
    // Nazaj v vrsto šele po vpisu (za opomnik čez tri dni).
    const { error: eVrsta } = await db.from('klub_stik').update({ v_vrsti: true }).eq('id', s.id)
    log(`${vrstaMaila} → ${oznaka(s)}${eVrsta ? ` (vrnitev v vrsto ni uspela: ${eVrsta.message})` : ''}`)
    try {
      await zImap(geslo, (ukaz) => ukaz(`APPEND "Sent" (\\Seen) {${Buffer.byteLength(m)}}`, m))
    } catch (e) {
      log(`  (kopija v Sent ni uspela: ${e.message})`)
    }
  }
  if (suho) log(`\n--suho: ${poslanih} mailov bi šlo (nič poslano, nič vpisano).`)
  else if (poslanih) log(`Poslano: ${poslanih}`)
  return opozorilo
}

const KROG_MS = 10 * 60e3
const PO_PRIJAVI_MS = 60 * 60e3

async function main() {
  const arg = (ime) => {
    const i = process.argv.indexOf(ime)
    return i >= 0 ? process.argv[i + 1] : undefined
  }
  const suho = process.argv.includes('--suho')
  const zanka = process.argv.includes('--zanka') && !suho
  const najvec = Number(arg('--najvec') ?? 2)
  const env = process.env
  const geslo = env.LUKA_SMTP_GESLO
  // V zanki (Docker restart) pred izhodom počakamo, da manjkajoča nastavitev ne vrti ponovnih zagonov.
  const konec = async (sporocilo) => {
    console.error(sporocilo)
    if (zanka) await cakaj(10 * 60e3)
    process.exit(1)
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) await konec('Manjka SUPABASE_URL ali SUPABASE_SERVICE_ROLE_KEY.')
  if (!suho && !geslo) await konec('Manjka LUKA_SMTP_GESLO (geslo nabiralnika luka@slff.eu).')
  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  if (!zanka) {
    try {
      if (await krog(db, { geslo, suho, najvec })) process.exitCode = 1
    } catch (e) {
      console.error(zakrij(e instanceof NapakaPrijave ? `Prijava v nabiralnik ni uspela: ${e.message}` : `Napaka: ${e.message}`))
      process.exit(1)
    }
    return
  }
  // Delavec na strežniku (slff-posta): krog vsakih 10 minut; prehodne napake
  // le zabeleži. Zavrnjena prijava: ura premora, nato izhod (Docker ga
  // znova zažene) — da napačno geslo ne tolče po strežniku.
  log('Pošta klubom: zanka teče (krog vsakih 10 minut).')
  for (;;) {
    const zacetek = Date.now()
    try {
      await krog(db, { geslo, suho: false, najvec })
    } catch (e) {
      if (e instanceof NapakaPrijave) {
        console.error(zakrij(`Prijava v nabiralnik ni uspela: ${e.message} — premor 1 h, nato izhod`))
        await cakaj(PO_PRIJAVI_MS)
        process.exit(1)
      }
      console.error(zakrij(`Krog ni uspel: ${e.message}`))
    }
    await cakaj(Math.max(0, KROG_MS - (Date.now() - zacetek)))
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main()
}
