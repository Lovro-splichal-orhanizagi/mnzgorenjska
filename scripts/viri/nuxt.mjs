// Branje `window.__NUXT__` (Nuxt 2) iz strežniško izrisane strani — BREZ eval.
//
// Nuxt 2 stanje strani zapiše kot izraz JavaScripta:
//
//   window.__NUXT__=(function(a,b,c){ a[0]={…}; c.x=b; return {…} }(null,"",{}));
//
// To je koda, ki jo je napisal tuj strežnik, zato je ne poganjamo (ne `eval`,
// ne `new Function`, ne `vm`). Razčlenjevalnik spodaj pozna le ozko slovnico,
// ki jo Nuxt 2 (devalue) zares izpiše: parametre funkcije, prirejanja
// `ime[0]=…` / `ime.polje=…`, `return <vrednost>` in argumente klica. Vrednosti
// so literali (niz, število, true/false/null, `void 0`), objekti, tabele,
// `Array(n)` in sklic na parameter. Vse drugo (klic funkcije, operator, `new`)
// vrže napako — raje prazen uvoz kot izvedena tuja koda.

export class NuxtNapaka extends Error {
  constructor(sporocilo) {
    super(`nuxt: ${sporocilo}`)
    this.name = 'NuxtNapaka'
  }
}

const IME = /[A-Za-z_$][A-Za-z0-9_$]*/y
const STEVILO = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
const PRAZNO = /(?:\s|\/\*[\s\S]*?\*\/)*/y
const PREPOVEDANA = new Set(['__proto__', 'constructor', 'prototype'])

class Bralnik {
  constructor(s, i = 0) {
    this.s = s
    this.i = i
  }
  presledki() {
    PRAZNO.lastIndex = this.i
    PRAZNO.exec(this.s)
    this.i = PRAZNO.lastIndex
  }
  vidi(niz) {
    this.presledki()
    return this.s.startsWith(niz, this.i)
  }
  vzemi(niz) {
    if (!this.vidi(niz)) return false
    this.i += niz.length
    return true
  }
  zahtevaj(niz) {
    if (!this.vzemi(niz)) throw new NuxtNapaka(`pričakovan "${niz}" na ${this.i}: "${this.s.slice(this.i, this.i + 40)}"`)
  }
  ime() {
    this.presledki()
    IME.lastIndex = this.i
    const m = IME.exec(this.s)
    if (!m) return null
    this.i = IME.lastIndex
    return m[0]
  }
  niz() {
    this.presledki()
    const q = this.s[this.i]
    if (q !== '"' && q !== "'") return undefined
    let out = ''
    let i = this.i + 1
    for (;;) {
      const c = this.s[i]
      if (c === undefined) throw new NuxtNapaka('nezaključen niz')
      if (c === q) break
      if (c === '\\') {
        const e = this.s[i + 1]
        if (e === 'u') {
          if (this.s[i + 2] === '{') {
            const konec = this.s.indexOf('}', i + 3)
            out += String.fromCodePoint(parseInt(this.s.slice(i + 3, konec), 16))
            i = konec + 1
          } else {
            const h = this.s.slice(i + 2, i + 6)
            if (!/^[0-9a-fA-F]{4}$/.test(h)) throw new NuxtNapaka(`napačen \\u v nizu na ${i}`)
            out += String.fromCharCode(parseInt(h, 16))
            i += 6
          }
          continue
        }
        if (e === 'x') {
          out += String.fromCharCode(parseInt(this.s.slice(i + 2, i + 4), 16))
          i += 4
          continue
        }
        const preslikava = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0' }
        if (e === '\n') { i += 2; continue }
        out += preslikava[e] ?? e
        i += 2
        continue
      }
      out += c
      i++
    }
    this.i = i + 1
    return out
  }
  stevilo() {
    this.presledki()
    STEVILO.lastIndex = this.i
    const m = STEVILO.exec(this.s)
    if (!m) return undefined
    this.i = STEVILO.lastIndex
    return Number(m[0])
  }
}

/** Vrednost: literal, objekt, tabela, Array(n) ali sklic na parameter. */
function vrednost(b, okolje) {
  b.presledki()
  const s = b.niz()
  if (s !== undefined) return s
  if (b.vzemi('{')) {
    const o = {}
    if (b.vzemi('}')) return o
    do {
      if (b.vidi('}')) break // končna vejica
      let kljuc = b.niz()
      if (kljuc === undefined) {
        const n = b.stevilo()
        kljuc = n !== undefined ? String(n) : b.ime()
      }
      if (kljuc == null) throw new NuxtNapaka(`ključ objekta na ${b.i}`)
      b.zahtevaj(':')
      const v = vrednost(b, okolje)
      if (!PREPOVEDANA.has(kljuc)) o[kljuc] = v
    } while (b.vzemi(','))
    b.zahtevaj('}')
    return o
  }
  if (b.vzemi('[')) {
    const t = []
    if (b.vzemi(']')) return t
    do {
      if (b.vidi(']')) break
      t.push(vrednost(b, okolje))
    } while (b.vzemi(','))
    b.zahtevaj(']')
    return t
  }
  const n = b.stevilo()
  if (n !== undefined) return n
  const zacetek = b.i
  const ime = b.ime()
  if (ime == null) throw new NuxtNapaka(`neznana vrednost na ${b.i}: "${b.s.slice(b.i, b.i + 40)}"`)
  if (ime === 'true') return true
  if (ime === 'false') return false
  if (ime === 'null') return null
  if (ime === 'undefined') return undefined
  if (ime === 'NaN') return NaN
  if (ime === 'Infinity') return Infinity
  if (ime === 'void') {
    b.zahtevaj('0')
    return undefined
  }
  if (ime === 'Array' && b.vzemi('(')) {
    const d = b.stevilo()
    b.zahtevaj(')')
    if (!Number.isInteger(d) || d < 0 || d > 100000) throw new NuxtNapaka(`Array(${d})`)
    return new Array(d)
  }
  if (okolje && Object.prototype.hasOwnProperty.call(okolje, ime)) return okolje[ime]
  throw new NuxtNapaka(`neznano ime "${ime}" na ${zacetek}`)
}

/** Prirejanje `ime([n]|.polje)+ = vrednost`. */
function prirejanje(b, okolje) {
  const ime = b.ime()
  if (ime == null || !Object.prototype.hasOwnProperty.call(okolje, ime)) throw new NuxtNapaka(`prirejanje na ${b.i}`)
  let cilj = okolje[ime]
  let kljuc = null
  for (;;) {
    if (b.vzemi('[')) {
      const k = b.stevilo() ?? b.niz()
      if (k === undefined) throw new NuxtNapaka(`indeks na ${b.i}`)
      b.zahtevaj(']')
      if (kljuc != null) cilj = cilj[kljuc]
      kljuc = String(k)
    } else if (b.vzemi('.')) {
      const k = b.ime()
      if (k == null) throw new NuxtNapaka(`polje na ${b.i}`)
      if (kljuc != null) cilj = cilj[kljuc]
      kljuc = k
    } else break
  }
  if (kljuc == null) throw new NuxtNapaka(`prirejanje parametru "${ime}" ni podprto`)
  b.zahtevaj('=')
  const v = vrednost(b, okolje)
  if (cilj == null || typeof cilj !== 'object') throw new NuxtNapaka(`prirejanje v ${typeof cilj}`)
  if (!PREPOVEDANA.has(kljuc)) cilj[kljuc] = v
}

/** Iz HTML strani izlušči `window.__NUXT__` kot navaden objekt; brez njega null. */
export function preberiNuxt(html) {
  const s = String(html ?? '')
  const zacetek = s.indexOf('window.__NUXT__')
  if (zacetek < 0) return null
  const konec = s.indexOf('</script>', zacetek)
  const b = new Bralnik(konec < 0 ? s : s.slice(0, konec), zacetek + 'window.__NUXT__'.length)
  b.zahtevaj('=')
  // Oblika brez funkcije: window.__NUXT__={…}
  if (!b.vidi('(')) return vrednost(b, null)
  b.zahtevaj('(')
  b.zahtevaj('function')
  b.zahtevaj('(')
  const parametri = []
  if (!b.vzemi(')')) {
    do parametri.push(b.ime())
    while (b.vzemi(','))
    b.zahtevaj(')')
  }
  if (parametri.some((p) => p == null || PREPOVEDANA.has(p))) throw new NuxtNapaka('parametri funkcije')
  b.zahtevaj('{')
  // Telo preberemo dvakrat: najprej ga preskočimo do argumentov (ti dajo
  // vrednosti parametrov), potem ga izvedemo.
  const telo = b.i
  let globina = 1
  let i = telo
  while (globina > 0) {
    const c = b.s[i]
    if (c === undefined) throw new NuxtNapaka('nezaključeno telo funkcije')
    if (c === '"' || c === "'") {
      const t = new Bralnik(b.s, i)
      t.niz()
      i = t.i
      continue
    }
    if (c === '{') globina++
    else if (c === '}') globina--
    i++
  }
  b.i = i
  b.zahtevaj('(')
  const argumenti = []
  if (!b.vzemi(')')) {
    do argumenti.push(vrednost(b, null))
    while (b.vzemi(','))
    b.zahtevaj(')')
  }
  b.zahtevaj(')')
  const okolje = Object.create(null)
  parametri.forEach((p, k) => { okolje[p] = argumenti[k] })

  const t = new Bralnik(b.s, telo)
  for (;;) {
    if (t.vzemi(';')) continue
    if (t.vidi('return')) {
      t.i += 'return'.length
      const v = vrednost(t, okolje)
      t.vzemi(';')
      t.zahtevaj('}')
      return v
    }
    prirejanje(t, okolje)
  }
}
