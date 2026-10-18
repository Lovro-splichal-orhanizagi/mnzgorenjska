// Smoke za shop.slff.eu: izris vseh strani brez brskalnika in baze, slovar
// (isti {parametri} v sl in en, brez praznih nizov), košarica.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SejaProvider } from './src/seja'
import { Okvir } from './src/Okvir'
import { Katalog, MrezaIzdelkov } from './src/strani/Katalog'
import { Izdelek, IzdelekView, Predogled } from './src/strani/Izdelek'
import { ekipaPrevelika, izPrimera } from './src/strani/Konfigurator'
import { MrezaMotivov, Pahljaca, Personalizirano, vProdaji } from './src/strani/Personalizirano'
import { VarnaStran } from './src/App'
import { homografija, matrika } from './src/mockup'
import { cenaKosa, Kosarica, motivaNi, ociscena, SlikaMotiva, stripeNaslov } from './src/strani/Kosarica'
import { Hvala } from './src/strani/Hvala'
import { Narocila } from './src/strani/Narocila'
import { Pogoji } from './src/strani/Pogoji'
import { Odstop, mailOdstopa } from './src/strani/Odstop'
import { Prijava, varnaPot } from './src/strani/Prijava'
import { Admin, Dobavnica, Nalepka, zaPakiranje } from './src/strani/Admin'
import { csvSerije, datotekeTiska, PogledSerije, prenesiVse, ROB, s300dpi, svgDtf, svgZaTisk } from './src/strani/AdminTisk'
import { doplaciloIz, KarticaMotiva, type MotivAdmin } from './src/strani/AdminMotivi'
import { zahtevaBona } from './src/strani/AdminBoni'
import { vCente, varnoIme } from './src/strani/AdminIzdelki'
import { EN, SL, TELEFON, cena, type Kljuc } from './src/besede'
import { dodaj, kljuc, kosov, nastavi, odstrani, postnina, preberi, PRAZNA, skupaj } from './src/kosarica'
import { celicaCsv, doplacilo, napakaImena, napakaPolja, oblikaSvg, stabilno, stevilka, veljavnaOblika } from './src/personalizacija'
import { coneMotiva, narisiMotiv, poljaCone, praznaCona, velikostMm, zVgrajenoPisavo } from './src/risba'
import { MOTIVI } from './src/motivi'
import { readFileSync } from 'node:fs'
import type { Cona, Izdelek as TIzdelek, IzdelekKataloga, MotivIzdelka, MotivKataloga, NarociloAdmin, PostavkaNarocila, PostavkaTiska, Serija } from './src/baza'

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
  && vrsticeCsv[1] === '"AB12CD34";"11";"MIS-CRN-M";"Majica (Črna / M)";"2";"Žan ""Z""";"7";"AB12CD34-11.svg";"";"";"";"";""'
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
    csvM[0]!.endsWith('"SVG";"Motiv";"Postopek";"Cona";"PNG";"PNG DTF"') && csvM.length === 4
    && csvM[1]!.endsWith('"IJ90KL12-hrbet-dtf-13.svg";"retro-dres";"dtf";"hrbet";"IJ90KL12-hrbet-dtf-13.png";"IJ90KL12-hrbet-dtf-13-dtf.png"') && csvM[2]!.includes('"prsi"'), csvM.join(' | '))
  const { crc32 } = await import('node:zlib')
  const lazni = new Uint8Array(45)
  lazni.set([0x89, 0x50, 0x4e, 0x47], 0)
  const png = new Uint8Array(await s300dpi(lazni).arrayBuffer())
  const dv = new DataView(png.buffer)
  preveri('tisk motiva: PNG dobi pHYs 300 dpi za IHDR', png.length === 66 && String.fromCharCode(...png.subarray(37, 41)) === 'pHYs'
    && dv.getUint32(41) === 11811 && dv.getUint32(45) === 11811 && png[49] === 1 && dv.getUint32(50) === crc32(png.subarray(37, 50))
    && (await s300dpi(png).arrayBuffer()).byteLength === 66)
  const posnetek: PostavkaTiska = { ...motivna, personalizacija: { ...motivna.personalizacija, barve: ['#123456', '#ABCDEF', '#000000'], cone: { hrbet: { sirina_mm: 280, visina_mm: 380 } } } }
  const datP = datotekeTiska(posnetek)
  preveri('tisk motiva: posnetek ob nakupu ima prednost pred živimi conami in barvami',
    datP.map((d) => `${d.cona}:${d.mm.sirina}x${d.mm.visina}`).join() === 'hrbet:280x380,prsi:260x120'
    && svgZaTisk(posnetek, datP[0]!).includes('#123456') && !svgZaTisk(posnetek, datP[0]!).includes('#C8102E'))
  const dtf = svgDtf(motivna, dat[1]!)
  preveri('tisk motiva: DTF le motiv v pravi velikosti, brez prireza in oznak',
    /^<svg\b[^>]*\swidth="260mm"/.test(dtf) && /^<svg\b[^>]*\sheight="120mm"/.test(dtf) && !dtf.includes('data-oznake') && dtf.includes('BAR OFFSIDE'))
  const tuj: PostavkaTiska = { ...motivna, postavka_id: 14, personalizacija: { ...motivna.personalizacija, motiv: 'ni-predloge' } }
  const pogledTuj = renderToString(<PogledSerije s={{ ...serija, postavke: [tuj, motivna] }} />)
  preveri('tisk motiva: motiv brez predloge ne podre pogleda in nima datotek',
    datotekeTiska(tuj).length === 0 && pogledTuj.includes('ni-predloge') && pogledTuj.includes('IJ90KL12-prsi-dtf-13')
    && csvSerije({ ...serija, postavke: [tuj] }).split('\r\n')[1]!.endsWith('"";"";"ni-predloge";"dtf";"";"";""'))
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
  preveri('motivi: seme prebrano, vsak motiv ima predlogo', semena.length === 6 && semena.every((x) => MOTIVI.some((m) => m.slug === x.slug))
    && MOTIVI.length === semena.length, semena.map((x) => x.slug).join(','))
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

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
