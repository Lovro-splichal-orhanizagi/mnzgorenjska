import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { aplikacija as aplikacijaSk } from './src/i18n/sk/aplikacija.ts'

/**
 * V zgrajeno stran zapiše commit, iz katerega je nastala.
 *
 * Brez tega ni načina, da bi od zunaj preverili, KAJ je pravzaprav v zraku.
 * To ni teoretično: povezava med Vercelom in GitHubom se je 3. septembra
 * podrla (repozitorij se je preimenoval, Vercel je obdržal staro pot) in
 * produkcija je dva dni tiho stregla staro različico. Nič ni javilo napake —
 * deploy se preprosto ni zgodil. Zdaj to ujame `preveri-deploy` v CI.
 */
function znamkaCommita() {
  const sha =
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
 * Slovaška različica `index.html` za kartico ob deljenju.
 *
 * Facebook, WhatsApp in iskalniki JS ne poženejo in vidijo le statični HTML —
 * slovenski. Klub, ki deli povezavo `slff.eu/club/…?t=sk-…`, bi objavil
 * "Fantasy liga za slovenske medobčinske lige". Build zato poleg index.html
 * zapiše še sk.html s slovaškim jezikom in opisi; vercel.json ga vrne za `/sk`
 * in za vsako pot z `?t=sk-…`. Aplikacija je ista, zamenjan je le <head>.
 */
function slovaskaKartica() {
  let izhod = 'dist'
  const zamenjaj = (html, atribut, ime, vsebina) => {
    const re = new RegExp(`(<meta ${atribut}="${ime}" content=")[^"]*(")`)
    if (!re.test(html)) throw new Error(`sk.html: v index.html manjka <meta ${atribut}="${ime}">`)
    return html.replace(re, `$1${vsebina.replace(/"/g, '&quot;')}$2`)
  }
  return {
    name: 'slovaska-kartica',
    apply: 'build',
    configResolved(c) {
      izhod = resolve(c.root, c.build.outDir)
    },
    closeBundle() {
      const n = aplikacijaSk.naslovStrani
      let html = readFileSync(resolve(izhod, 'index.html'), 'utf8')
      html = html.replace('<html lang="sl">', '<html lang="sk">')
      html = zamenjaj(html, 'name', 'description', n.opis)
      html = zamenjaj(html, 'property', 'og:description', n.deljenje)
      html = zamenjaj(html, 'property', 'og:locale', 'sk_SK')
      html = zamenjaj(html, 'property', 'og:url', 'https://slff.eu/sk')
      html = zamenjaj(html, 'name', 'twitter:description', n.deljenjeKratko)
      writeFileSync(resolve(izhod, 'sk.html'), html)
    },
  }
}

export default defineConfig({
  plugins: [react(), znamkaCommita(), slovaskaKartica()],
  server: {
    watch: {
      // Predpomnjeni zapisniki niso del aplikacije. Brez tega Vite ob vsakem
      // uvozu sproži ponovno nalaganje strani za vsako od 150+ datotek.
      ignored: ['**/scripts/.predpomnilnik/**', '**/supabase/.temp/**'],
    },
  },
})
