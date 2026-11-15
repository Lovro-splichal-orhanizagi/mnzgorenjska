#!/usr/bin/env node
// Pošlje ENO ročno napisano sponzorsko pošto (ne prek vrste za klube).
//
//   ssh slff-ops send-mail <lovro|luka|nejc> <na> <zadeva> < telo.txt
//   (na VM: docker exec -i slff-posta node scripts/posli-enega.mjs <od> <na> <zadeva> < telo.txt)
//
// Telo (text/plain, stdin) je že napisano; skripta doda le glavo, HTML del in
// List-Unsubscribe. Omejitve: en prejemnik, vsak naslov največ enkrat (tudi
// če je prejšnji poskus padel po DATA), največ 10 mailov na dan in 5 minut
// med dvema. Dnevnik: /data/sponzorji.jsonl (en JSON na vrstico).
// Gesla vzame iz okolja kontejnerja slff-posta; ne izpiše jih nikoli.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { aktivniPosiljatelji, povezi, posljiSmtp, sporocilo } from './posta-klubom.mjs'

const DNEVNIK = process.env.SPONZORJI_DNEVNIK ?? '/data/sponzorji.jsonl'
const NA_DAN = 10
const RAZMAK_MS = 5 * 60e3
const [kljuc, na, zadeva] = process.argv.slice(2)
const fail = (t) => { console.error(`NAPAKA: ${t}`); process.exit(1) }

const po = aktivniPosiljatelji(process.env).find((p) => p.kljuc === kljuc && p.kljuc !== 'klubi')
if (!po) fail('pošiljatelj mora biti lovro, luka ali nejc (z nastavljenim geslom)')
if (!/^[^\s<>"',;]+@[^\s<>"',;]+\.[a-z]{2,}$/i.test(na ?? '')) fail('neveljaven naslov prejemnika (en sam naslov)')
if (!zadeva || /[\r\n]/.test(zadeva)) fail('manjka zadeva')
const telo = readFileSync(0, 'utf8').replace(/\r\n/g, '\n').trim()
if (telo.length < 40) fail('telo je prazno ali prekratko')

const dnevnik = existsSync(DNEVNIK) ? readFileSync(DNEVNIK, 'utf8').split('\n').filter(Boolean).map((v) => JSON.parse(v)) : []
if (dnevnik.some((d) => d.na === na.toLowerCase())) fail(`${na} je že v dnevniku — ne pošiljam drugič`)
const zdaj = new Date()
const danes = dnevnik.filter((d) => d.cas.slice(0, 10) === zdaj.toISOString().slice(0, 10))
if (danes.length >= NA_DAN) fail(`dnevna meja ${NA_DAN} mailov dosežena`)
const zadnji = dnevnik.at(-1)
if (zadnji && zdaj - new Date(zadnji.cas) < RAZMAK_MS) fail('počakaj 5 minut od prejšnjega maila (en mail naenkrat)')

const zapisi = (stanje, napaka) => appendFileSync(DNEVNIK, JSON.stringify({ cas: zdaj.toISOString(), od: po.od, na: na.toLowerCase(), zadeva, stanje, ...(napaka && { napaka }) }) + '\n')
const m = sporocilo({ na, zadeva, telo, odjava: 'Unsubscribe', po, zdaj })
try {
  await posljiSmtp(await povezi('mail.slff.eu', 465), { od: po.od, na, geslo: po.geslo, sporocilo: m })
  zapisi('poslano')
  console.log(`OK: poslano ${po.od} -> ${na}`)
} catch (e) {
  // Po DATA je mail morda šel: zapišemo, da se ne pošlje znova.
  zapisi(e.poDATA ? 'morda_poslano' : 'napaka', e.message)
  fail(e.message)
}
