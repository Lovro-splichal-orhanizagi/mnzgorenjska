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

// Kartica gre v Discord: brez naslovov, žetonov ali ključev.
const SKRIVNO = [
  [/[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i, 'e-poštni naslov'],
  [/\b(ghp|gho|github_pat|sk|xox[abp]|eyJ)[A-Za-z0-9_\-.]{12,}/, 'žeton'],
  [/[A-Za-z0-9+_\-]{41,}/, 'dolg niz (ključ?)'],
]

export function preveriZahtevo(z) {
  const napake = []
  for (const k of Object.keys(z)) if (!POLJA.includes(k)) napake.push(`neznano polje ${k}`)
  for (const k of OBVEZNA) if (typeof z[k] !== 'string' || !z[k].trim()) napake.push(`manjka ${k}`)
  if (z.zadeva && !/^SLF-\d+$/.test(z.zadeva)) napake.push('zadeva mora biti SLF-<število>')
  if (z.akcija && !AKCIJE[z.akcija]) napake.push(`akcija mora biti ena od: ${Object.keys(AKCIJE).join(', ')}`)
  if (z.verzija && !/^[0-9a-f]{7,64}$/.test(z.verzija)) napake.push('verzija mora biti SHA commita ali sha256 vsebine')
  if (z.potece && Number.isNaN(Date.parse(z.potece))) napake.push('potece ni datum ISO')
  for (const k of POLJA) {
    if (k === 'verzija' || typeof z[k] !== 'string') continue
    for (const [re, kaj] of SKRIVNO) if (re.test(z[k])) napake.push(`${k} vsebuje ${kaj}; to ne sme v Discord`)
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

// Prenos, ki ga desk zapiše na zadevo:
//   [odobritev] ODOBRIM SLF-211-merge-deploy-1a2b3c4d
//   odobril: Lovro, discord 123456789012345678
//   sporocilo: 1300000000000000000
//   cas: 2026-10-30T11:00:00Z
export function razcleniPrenos(body) {
  const m = /^\[odobritev\]\s+(ODOBRIM|ZAVRNEM)\s+(\S+)\s*$/m.exec(body)
  if (!m) return null
  const polje = (ime) => new RegExp(`^${ime}:\\s*(.+?)\\s*$`, 'm').exec(body)?.[1]
  const odobril = polje('odobril')
  return {
    odlocitev: m[1],
    koda: m[2],
    ime: odobril?.split(',')[0].trim(),
    discord: /discord\s+(\d{17,20})\b/.exec(odobril ?? '')?.[1],
    sporocilo: /^\d{17,20}$/.test(polje('sporocilo') ?? '') ? polje('sporocilo') : undefined,
    cas: polje('cas'),
  }
}

export function preveri(z, komentarji, { odobritelji = [], zdaj = new Date() } = {}) {
  const napake = preveriZahtevo(z)
  if (napake.length) return { ok: false, razlog: `zahteva ni veljavna: ${napake.join('; ')}` }
  const k = koda(z)
  const porabljena = komentarji.some((c) => new RegExp(`^\\[odobritev-porabljena\\]\\s+${k}\\b`, 'm').test(c.body ?? ''))
  if (porabljena) return { ok: false, koda: k, razlog: 'koda je že porabljena; za ponovitev je potrebna nova kartica' }
  const prenosi = komentarji
    .map((c) => ({ c, p: razcleniPrenos(c.body ?? '') }))
    .filter(({ p }) => p)
  const zavrnitve = []
  for (const { c, p } of [...prenosi].sort((a, b) => Date.parse(b.c.createdAt) - Date.parse(a.c.createdAt))) {
    const razlog = (r) => zavrnitve.push(`${c.id}: ${r}`)
    if (p.koda !== k) { razlog(`koda ${p.koda} ne ustreza trenutni zahtevi (${k}); stara ali tuja kartica`); continue }
    // Agent ne more odobriti: prenos mora zapisati človeški račun (desk ali odbor).
    if (!c.authorUserId || c.authorAgentId) { razlog('prenos ni zapisal človeški račun'); continue }
    if (!p.discord || !p.sporocilo || !p.cas || Number.isNaN(Date.parse(p.cas))) { razlog('manjka discord ID, ID sporočila ali čas'); continue }
    if (prenosi.some((o) => o.p.sporocilo === p.sporocilo && o.p.koda !== p.koda)) { razlog('isto sporočilo je uporabljeno za drugo kodo'); continue }
    if (Date.parse(p.cas) > Date.parse(z.potece) || zdaj.getTime() > Date.parse(z.potece)) { razlog('kartica je potekla'); continue }
    if (!javnaOdobritev(z.akcija) && !odobritelji.includes(p.discord)) { razlog(`discord ${p.discord} ne sme odobriti akcije ${z.akcija}`); continue }
    return { ok: true, odlocitev: p.odlocitev, koda: k, komentar: c.id, odobril: p.ime, discord: p.discord, sporocilo: p.sporocilo, cas: p.cas }
  }
  return { ok: false, koda: k, razlog: zavrnitve.length ? zavrnitve.join(' | ') : 'ni prenosa odobritve za to kodo' }
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
