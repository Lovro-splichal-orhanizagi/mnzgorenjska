import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { crc32, deflateRawSync } from 'node:zlib'
import { aplikacija as aplikacijaSk } from './src/i18n/sk/aplikacija.ts'
import { aplikacija as aplikacijaHr } from './src/i18n/hr/aplikacija.ts'
import { aplikacija as aplikacijaCs } from './src/i18n/cs/aplikacija.ts'
import { aplikacija as aplikacijaHu } from './src/i18n/hu/aplikacija.ts'
import { aplikacija as aplikacijaDe } from './src/i18n/de/aplikacija.ts'
import { aplikacija as aplikacijaSr } from './src/i18n/sr/aplikacija.ts'
import { aplikacija as aplikacijaRo } from './src/i18n/ro/aplikacija.ts'
import { aplikacija as aplikacijaEt } from './src/i18n/et/aplikacija.ts'
import { aplikacija as aplikacijaPl } from './src/i18n/pl/aplikacija.ts'
import { aplikacija as aplikacijaEs } from './src/i18n/es/aplikacija.ts'
import { aplikacija as aplikacijaLv } from './src/i18n/lv/aplikacija.ts'
import { aplikacija as aplikacijaMk } from './src/i18n/mk/aplikacija.ts'
import { aplikacija as aplikacijaEl } from './src/i18n/el/aplikacija.ts'
import { aplikacija as aplikacijaTr } from './src/i18n/tr/aplikacija.ts'
import { aplikacija as aplikacijaUk } from './src/i18n/uk/aplikacija.ts'
import { aplikacija as aplikacijaHy } from './src/i18n/hy/aplikacija.ts'
import { aplikacija as aplikacijaAz } from './src/i18n/az/aplikacija.ts'
import { aplikacija as aplikacijaDa } from './src/i18n/da/aplikacija.ts'
import { aplikacija as aplikacijaEn } from './src/i18n/en/aplikacija.ts'
import { sl } from './src/i18n/sl/index.ts'
import { sk } from './src/i18n/sk/index.ts'
import { hr } from './src/i18n/hr/index.ts'
import { cs } from './src/i18n/cs/index.ts'
import { hu } from './src/i18n/hu/index.ts'
import { de } from './src/i18n/de/index.ts'
import { sr } from './src/i18n/sr/index.ts'
import { ro } from './src/i18n/ro/index.ts'
import { et } from './src/i18n/et/index.ts'
import { pl } from './src/i18n/pl/index.ts'
import { es } from './src/i18n/es/index.ts'
import { lv } from './src/i18n/lv/index.ts'
import { mk } from './src/i18n/mk/index.ts'
import { el } from './src/i18n/el/index.ts'
import { tr } from './src/i18n/tr/index.ts'
import { uk } from './src/i18n/uk/index.ts'
import { hy } from './src/i18n/hy/index.ts'
import { az } from './src/i18n/az/index.ts'
import { da } from './src/i18n/da/index.ts'
import { en } from './src/i18n/en/index.ts'

/**
 * V zgrajeno stran zapiše commit, iz katerega je nastala.
 *
 * Brez tega ni načina, da bi od zunaj preverili, KAJ je pravzaprav v zraku.
 * To ni teoretično: povezava med Vercelom in GitHubom se je 3. septembra
 * podrla (repozitorij se je preimenoval, Vercel je obdržal staro pot) in
 * produkcija je dva dni tiho stregla staro različico. Nič ni javilo napake —
 * deploy se preprosto ni zgodil. Zdaj to ujame `preveri-deploy` v CI.
 */
function shaCommita() {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    (() => {
      try {
        return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
          .toString()
          .trim()
      } catch {
        return ''
      }
    })()
  )
}

function znamkaCommita() {
  const sha = shaCommita()
  return {
    name: 'znamka-commita',
    transformIndexHtml(html) {
      if (!sha) return html
      return html.replace(
        '</head>',
        `    <meta name="slff-commit" content="${sha}" />\n  </head>`,
      )
    },
  }
}

/**
 * Različice `index.html` za kartico ob deljenju (sk.html, hr.html, cz.html, hu.html, at.html, rs.html, ro.html, ee.html, pl.html, es.html, lv.html, mk.html,
 * gr.html, tr.html, ua.html, am.html, az.html, dk.html, gb.html, mt.html, me.html, ba.html, md.html, jp.html, hk.html,
 * th.html, gi.html).
 *
 * Facebook, WhatsApp in iskalniki JS ne poženejo in vidijo le statični HTML —
 * slovenski. Klub, ki deli povezavo `slff.eu/club/…?t=sk-…`, bi objavil
 * "Fantasy liga za slovenske medobčinske lige". Build zato poleg index.html
 * zapiše še sk.html in hr.html z jezikom in opisi države; vercel.json ju vrne
 * za `/sk`, `/hr` in poti z `?t=sk-…`, `?t=hr-…`. Aplikacija je ista, zamenjan
 * je le <head>.
 */
function karticeDrzav() {
  let izhod = 'dist'
  // Kartica ob deljenju (og:) mora biti v statičnem HTML: Facebook in WhatsApp
  // ga bereta brez JS. Za vsako državo zunaj Slovenije zapišemo svoj HTML.
  const DRZAVE = [
    { koda: 'sk', jezik: 'sk', locale: 'sk_SK', n: aplikacijaSk.naslovStrani },
    { koda: 'hr', jezik: 'hr', locale: 'hr_HR', n: aplikacijaHr.naslovStrani },
    // Češka: datoteka po kodi države (/cz, ?t=cz-…), jezik je cs.
    { koda: 'cz', jezik: 'cs', locale: 'cs_CZ', n: aplikacijaCs.naslovStrani },
    // Madžarska: koda države in jezika sta ista (/hu, ?t=hu-…).
    { koda: 'hu', jezik: 'hu', locale: 'hu_HU', n: aplikacijaHu.naslovStrani },
    // Avstrija: datoteka po kodi države (/at, ?t=at-…), jezik je de.
    { koda: 'at', jezik: 'de', locale: 'de_AT', n: aplikacijaDe.naslovStrani },
    { koda: 'de', jezik: 'de', locale: 'de_DE', n: aplikacijaDe.naslovStrani },
    // Srbija: datoteka po kodi države (/rs, ?t=rs-…), jezik je sr v latinici.
    { koda: 'rs', jezik: 'sr-Latn', locale: 'sr_RS', n: aplikacijaSr.naslovStrani },
    // Romunija: datoteka po kodi države (/ro, ?t=ro-…), jezik je ro.
    { koda: 'ro', jezik: 'ro', locale: 'ro_RO', n: aplikacijaRo.naslovStrani },
    // Estonija: datoteka po kodi države (/ee, ?t=ee-…), jezik je et.
    { koda: 'ee', jezik: 'et', locale: 'et_EE', n: aplikacijaEt.naslovStrani },
    // Poljska: datoteka po kodi države (/pl, ?t=pl-…), jezik je pl.
    { koda: 'pl', jezik: 'pl', locale: 'pl_PL', n: aplikacijaPl.naslovStrani },
    // Španija: datoteka po kodi države (/es, ?t=es-…), jezik je es.
    { koda: 'es', jezik: 'es', locale: 'es_ES', n: aplikacijaEs.naslovStrani },
    // Latvija: datoteka po kodi države (/lv, ?t=lv-…), jezik je lv.
    { koda: 'lv', jezik: 'lv', locale: 'lv_LV', n: aplikacijaLv.naslovStrani },
    // Severna Makedonija: datoteka po kodi države (/mk, ?t=mk-…), jezik je mk.
    { koda: 'mk', jezik: 'mk', locale: 'mk_MK', n: aplikacijaMk.naslovStrani },
    // Grčija: datoteka po kodi države (/gr, ?t=gr-…), jezik je el.
    { koda: 'gr', jezik: 'el', locale: 'el_GR', n: aplikacijaEl.naslovStrani },
    // Turčija: koda države in jezika sta isti (/tr, ?t=tr-…).
    { koda: 'tr', jezik: 'tr', locale: 'tr_TR', n: aplikacijaTr.naslovStrani },
    // Ukrajina: datoteka po kodi države (/ua, ?t=ua-…), jezik je uk (ne Združeno kraljestvo).
    { koda: 'ua', jezik: 'uk', locale: 'uk_UA', n: aplikacijaUk.naslovStrani },
    // Armenija: datoteka po kodi države (/am, ?t=am-…), jezik je hy.
    { koda: 'am', jezik: 'hy', locale: 'hy_AM', n: aplikacijaHy.naslovStrani },
    // Azerbajdžan: koda države in jezika sta isti (/az, ?t=az-…).
    { koda: 'az', jezik: 'az', locale: 'az_AZ', n: aplikacijaAz.naslovStrani },
    // Danska: datoteka po kodi države (/dk, ?t=dk-…), jezik je da.
    { koda: 'dk', jezik: 'da', locale: 'da_DK', n: aplikacijaDa.naslovStrani },
    // Združeno kraljestvo (Anglija, Škotska) in Malta: angleščina.
    { koda: 'gb', jezik: 'en-GB', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    { koda: 'mt', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    // Črna gora: srbščina v latinici; Bosna in Hercegovina: hrvaščina; Moldavija: romunščina.
    { koda: 'me', jezik: 'sr-Latn', locale: 'sr_RS', n: aplikacijaSr.naslovStrani },
    { koda: 'ba', jezik: 'hr', locale: 'hr_HR', n: aplikacijaHr.naslovStrani },
    { koda: 'md', jezik: 'ro', locale: 'ro_RO', n: aplikacijaRo.naslovStrani },
    // Japonska, Hongkong, Tajska, Gibraltar, San Marino: angleški vmesnik (lastnega slovarja ni).
    { koda: 'jp', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    { koda: 'hk', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    { koda: 'th', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    { koda: 'gi', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
    { koda: 'sm', jezik: 'en', locale: 'en_GB', n: aplikacijaEn.naslovStrani },
  ]
  const zamenjaj = (html, datoteka, atribut, ime, vsebina) => {
    const re = new RegExp(`(<meta ${atribut}="${ime}" content=")[^"]*(")`)
    if (!re.test(html)) throw new Error(`${datoteka}: v index.html manjka <meta ${atribut}="${ime}">`)
    return html.replace(re, `$1${vsebina.replace(/"/g, '&quot;')}$2`)
  }
  return {
    name: 'kartice-drzav',
    apply: 'build',
    configResolved(c) {
      izhod = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const osnova = readFileSync(resolve(izhod, 'index.html'), 'utf8')
      for (const { koda, jezik, locale, n } of DRZAVE) {
        const d = `${koda}.html`
        let html = osnova.replace('<html lang="sl">', `<html lang="${jezik}">`)
        html = zamenjaj(html, d, 'name', 'description', n.opis)
        html = zamenjaj(html, d, 'property', 'og:description', n.deljenje)
        html = zamenjaj(html, d, 'property', 'og:locale', locale)
        html = zamenjaj(html, d, 'property', 'og:url', `https://slff.eu/${koda}`)
        html = zamenjaj(html, d, 'name', 'twitter:description', n.deljenjeKratko)
        writeFileSync(resolve(izhod, d), html)
      }
    },
  }
}

/**
 * Nizi za strežnik HTML (scripts/hetzner/html/streznik.mjs): naslov, opis in
 * povzetek strani igralca, kluba, tekme in lestvice v jeziku države lige.
 * Strežnik slovarjev v .ts ne bere, zato build zapiše le te ključe v
 * `dist/html-besede.json`; kar jeziku manjka, pride iz slovenščine.
 */
function besedeZaHtml() {
  const KLJUCI = [
    'aplikacija.naslovStrani.osnova', 'aplikacija.naslovStrani.zStranjo', 'aplikacija.naslovStrani.deljenjeKratko', 'aplikacija.naslovStrani.ligeDrzave', 'aplikacija.niStrani.naslov', 'aplikacija.noga.zvezeSplosno',
    'skupno.besede', 'skupno.pozicija',
    'tekme.tabela.naslov', 'tekme.tabela.zavihek', 'tekme.tabela.uvod', 'tekme.tabela.stolpci', 'tekme.tabela.stolpciStrelcev', 'tekme.tabela.strelci',
    'tekme.rezultati.naslov', 'tekme.rezultati.uvod', 'tekme.tekma.naslov',
    'igralci.seznam.naslov', 'igralci.profil.naslov', 'igralci.preverjen.znacka', 'lestvice.lestvica.naslov', 'lestvice.klub.naslov',
    // Mini lige (kartica ob deljenju) in slike za predogled (scripts/hetzner/predogledi/).
    'lestvice.vstop.naslov', 'lestvice.vstop.naslovLiga', 'lestvice.vstop.miniLiga', 'lestvice.javneLige.pridruziSe',
    'skupno.pozicijaKratko', 'skupno.cena', 'igralci.kartica.stat', 'igralci.kartica.tockVSezoni',
    'lestvice.krog', 'lestvice.mesto', 'lestvice.plakat.najvecTock', 'lestvice.plakat.izNasihIgralcev',
  ]
  const SLOVARJI = { sl, sk, hr, cs, hu, de, sr, ro, et, pl, es, lv, mk, el, tr, uk, hy, az, da, en }
  const vzemi = (drevo, kljuc) => kljuc.split('.').reduce((d, k) => d?.[k], drevo)
  let izhod = 'dist'
  return {
    name: 'besede-za-html',
    apply: 'build',
    configResolved(c) {
      izhod = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const besede = {}
      for (const [jezik, slovar] of Object.entries(SLOVARJI)) {
        besede[jezik] = {}
        for (const k of KLJUCI) {
          const izvor = vzemi(sl, k)
          if (izvor === undefined) throw new Error(`besede-za-html: ključa ${k} ni v slovenščini`)
          const prevod = vzemi(slovar, k)
          // Veja (stolpci, pozicije) se dopolni po listih, list pride cel.
          besede[jezik][k] = typeof izvor === 'object' && !('other' in izvor) ? { ...izvor, ...prevod } : (prevod ?? izvor)
        }
      }
      writeFileSync(resolve(izhod, 'html-besede.json'), JSON.stringify(besede))
    },
  }
}

/** Najmanjši zip (deflate) brez odvisnosti: lokalne glave, imenik, konec. */
function zip(datoteke) {
  const deli = [], imenik = []
  let odmik = 0
  for (const { ime, vsebina } of datoteke) {
    const imeB = Buffer.from(ime), stisnjeno = deflateRawSync(vsebina), crc = crc32(vsebina)
    const glava = Buffer.alloc(30)
    glava.writeUInt32LE(0x04034b50, 0); glava.writeUInt16LE(20, 4); glava.writeUInt16LE(0x0800, 6)
    glava.writeUInt16LE(8, 8); glava.writeUInt32LE(crc, 14); glava.writeUInt32LE(stisnjeno.length, 18)
    glava.writeUInt32LE(vsebina.length, 22); glava.writeUInt16LE(imeB.length, 26)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8)
    c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16); c.writeUInt32LE(stisnjeno.length, 20)
    c.writeUInt32LE(vsebina.length, 24); c.writeUInt16LE(imeB.length, 28); c.writeUInt32LE(odmik, 42)
    deli.push(glava, imeB, stisnjeno); imenik.push(c, imeB)
    odmik += 30 + imeB.length + stisnjeno.length
  }
  const im = Buffer.concat(imenik), konec = Buffer.alloc(22)
  konec.writeUInt32LE(0x06054b50, 0); konec.writeUInt16LE(datoteke.length, 8); konec.writeUInt16LE(datoteke.length, 10)
  konec.writeUInt32LE(im.length, 12); konec.writeUInt32LE(odmik, 16)
  return Buffer.concat([...deli, im, konec])
}

/**
 * Posodobitev mobilne aplikacije mimo trgovine (OTA, src/lib/ota.ts).
 *
 * Vsak build zapiše `dist/app/<commit>.zip` (vsa stran brez grbov — 35 MB, ki
 * jih aplikacija bere s slff.eu) in `dist/app/latest.json`. Ob objavi na
 * Vercel aplikacija najde novo različico in jo naloži ob naslednjem zagonu.
 * `minBuild` (package.json `slff.otaMinBuild`) je najnižja številka gradnje
 * iz trgovine, ki to kodo zmore — dvigni ga, ko koda zahteva nov vtičnik ali
 * drugo nativno spremembo, sicer bi stara aplikacija naložila kodo, ki pri
 * njej ne dela.
 */
function otaSvezenj() {
  let izhod = 'dist'
  return {
    name: 'ota-svezenj',
    apply: 'build',
    configResolved(c) {
      izhod = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const sha = shaCommita()
      if (!sha) return
      const izpusti = (rel) => /^(grbi|app|\.well-known)(\/|$)/.test(rel)
      const datoteke = []
      const beri = (mapa) => {
        for (const ime of readdirSync(mapa)) {
          const pot = join(mapa, ime)
          const rel = relative(izhod, pot).split('\\').join('/')
          if (izpusti(rel)) continue
          if (statSync(pot).isDirectory()) beri(pot)
          else datoteke.push({ ime: rel, vsebina: readFileSync(pot) })
        }
      }
      beri(izhod)
      const svezenj = zip(datoteke)
      const { slff } = JSON.parse(readFileSync(resolve(izhod, '..', 'package.json'), 'utf8'))
      mkdirSync(resolve(izhod, 'app'), { recursive: true })
      writeFileSync(resolve(izhod, 'app', `${sha}.zip`), svezenj)
      writeFileSync(resolve(izhod, 'app', 'latest.json'), JSON.stringify({
        version: sha,
        url: `https://slff.eu/app/${sha}.zip`,
        checksum: createHash('sha256').update(svezenj).digest('hex'),
        minBuild: slff.otaMinBuild,
      }))
    },
  }
}

export default defineConfig({
  plugins: [react(), znamkaCommita(), karticeDrzav(), besedeZaHtml(), otaSvezenj()],
  build: {
    rolldownOptions: {
      output: {
        // Knjižnice so svoj kos: menjajo se redko, zato ga brskalnik ob novi
        // objavi aplikacije ne prenaša znova (ime kosa ostane isto).
        codeSplitting: {
          groups: [{ name: 'knjiznice', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@supabase)[\\/]/ }],
        },
      },
    },
  },
  server: {
    watch: {
      // Predpomnjeni zapisniki niso del aplikacije. Brez tega Vite ob vsakem
      // uvozu sproži ponovno nalaganje strani za vsako od 150+ datotek.
      ignored: ['**/scripts/.predpomnilnik/**', '**/supabase/.temp/**'],
    },
  },
})
