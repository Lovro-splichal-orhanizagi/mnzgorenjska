// Novanet / pnfg: številke so lahko besedilo, CSS :before/:after ali klic ntype.
// Razred fa-N in skrito besedilo sta lahko VABA. Skriptov ne izvajamo:
// razpakiramo podatkovni niz in sprejmemo le preverjeno formulo ntype.
// Celoten podprt vir sestavi novanet.mjs; ta modul dekodira le izide.

const napaka = (s) => Object.assign(new Error(`novanet: ${s}`),{razclenitev:true})
const skripti = (html) => [...String(html).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map((m) => m[1])
const PAKIRNIK = String.raw`eval(function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!"".replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return"\\w+"};c=1}while(c--){if(k[c]){p=p.replace(new RegExp("\\b"+e(c)+"\\b","g"),k[c])}}return p}`.replace(/\s+/g, '')

function razpakiraj(skript) {
  // Dean Edwards packer: samo JSON nizi in številke; nikoli eval/Function/vm.
  const m = skript.match(/return\s+p\s*}\s*\(\s*("(?:[^"\\]|\\.)*")\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*("(?:[^"\\]|\\.)*")\.split\("\|"\)/)
  if (!m) return skript
  const uvod = skript.slice(0, m.index + m[0].indexOf('(')).replace(/\s+/g, '')
  const konec = skript.slice(m.index + m[0].length).replace(/\s+/g, '')
  if (uvod !== PAKIRNIK || konec !== ',0,{}));') throw napaka('neznan razpakirnik ntype')
  const osnova = Number(m[2])
  const koliko = Number(m[3])
  if (osnova < 2 || osnova > 36 || koliko > 10000) throw napaka('neznana oblika pakiranja ntype')
  const slovar = JSON.parse(m[4]).split('|')
  const kljuci = new Map()
  for (let i = 0; i < koliko; i++) if (slovar[i]) kljuci.set(i.toString(osnova), slovar[i])
  return JSON.parse(m[1]).replace(/\b\w+\b/g, (kljuc) => kljuci.get(kljuc) ?? kljuc)
}

function tabelaNtype(skript) {
  const koda = razpakiraj(skript).replace(/\s+/g, '').replaceAll('"', "'")
  // Preverimo tudi način uporabe tabele, ne le najdenih številk.
  const m = koda.match(/^functionntype\(id,n,i,oc\)\{vart=\[(\d(?:,\d)*)\];document\.getElementById\(id\)\.classList\.remove\(oc\);document\.getElementById\(id\)\.classList\.add\('fa-'\+t\[\(i\*(\d+)\)\+n\]\)\}$/)
  if (!m) throw napaka('neznana formula ntype; izida ne ugibamo')
  const tabela = m[1].split(',').map(Number)
  const korak = Number(m[2])
  if (korak !== 10 || tabela.some((x) => !Number.isInteger(x) || x < 0 || x > 9) || tabela.length % korak !== 0)
    throw napaka('neveljavna tabela ntype')
  return { tabela, korak }
}

function shrani(mapa, id, vrednost) {
  if (mapa.has(id) && mapa.get(id) !== vrednost) throw napaka(`nasprotujoči preslikavi za ${id}`)
  mapa.set(id, vrednost)
}

// Podmnožica CSS iz opazovanih strani. Ne podpiramo splošnega kaskadiranja,
// pogojnih slogov ali CSS vidnosti: kadar zadenejo izid, ga zavrnemo.
function cssPreslikave(html, kontekst) {
  const videnaPravila = new Set()
  const neznano = (selektor) => {
    if (!/^[#.][\w-]+(?:::?(?:before|after))?$/.test(selektor.trim())) kontekst.neznanCss = true
    const imena = [...selektor.matchAll(/([#.])([\w-]+)/g)]
    if (!imena.length) kontekst.neznanCss = true
    for (const m of imena) (m[1] === '#' ? kontekst.neznaniId : kontekst.neznaniRazredi).add(m[2])
  }
  for (const style of String(html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const css = style[1].replace(/\/\*[\s\S]*?\*\//g, '')
    let globina = 0, zacetek = 0, odprt = 0, narekovaj = null
    for (let i = 0; i < css.length; i++) {
      const c = css[i]
      if (narekovaj) {
        if (c === '\\') i++
        else if (c === narekovaj) narekovaj = null
        continue
      }
      if (c === '"' || c === "'") { narekovaj = c; continue }
      if (c === '{') { if (globina++ === 0) odprt = i; continue }
      if (c !== '}' || --globina !== 0) continue
      const selektor = css.slice(zacetek, odprt).trim()
      const telo = css.slice(odprt + 1, i)
      zacetek = i + 1
      if (!/\b(?:content|display|visibility)\s*:/i.test(telo)) continue
      if (selektor.startsWith('@') || /[{}]/.test(telo)) {
        const listi = [...telo.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        if (!listi.length) neznano(selektor)
        for (const list of listi) {
          if (/\b(?:content|display|visibility)\s*:/i.test(list[2]))
            for (const del of list[1].split(',')) neznano(del.trim())
        }
        continue
      }
      for (const del of selektor.split(',')) {
        const pseudo = del.trim().match(/^#([\w-]+)::?(before|after)$/)
        const id = pseudo?.[1]
        if (id) {
          const kljuc = `${id}:${pseudo[2]}`
          if (videnaPravila.has(kljuc)) { neznano(del); continue }
          videnaPravila.add(kljuc)
        }
        const content = [...telo.matchAll(/(?:^|;)\s*content\s*:\s*([^;]*)/gi)]
        const vrednost = content.length === 1 && content[0][1].trim().match(/^(["'])(.*?)\1$/)
        const display = [...telo.matchAll(/(?:^|;)\s*display\s*:\s*([^;]*)/gi)]
        const visibility = [...telo.matchAll(/(?:^|;)\s*visibility\s*:\s*([^;]*)/gi)]
        if (!id || !vrednost || display.length > 1 || visibility.length || (display.length && !/^none(?:\s*!important)?$/i.test(display[0][1].trim()))) { neznano(del); continue }
        const mapa = pseudo[2] === 'before' ? kontekst.stevke : kontekst.koncneStevke
        // display:none velja za pseudo-element, ne za besedilo njegovega span.
        if (display.length) { mapa.delete(id); continue }
        const stevilka = vrednost[2].replace(/\\([\da-f]{1,6})\s?/gi, (_, hex) => {
          const cp = parseInt(hex, 16)
          if (cp > 0x10ffff) throw napaka('neveljavna CSS številka')
          return String.fromCodePoint(cp)
        })
        if (!/^\d$/.test(stevilka)) { neznano(del); continue }
        shrani(mapa, id, stevilka)
      }
    }
    if (globina !== 0 || narekovaj) throw napaka('neveljaven CSS')
  }
}

/** Preslikava id elementa → prava številka. Bere se znova za vsak dokument. */
export function preslikaveNovanet(html) {
  const mapa = new Map()
  const kontekst = { stevke: mapa, koncneStevke: new Map(), neznaniId: new Set(), neznaniRazredi: new Set(), neznanCss: false }
  let formula = null
  for (const skript of skripti(html)) {
    if (/function\s*\(p,a,c,k,e,d\)|function\s+ntype\b/.test(skript) && /ntype/.test(skript)) {
      formula = tabelaNtype(skript)
      continue
    }
    if (!/\bntype\s*\(/.test(skript)) continue
    // oc is a numeric CSS class label to remove, not a score digit. The live
    // template also emits fa-12; only the validated table/index supplies score.
    const m = skript.trim().match(/^ntype\(\s*["']([\w-]+)["']\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*["']fa-\d+["']\s*\);?$/)
    if (!m) throw napaka('neznan klic ntype')
    if (!formula) throw napaka('manjka tabela preslikav ntype')
    const n = Number(m[2]), i = Number(m[3])
    const indeks = i * formula.korak + n
    if (n >= formula.korak || indeks >= formula.tabela.length) throw napaka(`neveljaven indeks ntype za ${m[1]}`)
    shrani(mapa, m[1], String(formula.tabela[indeks]))
  }
  cssPreslikave(html, kontekst)
  return kontekst
}

function atributi(znacka) {
  const out = {}
  const telo = znacka.replace(/^<\/?[\w:-]+/, '').replace(/\/?>$/, '')
  for (const m of telo.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))
    out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
  return out
}

function vidnoBesedilo(html, kontekst) {
  if (kontekst.neznanCss) throw napaka('nepodprt CSS vpliva na izid')
  const mapa = kontekst.stevke
  // Majhen bralnik odlomka (ne celotne strani). Sklad ohrani skrite potomce
  // skrite tudi ob gnezdenih elementih. Glif doda vidno številko :before.
  const sklad = [{ ime: '', skrit: false }]
  let out = ''
  const deli = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]+>|[^<]+/gi
  for (const m of String(html).matchAll(deli)) {
    const del = m[0]
    if (del.startsWith('<!--') || m[1]) continue
    if (del.startsWith('</')) {
      const ime = del.match(/^<\/\s*([\w:-]+)/)?.[1]?.toLowerCase()
      const i = sklad.findLastIndex((x) => x.ime === ime)
      if (i > 0) {
        for (let j = sklad.length - 1; j >= i; j--) out += sklad[j].po ?? ''
        sklad.length = i
      }
    } else if (del.startsWith('<')) {
      const ime = del.match(/^<([\w:-]+)/)?.[1]?.toLowerCase()
      if (!ime) throw napaka('neveljaven HTML odlomka izida')
      const a = atributi(del)
      if (kontekst.neznaniId.has(a.id) || (a.class ?? '').split(/\s+/).some((ime) => kontekst.neznaniRazredi.has(ime)))
        throw napaka(`nepodprt CSS za ${a.id ?? a.class}`)
      const skrit = sklad.at(-1).skrit || Object.hasOwn(a, 'hidden') || /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(a.style ?? '')
      const stevka = mapa.get(a.id)
      if (!skrit && stevka != null) out += stevka
      if (!skrit && stevka == null && /(?:^|\s)fa-\d+(?:\s|$)/.test(a.class ?? ''))
        throw napaka(`nerazrešen glif ${a.id ?? '(brez id)'}`)
      if (!['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(ime) && !del.endsWith('/>'))
        sklad.push({ ime, skrit, po: skrit ? '' : kontekst.koncneStevke.get(a.id) ?? '' })
    } else if (!sklad.at(-1).skrit) out += del
  }
  for (let i = sklad.length - 1; i > 0; i--) out += sklad[i].po ?? ''
  return out.replace(/&nbsp;|&#160;/gi, ' ').replace(/&ndash;|&#8211;/gi, '–').replace(/&#x([\da-f]+);|&#(\d+);/gi, (_, hex, dec) => {
    const cp = hex ? parseInt(hex, 16) : Number(dec)
    if (cp > 0x10ffff) throw napaka('neveljavna entiteta izida')
    return String.fromCodePoint(cp)
  }).trim()
}

/**
 * Odločitve o elementu izida sprejme klicatelj: glava, rezultat kroga ali
 * vmesni izid gola. Nikoli ne pregledujemo naključnih številk cele strani.
 * Brez izida vrne null; neznana obfuskacija povzroči napako.
 */
export function izidNovanet(odlomek, preslikave = preslikaveNovanet(odlomek)) {
  const besedilo = vidnoBesedilo(odlomek, preslikave)
  if (/^(?:[-–—:]\s*)*$/.test(besedilo)) return null
  const m = besedilo.match(/^(\d+)\s*[-–—:]\s*(\d+)$/)
  if (!m) throw napaka(`neprepoznan izid ${JSON.stringify(besedilo)}`)
  const izid = [Number(m[1]), Number(m[2])]
  if (!izid.every(Number.isSafeInteger)) throw napaka('izid zunaj številskega obsega')
  return izid
}
