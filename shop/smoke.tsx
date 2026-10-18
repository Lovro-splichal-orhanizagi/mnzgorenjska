// Smoke za shop.slff.eu: izris vseh strani brez brskalnika in baze, slovar
// (isti {parametri} v sl in en, brez praznih nizov), košarica.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SejaProvider } from './src/seja'
import { Okvir } from './src/Okvir'
import { Katalog, MrezaIzdelkov } from './src/strani/Katalog'
import { Izdelek, IzdelekView } from './src/strani/Izdelek'
import { Kosarica, ociscena, stripeNaslov } from './src/strani/Kosarica'
import { Hvala } from './src/strani/Hvala'
import { Narocila } from './src/strani/Narocila'
import { Pogoji } from './src/strani/Pogoji'
import { Odstop, mailOdstopa } from './src/strani/Odstop'
import { Prijava, varnaPot } from './src/strani/Prijava'
import { Admin, Dobavnica, Nalepka } from './src/strani/Admin'
import { vCente, varnoIme } from './src/strani/AdminIzdelki'
import { EN, SL, TELEFON, cena, type Kljuc } from './src/besede'
import { dodaj, kosov, nastavi, odstrani, postnina, preberi, PRAZNA, skupaj } from './src/kosarica'
import type { Izdelek as TIzdelek, IzdelekKataloga, NarociloAdmin } from './src/baza'

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
  && [null, '', 'admin', '//evil.eu', '/\\evil.eu', 'https://evil.eu/x', 'javascript:alert(1)'].every((v) => varnaPot(v) === null))
preveri('admin: varno ime datoteke', varnoIme('Majica Črna (1).JPG') === 'majica-crna-1-.jpg' && varnoIme('../../x.png') === 'x.png' && varnoIme('čšž') === 'csz')
const narocilo: NarociloAdmin = {
  id: 1, javna_oznaka: 'AB12CD34', stanje: 'placano', email: 'a@b.si', ime: 'Ana Novak', jezik: 'sl',
  naslov: { name: 'Ana Novak', line1: 'Glavna 1', line2: null, postal_code: '10000', city: 'Zagreb', country: 'HR' },
  znesek_postavke: 2500, znesek_dostava: 990, znesek_ddv: 600, znesek_skupaj: 3490, dostava_kljuc: 'paket_eu', sledilna: null, manjka: 1,
  placano_at: '2026-10-18T10:00:00Z', poslano_at: null, created_at: '2026-10-18T09:55:00Z',
  postavke: [{ razlicica_id: 1, sku: 'MAJ-CRN-S', ime: 'Majica (Črna / S)', cena: 2500, kolicina: 1 }],
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
preveri('kosarica: največ 20 na vrstico', dodaj(k, 1, 99, 'majica').postavke[0].kolicina === 20 && nastavi(k, 1, 50).postavke[0].kolicina === 20)
preveri('kosarica: nastavi 0 in odstrani zbrišeta vrstico', nastavi(k, 5, 0).postavke.length === 1 && odstrani(k, 1).postavke.length === 1)
preveri('kosarica: neveljavna količina se ne doda', dodaj(PRAZNA, 1, 0, 'x').postavke.length === 0 && dodaj(PRAZNA, 1, -3, 'x').postavke.length === 0)
const polna = Array.from({ length: 20 }, (_, n) => n + 1).reduce((a, id) => dodaj(a, id, 1, 's'), PRAZNA)
preveri('kosarica: največ 20 vrstic', dodaj(polna, 99, 1, 's').postavke.length === 20)
preveri('kosarica: skupaj v centih, brez neznane cene', skupaj(k, { 1: 2500 }) === 12500 && skupaj(k, { 1: 2500, 5: 2000 }) === 14500)
preveri('kosarica: preberi zavrne smeti', preberi('{"postavke":[{"razlicica_id":"1","slug":"a","kolicina":1},{"razlicica_id":2,"slug":"b","kolicina":99}],"drzava":"US"}').postavke.length === 1
  && preberi('{"postavke":[{"razlicica_id":2,"slug":"b","kolicina":99}]}').postavke[0].kolicina === 20
  && preberi('{"drzava":"US"}').drzava === 'SI' && preberi('{"drzava":"HR"}').drzava === 'HR'
  && preberi('{"postavke":[{"razlicica_id":3,"slug":"c","kolicina":1},{"razlicica_id":3,"slug":"c","kolicina":5}]}').postavke.length === 1
  && preberi('ni json').postavke.length === 0 && preberi(null).drzava === 'SI' && preberi('[1]').postavke.length === 0)
preveri('kosarica: poštnina (pismo le v SI)', postnina('SI', true) === 150 && postnina('SI', false) === 390 && postnina('HR', true) === 990)
const cista = ociscena({ postavke: [{ razlicica_id: 1, slug: 'majica', kolicina: 1 }, { razlicica_id: 2, slug: 'majica', kolicina: 1 }, { razlicica_id: 9, slug: 'ni', kolicina: 1 }], drzava: 'AT' }, { majica: izdelek, ni: null })
preveri('kosarica: po zavrnitvi ostane le, kar je na voljo', cista.postavke.length === 1 && cista.postavke[0].razlicica_id === 1 && cista.drzava === 'AT')

console.log(napak === 0 ? '\nVSE OK' : `\n${napak} NAPAK`)
process.exit(napak === 0 ? 0 : 1)
