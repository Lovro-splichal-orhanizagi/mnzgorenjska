// Smoke za shop.slff.eu: izris vseh strani brez brskalnika in baze, slovar
// (isti {parametri} v sl in en, brez praznih nizov), košarica.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SejaProvider } from './src/seja'
import { Okvir } from './src/Okvir'
import { Katalog, KarticaIzdelka, MrezaIzdelkov } from './src/strani/Katalog'
import { Izdelek, IzdelekView, Predogled } from './src/strani/Izdelek'
import { barveMotiva, ekipaPrevelika, izPrimera, moznost, PoljeVnosa, prikazVrednosti, stanjePostave, type StanjePostave } from './src/strani/Konfigurator'
import { MrezaMotivov, Pahljaca, Personalizirano, SkupineMotivov, skupinaMotiva, vProdaji } from './src/strani/Personalizirano'
import { VarnaStran } from './src/App'
import { homografija, matrika, trakoviValja } from './src/mockup'
import { cenaKosa, Kosarica, motivaNi, ociscena, SlikaMotiva, stripeNaslov } from './src/strani/Kosarica'
import { Hvala } from './src/strani/Hvala'
import { Narocila } from './src/strani/Narocila'
import { Pogoji } from './src/strani/Pogoji'
import { Odstop, mailOdstopa } from './src/strani/Odstop'
import { Prijava, varnaPot } from './src/strani/Prijava'
import { Admin, Dobavnica, Nalepka, zaPakiranje } from './src/strani/Admin'
import { barveNiti, csvSerije, datotekeTiska, dpiZa, PogledSerije, prenesiVse, ROB, sDpi, svgDatoteke, svgMotiva, svgZaTisk } from './src/strani/AdminTisk'
import { doplaciloIz, KarticaMotiva, type MotivAdmin } from './src/strani/AdminMotivi'
import { zahtevaBona } from './src/strani/AdminBoni'
import { PREHODI, povzetekPostavk, stripePovezava, ZnackaStanja } from './src/strani/AdminVsaNarocila'
import { vCente, varnoIme } from './src/strani/AdminIzdelki'
import { EN, SL, TELEFON, cena, type Kljuc } from './src/besede'
import { dodaj, kljuc, kosov, nastavi, odstrani, postnina, preberi, PRAZNA, skupaj } from './src/kosarica'
import { celicaCsv, doplacilo, letoNaprej, napakaImena, napakaPolja, oblikaSvg, stabilno, stevilka, veljavnaOblika } from './src/personalizacija'
import { barveIzPolj, coneMotiva, kontrast, narisiKose, narisiMotiv, oblikujDatum, poljaCone, praznaCona, sirinaBesedila, velikostMm, zVgrajenoPisavo } from './src/risba'
import { MOTIVI } from './src/motivi'
import { readFileSync } from 'node:fs'
import type { Cona, Izdelek as TIzdelek, IzdelekKataloga, MotivIzdelka, MotivKataloga, NarociloAdmin, PoljeMotiva, Postava, PostavkaNarocila, PostavkaTiska, PrimerMotiva, Serija, ShemaMotiva } from './src/baza'

let napak = 0
const preveri = (opis: string, ok: boolean, dodatno = '') => {
  if (!ok) napak++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${opis}${ok || !dodatno ? '' : ` (${dodatno})`}`)
}

const izris = (pot: string, vzorec: string, stran: ReactNode): string =>
  renderToString(
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

const strani: [string, string, ReactNode][] = [
  ['/', '/', <Katalog />],
  ['/p/majica', '/p/:slug', <Izdelek />],
  ['/personalised', '/personalised', <Personalizirano />],
  ['/cart', '/cart', <Kosarica />],
  ['/thanks?n=AB12CD34', '/thanks', <Hvala />],
  ['/orders', '/orders', <Narocila />],
  ['/terms', '/terms', <Pogoji />],
  ['/withdrawal', '/withdrawal', <Odstop />],
  ['/login', '/login', <Prijava />],
  ['/login?next=/admin', '/login', <Prijava />],
  ['/admin', '/admin', <Admin />],
]
for (const [pot, vzorec, stran] of strani) {
  try {
    preveri(`izris ${pot}`, izris(pot, vzorec, stran).includes(SL['app.znacka']))
  } catch (e) {
    preveri(`izris ${pot}`, false, String(e))
  }
}

const pogoji = izris('/terms', '/terms', <Pogoji />)
preveri('pogoji: prodajalec, register, telefon, ID za DDV, 14 dni, ZVPot-1, IRPS zavrnjen, brez ODR',
  ['SPACE GUARDIAN', 'SI42765153', '9850538000', 'Okrožnem sodišču v Ljubljani', TELEFON, '14 dneh', 'ZVPot-1', 'ne pristaja', 'gov.si', 'Pogoji z dne 18. 10. 2026']
    .every((s) => pogoji.includes(s))
  && !/ec\.europa\.eu\/consumers\/odr/.test(pogoji) && !pogoji.includes('sodišče v Ljubljani'))
preveri('pogoji: telefon prodajalca (pred živo prodajo)', /^\+386 [\d ]{6,}$/.test(TELEFON), 'manjka telefon prodajalca (pred živo prodajo)')
preveri('noga: telefon s povezavo tel:', pogoji.includes('href="tel:+38640773385"'))

const katalog: IzdelekKataloga[] = [
  { slug: 'majica', ime_sl: 'Majica', ime_en: 'T-shirt', kategorija: 'oblacila', slike: [], cena_od: 2500, cena_do: 2500, na_voljo: 'malo' },
  { slug: 'sal', ime_sl: 'Šal', ime_en: 'Scarf', kategorija: 'dodatki', slike: ['https://api.slff.eu/storage/v1/object/public/trgovina/sal/1.jpg'], cena_od: 2000, cena_do: 2400, na_voljo: 'ne' },
]
const mreza = renderToString(<StaticRouter location="/"><MrezaIzdelkov izdelki={katalog} /></StaticRouter>)
preveri('katalog: "od" le pri različnih cenah', mreza.includes('od 20,00') && !mreza.includes('od 25,00'))
preveri('katalog: kartice s ceno, sliko ali grbom in značko', mreza.includes('Majica') && mreza.includes('25,00') && mreza.includes('/p/sal')
  && mreza.includes('sal/1.jpg') && mreza.includes('slff-grb') && mreza.includes(SL['voljo.malo']) && mreza.includes(SL['voljo.ne']), mreza.slice(0, 300))
preveri('katalog: prazen pokaže sporočilo', renderToString(<StaticRouter location="/"><MrezaIzdelkov izdelki={[]} /></StaticRouter>).includes(SL['katalog.prazno']))

const izdelek: TIzdelek = {
  slug: 'majica', ime_sl: 'Majica', ime_en: 'T-shirt', opis_sl: 'Bombaž.', opis_en: 'Cotton.', kategorija: 'oblacila', slike: [], pismo: false,
  po_narocilu: false, digitalni: false, personalizacije: [],
  razlicice: [
    { id: 1, oznaka_sl: 'Črna / S', oznaka_en: 'Black / S', cena: 2500, na_voljo: 'da' },
    { id: 2, oznaka_sl: 'Črna / M', oznaka_en: 'Black / M', cena: 2500, na_voljo: 'ne' },
  ],
}
const stran = renderToString(<StaticRouter location="/p/majica"><IzdelekView i={izdelek} /></StaticRouter>)
preveri('izdelek: različice, razprodana onemogočena, cena', stran.includes('Črna / S') && /disabled=""[^>]*>Črna \/ M/.test(stran) && stran.includes('25,00') && !stran.includes('od 25'), stran.slice(0, 200))

preveri('cena: Intl v jeziku strani', cena(2500).replace(/\s/g, ' ') === '25,00 €', cena(2500))
preveri('stripe: le https://checkout.stripe.com', stripeNaslov('https://checkout.stripe.com/c/pay/x') && !stripeNaslov('http://checkout.stripe.com/x')
  && !stripeNaslov('https://checkout.stripe.com.evil.eu/x') && !stripeNaslov('https://billing.stripe.com/x') && !stripeNaslov('nič'))
const mail = decodeURIComponent(mailOdstopa({ oznaka: 'AB12', ime: 'Ana', naslov: 'Pot 1', eposta: 'a@b.si', izdelki: 'Majica', naroceno: '', prejeto: '2026-10-20' }, '21. oktober 2026'))
preveri('odstop: mailto z izpolnjenim obrazcem', mail.startsWith('mailto:info@slff.eu?subject=') && mail.includes('AB12') && mail.includes('Majica') && mail.includes('20. oktober 2026') && !/\{\w+\}/.test(mail), mail)

const kljuci = Object.keys(SL) as Kljuc[]
const parametri = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const razlicni = kljuci.filter((k) => parametri(SL[k]) !== parametri(EN[k]))
preveri('besede: en ima iste {parametre} kot sl', razlicni.length === 0, razlicni.join(', '))
const prazni = kljuci.filter((k) => !SL[k].trim() || !EN[k].trim())
preveri('besede: brez praznih nizov', prazni.length === 0, prazni.join(', '))
const odstavkov = (s: string) => s.split('\n\n').length
const pogojiRazlicni = kljuci.filter((k) => k.startsWith('pogoji.') && odstavkov(SL[k]) !== odstavkov(EN[k]))
preveri('besede: pogoji imajo v obeh jezikih enako odstavkov', pogojiRazlicni.length === 0, pogojiRazlicni.join(', '))

// Administracija
preveri('admin: evri v cente', vCente('25') === 2500 && vCente('25,00') === 2500 && vCente('25.00') === 2500 && vCente(' 25,5 ') === 2550
  && vCente('0,99') === 99 && vCente('12 €') === 1200
  && [ '', '0', '0,00', '-5', '25,001', '1.234,00', 'abc', '25,', ',5', '1e3'].every((v) => vCente(v) === null))
preveri('admin: next le pot na istem izvoru', varnaPot('/admin') === '/admin' && varnaPot('/admin?x=1') === '/admin?x=1'
  && [null, '', 'admin', '//evil.eu', '/\\evil.eu', 'https://evil.eu/x', 'javascript:alert(1)', '/..//evil.eu', '/.//evil.eu'].every((v) => varnaPot(v) === null))
preveri('admin: varno ime datoteke', varnoIme('Majica Črna (1).JPG') === 'majica-crna-1-.jpg' && varnoIme('../../x.png') === 'x.png' && varnoIme('čšž') === 'csz')
const narocilo: NarociloAdmin = {
  id: 1, javna_oznaka: 'AB12CD34', stanje: 'placano', email: 'a@b.si', ime: 'Ana Novak', jezik: 'sl',
  naslov: { name: 'Ana Novak', line1: 'Glavna 1', line2: null, postal_code: '10000', city: 'Zagreb', country: 'HR' },
  znesek_postavke: 2500, znesek_dostava: 990, znesek_ddv: 600, znesek_skupaj: 3490, dostava_kljuc: 'paket_eu', sledilna: null, manjka: 1,
  placano_at: '2026-10-18T10:00:00Z', poslano_at: null, created_at: '2026-10-18T09:55:00Z',
  postavke: [{ id: 1, razlicica_id: 1, sku: 'MAJ-CRN-S', ime: 'Majica (Črna / S)', cena: 2500, doplacilo: 0, kolicina: 1, personalizacija: null, stanje_tiska: null, po_narocilu: false, digitalni: false }],
}
const nalepka = renderToString(<Nalepka n={narocilo} />)
preveri('admin: nalepka 100×150 mm s pošiljateljem in prejemnikom', ['100mm 150mm', 'SPACE GUARDIAN d.o.o.', 'Ulica Hermana Potočnika 5', '1000 Ljubljana', 'Ana Novak', 'Glavna 1', '10000 Zagreb', 'Croatia'].every((v) => nalepka.includes(v)), nalepka.slice(0, 300))
const dobavnica = renderToString(<Dobavnica n={narocilo} />)
preveri('admin: dobavnica s postavkami', ['AB12CD34', 'MAJ-CRN-S', 'Majica (Črna / S)', SL['admin.tisk.dobavnica']].every((v) => dobavnica.includes(v)))

// Košarica
let k = dodaj(PRAZNA, 1, 2, 'majica')
k = dodaj(k, 1, 3, 'majica')
k = dodaj(k, 5, 1, 'sal')
preveri('kosarica: dodaj sešteje isto različico', k.postavke.length === 2 && k.postavke[0].kolicina === 5 && kosov(k) === 6)
preveri('kosarica: največ 20 na vrstico', dodaj(k, 1, 99, 'majica').postavke[0].kolicina === 20 && nastavi(k, '1|', 50).postavke[0].kolicina === 20)
preveri('kosarica: nastavi 0 in odstrani zbrišeta vrstico', nastavi(k, '5|', 0).postavke.length === 1 && odstrani(k, '1|').postavke.length === 1)
preveri('kosarica: neveljavna količina se ne doda', dodaj(PRAZNA, 1, 0, 'x').postavke.length === 0 && dodaj(PRAZNA, 1, -3, 'x').postavke.length === 0)
const polna = Array.from({ length: 20 }, (_, n) => n + 1).reduce((a, id) => dodaj(a, id, 1, 's'), PRAZNA)
preveri('kosarica: največ 20 vrstic', dodaj(polna, 99, 1, 's').postavke.length === 20)
const zn = dodaj(dodaj(PRAZNA, 9, 1, 'znacka', { znacka: {} }, undefined, 1), 9, 1, 'znacka', { znacka: {} }, undefined, 1)
preveri('kosarica: značka ostane en kos tudi ob drugem kliku', zn.postavke.length === 1 && zn.postavke[0].kolicina === 1
  && nastavi(zn, kljuc(zn.postavke[0]), 2, 1).postavke[0].kolicina === 1)
preveri('kosarica: skupaj v centih, brez neznane cene', skupaj(k, { '1|': 2500 }) === 12500 && skupaj(k, { '1|': 2500, '5|': 2000 }) === 14500)
preveri('kosarica: preberi zavrne smeti', preberi('{"postavke":[{"razlicica_id":"1","slug":"a","kolicina":1},{"razlicica_id":2,"slug":"b","kolicina":99}],"drzava":"US"}').postavke.length === 1
  && preberi('{"postavke":[{"razlicica_id":2,"slug":"b","kolicina":99}]}').postavke[0].kolicina === 20
  && preberi('{"drzava":"US"}').drzava === 'SI' && preberi('{"drzava":"HR"}').drzava === 'HR'
  && preberi('{"postavke":[{"razlicica_id":3,"slug":"c","kolicina":1},{"razlicica_id":3,"slug":"c","kolicina":5}]}').postavke.length === 1
  && preberi('ni json').postavke.length === 0 && preberi(null).drzava === 'SI' && preberi('[1]').postavke.length === 0)
preveri('kosarica: poštnina (pismo le v SI)', postnina('SI', true) === 150 && postnina('SI', false) === 390 && postnina('HR', true) === 990)
const cista = ociscena({ postavke: [{ razlicica_id: 1, slug: 'majica', kolicina: 1 }, { razlicica_id: 2, slug: 'majica', kolicina: 1 }, { razlicica_id: 9, slug: 'ni', kolicina: 1 }], drzava: 'AT' }, { majica: izdelek, ni: null })
preveri('kosarica: po zavrnitvi ostane le, kar je na voljo', cista.postavke.length === 1 && cista.postavke[0].razlicica_id === 1 && cista.drzava === 'AT')

// Personalizacija
preveri('pers: ime 1–12 znakov, črke s šumniki, presledek, pika, vezaj, vsaj ena črka',
  ['Ana', 'Žan Novak', 'J.-P. Šuc', '  Ana   Bo  ', 'ÉÖøž', 'Abcdefghijkl'].every((v) => napakaImena(v) === null)
  && napakaImena('') === 'pers.napaka.prazno' && napakaImena('   ') === 'pers.napaka.prazno' && napakaImena('Abcdefghijklm') === 'pers.napaka.dolgo'
  && ['Ana1', '...', '- .', 'A<b>', 'Ana_', 'Ⅻ', 'Ана', '😀'].every((v) => napakaImena(v) === 'pers.napaka.znaki'))
preveri('pers: številka 0–99', stevilka('0') === 0 && stevilka(' 7 ') === 7 && stevilka('99') === 99
  && ['100', '-1', '1.5', '', 'a', '1e1', '07a'].every((v) => stevilka(v) === null))
const moznosti = [{ vrsta: 'poljubno_ime' as const, doplacilo: 500, obvezna: true }, { vrsta: 'stevilka' as const, doplacilo: 300, obvezna: false }]
preveri('pers: doplačilo le za izbrane možnosti', doplacilo(moznosti, undefined) === 0 && doplacilo(moznosti, { poljubno_ime: 'Ana' }) === 500
  && doplacilo(moznosti, { poljubno_ime: 'Ana', stevilka: 7 }) === 800)
preveri('pers: oblika vnosa iz shrambe', veljavnaOblika({ poljubno_ime: 'Ana', stevilka: 7 }) !== null && veljavnaOblika({ prvak: { mini_liga_id: 1, sezona: '2025/26' } }) !== null
  && veljavnaOblika({ znacka: {} }) !== null && veljavnaOblika({ ime_ekipe: 3 }) !== null
  && [null, [], {}, { x: 1 }, { stevilka: 100 }, { stevilka: '7' }, { ime_ekipe: '3' }, { prvak: { sezona: 1 } }, { znacka: { ime: 'X' } }].every((v) => veljavnaOblika(v) === null))
preveri('pers: stabilen ključ ne glede na vrstni red', stabilno({ b: 1, a: { d: 2, c: 'x' } }) === stabilno({ a: { c: 'x', d: 2 }, b: 1 }))

let kp = dodaj(PRAZNA, 7, 1, 'majica-ime', { poljubno_ime: 'Ana', stevilka: 7 }, 'Ana · 7')
kp = dodaj(kp, 7, 1, 'majica-ime', { poljubno_ime: 'Bor' }, 'Bor')
kp = dodaj(kp, 7, 2, 'majica-ime', { stevilka: 7, poljubno_ime: 'Ana' }, 'Ana · 7')
kp = dodaj(kp, 7, 1, 'majica-ime')
preveri('kosarica: ista različica z drugim besedilom je druga vrstica', kp.postavke.length === 3 && kp.postavke[0].kolicina === 3 && kp.postavke[1].kolicina === 1
  && kljuc(kp.postavke[0]) !== kljuc(kp.postavke[1]) && kljuc(kp.postavke[2]) === '7|')
preveri('kosarica: odstrani le izbrano vrstico', odstrani(kp, kljuc(kp.postavke[1])).postavke.map((p) => p.opis ?? '').join() === 'Ana · 7,')
const shranjena = preberi(JSON.stringify(kp))
preveri('kosarica: personalizacija preživi shrambo', shranjena.postavke.length === 3 && shranjena.postavke[0].personalizacija?.poljubno_ime === 'Ana'
  && shranjena.postavke[0].opis === 'Ana · 7' && shranjena.postavke[2].personalizacija === undefined)
preveri('kosarica: neveljavna personalizacija iz shrambe zavržena', preberi(JSON.stringify({ postavke: [
  { razlicica_id: 1, slug: 'a', kolicina: 1, personalizacija: { stevilka: 500 } },
  { razlicica_id: 1, slug: 'a', kolicina: 1, personalizacija: { poljubno_ime: 'Ana' } },
  { razlicica_id: 1, slug: 'a', kolicina: 2, personalizacija: { poljubno_ime: 'Ana' } },
] })).postavke.length === 1)

const majicaIme: TIzdelek = {
  ...izdelek, slug: 'majica-ime', ime_sl: 'Majica z imenom', po_narocilu: true,
  personalizacije: moznosti,
  razlicice: [{ id: 7, oznaka_sl: 'Črna / M', oznaka_en: 'Black / M', cena: 2500, na_voljo: 'da' }],
}
preveri('kosarica: cena kosa z doplačilom', cenaKosa({ 'majica-ime': majicaIme }, kp.postavke[0]) === 3300 && cenaKosa({ 'majica-ime': majicaIme }, kp.postavke[2]) === 2500
  && cenaKosa({}, kp.postavke[0]) === null)
const izrisi = (i: TIzdelek) => renderToString(<StaticRouter location={`/p/${i.slug}`}><SejaProvider><IzdelekView i={i} /></SejaProvider></StaticRouter>)
const stranPers = izrisi(majicaIme)
preveri('izdelek: obrazec personalizacije, doplačila, brez odstopa, rok izdelave, gumb onemogočen',
  [SL['pers.poljubno_ime'], SL['pers.stevilka'], '+5,00', '+3,00', SL['pers.neobvezno'], SL['izdelek.brezOdstopa'], SL['izdelek.poNarocilu'], SL['pers.imeNamig']].every((v) => stranPers.includes(v))
  && !stranPers.includes(SL['izdelek.odstop']) && /disabled=""[^>]*>Dodaj v košarico/.test(stranPers), [SL['pers.poljubno_ime'], SL['pers.stevilka'], '+5,00', '+3,00', SL['pers.neobvezno'], SL['izdelek.brezOdstopa'], SL['izdelek.poNarocilu'], SL['pers.imeNamig']].filter((v) => !stranPers.includes(v)).join(' / ') + (stranPers.match(/.{80}Dodaj v ko/)?.[0] ?? ''))
const ekipa: TIzdelek = { ...majicaIme, slug: 'majica-ekipa', personalizacije: [{ vrsta: 'ime_ekipe', doplacilo: 500, obvezna: true }] }
const prvak: TIzdelek = { ...majicaIme, slug: 'majica-prvak', personalizacije: [{ vrsta: 'prvak', doplacilo: 0, obvezna: true }] }
preveri('izdelek: ime ekipe in prvak brez prijave zahtevata prijavo', [ekipa, prvak].every((i) => {
  const h = izrisi(i)
  return h.includes(SL['pers.prijava']) && h.includes(`/login?next=/p/${i.slug}`)
}))
const bon: TIzdelek = { ...izdelek, slug: 'darilni-bon', digitalni: true, razlicice: [{ id: 9, oznaka_sl: '20 €', oznaka_en: '€20', cena: 2000, na_voljo: 'da' }] }
const stranBon = izrisi(bon)
preveri('izdelek: darilni bon po e-pošti, brez dostave', stranBon.includes(SL['izdelek.digitalni']) && stranBon.includes(SL['izdelek.bon']) && !stranBon.includes(SL['izdelek.dostava']))
const pred = renderToString(<Predogled alt="x" ime="Žan <b>&" st={7} />)
preveri('predogled: besedilo in številka čez sliko, ubežano', pred.includes('<svg') && pred.includes('ŽAN &lt;B&gt;&amp;') && pred.includes('>7</text>') && !pred.includes('<b>'), pred)
preveri('predogled: brez besedila ni plasti', !renderToString(<Predogled alt="x" ime={null} st={null} />).includes('<svg'))

// Tisk in boni (admin)
const svg = oblikaSvg(`A<b>&"'`, 10)
preveri('tisk: SVG ubeži besedilo, številka, pisava', svg.startsWith('<?xml') && svg.includes('A&lt;B&gt;&amp;&quot;&apos;') && !svg.includes('<b>') && svg.includes('>10</text>')
  && svg.includes('Inter') && !oblikaSvg('Ana', null).includes('</text><text') && oblikaSvg(null, 5).includes('>5</text>'))
preveri('tisk: CSV celica (narekovaji, formula)', celicaCsv('a"b') === '"a""b"' && celicaCsv('=1+1') === `"'=1+1"` && celicaCsv('-2') === `"'-2"`
  && celicaCsv('@x') === `"'@x"` && celicaCsv(null) === '""' && celicaCsv(7) === '"7"' && celicaCsv('a;b\nc') === '"a;b\nc"')
const serija: Serija = {
  id: 3, created_at: '2026-10-18T10:00:00Z', poslana_at: null, natisnjena_at: null,
  postavke: [
    { postavka_id: 11, stanje_tiska: 'v_seriji', narocilo_id: 1, javna_oznaka: 'AB12CD34', placano_at: null, sku: 'MIS-CRN-M', ime: 'Majica (Črna / M)', kolicina: 2, personalizacija: { vrsta: 'poljubno_ime', ime: 'Žan "Z"', stevilka: 7 } },
    { postavka_id: 12, stanje_tiska: 'v_seriji', narocilo_id: 2, javna_oznaka: 'EF56GH78', placano_at: null, sku: 'MIE-BEL-S', ime: 'Majica (Bela / S)', kolicina: 1, personalizacija: { vrsta: 'ime_ekipe', ime: '=Tigri' } },
  ],
}
const csv = csvSerije(serija)
const vrsticeCsv = csv.split('\r\n')
preveri('tisk: CSV serije (BOM, glava, ubežano, ime SVG)', csv.startsWith('﻿"Naročilo";"Postavka";"Šifra"') && vrsticeCsv.length === 4
  && vrsticeCsv[1] === '"AB12CD34";"11";"MIS-CRN-M";"Majica (Črna / M)";"2";"Žan ""Z""";"7";"AB12CD34-11.svg";"";"";"";"";"";"";"";"";""'
  && vrsticeCsv[2].includes(`"'=Tigri";""`), vrsticeCsv.slice(0, 3).join(' | '))
const pogledSerije = renderToString(<PogledSerije s={serija} />)
preveri('admin: pogled serije s predogledi', pogledSerije.includes('Serija 3') && pogledSerije.includes('AB12CD34') && pogledSerije.includes('data:image/svg+xml') && pogledSerije.includes('EF56GH78'))
// Izvoz motiva za tisk: prava velikost cone, prirez, rezilne oznake, pisava
{
  const conaT = (kljuc: string, barva: string | null, sirina_mm: number, visina_mm: number): Cona => ({ kljuc, barva, slika: '', koti: [[0, 0], [1, 0], [1, 1], [0, 1]], sirina_mm, visina_mm })
  const motivna: PostavkaTiska = {
    postavka_id: 13, stanje_tiska: 'v_seriji', narocilo_id: 3, javna_oznaka: 'IJ90KL12', placano_at: null, sku: 'MPM-BEL-M', ime: 'Majica po meri', kolicina: 1,
    personalizacija: { motiv: 'retro-dres', shema: 'retro', polja: { ime: 'Novak', stevilka: 9, sponzor: 'Bar Offside', leto: null }, ime: 'Retro dres · Novak · 9 · Bar Offside' },
    razlicica: 'Bela / M', postopek: 'dtf', barve: ['#C8102E', '#F6C700', '#3A0A0F'],
    cone: [conaT('hrbet', 'Črna', 300, 400), conaT('hrbet', 'Bela', 300, 400), conaT('prsi', 'Črna', 250, 110), conaT('prsi', 'Bela', 260, 120)],
  }
  const dat = datotekeTiska(motivna)
  preveri('tisk motiva: datoteka na neprazno cono, ime <oznaka>-<cona>-<postopek>-<n>, mere cone nosilca te barve',
    dat.map((d) => `${d.ime}:${d.mm.sirina}x${d.mm.visina}`).join() === 'IJ90KL12-hrbet-dtf-13:300x400,IJ90KL12-prsi-dtf-13:260x120'
    && datotekeTiska({ ...motivna, personalizacija: { ...motivna.personalizacija, polja: { ime: 'Novak', stevilka: 9 } } }).length === 1
    && datotekeTiska(serija.postavke[0]!).length === 0, dat.map((d) => `${d.ime}:${d.mm.sirina}x${d.mm.visina}`).join())
  const list = svgZaTisk(motivna, dat[1]!)
  const S = 260 + 2 * ROB
  const V = 120 + 2 * ROB
  const odseki = [...(/<path d="([^"]+)"[^>]*data-oznake="rez"/.exec(list)?.[1] ?? '').matchAll(/M([\d.]+) ([\d.]+)([VH])([\d.]+)/g)]
  // Vsaka oznaka leži na črti reza (rob cone) in zunaj prireza (3 mm), znotraj lista.
  const zunaj = odseki.every(([, x, y, smer, konec]) => {
    const navpicna = smer === 'V'
    const [a, b] = navpicna ? [Number(y), Number(konec)] : [Number(x), Number(konec)]
    const meja = navpicna ? V : S
    const naCrti = navpicna ? [ROB, S - ROB].includes(Number(x)) : [ROB, V - ROB].includes(Number(y))
    return naCrti && Math.min(a, b) >= 0 && Math.max(a, b) <= meja && (Math.max(a, b) <= ROB - 3 || Math.min(a, b) >= meja - ROB + 3)
  })
  preveri('tisk motiva: list v mm s prirezom 3 mm in 8 rezilnimi oznakami zunaj prireza',
    list.startsWith('<?xml') && list.includes(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}mm" height="${V}mm" viewBox="0 0 ${S} ${V}">`)
    && ROB >= 3 + 5 && list.includes(`<svg x="${ROB}" y="${ROB}" width="260" height="120" overflow="visible"`)
    && odseki.length === 8 && zunaj && list.includes('#C8102E') && list.includes('BAR OFFSIDE'), list.slice(0, 400))
  const sPisavo = await zVgrajenoPisavo(list)
  preveri('tisk motiva: SVG ima vgrajeno pisavo Anton', /^<\?xml[^>]*>\n<svg [^>]*><style>@font-face\{font-family:Anton;src:url\(data:font\/ttf;base64,/.test(sPisavo))
  const csvM = csvSerije({ ...serija, postavke: [motivna] }).split('\r\n')
  preveri('tisk motiva: CSV vrstica na cono s stolpci motiv, postopek, cona',
    csvM[0]!.endsWith('"SVG";"Motiv";"Postopek";"Cona";"PNG";"PNG DTF";"Kos";"Mere (mm)";"DPI";"Barve niti"') && csvM.length === 4
    && csvM[1]!.endsWith('"IJ90KL12-hrbet-dtf-13.svg";"retro-dres";"dtf";"hrbet";"IJ90KL12-hrbet-dtf-13.png";"IJ90KL12-hrbet-dtf-13-dtf.png";"";"300 × 400";"300";""') && csvM[2]!.includes('"prsi"'), csvM.join(' | '))
  const { crc32 } = await import('node:zlib')
  const lazni = new Uint8Array(45)
  lazni.set([0x89, 0x50, 0x4e, 0x47], 0)
  const png = new Uint8Array(await sDpi(lazni).arrayBuffer())
  const dv = new DataView(png.buffer)
  preveri('tisk motiva: PNG dobi pHYs 300 dpi za IHDR', png.length === 66 && String.fromCharCode(...png.subarray(37, 41)) === 'pHYs'
    && dv.getUint32(41) === 11811 && dv.getUint32(45) === 11811 && png[49] === 1 && dv.getUint32(50) === crc32(png.subarray(37, 50))
    && (await sDpi(png).arrayBuffer()).byteLength === 66)
  preveri('tisk motiva: pHYs 150 dpi (velika sublimacija)', new DataView(await sDpi(lazni, 150).arrayBuffer()).getUint32(41) === 5906)
  const posnetek: PostavkaTiska = { ...motivna, personalizacija: { ...motivna.personalizacija, barve: ['#123456', '#ABCDEF', '#000000'], cone: { hrbet: { sirina_mm: 280, visina_mm: 380 } } } }
  const datP = datotekeTiska(posnetek)
  preveri('tisk motiva: posnetek ob nakupu ima prednost pred živimi conami in barvami',
    datP.map((d) => `${d.cona}:${d.mm.sirina}x${d.mm.visina}`).join() === 'hrbet:280x380,prsi:260x120'
    && svgZaTisk(posnetek, datP[0]!).includes('#123456') && !svgZaTisk(posnetek, datP[0]!).includes('#C8102E'))
  const dtf = svgMotiva(motivna, dat[1]!)
  preveri('tisk motiva: DTF le motiv v pravi velikosti, brez prireza in oznak',
    /^<svg\b[^>]*\swidth="260mm"/.test(dtf) && /^<svg\b[^>]*\sheight="120mm"/.test(dtf) && !dtf.includes('data-oznake') && dtf.includes('BAR OFFSIDE'))
  const tuj: PostavkaTiska = { ...motivna, postavka_id: 14, personalizacija: { ...motivna.personalizacija, motiv: 'ni-predloge' } }
  const pogledTuj = renderToString(<PogledSerije s={{ ...serija, postavke: [tuj, motivna] }} />)
  preveri('tisk motiva: motiv brez predloge ne podre pogleda in nima datotek',
    datotekeTiska(tuj).length === 0 && pogledTuj.includes('ni-predloge') && pogledTuj.includes('IJ90KL12-prsi-dtf-13')
    && csvSerije({ ...serija, postavke: [tuj] }).split('\r\n')[1]!.endsWith('"";"";"ni-predloge";"dtf";"";"";"";"";"";"";""'))
  preveri('tisk motiva: pogled serije pokaže cone', renderToString(<PogledSerije s={{ ...serija, postavke: [motivna] }} />).includes('IJ90KL12-prsi-dtf-13 · 260 × 120 mm'))
  // V Node ni <canvas>: vsak PNG pade, kot v iOS Safariju PNG hrbta. Ostale datoteke gredo naprej.
  const shranjene: string[] = []
  const neuspele = await prenesiVse({ ...serija, postavke: [motivna, serija.postavke[0]!] }, (ime) => { shranjene.push(ime) })
  preveri('tisk: neuspela datoteka ne ustavi serije, neuspele so naštete',
    shranjene.join() === 'IJ90KL12-hrbet-dtf-13.svg,IJ90KL12-prsi-dtf-13.svg,AB12CD34-11.svg'
    && neuspele.join() === 'IJ90KL12-hrbet-dtf-13.png,IJ90KL12-hrbet-dtf-13-dtf.png,IJ90KL12-prsi-dtf-13.png,IJ90KL12-prsi-dtf-13-dtf.png', `${shranjene.join()} | ${neuspele.join()}`)
}
const pn = (x: Partial<PostavkaNarocila>): PostavkaNarocila => ({ ...narocilo.postavke[0], ...x })
const nar = (postavke: PostavkaNarocila[]): NarociloAdmin => ({ ...narocilo, postavke })
preveri('admin: za pakiranje le, ko je vse v paketu na zalogi ali natisnjeno',
  zaPakiranje(nar([pn({})])) && zaPakiranje(nar([pn({}), pn({ id: 2, stanje_tiska: 'natisnjeno' })]))
  && !zaPakiranje(nar([pn({}), pn({ id: 2, stanje_tiska: 'za_tisk' })])) && !zaPakiranje(nar([pn({ stanje_tiska: 'v_seriji' })]))
  && !zaPakiranje(nar([pn({ digitalni: true })])) && !zaPakiranje(nar([pn({ personalizacija: { vrsta: 'znacka', ime: 'Ana' } })]))
  && zaPakiranje(nar([pn({}), pn({ id: 2, digitalni: true }), pn({ id: 3, personalizacija: { vrsta: 'znacka', ime: 'Ana' } })])))
const dobavnicaMesana = renderToString(<Dobavnica n={nar([pn({ personalizacija: { vrsta: 'poljubno_ime', ime: 'Ana', stevilka: 7 }, stanje_tiska: 'natisnjeno' }), pn({ id: 2, ime: 'Darilni bon (20 €)', digitalni: true })])} />)
preveri('admin: dobavnica brez bonov, s personalizacijo', dobavnicaMesana.includes('Ana · 7') && !dobavnicaMesana.includes('Darilni bon'))
preveri('admin vsa: Stripe povezava po nacinu seje',
  stripePovezava('pi_1', 'cs_test_a').url === 'https://dashboard.stripe.com/test/payments/pi_1' && stripePovezava('pi_1', 'cs_test_a').znanNacin
  && stripePovezava('pi_1', 'cs_live_a').url === 'https://dashboard.stripe.com/payments/pi_1'
  && !stripePovezava('pi_1', null).znanNacin && stripePovezava('pi_1', null).url === 'https://dashboard.stripe.com/payments/pi_1')
preveri('admin vsa: prehodi kot v bazi (poslano le iz placano/v_izdelavi, konec brez dejanj)',
  JSON.stringify(PREHODI) === JSON.stringify({ placano: ['v_izdelavi', 'poslano', 'preklicano'],
    v_izdelavi: ['placano', 'poslano', 'preklicano'], poslano: ['dostavljeno'] }))
preveri('admin vsa: znacka stanja in povzetek postavk',
  renderToString(<ZnackaStanja stanje="v_izdelavi" />).includes(SL['admin.stanje.v_izdelavi'])
  && povzetekPostavk(nar([pn({}), pn({ id: 2, kolicina: 2, ime: 'Nalepka' })])) === '1 × Majica (Črna / S), 2 × Nalepka')
preveri('admin: zahteva bona (odstotek ali znesek, uporab, rok)',
  JSON.stringify(zahtevaBona('scout', 'odstotek', '20', '10', '2026-12-31')) === '{"za":"scout","odstotek":20,"uporab":10,"do":"2026-12-31"}'
  && zahtevaBona('preverjen', 'znesek', '5,50', '1', '2026-12-31')?.znesek === 550
  && [['odstotek', '0', '1', '2026-12-31'], ['odstotek', '101', '1', '2026-12-31'], ['znesek', '0', '1', '2026-12-31'], ['odstotek', '20', '0', '2026-12-31'],
    ['odstotek', '20', '1001', '2026-12-31'], ['odstotek', '20', '1', '']].every(([v, a, b, c]) => zahtevaBona('scout', v as 'odstotek', a, b, c) === null))
preveri('pogoji: rok izdelave, darilni boni, popusti, personalizacija v zasebnosti',
  ['1–2 tednih', 'Darilni bon je koda', 'ostanek ne ostane', 'gotovino', 'promocijskimi kodami', 'besedilo personalizacije'].every((v) => pogoji.includes(v)))

// Motivi: predloge ↔ seme v migraciji (polja po conah, barve shem), ubežanje, dolge in kratke vrednosti
{
  // Urejen XML brez razčlenjevalnika: oznake v paru, v besedilu ni golega '<' ali '&', atributi v narekovajih.
  const urejenXml = (surovo: string): boolean => {
    const x = surovo.replace(/<!--[^]*?-->/g, '')
    const sklad: string[] = []
    const ent = /&(?!(?:amp|lt|gt|quot|apos|#\d+);)/
    let zadnji = 0
    for (const m of x.matchAll(/<[^>]*>/g)) {
      const vmes = x.slice(zadnji, m.index)
      if (vmes.includes('<') || ent.test(vmes)) return false
      zadnji = m.index! + m[0].length
      const o = /^<(\/?)([\w:-]+)((?:\s+[\w:-]+="[^"<]*")*)\s*(\/?)>$/.exec(m[0])
      if (!o || ent.test(o[3]!)) return false
      if (o[1]) { if (sklad.pop() !== o[2]) return false } else if (!o[4]) sklad.push(o[2]!)
    }
    return sklad.length === 0 && !x.slice(zadnji).includes('<')
  }
  preveri('motivi: preverjanje XML zavrne pokvarjeno', urejenXml('<svg><text a="1">x &amp; y</text></svg>') && !urejenXml('<svg><text>a < b</text></svg>')
    && !urejenXml('<svg><g></svg>') && !urejenXml('<svg><text>a & b</text></svg>'))
  const sql = readFileSync(new URL('../supabase/migrations/20261019080000_trgovina_motivi.sql', import.meta.url), 'utf8')
  const seme = sql.slice(sql.indexOf('insert into trgovina.motivi (slug'))
  type PoljeSemena = { kljuc: string; vrsta: string; max?: number; cona?: string }
  const semena = [...seme.matchAll(/^\('([a-z0-9-]+)',[\s\S]*?\n '([a-z]+)',\n '(\[[\s\S]*?\])',\n '(\[[\s\S]*?\])',/gm)]
    .map((m) => ({ slug: m[1]!, cona: m[2]!, polja: JSON.parse(m[3]!) as PoljeSemena[], sheme: JSON.parse(m[4]!) as { barve: string[] }[] }))
  preveri('motivi: seme prebrano, vsak motiv ima predlogo', semena.length === 6 && semena.every((x) => MOTIVI.some((m) => m.slug === x.slug)),
    semena.map((x) => x.slug).join(','))
  for (const sm of semena) {
    const m = MOTIVI.find((x) => x.slug === sm.slug)
    if (!m) continue
    const cone = [...new Set(sm.polja.map((p) => p.cona ?? sm.cona))]
    preveri(`motiv ${sm.slug}: cone in polja po conah`, m.cona === sm.cona && coneMotiva(sm.slug)[0] === sm.cona
      && JSON.stringify([...coneMotiva(sm.slug)].sort()) === JSON.stringify([...cone].sort())
      && JSON.stringify(m.polja) === JSON.stringify(sm.polja.map((p) => p.kljuc))
      && cone.every((c) => JSON.stringify(poljaCone(sm.slug, c).sort()) === JSON.stringify(sm.polja.filter((p) => (p.cona ?? sm.cona) === c).map((p) => p.kljuc).sort())),
      cone.map((c) => `${c}: ${poljaCone(sm.slug, c).join(',')}`).join(' | '))
    const barve = sm.sheme[0]!.barve
    const n = Math.max(...sm.sheme.map((s) => s.barve.length))
    preveri(`motiv ${sm.slug}: vse barve sheme (${n}) imajo mesto`, m.barve === n
      && Array.from({ length: n }, (_, i) => i + 1).every((i) => coneMotiva(sm.slug).some((c) => new RegExp(`data-(barva|crta)="${i}"`).test(m.predloge[c]!))))
    const vrednost = (p: PoljeSemena, dolgo: boolean): string | number =>
      p.vrsta === 'stevilka' ? (dolgo ? 88 : 1) : p.vrsta === 'leto' ? 1998
        : p.vrsta === 'prvak' ? (dolgo ? 'Prvak mini lige Pisarna United Kran… 2025/26' : 'Mini league champion ABC 2025/26')
          : dolgo ? 'Ž<script>&\u0001"W'.padEnd(p.max ?? 12, 'W') : 'Kos'
    for (const dolgo of [true, false]) {
      const polja = Object.fromEntries(sm.polja.map((p) => [p.kljuc, vrednost(p, dolgo)]))
      for (const c of coneMotiva(sm.slug)) {
        const out = narisiMotiv(sm.slug, polja, barve, c)
        const { sirina, visina } = velikostMm(sm.slug, c)
        const velikosti = [...out.matchAll(/font-size="([\d.]+)"/g)].map((x) => Number(x[1]))
        preveri(`motiv ${sm.slug}/${c} ${dolgo ? 'dolgo' : 'kratko'}: izris, barve, ubežano, brez oznak predloge`,
          out.startsWith('<svg') && out.includes(`viewBox="0 0 ${sirina} ${visina}"`) && out.includes(`fill="${barve[0]}"`)
          && !/<script/i.test(out) && urejenXml(out) && !out.includes('\u0001')
          && !/data-(polje|sirina|luk|oblika|velike|vrstice)/.test(out) && velikosti.every((v) => v > 4)
          && (dolgo || !out.includes('>W<')), out.slice(0, 200))
      }
    }
  }
  const rd = narisiMotiv('retro-dres', { ime: 'Novak', stevilka: 9, sponzor: '', leto: null }, ['#111', '#eee', '#000'])
  preveri('motivi: prazno neobvezno polje skrije svoj del, prazna cona', /data-ce="leto"[^>]*display="none"|display="none"[^>]*data-ce="leto"/.test(rd)
    && praznaCona('retro-dres', { sponzor: '' }, 'prsi') && !praznaCona('retro-dres', { sponzor: 'Bar' }, 'prsi'))
  preveri('motivi: neveljavna barva ne pride v atribut', narisiMotiv('kapetan', { ime: 'A', stevilka: 1 }, ['red" onload="x', '#fff', '#000']).includes('fill="#000000"')
    && !narisiMotiv('kapetan', { ime: 'A', stevilka: 1 }, ['red" onload="x', '#fff', '#000']).includes('onload'))
  const mm = narisiMotiv('retro-dres', { sponzor: 'Bar' }, ['#111', '#eee', '#000'], 'prsi', { sirina: 260, visina: 120 })
  preveri('motivi: mere cone nosilca v mm, sezona, dve vrstici, pisava', /^<svg[^>]*width="260mm"[^>]*height="120mm"|^<svg[^>]*height="120mm"[^>]*width="260mm"/.test(mm)
    && JSON.stringify(velikostMm('retro-dres')) === '{"sirina":300,"visina":400}'
    && narisiMotiv('kralj-kafane', { ime: 'A', goli: 3, sezona: 2025 }, ['#111', '#eee', '#000']).includes('>2025/26</text>')
    && (narisiMotiv('prvak-mini-lige', { prvak: 'Prvak mini lige Pisarna United Kran… 2025/26' }, ['#111', '#eee', '#000']).match(/>PISARNA<\/text>/g) ?? []).length === 2
    && (await zVgrajenoPisavo(mm)).includes('@font-face{font-family:Anton;src:url(data:font/ttf;base64,'), mm.slice(0, 300))
  const ids = (x: string): string[] => [...x.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!)
  const a = narisiMotiv('prvak-mini-lige', { prvak: 'Prvak mini lige ABC 2025/26' }, ['#111', '#eee', '#000'])
  const b = narisiMotiv('prvak-mini-lige', { prvak: 'Prvak mini lige ABC 2025/26' }, ['#111', '#eee', '#000'])
  const sklici = (x: string): string[] => [...x.matchAll(/(?:href="#|url\(#)([^")]+)/g)].map((m) => m[1]!)
  preveri('motivi: dva izrisa na isti strani brez skupnih id-jev, sklici kažejo na svoje', ids(a).length > 0 && ids(a).every((i) => !ids(b).includes(i))
    && [a, b].every((x) => sklici(x).length > 0 && sklici(x).every((r) => ids(x).includes(r))))
  preveri('motivi: prepovedani znaki XML izpuščeni', urejenXml(narisiMotiv('kapetan', { ime: 'A\u0000B\uFFFE\uD800C', stevilka: 1 }, ['#111', '#eee', '#000']))
    && narisiMotiv('kapetan', { ime: 'A\u0000B\uFFFE\uD800C', stevilka: 1 }, ['#111', '#eee', '#000']).includes('>ABC</text>'))

  // Motivi dela 2–3: predloge ↔ seme, mere con, laser (ena barva), vezenje (≤ 4 barve, črte ≥ 1 mm, črke ≥ 5 mm),
  // postava iz posnetka, dres v vseh vzorcih, podstavki po kosih in na listu, datum.
  {
    const sql23 = readFileSync(new URL('../supabase/migrations/20261019150000_trgovina_motivi_del23.sql', import.meta.url), 'utf8')
    const seme23 = sql23.slice(sql23.indexOf('insert into trgovina.motivi (slug'))
    type Polje23 = { kljuc: string; vrsta: string; max?: number; cona?: string; moznosti?: unknown[] }
    const semena23 = [...seme23.matchAll(/^\('([a-z0-9-]+)',[\s\S]*?\n '([a-z]+)',\n '(\[[\s\S]*?\])',\n '(\[[\s\S]*?\])',/gm)]
      .map((m) => ({ slug: m[1]!, cona: m[2]!, polja: JSON.parse(m[3]!) as Polje23[], sheme: JSON.parse(m[4]!) as { barve: string[] }[] }))
    const coneSeme = [...sql23.matchAll(/\('([a-z-]+)',\s+'([a-z]+)',\s+(?:null|'[^']*'),\s+'[^']*',\s+'[^']*', (\d+), (\d+)\)/g)]
      .map((m) => ({ izdelek: m[1]!, cona: m[2]!, s: Number(m[3]), v: Number(m[4]) }))
    const vezi = [...sql23.matchAll(/\('([a-z-]+)', '([a-z-]+)', \d+\)/g)].map((m) => ({ motiv: m[1]!, izdelek: m[2]! }))
    const LASER = ['tretji-polcas', 'ekipni-kozarec', 'ime-in-stevilka']
    preveri('motivi d23: seme prebrano, vsak motiv ima predlogo', semena23.length === 12 && semena23.every((x) => MOTIVI.some((m) => m.slug === x.slug))
      && coneSeme.length === 14 && vezi.length === 14 && MOTIVI.length === 6 + semena23.length, `${semena23.length} ${coneSeme.length} ${vezi.length}`)
    const barveIzhoda = (out: string): string[] => [...new Set([...out.matchAll(/\s(?:fill|stroke)="(#[0-9a-fA-F]+)"/g)].map((m) => m[1]!.toUpperCase()))]
    const st = (out: string, a: string): number[] => [...out.matchAll(new RegExp(`\\s${a}="([\\d.]+)"`, 'g'))].map((m) => Number(m[1]))
    for (const sm of semena23) {
      const m = MOTIVI.find((x) => x.slug === sm.slug)
      if (!m) continue
      // Dres: vzorec, barve in ovratnik riše vsaka cona (ves dres je potiskan).
      const vsePovsod = sm.slug === 'dres-po-meri' ? sm.polja.filter((p) => !p.cona).map((p) => p.kljuc) : []
      const cone = [...new Set(sm.polja.map((p) => p.cona ?? sm.cona))]
      preveri(`motiv ${sm.slug}: cone in polja po conah`, m.cona === sm.cona && JSON.stringify(m.polja) === JSON.stringify(sm.polja.map((p) => p.kljuc))
        && JSON.stringify([...coneMotiva(sm.slug)].sort()) === JSON.stringify([...cone].sort())
        && cone.every((c) => JSON.stringify(poljaCone(sm.slug, c).sort())
          === JSON.stringify([...new Set([...vsePovsod, ...sm.polja.filter((p) => (p.cona ?? sm.cona) === c).map((p) => p.kljuc)])].sort())),
      cone.map((c) => `${c}: ${poljaCone(sm.slug, c).join(',')}`).join(' | '))
      // Mere: predloga je cona nosilca v mm; vrč ima isto višino (motiv na sprednji strani), A2 isto razmerje kot A3.
      const zone = coneSeme.filter((z) => vezi.some((v) => v.motiv === sm.slug && v.izdelek === z.izdelek))
      preveri(`motiv ${sm.slug}: mere predloge ustrezajo conam nosilcev`, zone.length > 0 && coneMotiva(sm.slug).every((c) => {
        const { sirina, visina } = velikostMm(sm.slug, c)
        return zone.filter((z) => z.cona === c).every((z) => (z.s === sirina && z.v === visina) || Math.abs(z.s / z.v - sirina / visina) < 0.01 || (z.v === visina && z.s >= sirina))
      }), zone.map((z) => `${z.izdelek}/${z.cona} ${z.s}×${z.v}`).join(', '))
      const vrednost = (p: Polje23, dolgo: boolean): unknown =>
        p.vrsta === 'stevilka' ? (dolgo ? 88 : 1) : p.vrsta === 'leto' ? (dolgo ? 1998 : null) : p.vrsta === 'datum' ? '2026-05-17'
          : p.vrsta === 'postava' ? {}
            : p.vrsta === 'izbira' || p.vrsta === 'barva'
              ? (() => { const o = p.moznosti?.[dolgo ? p.moznosti.length - 1 : 0]; return typeof o === 'string' ? o : (o as { kljuc: string }).kljuc })()
              : dolgo ? (p.max ?? 12) > 16 ? 'Ž<script>&\u0001"W WWW'.padEnd(p.max!, 'W') : 'Ž<script>&\u0001"W'.padEnd(p.max ?? 12, 'W') : 'Kos'
      for (const [i, shema] of sm.sheme.entries()) for (const dolgo of [true, false]) {
        const polja = Object.fromEntries(sm.polja.map((p) => [p.kljuc, vrednost(p, dolgo)]))
        const barve = sm.slug === 'dres-po-meri' ? barveIzPolj(sm.polja, polja) : shema.barve
        for (const c of coneMotiva(sm.slug)) for (const jezik of ['sl', 'en'] as const) {
          const out = narisiMotiv(sm.slug, polja, barve, c, undefined, { jezik })
          const { sirina, visina } = velikostMm(sm.slug, c)
          const ok = out.startsWith('<svg') && out.includes(`viewBox="0 0 ${sirina} ${visina}"`) && !/<script/i.test(out) && urejenXml(out)
            && !out.includes('\u0001') && !/data-(polje|polja|sirina|luk|oblika|velike|vrstice|en|vzorec|izracun|postava|dres)=/.test(out)
            && !out.includes('{n}') && !out.includes('[object') && st(out, 'font-size').every((v) => v > 4)
          const laser = !LASER.includes(sm.slug) || (barveIzhoda(out).join() === barve[0]!.toUpperCase() && !/opacity|gradient/i.test(out)
            && st(out, 'stroke-width').every((w) => w >= 0.3))
          const vezenje = sm.slug !== 'vezena-ekipa' || (barveIzhoda(out).length <= 4 && !/opacity|gradient/i.test(out)
            && st(out, 'stroke-width').every((w) => w >= 1) && st(out, 'font-size').every((f) => f * 0.859 >= 5))
          if (i === 0 || !ok || !laser || !vezenje) preveri(`motiv ${sm.slug}/${c} ${dolgo ? 'dolgo' : 'kratko'} ${jezik} shema ${i}: izris, ubežano, brez oznak predloge${LASER.includes(sm.slug) ? ', laser ena barva' : ''}${sm.slug === 'vezena-ekipa' ? ', vezenje' : ''}`,
            ok && laser && vezenje, out.slice(0, 160))
        }
      }
    }

    // Postava iz posnetka (oblika v2): anonimiziran "Igralec", dolgo ime, brez točk, zamenjave, kazen.
    const igr = (priimek: string, pozicija: string, tocke: number | null, dodatno: Record<string, unknown> = {}) =>
      ({ ime: priimek, priimek, pozicija, klub: 'Lipa', tocke, kapetan: false, podkapetan: false, mnozitelj: 1, steje: true, ...dodatno })
    const posnetek = {
      ekipa: 'Sporting <b>Čevapčiči</b> Kranj', liga: 'Liga Gorjanci', sezona: '2026/27', krog: 9, formacija: '3-5-2', tocke_skupaj: 57, kazen: 4,
      zacetni: [igr('Žogec', 'GK', 6, { ime: 'Tine Žogec' }), igr('Igralec', 'DEF', 2), igr('Podajač-Presingar', 'DEF', 1), igr('Golgeter', 'DEF', null),
        igr('Bombardir', 'MID', 36, { kapetan: true, mnozitelj: 3 }), igr('Volejček', 'MID', 2, { podkapetan: true }), igr('Drsalec', 'MID', 5), igr('Ofsajdnik', 'MID', 3),
        igr('Klopčič', 'MID', 2, { zamenjava: true }), igr('Škarjevec', 'FWD', 9), igr('Penalček', 'FWD', 2)],
      klop: [igr('Žogec', 'GK', 0, { ime: 'Lovec Žogec', steje: false }), igr('Bidončič', 'DEF', 1, { steje: true }), igr('Copatar', 'MID', null, { steje: false }), igr('Prečkar', 'FWD', null, { zamenjan: true, steje: false })],
    }
    const plakat = narisiMotiv('moja-postava', { postava: posnetek }, ['#2E9E4F', '#E9F6EC', '#0B3B1E'])
    const plakatEn = narisiMotiv('moja-postava', { postava: posnetek }, ['#2E9E4F', '#E9F6EC', '#0B3B1E'], undefined, { sirina: 420, visina: 594 }, { jezik: 'en' })
    preveri('postava: 11 + 4 dresov, imena, Igralec, kapetan, podkapetan, točke, skupaj, kazen, ubežano',
      (plakat.match(/M-6 -14 Q0 -10 6 -14/g) ?? []).length === 15 && urejenXml(plakat) && plakat.includes('>IGRALEC</text>')
      && plakat.includes('>PODAJAČ-PRESINGAR</text>') && plakat.includes('>C</text>') && plakat.includes('>V</text>') && plakat.includes('>36</text>')
      && plakat.includes('>–</text>') && plakat.includes('>57</text>') && plakat.includes('>3-5-2</text>') && plakat.includes('LIGA GORJANCI · SEZONA 2026/27')
      && plakat.includes('VKLJ. −4 ZA PRESTOPE') && plakat.includes('&lt;B&gt;ČEVAPČIČI&lt;/B&gt;') && !plakat.includes('<b>')
      && (plakat.match(/opacity="\.55"/g) ?? []).length === 1 && (plakat.match(/l4 -6 l4 6 z/g) ?? []).length === 1
      && plakat.includes('>(0)</text>') && !plakat.includes('>(1)</text>') && (plakat.match(/l1\.6 1\.7/g) ?? []).length === 1
      && plakat.includes('>T. ŽOGEC</text>') && plakat.includes('>L. ŽOGEC</text>'), plakat.slice(0, 200))
    preveri('postava: brez skupnih točk "–", ne prazna celica', /font-size="10\.5"[^>]*>–<\/text>/.test(narisiMotiv('moja-postava', { postava: { ...posnetek, tocke_skupaj: null } }, ['#111', '#eee', '#000'])))
    // Geometrija: 5 v vrsti vsaj 42 mm narazen; ime na traku med obročem C (180,75) in zvezdo (282,7).
    const vrsta5 = narisiMotiv('moja-postava', { postava: { ...posnetek, zacetni: posnetek.zacetni.map((x, n) => ({ ...x, pozicija: n === 0 ? 'GK' : n < 6 ? 'MID' : 'DEF' })) } }, ['#111', '#eee', '#000'])
    const xi = [...vrsta5.matchAll(/translate\(([\d.]+) ([\d.]+)\) scale\(1\)/g)].filter((m) => m[2] === [...vrsta5.matchAll(/translate\(([\d.]+) ([\d.]+)\) scale\(1\)/g)][0]![2])
      .map((m) => Number(m[1]))
    preveri('postava: 5 igralcev v vrsti vsaj 42 mm narazen', xi.length === 5 && xi.slice(1).every((x, n) => x - xi[n]! >= 42), xi.join(','))
    const trak = narisiMotiv('kapetanski-trak', { ime: 'WWWWWWWWWWWW' }, ['#1D4ED8', '#FACC15', '#0A1A4A'])
    const imeTraku = /<text[^>]*>WWWWWWWWWWWW<\/text>/.exec(trak)?.[0] ?? ''
    const atr = (a: string): number => Number(new RegExp(`\\s${a}="([\\d.]+)"`).exec(imeTraku)?.[1] ?? NaN)
    const sirinaImena = sirinaBesedila('WWWWWWWWWWWW', atr('font-size'), atr('letter-spacing'))
    preveri('trak: dolgo ime ne seže na obroč C ne na zvezdo', atr('x') - sirinaImena / 2 > 182 && atr('x') + sirinaImena / 2 < 280, imeTraku)
    // Vsi slogani iz semena na podstavku in kozarcu ostanejo berljivi (≥ 9 mm pisave).
    for (const [slug, kljuc] of [['kafanski-komplet', 'slogan1'], ['tretji-polcas', 'slogan']] as const) {
      const moznosti = semena23.find((x) => x.slug === slug)!.polja.find((p) => p.kljuc === kljuc)!.moznosti as string[]
      const male = moznosti.filter((m) => {
        const out = narisiMotiv(slug, { ekipa: 'Q', ime: 'Q', [kljuc]: m }, ['#E8A317', '#FFF4D6', '#5A3A0A'])
        return [...out.matchAll(/font-size="([\d.]+)"[^>]*>([^<]+)<\/text>/g)].filter((x) => m.toUpperCase().includes(x[2]!)).some((x) => Number(x[1]) < 9)
      })
      preveri(`${slug}: vsi slogani ≥ 9 mm pisave`, moznosti.length > 5 && male.length === 0, male.join(', '))
    }
    preveri('postava: angleški napisi, A2 v mm, brez kazni ni vrstice', plakatEn.includes('MY LINE-UP') && plakatEn.includes('SEASON 2026/27') && plakatEn.includes('INCL. −4')
      && /width="420mm"/.test(plakatEn) && !narisiMotiv('moja-postava', { postava: { ...posnetek, kazen: 0 } }, ['#111', '#eee', '#000']).includes('ZA PRESTOPE'))
    const prazen = narisiMotiv('moja-postava', { postava: {} }, ['#111', '#eee', '#000'])
    preveri('postava: prazen ali pokvarjen posnetek se izriše brez dresov', urejenXml(prazen) && !prazen.includes('M-6 -14 Q0 -10')
      && urejenXml(narisiMotiv('moja-postava', { postava: { zacetni: [null, 5, { pozicija: 'XX', priimek: 7 }], klop: 'x' } }, ['#111', '#eee', '#000']))
      && praznaCona('moja-postava', { postava: {} }) && !praznaCona('moja-postava', { postava: posnetek }))

    // Dres: vseh 6 vzorcev, obe strani, barve dresa, napisi v kontrastni barvi.
    const dres = semena23.find((x) => x.slug === 'dres-po-meri')!
    const vzorci = (dres.polja.find((p) => p.kljuc === 'vzorec')!.moznosti as { kljuc: string }[]).map((o) => o.kljuc)
    const pd = { barva1: 'zelena', barva2: 'bela', ovratnik: 'polo', sponzor: 'Bife <Zadnji>', ime: 'Novak', stevilka: 9 }
    preveri('dres: barve iz polj (le izpolnjene, po vrsti)', JSON.stringify(barveIzPolj(dres.polja, { ...pd, barva3: 'rdeca' })) === '["#0B6B3A","#FFFFFF","#C8102E"]'
      && JSON.stringify(barveIzPolj(dres.polja, pd)) === '["#0B6B3A","#FFFFFF"]' && vzorci.length === 6)
    for (const vzorec of vzorci) {
      const spredaj = narisiMotiv('dres-po-meri', { ...pd, vzorec }, ['#0B6B3A', '#FFFFFF'], 'spredaj', { sirina: 600, visina: 750 })
      const hrbet = narisiMotiv('dres-po-meri', { ...pd, vzorec }, ['#0B6B3A', '#FFFFFF'], 'hrbet')
      preveri(`dres ${vzorec}: ves panel, grb, sponzor spredaj, ime in številka zadaj`, [spredaj, hrbet].every((x) => urejenXml(x) && x.includes('fill="#0B6B3A"') && x.includes('<rect x="0" y="0"'))
        && spredaj.includes('BIFE &lt;ZADNJI&gt;') && spredaj.includes('#0F5A36') && hrbet.includes('>NOVAK</text>') && hrbet.includes('>9</text>') && !hrbet.includes('BIFE'),
      spredaj.slice(0, 200))
    }
    // Napisi dresa berljivi pri vsakem vzorcu in paru barv iz palete: polnilo ali obroba ima kontrast ≥ 3 do vsake barve pod napisom.
    const paleta = (dres.polja.find((p) => p.kljuc === 'barva1')!.moznosti as { hex: string }[]).map((o) => o.hex)
    const neberljivi: string[] = []
    for (const vzorec of vzorci) for (const b1 of paleta) for (const b2 of paleta) for (const b3 of b1 === b2 ? [] : [null, '#FFD100']) {
      const barve = b3 ? [b1, b2, b3] : [b1, b2]
      const out = narisiMotiv('dres-po-meri', { vzorec, ovratnik: 'okrogel', ime: 'Novak', stevilka: 9 }, barve, 'hrbet')
      const oznaka = /<text\b[^>]*data-ce="ime"[^>]*>/.exec(out)?.[0] ?? ''
      const fill = /\sfill="(#[0-9A-Fa-f]+)"/.exec(oznaka)?.[1] ?? ''
      const stroke = /\sstroke="(#[0-9A-Fa-f]+)"/.exec(oznaka)?.[1]
      const pod = vzorec === 'enobarven' || vzorec === 'tanke-crte' ? [b1] : [b1, b2]
      const loci = (b: string): boolean => !!fill && Math.max(kontrast(fill, b), stroke ? kontrast(stroke, b) : 0) >= 3
      if (!pod.every(loci) || (pod.length === 1 && kontrast(fill || b1, b1) < 3)) neberljivi.push(`${vzorec} ${barve.join('/')}`)
    }
    preveri('dres: napisi berljivi pri vseh vzorcih in parih barv (kontrast ≥ 3)', neberljivi.length === 0, neberljivi.slice(0, 8).join(', '))
    const tankeBC = ['#FFFFFF,#111111', '#111111,#FFFFFF'].map((p) => narisiMotiv('dres-po-meri', { vzorec: 'tanke-crte', ovratnik: 'v', sponzor: 'Bar', ime: 'Novak', stevilka: 9 }, p.split(','), 'hrbet'))
    preveri('dres: tanke črte bela/črna in črna/bela imajo vidne napise', tankeBC.every((x, n) => {
      const o = /<text\b[^>]*data-ce="ime"[^>]*>/.exec(x)?.[0] ?? ''
      return kontrast(/\sfill="(#[0-9A-Fa-f]+)"/.exec(o)?.[1] ?? '#FFFFFF', n === 0 ? '#FFFFFF' : '#111111') >= 3
    }))
    const brez = narisiMotiv('dres-po-meri', { vzorec: 'enobarven', barva1: 'bela', barva2: 'crna', ovratnik: 'v', sponzor: '', ime: '', stevilka: null }, ['#FFFFFF', '#111111'], 'hrbet')
    preveri('dres: prazni napisi skriti, hrbet se vseeno tiska; na beli napis temen', /display="none"/.test(brez) && !praznaCona('dres-po-meri', { barva1: 'bela', ime: '' }, 'hrbet')
      && /data-ce="ime"[^>]*fill="#111111"|fill="#111111"[^>]*data-ce="ime"/.test(brez))

    // Podstavki: kos {n} izbere slogan, list ima vseh šest.
    const pod = { ekipa: 'FC Ponedeljek', slogan1: 'Tretji polčas', slogan2: 'Samo še eno', slogan3: 'Ofsajd je bil', slogan4: 'Rundo plača kapetan', slogan5: 'Third half', slogan6: 'Na pivu smo prvi' }
    const tretji = narisiMotiv('kafanski-komplet', pod, ['#E8A317', '#FFF4D6', '#5A3A0A'], undefined, undefined, { kos: 3 })
    const list = narisiKose('kafanski-komplet', pod, ['#E8A317', '#FFF4D6', '#5A3A0A'])
    const besedilo = (x: string): string => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    preveri('podstavki: kos 3 ima tretji slogan in RUNDA 3, list 6 kosov 295×195 mm', besedilo(tretji).includes('OFSAJD JE BIL') && !besedilo(tretji).includes('TRETJI POLČAS')
      && tretji.includes('>3</text>') && urejenXml(list) && (list.match(/<svg\b/g) ?? []).length === 7 && list.includes('width="295mm" height="195mm"')
      && ['TRETJI POLČAS', 'SAMO ŠE ENO', 'OFSAJD JE BIL', 'THIRD HALF', 'NA PIVU SMO PRVI'].every((s) => besedilo(list).includes(s)), besedilo(tretji).slice(0, 200))

    preveri('datum sl/en in ocena kartice', oblikujDatum('2026-05-17') === '17. maja 2026' && oblikujDatum('2026-05-17', 'en', true) === 'Sunday, 17 May 2026'
      && oblikujDatum('2026-05-17', 'sl', true) === 'nedelja, 17. maja 2026' && oblikujDatum('x') === 'x'
      && narisiMotiv('kartica-legende', { ime: 'A', pozicija: 'MID', hitrost: 88, strel: 91, podaje: 79, obramba: 45 }, ['#D4A62A', '#FFF3C4', '#4A3410']).includes('>76</text>')
      && narisiMotiv('retro-plakat-tekme', { domaci: 'A', gostje: 'B', goli_domaci: 3, goli_gostje: 2, datum: '2026-05-17' }, ['#C8102E', '#F5EBD7', '#3A0A0F'], undefined, undefined, { jezik: 'en' }).includes('SUNDAY, 17 MAY 2026'))
  }
}

// Motivi: konfigurator, vitrina, oblika vnosa
{
  const cone: Cona[] = [
    { kljuc: 'hrbet', barva: 'Črna', slika: '/nosilci/majica-crna-hrbet.webp', koti: [[530, 330], [1070, 330], [1070, 1050], [530, 1050]], sirina_mm: 300, visina_mm: 400 },
    { kljuc: 'hrbet', barva: 'Bela', slika: '/nosilci/majica-bela-hrbet.webp', koti: [[525, 320], [1065, 320], [1065, 1040], [525, 1040]], sirina_mm: 300, visina_mm: 400 },
    { kljuc: 'prsi', barva: 'Črna', slika: '/nosilci/majica-crna-spredaj.webp', koti: [[566, 430], [1034, 430], [1034, 646], [566, 646]], sirina_mm: 260, visina_mm: 120 },
    { kljuc: 'prsi', barva: 'Bela', slika: '/nosilci/majica-bela-spredaj.webp', koti: [[561, 410], [1029, 410], [1029, 626], [561, 626]], sirina_mm: 260, visina_mm: 120 },
  ]
  const sheme = [{ kljuc: 'klasika', ime_sl: 'Klasika', ime_en: 'Classic', barve: ['#1E8C45', '#F4F4F0', '#0B3B1E'] }, { kljuc: 'retro', ime_sl: 'Retro', ime_en: 'Retro', barve: ['#C8102E', '#F6C700', '#3A0A0F'] }]
  const retro: MotivIzdelka = {
    slug: 'retro-dres', ime_sl: 'Retro dres', ime_en: 'Retro kit', opis_sl: 'Kot dres iz devetdesetih.', opis_en: 'Like a nineties kit.', cona: 'hrbet', doplacilo: 800, sheme,
    polja: [
      { kljuc: 'ime', vrsta: 'besedilo', oznaka_sl: 'Ime na hrbtu', oznaka_en: 'Name on the back', max: 12, obvezno: true, privzeto: 'NOVAK' },
      { kljuc: 'stevilka', vrsta: 'stevilka', oznaka_sl: 'Številka', oznaka_en: 'Number', obvezno: true, privzeto: 9 },
      { kljuc: 'sponzor', vrsta: 'besedilo', oznaka_sl: 'Sponzor na prsih', oznaka_en: 'Chest sponsor', max: 20, obvezno: false, privzeto: 'Bife Zadnji Žvižg', cona: 'prsi' },
      { kljuc: 'leto', vrsta: 'leto', oznaka_sl: 'Ustanovljeno', oznaka_en: 'Established', obvezno: false, privzeto: 1998 },
    ],
    primeri: [
      { polja: { ime: 'KOVAČ', stevilka: 7, sponzor: 'Bar Offside', leto: 2004 }, shema: 'retro', izdelek: 'majica-po-meri', barva: 'Črna' },
      { polja: { ime: 'ZUPAN', stevilka: 10 }, shema: 'klasika', izdelek: 'majica-po-meri', barva: 'Bela' },
    ],
  }
  const hangover: MotivIzdelka = {
    slug: 'hangover-xi', ime_sl: 'Hangover XI', ime_en: 'Hangover XI', opis_sl: 'Za ekipo ob desetih.', opis_en: 'For the ten o’clock team.', cona: 'hrbet', doplacilo: 800,
    sheme: [{ kljuc: 'pivska', ime_sl: 'Pivska', ime_en: 'Lager', barve: ['#E8A317', '#FFF4D6', '#5A3A0A'] }],
    polja: [
      { kljuc: 'ekipa', vrsta: 'ekipa', oznaka_sl: 'Tvoja ekipa', oznaka_en: 'Your team', max: 24, obvezno: true },
      { kljuc: 'stevilka', vrsta: 'stevilka', oznaka_sl: 'Številka', oznaka_en: 'Number', obvezno: true, privzeto: 11 },
    ],
    primeri: [{ polja: { ekipa: 'FC Ponedeljek Zjutraj', stevilka: 11 }, shema: 'pivska', izdelek: 'majica-po-meri', barva: 'Črna' }],
  }
  const nosilec: TIzdelek = {
    ...izdelek, slug: 'majica-po-meri', ime_sl: 'Majica po meri', ime_en: 'Custom T-shirt', po_narocilu: true, postopek: 'dtf', motivi: [retro, hangover], cone,
    razlicice: [
      { id: 21, oznaka_sl: 'Črna / S', oznaka_en: 'Black / S', cena: 2700, na_voljo: 'da' },
      { id: 22, oznaka_sl: 'Črna / M', oznaka_en: 'Black / M', cena: 2700, na_voljo: 'da' },
      { id: 23, oznaka_sl: 'Bela / M', oznaka_en: 'White / M', cena: 2700, na_voljo: 'da' },
    ],
  }
  const konf = (pot: string) => renderToString(<StaticRouter location={pot}><SejaProvider><IzdelekView i={nosilec} /></SejaProvider></StaticRouter>)
  const k1 = konf('/p/majica-po-meri')
  const manjkaK = ['Retro dres', 'Hangover XI', 'Ime na hrbtu', 'Sponzor na prsih', SL['motiv.vZivo'], SL['motiv.cona.hrbet'], SL['motiv.cona.prsi'], SL['izdelek.brezOdstopa'],
    SL['izdelek.poNarocilu'], SL['motiv.primeri'], SL['motiv.zacni'], '35,00', '/nosilci/majica-crna-hrbet.webp', '>9</text>', 'feImage', SL['motiv.izberiVelikost'], 'Bela']
    .filter((v) => !k1.includes(v))
  preveri('konfigurator: motivi, polja, živ mockup (privzete vrednosti), pogled, cena z doplačilom, primeri, brez odstopa', manjkaK.length === 0, manjkaK.join(' / '))
  preveri('konfigurator: brez velikosti gumb onemogočen', /disabled=""[^>]*>Izberi velikost/.test(k1))
  const k2 = konf('/p/majica-po-meri?motiv=hangover-xi')
  preveri('konfigurator: ?motiv= izbere motiv, ekipa brez prijave zahteva prijavo, predogled z izmišljeno ekipo',
    /aria-checked="true"[^>]*>(?:(?!<\/button>).)*Hangover XI/s.test(k2) && k2.includes(SL['pers.prijava']) && k2.includes('>11</text>') && k2.includes(SL['motiv.ekipaPredogled']))
  preveri('konfigurator: neznan ?motiv= vzame prvega', /aria-checked="true"[^>]*>(?:(?!<\/button>).)*Retro dres/s.test(konf('/p/majica-po-meri?motiv=ni')))
  const iz = izPrimera(retro, { ime: 'NOVAK', stevilka: '9', sponzor: 'Bife', leto: '1998' }, retro.primeri[1]!)
  preveri('konfigurator: "Začni s tem" vpiše polja primera, manjkajoča izprazni, ekipe ne prepiše',
    JSON.stringify(iz) === '{"ime":"ZUPAN","stevilka":"10","sponzor":"","leto":""}'
    && JSON.stringify(izPrimera(hangover, { ekipa: '5', stevilka: '1' }, hangover.primeri[0]!)) === '{"ekipa":"5","stevilka":"11"}')
  preveri('konfigurator: napake polj zrcalijo bazo', napakaPolja('besedilo', 'Žan 9') === null && napakaPolja('besedilo', '') === null
    && napakaPolja('besedilo', 'A'.repeat(13)) === 'motiv.napaka.dolgo' && napakaPolja('besedilo', 'A'.repeat(20), 20) === null
    && napakaPolja('besedilo', '99') === 'motiv.napaka.znaki' && napakaPolja('besedilo', 'A<b>') === 'motiv.napaka.znaki' && napakaPolja('besedilo', "Bar & Co!") === null
    && napakaPolja('stevilka', '100') === 'pers.napaka.stevilka' && napakaPolja('stevilka', '7') === null
    && napakaPolja('leto', '1949', 12, 2026) === 'motiv.napaka.leto' && napakaPolja('leto', '2027', 12, 2026) === 'motiv.napaka.leto' && napakaPolja('leto', '1998', 12, 2026) === null)

  const vnos = { motiv: 'retro-dres', polja: { ime: 'Novak', stevilka: 9 }, shema: 'retro' }
  preveri('pers: oblika motiva iz shrambe', veljavnaOblika(vnos) !== null && veljavnaOblika({ motiv: 'hangover-xi', polja: { ekipa: 3, stevilka: 1 }, shema: 'x' }) !== null
    && veljavnaOblika({ motiv: 'prvak-mini-lige', polja: { prvak: { mini_liga_id: 1, sezona: '2025/26' } }, shema: 'zlata' }) !== null
    && [{ motiv: 'X Y', shema: 'a' }, { motiv: 'a' }, { motiv: 'a', shema: 'b', ime_ekipe: 1 }, { motiv: 'a', shema: 'b', polja: [] }, { motiv: 'a', shema: 'b', polja: { x: [1] } },
      { motiv: 'a', shema: 'b', polja: { x: { mini_liga_id: '1', sezona: 'x' } } }, { motiv: 'a', shema: 'b', polja: { x: 1.5 } }].every((v) => veljavnaOblika(v) === null))
  preveri('pers: doplačilo motiva iz izdelka', doplacilo([], vnos, [{ slug: 'retro-dres', doplacilo: 800 }]) === 800 && doplacilo([], vnos, []) === 0
    && doplacilo(moznosti, { poljubno_ime: 'Ana' }, [{ slug: 'retro-dres', doplacilo: 800 }]) === 500)
  const km = dodaj(PRAZNA, 22, 1, 'majica-po-meri', vnos, 'Retro dres · Novak · 9', 20, { ime: 'Novak', stevilka: 9 })
  const kmp = preberi(JSON.stringify(km))
  preveri('kosarica: motiv in prikaz preživita shrambo, cena z doplačilom motiva', kmp.postavke[0]?.personalizacija?.motiv === 'retro-dres' && kmp.postavke[0]?.prikaz?.ime === 'Novak'
    && cenaKosa({ 'majica-po-meri': nosilec }, kmp.postavke[0]!) === 3500
    && preberi(JSON.stringify({ postavke: [{ ...km.postavke[0], prikaz: { x: 'a'.repeat(61) } }] })).postavke[0]?.prikaz === undefined)

  const h = homografija([[0.1, 0.2], [0.6, 0.2], [0.6, 0.7], [0.1, 0.7]])
  const pr = (u: number, v: number, k: [number, number][]) => { const q = homografija(k); const w = q.g * u + q.h * v + 1; return [(q.a * u + q.b * v + q.c) / w, (q.d * u + q.e * v + q.f) / w] }
  const trapez: [number, number][] = [[0.3, 0.2], [0.7, 0.25], [0.75, 0.8], [0.25, 0.75]]
  preveri('mockup: homografija preslika vogale enotskega kvadrata v štirikotnik', Math.abs(h.g) < 1e-9 && Math.abs(h.h) < 1e-9 && Math.abs(h.a - 0.5) < 1e-9 && Math.abs(h.e - 0.5) < 1e-9
    && [[0, 0], [1, 0], [1, 1], [0, 1]].every(([u, v], i) => pr(u!, v!, trapez).every((x, j) => Math.abs(x - trapez[i]![j]!) < 1e-9))
    && matrika(trapez, 1000).startsWith('matrix3d(') && matrika(trapez, 1000).split(',').length === 16)

  const katalogMotivov: MotivKataloga[] = [retro, hangover].map(({ doplacilo: _d, ...m }) => ({
    ...m, izdelki: [{ slug: 'majica-po-meri', ime_sl: 'Majica po meri', ime_en: 'Custom T-shirt', postopek: 'dtf', doplacilo: 800, cena_od: 2700, cone }],
  }))
  const brez: MotivKataloga = { ...katalogMotivov[0]!, slug: 'legenda', izdelki: [] }
  preveri('vitrina: motiv brez aktivnega nosilca skrit', vProdaji([...katalogMotivov, brez]).map((m) => m.slug).join() === 'retro-dres,hangover-xi')
  const vitrina = renderToString(<StaticRouter location="/personalised"><MrezaMotivov motivi={katalogMotivov} /></StaticRouter>)
  preveri('vitrina: motivi s primeri na mockupu in povezavo na nosilec z izbranim motivom', vitrina.includes('/p/majica-po-meri?motiv=retro-dres') && vitrina.includes('/p/majica-po-meri?motiv=hangover-xi')
    && vitrina.includes('>7</text>') && vitrina.includes('>10</text>') && vitrina.includes('/nosilci/majica-bela-hrbet.webp') && vitrina.includes('35,00') && vitrina.includes(SL['osebno.cta']))

  // Motiv, ki je v bazi, a te izdaje trgovine še nima predloge, ne sme podreti nobene strani.
  const neznan: MotivIzdelka = { ...retro, slug: 'nov-motiv', ime_sl: 'Nov motiv', ime_en: 'New design' }
  const neznanKat: MotivKataloga = { ...katalogMotivov[0]!, slug: 'nov-motiv', ime_sl: 'Nov motiv', ime_en: 'New design' }
  const brezNapake = (f: () => string): string | null => { try { return f() } catch { return null } }
  preveri('neznan motiv: vitrina in pas v katalogu ga skrijeta in ne padeta', vProdaji([neznanKat, ...katalogMotivov]).every((m) => m.slug !== 'nov-motiv')
    && brezNapake(() => renderToString(<StaticRouter location="/"><Pahljaca motivi={[neznanKat, ...katalogMotivov]} majhna /></StaticRouter>)) !== null
    && brezNapake(() => renderToString(<StaticRouter location="/personalised"><MrezaMotivov motivi={[neznanKat]} /></StaticRouter>)) !== null)
  const zNeznanim = (motivi: MotivIzdelka[], pot = '/p/majica-po-meri?motiv=nov-motiv') =>
    brezNapake(() => renderToString(<StaticRouter location={pot}><SejaProvider><IzdelekView i={{ ...nosilec, motivi }} /></SejaProvider></StaticRouter>))
  const kn = zNeznanim([neznan, retro])
  preveri('neznan motiv: konfigurator ga izpusti in izbere znanega, sam neznan ne podre strani', kn !== null && !kn.includes('Nov motiv') && kn.includes('Retro dres')
    && zNeznanim([neznan]) !== null)
  const vrsticaN = dodaj(PRAZNA, 22, 1, 'majica-po-meri', { motiv: 'nov-motiv', polja: { ime: 'Novak' }, shema: 'klasika' }, 'Nov motiv · Novak', 20, { ime: 'Novak' }).postavke[0]!
  const kos = (i: TIzdelek) => brezNapake(() => renderToString(<StaticRouter location="/cart"><SlikaMotiva iz={i} p={vrsticaN} oznaka="Črna / M" alt="x" /></StaticRouter>))
  preveri('neznan ali umaknjen motiv v košarici: brez mockupa, z opozorilom, plačilo onemogočeno', kos({ ...nosilec, motivi: [retro, neznan] }) !== null
    && !(kos({ ...nosilec, motivi: [retro, neznan] }) ?? '').includes('feImage') && motivaNi({ ...nosilec, motivi: [retro, neznan] }, vrsticaN)
    && motivaNi(nosilec, vrsticaN) && !motivaNi(nosilec, kmp.postavke[0]!) && !motivaNi(nosilec, { razlicica_id: 1, slug: 'x', kolicina: 1 }))
  // Admin sme primere izprazniti: vitrina, pas v katalogu in konfigurator vzamejo privzete vrednosti.
  const brezPrimerov: MotivKataloga = { ...katalogMotivov[0]!, primeri: [] }
  const vitrinaBp = brezNapake(() => renderToString(<StaticRouter location="/personalised"><MrezaMotivov motivi={[brezPrimerov]} /></StaticRouter>))
  const konfBp = zNeznanim([{ ...retro, primeri: [] }], '/p/majica-po-meri')
  preveri('brez primerov: vitrina, pahljača in konfigurator ne padejo, predogled s privzetimi vrednostmi',
    (vitrinaBp ?? '').includes('>9</text>') && brezNapake(() => renderToString(<StaticRouter location="/"><Pahljaca motivi={[brezPrimerov]} majhna /></StaticRouter>)) !== null
    && (konfBp ?? '').includes('>9</text>') && !(konfBp ?? '').includes(SL['motiv.primeri']))
  const kmalu = (i: TIzdelek) => renderToString(<StaticRouter location={`/p/${i.slug}`}><SejaProvider><IzdelekView i={i} /></SejaProvider></StaticRouter>)
  const kmaluVsi = [kmalu({ ...nosilec, motivi: [] }), kmalu({ ...nosilec, motivi: [neznan] }), kmalu({ ...nosilec, cone: [] })]
  preveri('nosilec brez uporabnega motiva: "Motivi prihajajo kmalu", brez gumba za nakup',
    kmaluVsi.every((x) => x.includes(SL['izdelek.motiviKmalu']) && !x.includes(SL['izdelek.dodaj']) && !x.includes(SL['izdelek.izberi']))
    && !konf('/p/majica-po-meri').includes(SL['izdelek.motiviKmalu']))
  const motivAdmin: MotivAdmin = { ...brezPrimerov, id: 1, aktiven: false, vrstni_red: 10, doplacila: [{ izdelek_id: 5, slug: 'majica-po-meri', doplacilo: 800 }] }
  const nosilecAdmin = { id: 5, slug: 'majica-po-meri', ime_sl: 'Majica po meri', ime_en: 'Custom T-shirt', opis_sl: '', opis_en: '', kategorija: 'oblacila' as const, slike: [], tax_code: 'x',
    pismo: false, po_narocilu: true, digitalni: false, postopek: 'dtf', aktiven: true, vrstni_red: 100, razlicice: [] }
  const kartica = brezNapake(() => renderToString(<KarticaMotiva m={motivAdmin} nosilci={[nosilecAdmin, { ...nosilecAdmin, id: 6, slug: 'pulover-po-meri' }]} osvezi={async () => {}} />)) ?? ''
  preveri('admin motivi: kartica z mini predogledom, doplačilo po nosilcu, primeri kot JSON',
    kartica.includes('data:image/svg+xml') && kartica.includes('value="8"') && kartica.includes('pulover-po-meri') && kartica.includes('[]') && kartica.includes(SL['admin.neaktiven']))
  preveri('admin motivi: doplačilo iz vnosa', doplaciloIz('8') === 800 && doplaciloIz('8,5') === 850 && doplaciloIz('0') === 0 && doplaciloIz(' ') === null
    && doplaciloIz('-1') === undefined && doplaciloIz('8.123') === undefined && doplaciloIz('abc') === undefined)
  preveri('konfigurator: predolgo ime ekipe ni izbirno', ekipaPrevelika('A'.repeat(25)) && !ekipaPrevelika('A'.repeat(24)) && ekipaPrevelika('Žan Novak', 8))
  const varna = new VarnaStran({ children: null })
  varna.state = VarnaStran.getDerivedStateFromError()
  const nadomestna = renderToString(<>{varna.render()}</>)
  preveri('napaka pri izrisu: sporočilo in ponovno nalaganje namesto prazne strani', nadomestna.includes(SL['napaka.stran']) && nadomestna.includes(SL['napaka.osvezi']))
}

// Motivi dela 2–3 v trgovini: konfigurator (postava, ocene, datum, paleta dresa, format, velikost),
// mockup (valj, gravura, vezenje, okvir, podstavki, obris dresa), vitrina po skupinah, katalog.
{
  const sql = readFileSync(new URL('../supabase/migrations/20261019150000_trgovina_motivi_del23.sql', import.meta.url), 'utf8')
  const niz = String.raw`'((?:[^']|'')*)'`
  const besedilo = (x: string) => x.replace(/''/g, "'")
  const vrstice = [...sql.slice(sql.indexOf('insert into trgovina.motivi (slug')).matchAll(new RegExp(String.raw`^\('([a-z0-9-]+)', ${niz}, ${niz},\n ${niz},\n ${niz},\n '([a-z]+)',\n ${niz},\n ${niz},\n ${niz},`, 'gm'))]
  const doplacila = [...sql.matchAll(/\('([a-z-]+)', '([a-z-]+)', (\d+)\)/g)].map((m) => ({ motiv: m[1]!, izdelek: m[2]!, doplacilo: Number(m[3]) }))
  const primeriPostave = JSON.parse(besedilo(/set primeri = '([\s\S]*?)'\n where slug = 'moja-postava'/.exec(sql)![1]!)) as PrimerMotiva[]
  const motivi23: (MotivIzdelka & { izdelki: string[] })[] = vrstice.map((m) => ({
    slug: m[1]!, ime_sl: besedilo(m[2]!), ime_en: besedilo(m[3]!), opis_sl: besedilo(m[4]!), opis_en: besedilo(m[5]!), cona: m[6]!,
    polja: JSON.parse(besedilo(m[7]!)) as PoljeMotiva[], sheme: JSON.parse(besedilo(m[8]!)) as ShemaMotiva[],
    primeri: m[1] === 'moja-postava' ? primeriPostave : JSON.parse(besedilo(m[9]!)) as PrimerMotiva[],
    doplacilo: doplacila.find((d) => d.motiv === m[1])?.doplacilo ?? 0, izdelki: doplacila.filter((d) => d.motiv === m[1]).map((d) => d.izdelek),
  }))
  const cone23: (Cona & { izdelek: string })[] = [...sql.matchAll(/\('([a-z-]+)',\s+'([a-z]+)',\s+(null|'[^']*'),\s+'([^']*)',\s+'([^']*)', (\d+), (\d+)\)/g)].map((m) => ({
    izdelek: m[1]!, kljuc: m[2]!, barva: m[3] === 'null' ? null : m[3]!.slice(1, -1), slika: m[4]!, koti: JSON.parse(m[5]!) as [number, number][], sirina_mm: Number(m[6]), visina_mm: Number(m[7]),
  }))
  const motiv = (slug: string) => motivi23.find((m) => m.slug === slug)!
  preveri('d23 trgovina: seme 12 motivov s primeri, postava ima tri postave, 14 con', motivi23.length === 12 && motivi23.every((m) => m.primeri.length >= 3)
    && primeriPostave.length === 3 && cone23.length === 14, `${motivi23.length} ${cone23.length}`)

  const nosilec = (slug: string, razlicice: [string, string, number][]): TIzdelek => ({
    ...izdelek, slug, ime_sl: slug, ime_en: slug, po_narocilu: true, postopek: 'laser', cone: cone23.filter((c) => c.izdelek === slug),
    motivi: motivi23.filter((m) => m.izdelki.includes(slug)).map(({ izdelki: _i, ...m }) => ({ ...m, doplacilo: doplacila.find((d) => d.motiv === m.slug && d.izdelek === slug)!.doplacilo })),
    razlicice: razlicice.map(([sl, en, c], n) => ({ id: 900 + n, oznaka_sl: sl, oznaka_en: en, cena: c, na_voljo: 'da' as const })),
  })
  const konf = (i: TIzdelek, q = '') => renderToString(<StaticRouter location={`/p/${i.slug}${q}`}><SejaProvider><IzdelekView i={i} /></SejaProvider></StaticRouter>)

  // Dres: paleta, vzorci s sličicami, ovratnik, velikosti z doplačilom, brez sheme, sprednji in zadnji pogled.
  const dres = konf(nosilec('dres-po-meri', [['S', 'S', 4900], ['M', 'M', 4900], ['3XL', '3XL', 5400]]))
  const manjkaD = ['Glavna barva', 'Druga barva', 'Barva obrob', 'Ovratnik', 'Polo', 'Šerpa', SL['motiv.brezBarve'], SL['motiv.cona.spredaj'], SL['motiv.cona.hrbet'],
    '59,00', '+5,00', SL['motiv.velikost'], 'maska-', 'obris-', '/nosilci/dres-spredaj.webp', '/nosilci/dres-hrbet.webp', 'data:image/svg+xml', SL['motiv.izberiVelikost']]
    .filter((v) => !dres.includes(v))
  preveri('d23 dres: paleta, vzorci s sličicami, ovratnik, velikosti z doplačilom, obris majice, oba pogleda', manjkaD.length === 0, manjkaD.join(' / '))
  preveri('d23 dres: 13 barv na polje, druga barva ne sme biti enaka prvi, brez koraka barv sheme', (dres.match(/background:#/g) ?? []).length >= 39
    && /aria-disabled="true"[^>]*aria-label="Zelena: [^"]+"/.test(dres) && !/aria-label="Zelena"[^>]*disabled=""/.test(dres) && !dres.includes(SL['motiv.korak.shema']))
  preveri('d23 dres: rokavi v glavni barvi (podlaga obrisa)', /<rect width="1600" height="1600" fill="#[0-9A-Fa-f]{6}"/.test(dres))

  // Plakat: postava brez prijave (izmišljena postava, poziv k prijavi), format A3/A2 s ceno, shema.
  const plakat = konf(nosilec('plakat-po-meri', [['A3', 'A3', 2900], ['A2', 'A2', 4500]]), '?motiv=moja-postava')
  const manjkaP = [SL['motiv.postava.prijava'], SL['motiv.postava.predogled'], 'FC PONEDELJEK ZJUTRAJ', SL['motiv.format'], '29,00', '45,00', SL['motiv.korak.shema'], 'steklo-', 'Retro plakat tekme']
    .filter((v) => !plakat.includes(v))
  preveri('d23 plakat: postava brez prijave z izmišljeno postavo, A3/A2 s ceno, steklo okvirja', manjkaP.length === 0, manjkaP.join(' / '))
  preveri('d23 plakat: A3 je izbran, gumb za nakup ni onemogočen zaradi velikosti', /aria-pressed="true"[^>]*>A3/.test(plakat) && !plakat.includes(SL['motiv.izberiVelikost']))
  const retro = konf(nosilec('plakat-po-meri', [['A3', 'A3', 2900], ['A2', 'A2', 4500]]), '?motiv=retro-plakat-tekme')
  preveri('d23 retro plakat: datum kot vnos datuma', /type="date"[^>]*value="2026-05-17"|value="2026-05-17"[^>]*type="date"/.test(retro) && retro.includes('min="1950-01-01"'))

  // Kartica: ocene z drsnikom; podstavki: šest sloganov v menijih, šest kosov na fotografiji.
  const kartica = konf(nosilec('kartica-igralca', [['A5', 'A5', 1500]]))
  preveri('d23 kartica: štiri ocene z drsnikom od 1, brez koraka različice', (kartica.match(/type="range"/g) ?? []).length === 4 && kartica.includes('min="1"')
    && !kartica.includes(SL['motiv.velikost']) && kartica.includes('>76</text>'))
  const podstavki = konf(nosilec('podstavki-po-meri', [['Komplet 6', 'Set of 6', 2200]]))
  preveri('d23 podstavki: šest sloganov v menijih, šest kosov na fotografiji', (podstavki.match(/<select/g) ?? []).length === 6
    && (podstavki.match(/<svg viewBox="0 0 95 95"/g) ?? []).length >= 6 && podstavki.includes('22,00'))

  // Kozarec, odpirač, kapa: gravura na valju, temna gravura, vezenje; barva kape s krogi.
  const kozarec = konf(nosilec('kozarec-po-meri', [['0,5 l', '0.5 l', 1200]]))
  preveri('d23 kozarec: valj (40 trakov), gravura brez senčenja fotografije, 21 €', (kozarec.match(/clipPath id="trak-/g) ?? []).length >= 40
    && kozarec.includes('<use href="#motiv-') && kozarec.includes('21,00') && kozarec.includes(SL['motiv.postopek.laser']))
  const odpirac = konf({ ...nosilec('odpirac-po-meri', [['Ena velikost', 'One size', 900]]) })
  preveri('d23 odpirač: temna gravura z robom svetlobe', odpirac.includes('feOffset') && !odpirac.includes('clipPath id="trak-'))
  const kapa = konf(nosilec('kapa-po-meri', [['Črna', 'Black', 2400], ['Bela-črna', 'White-black', 2400]]))
  preveri('d23 kapa: vezenje (nit, senca), barva kape s krogoma, cena 34 €', kapa.includes('feTurbulence') && kapa.includes('feDropShadow')
    && kapa.includes('linear-gradient(135deg') && kapa.includes('34,00') && kapa.includes(SL['motiv.barva']))

  // Mockup: valj stisne motiv na vidni del (2R·sin(s/2R)), trakovi se stikajo, sredina ostane.
  const tr = trakoviValja(70, 37.6)
  const vidno = tr.at(-1)!.x0v + (tr.at(-1)!.x1 - tr.at(-1)!.x0) * tr.at(-1)!.k - tr[0]!.x0v
  preveri('d23 mockup: valj', Math.abs(vidno - 2 * 37.6 * Math.sin(35 / 37.6)) < 1e-6 && tr.every((t, n) => n === 0 || Math.abs(tr[n - 1]!.x0v + (tr[n - 1]!.x1 - tr[n - 1]!.x0) * tr[n - 1]!.k - t.x0v) < 1e-9)
    && Math.abs(tr[20]!.k - 1) < 0.01 && tr[0]!.k < 0.7, String(vidno))

  // Vrednosti, barve in napake: ime možnosti v jeziku, ekipa iz postave, barve dresa, datum in ocene kot v bazi.
  const dresM = motiv('dres-po-meri')
  preveri('d23 prikaz: ime možnosti, ekipa postave, barve dresa iz polj, sicer shema', prikazVrednosti(dresM.polja[0]!, 'serpa') === 'Šerpa'
    && prikazVrednosti(dresM.polja[1]!, 'rdeca') === 'Rdeča' && prikazVrednosti(motiv('moja-postava').polja[0]!, primeriPostave[0]!.polja.postava) === 'FC Ponedeljek Zjutraj'
    && barveMotiva(dresM, { barva1: 'rdeca', barva2: 'bela' }).length === 2 && barveMotiva(motiv('moja-postava'), {}, 'retro')[0] === '#C8102E'
    && moznost('GK').ime_en === 'GK')
  const d = new Date(2026, 9, 19)
  preveri('d23 napake: datum in ocena zrcalita bazo', napakaPolja('datum', '2026-02-30', 12, 2026, 0, d) === 'motiv.napaka.datum'
    && napakaPolja('datum', '1949-12-31', 12, 2026, 0, d) === 'motiv.napaka.datum' && napakaPolja('datum', '2027-10-20', 12, 2026, 0, d) === 'motiv.napaka.datum'
    && napakaPolja('datum', '2027-10-19', 12, 2026, 0, d) === null && napakaPolja('datum', '2026-05-17', 12, 2026, 0, d) === null
    && napakaPolja('stevilka', '0', 12, 2026, 1) === 'motiv.napaka.ocena' && napakaPolja('stevilka', '1', 12, 2026, 1) === null && napakaPolja('stevilka', '0') === null)

  // Vitrina po skupinah s sidri; kartica nosilca brez slike pokaže motiv na nosilcu.
  const kat: MotivKataloga[] = motivi23.map(({ izdelki, doplacilo: _d, ...m }) => ({ ...m, izdelki: izdelki.map((s) => ({ slug: s, ime_sl: s, ime_en: s, postopek: 'laser', doplacilo: 0, cena_od: 1000, cone: cone23.filter((c) => c.izdelek === s) })) }))
  const majice: MotivKataloga = { ...kat[0]!, slug: 'retro-dres', izdelki: [{ ...kat[0]!.izdelki[0]!, slug: 'majica-po-meri' }] }
  const skupine = renderToString(<StaticRouter location="/personalised"><SkupineMotivov motivi={[majice, ...kat]} /></StaticRouter>)
  preveri('d23 vitrina: skupine s sidri v pravem vrstnem redu', ['majice', 'dresi', 'pub', 'stena', 'dodatki'].every((k) => skupine.includes(`href="#${k}"`) && skupine.includes(`id="${k}"`))
    && ['majice', 'dresi', 'pub', 'stena', 'dodatki'].map((k) => skupine.indexOf(`id="naslov-${k}"`)).every((x, n, a) => x > 0 && (n === 0 || x > a[n - 1]!))
    && skupinaMotiva(motiv('navijaski-sal') as unknown as MotivKataloga) === 'dodatki' && skupinaMotiva({ izdelki: [] }) === 'dodatki')
  const karticaNosilca = renderToString(<StaticRouter location="/"><KarticaIzdelka i={{ slug: 'kozarec-po-meri', ime_sl: 'Kozarec', ime_en: 'Glass', kategorija: 'dom', slike: [], cena_od: 1200, cena_do: 1200, na_voljo: 'da' }} motivi={kat} /></StaticRouter>)
  preveri('d23 katalog: nosilec brez slike pokaže motiv na fotografiji nosilca', karticaNosilca.includes('/nosilci/kozarec.webp') && karticaNosilca.includes('clipPath id="trak-') && !karticaNosilca.includes('slff-grb'))

  // Postava: stanja predogleda (nalaganje, brez kroga z namigom baze, napaka s ponovitvijo, posnetek), mladinska ekipa onemogočena.
  const poljePostave = motiv('moja-postava').polja[0]!
  const ekipeP = [{ id: 1, name: 'Dinamo Kavč', mladinska: false }, { id: 2, name: 'Mladi Tigri', mladinska: true }]
  const stanje = (postava?: StanjePostave) => renderToString(<StaticRouter location="/p/plakat-po-meri"><PoljeVnosa p={poljePostave} vrednost="1" napaka={null} manjka={false}
    nastavi={() => {}} uid="u" ekipe={ekipeP} prvaki={null} slug="plakat-po-meri" besediloPrvaka={() => ''} postava={postava} znova={() => {}} /></StaticRouter>)
  const posnetek = primeriPostave[1]!.polja.postava as Postava
  preveri('d23 postava: nalaganje, brez kroga, napaka s ponovitvijo, posnetek kroga, mladinska onemogočena',
    stanje('nalagam').includes(SL['app.nalaganje']) && stanje('brezKroga').includes(SL['motiv.postava.niKroga'])
    && stanje('napaka').includes(SL['motiv.postava.znova']) && stanje(posnetek).includes(`${posnetek.krog}. krog`)
    && !stanje(posnetek).includes(SL['motiv.postava.predogled']) && stanje('nalagam').includes(SL['motiv.postava.mladinska'])
    && /disabled=""[^>]*>(?:(?!<\/button>).)*Mladi Tigri/s.test(stanje('nalagam')))
  preveri('d23 postava: brez kroga po namigu baze, ne po besedilu', stanjePostave(null, { hint: 'trgovina-postava-krog' }) === 'brezKroga'
    && stanjePostave(null, { hint: 'trgovina-personalizacija' }) === 'napaka' && stanjePostave(posnetek, null) === posnetek)
  preveri('d23 datum: leto naprej kot v bazi (29. 2. → 28. 2.)', letoNaprej(new Date(2028, 1, 29)) === '2029-02-28' && letoNaprej(new Date(2026, 9, 19)) === '2027-10-19')

  // Košarica: sličica plakata postave ima igralce (primer) in ime kupčeve ekipe; katalog: cena z doplačilom motiva.
  const plakatIz = nosilec('plakat-po-meri', [['A3', 'A3', 2900], ['A2', 'A2', 4500]])
  const vrsticaP = { razlicica_id: 900, slug: 'plakat-po-meri', kolicina: 1, personalizacija: { motiv: 'moja-postava', polja: { postava: 1 }, shema: 'igrisce' }, prikaz: { postava: 'Moji Kavčarji' } }
  const kosP = renderToString(<StaticRouter location="/cart"><SlikaMotiva iz={plakatIz} p={vrsticaP} oznaka="A3" alt="x" /></StaticRouter>)
  preveri('d23 košarica: plakat postave z igralci in imenom ekipe', kosP.includes('MOJI KAVČARJI') && kosP.includes('ŽOGEC'), kosP.slice(0, 200))
  const karticaCena = renderToString(<StaticRouter location="/"><KarticaIzdelka i={{ slug: 'kozarec-po-meri', ime_sl: 'Kozarec', ime_en: 'Glass', kategorija: 'dom', slike: [], cena_od: 1200, cena_do: 1200, na_voljo: 'da', cena_z_motivom: 2100 }} /></StaticRouter>)
  preveri('d23 katalog: nosilec pove ceno z motivom ("od 21,00")', karticaCena.includes('od 21,00') && !karticaCena.includes('>12,00'))
  const vitrinaOdp = renderToString(<StaticRouter location="/personalised"><MrezaMotivov motivi={kat.filter((m) => m.slug === 'ime-in-stevilka' || m.slug === 'navijaski-sal')} /></StaticRouter>)
  preveri('d23 vitrina: odpirač in šal povečana bližje', vitrinaOdp.includes('scale(1.9)') && vitrinaOdp.includes('scale(2.1)'))

  // Izvoz za tisk po postopku (AdminTisk): laser ena barva brez oznak, vezenje ≤ 4 barve niti,
  // dres 600 × 750 mm s prirezom v barvah kupca in 150 dpi, podstavki 6 + list, plakat iz posnetka v jeziku naročila.
  {
    const postavka = (slug: string, izdelek: string, postopek: string, primer = 0, dodatno: Partial<PostavkaTiska> = {}): PostavkaTiska => {
      const m = motiv(slug)
      const pr = m.primeri[primer]!
      return {
        postavka_id: 70, stanje_tiska: 'v_seriji', narocilo_id: 7, javna_oznaka: 'ZZ00TT11', placano_at: null, sku: 'X', ime: izdelek, kolicina: 1,
        personalizacija: { motiv: slug, shema: pr.shema, polja: pr.polja },
        razlicica: pr.barva ?? undefined, postopek, barve: (m.sheme.find((x) => x.kljuc === pr.shema) ?? m.sheme[0]!).barve,
        cone: cone23.filter((c) => c.izdelek === izdelek), ...dodatno,
      }
    }
    // Besedilo se lahko prelomi v dve vrstici: vsaka beseda mora biti na listu.
    const vsebuje = (x: string, b: string) => b.toUpperCase().split(/\s+/).filter(Boolean).every((w) => x.toUpperCase().includes(w))
    const pravokotnik = (x: string, a: Record<string, string>) => [...x.matchAll(/<rect\b[^>]*>/g)].some(([r]) => Object.entries(a).every(([k, v]) => r.includes(` ${k}="${v}"`)))
    const barveSvg = (x: string) => new Set([...x.replace(/<path [^>]*data-oznake="rez"[^>]*>/, '').matchAll(/\s(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]!).filter((b) => b !== 'none'))
    const laser = postavka('tretji-polcas', 'kozarec-po-meri', 'laser')
    const [dl] = datotekeTiska(laser)
    const svgL = svgDatoteke(laser, dl!)
    const csvL = csvSerije({ ...serija, postavke: [laser] }).split('\r\n')[1]!
    preveri('izvoz d23: laser je ena barva (črna), prava velikost, brez prireza in oznak, SVG + PNG 300 dpi',
      [...barveSvg(svgL)].join() === '#000' && svgL.startsWith('<?xml') && /^<svg\b[^>]*\swidth="70mm"/m.test(svgL.split('\n')[1]!)
      && !svgL.includes('data-oznake') && !/opacity|Gradient/.test(svgL) && csvL.endsWith(`"${dl!.ime}.png";"";"";"70 × 90";"300";""`), `${[...barveSvg(svgL)].join()} | ${csvL}`)
    const kapa = postavka('vezena-ekipa', 'kapa-po-meri', 'vezenje')
    const [dk] = datotekeTiska(kapa)
    const niti = barveNiti(svgMotiva(kapa, dk!))
    const csvK = csvSerije({ ...serija, postavke: [kapa] }).split('\r\n')[1]!
    preveri('izvoz d23: vezenje ≤ 4 ploske barve, seznam niti v CSV, brez PNG in oznak',
      niti.length >= 1 && niti.length <= 4 && barveSvg(svgDatoteke(kapa, dk!)).size <= 4 && !svgDatoteke(kapa, dk!).includes('data-oznake')
      && csvK.endsWith(`"";"";"";"100 × 50";"";"${niti.join(' ')}"`), csvK)

    const kupec = ['#0A7E3C', '#F2F2F2', '#E8B22E']
    const dresP = postavka('dres-po-meri', 'dres-po-meri', 'sublimacija', 0, { razlicica: 'M' })
    dresP.personalizacija = { ...dresP.personalizacija, polja: { ...dresP.personalizacija!.polja, vzorec: 'obroci', ime: 'Novak', stevilka: 9, sponzor: 'Bar Offside' }, barve: kupec }
    const datD = datotekeTiska(dresP)
    const listD = svgZaTisk(dresP, datD[0]!)
    const S = 600 + 2 * ROB
    const px = (mm: number) => Math.round((mm / 25.4) * dpiZa(dresP, datD[0]!))
    preveri('izvoz d23: dres spredaj in hrbet 600 × 750 mm, prirez z ozadjem do roba, oznake, barve kupca, 150 dpi (3661 × 4547 px)',
      datD.map((d) => `${d.cona}:${d.mm.sirina}x${d.mm.visina}`).join() === 'spredaj:600x750,hrbet:600x750'
      && listD.includes(`width="${S}mm" height="${750 + 2 * ROB}mm"`) && listD.includes('data-oznake="rez"')
      && pravokotnik(listD, { x: '-3', y: '-3', width: '606', height: '756', fill: '#F2F2F2' }) && pravokotnik(listD, { x: '-3', y: '40', width: '606', height: '80', fill: '#0A7E3C' })
      && svgZaTisk(dresP, datD[1]!).includes('NOVAK') && !listD.includes('NOVAK') && listD.includes('BAR OFFSIDE')
      && dpiZa(dresP, datD[0]!) === 150 && px(S) === 3661 && px(750 + 2 * ROB) === 4547 && px(S) * px(750 + 2 * ROB) < 16777216,
      listD.slice(0, 600))

    const mat = postavka('kafanski-komplet', 'podstavki-po-meri', 'sublimacija')
    const datM = datotekeTiska(mat)
    const slogani = [1, 2, 3, 4, 5, 6].map((n) => String(mat.personalizacija!.polja![`slogan${n}`] ?? ''))
    const listM = svgZaTisk(mat, datM[6]!)
    preveri('izvoz d23: podstavki 6 datotek (vsaka svoj slogan, prirez kroga) + list vseh',
      datM.length === 7 && datM.slice(0, 6).every((d, i) => d.ime.endsWith(`-k${i + 1}`) && d.mm.sirina === 95 && d.kos === i + 1)
      && datM[6]!.ime.endsWith('-list') && datM[6]!.mm.sirina === 295 && datM[6]!.mm.visina === 195
      && datM.slice(0, 6).every((d, i) => { const x = svgZaTisk(mat, d); return x.includes('r="50.5"') && vsebuje(x, slogani[i]!) })
      && new Set(datM.slice(0, 6).map((d) => svgMotiva(mat, d).replace(/-m\d+/g, ''))).size === 6
      && (listM.match(/<svg\b/g) ?? []).length === 8 && listM.includes(`width="${295 + 2 * ROB}mm"`), datM.map((d) => d.ime).join())

    const plakatT = postavka('moja-postava', 'plakat-po-meri', 'uv', 0, { jezik: 'en' })
    const [dpl] = datotekeTiska(plakatT)
    const svgPl = svgDatoteke(plakatT, dpl!)
    const posnetek = plakatT.personalizacija!.polja!.postava as { ekipa: string; zacetni: { priimek: string }[] }
    preveri('izvoz d23: plakat postave iz posnetka naročila v jeziku naročila, A3 s prirezom in oznakami, 300 dpi',
      dpl!.mm.sirina === 297 && svgPl.includes(`width="${297 + 2 * ROB}mm"`) && svgPl.includes('data-oznake="rez"')
      && vsebuje(svgPl, posnetek.ekipa) && posnetek.zacetni.every((z) => vsebuje(svgPl, z.priimek))
      && svgPl.includes('MY LINE-UP') && !svgPl.includes('MOJA POSTAVA') && dpiZa(plakatT, dpl!) === 300
      && pravokotnik(svgPl, { x: '-3', y: '-3', width: '303', height: '426' }), svgPl.slice(0, 300))
    const sal = postavka('navijaski-sal', 'sal-po-meri', 'sublimacija')
    const [ds] = datotekeTiska(sal)
    preveri('izvoz d23: šal ves trak 1400 × 180 mm v 150 dpi', ds!.mm.sirina === 1400 && ds!.mm.visina === 180 && dpiZa(sal, ds!) === 150
      && svgZaTisk(sal, ds!).includes(`width="${1400 + 2 * ROB}mm"`))
    const zast = postavka('klubska-zastavica', 'zastavica-po-meri', 'sublimacija')
    const [dz] = datotekeTiska(zast)
    const listZ = svgZaTisk(zast, dz!)
    preveri('izvoz d23: zastavica s prirezom 3 mm okoli trikotnika (ozadje in clipPath)',
      (listZ.match(/transform="translate\(150 108\.1\) scale\(1\.0278\) translate\(-150 -108\.1\)"/g) ?? []).length === 2
      && /<clipPath[^>]*><path transform="translate\(150 108\.1\)/.test(listZ) && !svgMotiva(zast, dz!).includes('scale(1.0278)'), listZ.slice(0, 500))
    const shranjene: string[] = []
    const neuspele = await prenesiVse({ ...serija, postavke: [laser, kapa, mat] }, (ime) => { shranjene.push(ime) })
    preveri('izvoz d23: prenos po postopku (laser SVG+PNG, vezenje le SVG, podstavki 7 listov)',
      shranjene.length === 1 + 1 + 7 && neuspele.length === 1 + 7 && !neuspele.some((n) => n.includes('vezenje')) && !neuspele.some((n) => n.endsWith('-dtf.png')), `${shranjene.join()} | ${neuspele.join()}`)
  }
}

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
