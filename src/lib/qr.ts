// Koda QR za kartico za deljenje (SLF-481). Lasten zapis, ker knjižnice ni
// (package.json je zaklenjen): bajtni način, popravek napak M, različice 1–10
// (do 213 bajtov, dovolj za povezavo). Po standardu ISO/IEC 18004; maska z
// najmanjšo kaznijo (pravila 1, 2 in 4).

// Po različici (indeks = različica): bajti popravka na blok in število blokov za raven M.
const ECC_NA_BLOK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26]
const BLOKOV = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5]

function surovihModulov(v: number): number {
  let r = (16 * v + 128) * v + 64
  if (v >= 2) {
    const n = Math.floor(v / 7) + 2
    r -= (25 * n - 10) * n - 55
    if (v >= 7) r -= 36
  }
  return r
}
const podatkovnihBajtov = (v: number) => Math.floor(surovihModulov(v) / 8) - ECC_NA_BLOK[v] * BLOKOV[v]

function gfMnozi(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z
}

function delitelj(stopnja: number): number[] {
  const r = new Array<number>(stopnja).fill(0)
  r[stopnja - 1] = 1
  let koren = 1
  for (let i = 0; i < stopnja; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = gfMnozi(r[j], koren)
      if (j + 1 < r.length) r[j] ^= r[j + 1]
    }
    koren = gfMnozi(koren, 0x02)
  }
  return r
}

function ostanek(podatki: number[], d: number[]): number[] {
  const r = new Array<number>(d.length).fill(0)
  for (const b of podatki) {
    const f = b ^ (r.shift() as number)
    r.push(0)
    d.forEach((c, i) => (r[i] ^= gfMnozi(c, f)))
  }
  return r
}

/** Matrika modulov (true = temen) za besedilo v UTF-8; null, če je predolgo. */
export function kodaQr(besedilo: string): boolean[][] | null {
  const bajti = Array.from(new TextEncoder().encode(besedilo))
  let v = 1
  for (; v <= 10; v++) if (4 + (v < 10 ? 8 : 16) + bajti.length * 8 <= podatkovnihBajtov(v) * 8) break
  if (v > 10) return null

  // Biti: način 0100, dolžina, bajti, zaključek, poravnava, polnilo.
  const biti: number[] = []
  const dodaj = (vr: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) biti.push((vr >>> i) & 1)
  }
  dodaj(4, 4)
  dodaj(bajti.length, v < 10 ? 8 : 16)
  bajti.forEach((b) => dodaj(b, 8))
  const kapaciteta = podatkovnihBajtov(v) * 8
  dodaj(0, Math.min(4, kapaciteta - biti.length))
  dodaj(0, (8 - (biti.length % 8)) % 8)
  for (let p = 0xec; biti.length < kapaciteta; p ^= 0xec ^ 0x11) dodaj(p, 8)
  const podatki: number[] = []
  for (let i = 0; i < biti.length; i += 8) podatki.push(parseInt(biti.slice(i, i + 8).join(''), 2))

  // Bloki s popravkom, prepleteni.
  const nBlokov = BLOKOV[v]
  const eccDolzina = ECC_NA_BLOK[v]
  const surovih = Math.floor(surovihModulov(v) / 8)
  const kratkih = nBlokov - (surovih % nBlokov)
  const kratkaDolzina = Math.floor(surovih / nBlokov)
  const d = delitelj(eccDolzina)
  const bloki: number[][] = []
  for (let i = 0, k = 0; i < nBlokov; i++) {
    const dat = podatki.slice(k, k + kratkaDolzina - eccDolzina + (i < kratkih ? 0 : 1))
    k += dat.length
    const ecc = ostanek(dat, d)
    if (i < kratkih) dat.push(0)
    bloki.push(dat.concat(ecc))
  }
  const koncni: number[] = []
  for (let i = 0; i < bloki[0].length; i++)
    bloki.forEach((b, j) => {
      if (i !== kratkaDolzina - eccDolzina || j >= kratkih) koncni.push(b[i])
    })

  const n = v * 4 + 17
  const m: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const fun: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false))
  const postavi = (x: number, y: number, temen: boolean) => {
    m[y][x] = temen
    fun[y][x] = true
  }

  // Časovna vzorca, iskalni vzorci, poravnalni vzorci.
  for (let i = 0; i < n; i++) {
    postavi(6, i, i % 2 === 0)
    postavi(i, 6, i % 2 === 0)
  }
  for (const [cx, cy] of [[3, 3], [n - 4, 3], [3, n - 4]])
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || x >= n || y < 0 || y >= n) continue
        const r = Math.max(Math.abs(dx), Math.abs(dy))
        postavi(x, y, r !== 2 && r !== 4)
      }
  const poravnave: number[] = []
  if (v > 1) {
    const st = Math.floor(v / 7) + 2
    const korak = Math.ceil((v * 4 + 4) / (st * 2 - 2)) * 2
    poravnave.push(6)
    for (let p = n - 7; poravnave.length < st; p -= korak) poravnave.splice(1, 0, p)
  }
  poravnave.forEach((a, i) =>
    poravnave.forEach((b, j) => {
      const vogal = (i === 0 && j === 0) || (i === 0 && j === poravnave.length - 1) || (i === poravnave.length - 1 && j === 0)
      if (vogal) return
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) postavi(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }),
  )

  const format = (maska: number) => {
    const dat = (0 << 3) | maska // raven M = 00
    let r = dat
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537)
    const b = ((dat << 10) | r) ^ 0x5412
    const bit = (i: number) => ((b >>> i) & 1) !== 0
    for (let i = 0; i <= 5; i++) postavi(8, i, bit(i))
    postavi(8, 7, bit(6))
    postavi(8, 8, bit(7))
    postavi(7, 8, bit(8))
    for (let i = 9; i < 15; i++) postavi(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) postavi(n - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) postavi(8, n - 15 + i, bit(i))
    postavi(8, n - 8, true)
  }
  format(0) // rezervira polja oblike, preden gredo noter podatki
  if (v >= 7) {
    let r = v
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25)
    const b = (v << 12) | r
    for (let i = 0; i < 18; i++) {
      const bit = ((b >>> i) & 1) !== 0
      const a = n - 11 + (i % 3)
      const c = Math.floor(i / 3)
      postavi(a, c, bit)
      postavi(c, a, bit)
    }
  }

  // Podatki v cikcaku od spodnjega desnega kota.
  let i = 0
  for (let desno = n - 1; desno >= 1; desno -= 2) {
    if (desno === 6) desno = 5
    for (let vert = 0; vert < n; vert++)
      for (let j = 0; j < 2; j++) {
        const x = desno - j
        const y = ((desno + 1) & 2) === 0 ? n - 1 - vert : vert
        if (!fun[y][x] && i < koncni.length * 8) {
          m[y][x] = ((koncni[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0
          i++
        }
      }
  }

  const pogoj = (k: number, x: number, y: number) =>
    [
      (x + y) % 2 === 0,
      y % 2 === 0,
      x % 3 === 0,
      (x + y) % 3 === 0,
      (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
      ((x * y) % 2) + ((x * y) % 3) === 0,
      (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
      (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
    ][k]
  const maskiraj = (k: number) => {
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!fun[y][x] && pogoj(k, x, y)) m[y][x] = !m[y][x]
  }
  const kazen = () => {
    let k = 0
    for (let a = 0; a < n; a++)
      for (const vrsta of [true, false]) {
        let dolzina = 0
        let prej: boolean | null = null
        for (let b = 0; b < n; b++) {
          const c = vrsta ? m[a][b] : m[b][a]
          if (c === prej) dolzina++
          else {
            if (dolzina >= 5) k += dolzina - 2
            dolzina = 1
            prej = c
          }
        }
        if (dolzina >= 5) k += dolzina - 2
      }
    let temnih = 0
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (m[y][x]) temnih++
        if (x < n - 1 && y < n - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) k += 3
      }
    return k + Math.floor(Math.abs(temnih * 20 - n * n * 10) / (n * n)) * 10
  }
  let najboljsa = 0
  let najmanj = Infinity
  for (let k = 0; k < 8; k++) {
    maskiraj(k)
    format(k)
    const kz = kazen()
    if (kz < najmanj) {
      najmanj = kz
      najboljsa = k
    }
    maskiraj(k) // XOR: druga uporaba masko odstrani
  }
  maskiraj(najboljsa)
  format(najboljsa)
  return m
}
