#!/usr/bin/env node
// Odobritve v Discordu (#kafana) za delo SLFF. Glej docs/operativa/odobritve-kafana.md.
//
//   node scripts/odobritev.mjs kartica zahteva.json
//   node scripts/odobritev.mjs preveri zahteva.json komentarji.json --odobritelji id,id,id [--zdaj ISO]
//
// kartica: izpiše besedilo kartice za #kafana in kodo, vezano na zadevo, akcijo in različico.
// preveri: v komentarjih zadeve (GET /api/issues/{id}/comments) poišče prenos odobritve
// z enako kodo in vrne {ok, odlocitev, razlog}. Izhod 0 = veljavna odobritev, 3 = veljavna
// zavrnitev, 1 = nič veljavnega (izvajalec ne naredi ničesar).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const AKCIJE = {
  'merge-deploy': 'združitev in namestitev',
  email: 'pošiljanje e-pošte',
  objava: 'javna objava',
  zgodba: 'zgodba IG/FB',
  poraba: 'strošek',
  preizkus: 'preizkus brez učinka',
}
// Zgodbe lahko odobri kdorkoli v #kafana (odločitev Luke 20. 10.). Vse drugo samo Luka, Lovro, Nejc.
export const javnaOdobritev = (akcija) => akcija === 'zgodba'

const POLJA = ['zadeva', 'akcija', 'cilj', 'verzija', 'prejemniki', 'platforme', 'tveganje', 'potece']
const OBVEZNA = ['zadeva', 'akcija', 'cilj', 'verzija', 'tveganje', 'potece']

// Kartica gre v Discord: brez naslovov, žetonov ali ključev. To je varnostna mreža, ne zagotovilo:
// izvajalec v kartico piše le število prejemnikov, nikoli naslovov ali vsebine .env.
const SKRIVNO = [
  [/[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i, 'e-poštni naslov'],
  [/:\/\/[^\s/:@]+:[^\s/@]+@/, 'geslo v naslovu URL'],
  [/\b(ghp_|gho_|ghs_|ghu_|github_pat_|sk-|sk_live_|sk_test_|re_|xox[abprs]-)[A-Za-z0-9_\-]{8,}/, 'žeton'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/, 'žeton JWT'],
  [/[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6,7}\.[A-Za-z0-9_-]{27,}/, 'žeton Discord bota'],
  [/\b(api[_-]?key|token|secret|password|geslo)\s*[=:]\s*\S{6,}/i, 'ključ'],
]
// Dolg niz brez ločil je verjetno ključ; SHA commita (40) ali sha256 (64) je dovoljen.
const dolgKljuc = (s) => (s.match(/[A-Za-z0-9+]{32,}/g) ?? []).some((m) => !/^([0-9a-f]{40}|[0-9a-f]{64})$/i.test(m))

export function preveriZahtevo(z) {
  const napake = []
  for (const k of Object.keys(z)) if (!POLJA.includes(k)) napake.push(`neznano polje ${k}`)
  for (const k of OBVEZNA) if (typeof z[k] !== 'string' || !z[k].trim()) napake.push(`manjka ${k}`)
  if (z.zadeva && !/^SLF-\d+$/.test(z.zadeva)) napake.push('zadeva mora biti SLF-<število>')
  if (z.akcija && !AKCIJE[z.akcija]) napake.push(`akcija mora biti ena od: ${Object.keys(AKCIJE).join(', ')}`)
  if (z.verzija && !/^[0-9a-f]{7,64}$/.test(z.verzija)) napake.push('verzija mora biti SHA commita ali sha256 vsebine')
  if (z.potece && Number.isNaN(Date.parse(z.potece))) napake.push('potece ni datum ISO')
  for (const k of POLJA) {
    if (z[k] == null) continue
    if (typeof z[k] !== 'string') { napake.push(`${k} mora biti besedilo`); continue }
    if (k === 'verzija') continue
    for (const [re, kaj] of SKRIVNO) if (re.test(z[k])) napake.push(`${k} vsebuje ${kaj}; to ne sme v Discord`)
    if (dolgKljuc(z[k])) napake.push(`${k} vsebuje dolg niz (ključ?); to ne sme v Discord`)
  }
  return napake
}

export function koda(z) {
  const kanon = JSON.stringify(POLJA.filter((k) => z[k] != null).map((k) => [k, z[k]]))
  return `${z.zadeva}-${z.akcija}-${createHash('sha256').update(kanon).digest('hex').slice(0, 8)}`
}

export function kartica(z) {
  const k = koda(z)
  const kdo = javnaOdobritev(z.akcija) ? 'kdorkoli v #kafana' : 'samo Luka, Lovro ali Nejc'
  const vrstice = [
    `**Odobritev ${z.zadeva}: ${AKCIJE[z.akcija]}**`,
    `Kaj: ${z.cilj} @ \`${z.verzija.slice(0, 12)}\``,
    z.prejemniki && `Prejemniki: ${z.prejemniki}`,
    z.platforme && `Platforme: ${z.platforme}`,
    `Tveganje: ${z.tveganje}`,
    `Velja do: ${z.potece} · odobri ${kdo}`,
    `Odgovori natanko: \`ODOBRIM ${k}\` ali \`ZAVRNEM ${k}\``,
  ]
  return { koda: k, besedilo: vrstice.filter(Boolean).join('\n') }
}

// Prenos, ki ga desk zapiše na zadevo. Komentar je natanko teh štirih vrstic, nič drugega:
//   [odobritev] ODOBRIM SLF-211-merge-deploy-1a2b3c4d
//   odobril: Lovro, discord 123456789012345678
//   sporocilo: 1300000000000000000
//   cas: 2026-10-30T11:00:00Z
// Prilepljen blok v daljšem komentarju (npr. "[desk] … in Discord: …") ni prenos.
const PRENOS = /^\[odobritev\] (ODOBRIM|ZAVRNEM) (SLF-\d+-[a-z-]+-[0-9a-f]{8})\r?\nodobril: ([^,\n]+), discord (\d{17,20})\r?\nsporocilo: (\d{17,20})\r?\ncas: (\S+)\s*$/

export function razcleniPrenos(body) {
  const m = PRENOS.exec(body ?? '')
  if (!m || Number.isNaN(Date.parse(m[6]))) return null
  return { odlocitev: m[1], koda: m[2], ime: m[3].trim(), discord: m[4], sporocilo: m[5], cas: m[6] }
}

// Agent ne more odobriti: prenos mora zapisati človeški račun (desk ali odbor).
const cloveski = (c) => Boolean(c.authorUserId) && !c.authorAgentId && (c.authorType == null || c.authorType === 'user')
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function preveri(z, komentarji, { odobritelji = [], zdaj = new Date() } = {}) {
  const napake = preveriZahtevo(z)
  if (napake.length) return { ok: false, razlog: `zahteva ni veljavna: ${napake.join('; ')}` }
  const k = koda(z)
  const sme = (discord) => javnaOdobritev(z.akcija) || odobritelji.includes(discord)
  const porabljena = komentarji.some((c) => new RegExp(`^\\[odobritev-porabljena\\]\\s+${escape(k)}\\b`, 'm').test(c.body ?? ''))
  if (porabljena) return { ok: false, koda: k, razlog: 'koda je že porabljena; za ponovitev je potrebna nova kartica' }

  // Zavrnitev konča kodo ne glede na vrstni red; za nadaljevanje je potrebna nova kartica.
  // Človeški komentar, ki omenja ZAVRNEM <koda>, a ni veljaven prenos, kodo prav tako ustavi (varno).
  const zavrnjeno = new RegExp(`\\bZAVRNEM\\s+${escape(k)}(?![0-9a-f])`)
  for (const c of komentarji.filter((c) => cloveski(c) && zavrnjeno.test(c.body ?? ''))) {
    const p = razcleniPrenos(c.body)
    if (p && p.odlocitev === 'ZAVRNEM' && p.koda === k && sme(p.discord)) {
      return { ok: true, odlocitev: 'ZAVRNEM', koda: k, komentar: c.id, odobril: p.ime, discord: p.discord, sporocilo: p.sporocilo, cas: p.cas }
    }
    return { ok: false, koda: k, razlog: `${c.id}: koda je zavrnjena ali sporna (ZAVRNEM); potrebna je nova kartica` }
  }

  const prenosi = komentarji.filter(cloveski).map((c) => ({ c, p: razcleniPrenos(c.body) })).filter(({ p }) => p)
  const zavrnitve = []
  for (const c of komentarji) {
    if (!cloveski(c) && /^\[odobritev\]/.test(c.body ?? '')) zavrnitve.push(`${c.id}: prenos ni zapisal človeški račun`)
  }
  for (const { c, p } of [...prenosi].sort((a, b) => Date.parse(b.c.createdAt) - Date.parse(a.c.createdAt))) {
    const razlog = (r) => zavrnitve.push(`${c.id}: ${r}`)
    if (p.koda !== k) { razlog(`koda ${p.koda} ne ustreza trenutni zahtevi (${k}); stara ali tuja kartica`); continue }
    if (prenosi.some((o) => o.p.sporocilo === p.sporocilo && o.p.koda !== p.koda)) { razlog('isto sporočilo je uporabljeno za drugo kodo'); continue }
    if (Date.parse(p.cas) > Date.parse(z.potece) || zdaj.getTime() > Date.parse(z.potece)) { razlog('kartica je potekla'); continue }
    if (!sme(p.discord)) { razlog(`discord ${p.discord} ne sme odobriti akcije ${z.akcija}`); continue }
    return { ok: true, odlocitev: p.odlocitev, koda: k, komentar: c.id, odobril: p.ime, discord: p.discord, sporocilo: p.sporocilo, cas: p.cas }
  }
  return { ok: false, koda: k, razlog: zavrnitve.length ? zavrnitve.join(' | ') : 'ni veljavnega prenosa odobritve za to kodo' }
}

function main(argv) {
  const [ukaz, ...rest] = argv
  const opcija = (ime) => { const i = rest.indexOf(ime); return i >= 0 ? rest.splice(i, 2)[1] : undefined }
  const preberi = (pot) => JSON.parse(readFileSync(pot, 'utf8'))
  if (ukaz === 'kartica' && rest.length === 1) {
    const z = preberi(rest[0])
    const napake = preveriZahtevo(z)
    if (napake.length) { console.error(napake.join('\n')); return 1 }
    const { koda: k, besedilo } = kartica(z)
    console.log(besedilo)
    console.error(`koda: ${k}`)
    return 0
  }
  if (ukaz === 'preveri') {
    const odobritelji = (opcija('--odobritelji') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
    const zdaj = opcija('--zdaj')
    if (rest.length !== 2) return usage()
    const r = preveri(preberi(rest[0]), preberi(rest[1]), { odobritelji, zdaj: zdaj ? new Date(zdaj) : new Date() })
    console.log(JSON.stringify(r))
    return !r.ok ? 1 : r.odlocitev === 'ODOBRIM' ? 0 : 3
  }
  return usage()
}

function usage() {
  console.error('uporaba: odobritev.mjs kartica zahteva.json | preveri zahteva.json komentarji.json --odobritelji id,id,id [--zdaj ISO]')
  return 2
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)))
