// fussball.de: WOFF1 / cmap4 / post2; post3 le za točno pregledane obrise.
// Imena glifov so v pregledani pisavi
// ohranjena, čeprav cmap preslika naključne kode v zasebnem območju Unicode.
// Brez ugibanja po imenih igralcev ali stalnih kodah; vsaka pisava je svoja.
// OpenType post: https://learn.microsoft.com/en-us/typography/opentype/spec/post
import { inflateSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const datumskiGlifi = JSON.parse(readFileSync(new URL('./fussball-datumski-glifi.json', import.meta.url), 'utf8'))

const napaka = (s) => new Error(`fussball: ${s}`)
const zaseben = (cp) => (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0xffffd) || (cp >= 0x100000 && cp <= 0x10fffd)

// Standardni Macintosh post indeksi (3–97 so ASCII 32–126).
// Podprte črke in ločila; neznana imena ostanejo nerazrešena.
const standardni = new Map(Array.from('ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü', (c, i) => [98 + i, c]))
for (const [i, c] of Object.entries({
  137: 'ß', 144: 'Æ', 145: 'Ø', 160: 'æ', 161: 'ø', 172: '\u00a0',
  173: 'À', 174: 'Ã', 175: 'Õ', 176: 'Œ', 177: 'œ', 178: '–', 179: '—',
  180: '“', 181: '”', 182: '‘', 183: '’', 186: 'ÿ', 187: 'Ÿ',
  199: 'Â', 200: 'Ê', 201: 'Á', 202: 'Ë', 203: 'È', 204: 'Í', 205: 'Î',
  206: 'Ï', 207: 'Ì', 208: 'Ó', 209: 'Ô', 211: 'Ò', 212: 'Ú', 213: 'Û', 214: 'Ù',
  215: 'ı', 226: 'Ł', 227: 'ł', 228: 'Š', 229: 'š', 230: 'Ž', 231: 'ž',
  233: 'Ð', 234: 'ð', 235: 'Ý', 236: 'ý', 237: 'Þ', 238: 'þ',
  248: 'Ğ', 249: 'ğ', 250: 'İ', 251: 'Ş', 252: 'ş', 253: 'Ć', 254: 'ć', 255: 'Č', 256: 'č', 257: 'đ',
})) standardni.set(Number(i), c)

function unicodeIme(ime) {
  const osnovno = ime.split('.')[0]
  if (/^[A-Za-z]$/.test(osnovno)) return osnovno
  if (osnovno === 'space' || osnovno === 'uni00A0') return osnovno === 'space' ? ' ' : '\u00a0'
  let cps
  if (/^uni(?:[0-9A-Fa-f]{4})+$/.test(osnovno)) cps = osnovno.slice(3).match(/.{4}/g).map((s) => parseInt(s, 16))
  else if (/^u[0-9A-Fa-f]{4,6}$/.test(osnovno)) cps = [parseInt(osnovno.slice(1), 16)]
  if (!cps || cps.some((cp) => cp < 0x20 || (cp >= 0x7f && cp < 0xa0) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) || zaseben(cp))) return null
  return String.fromCodePoint(...cps)
}

function tabeleWoff(vhod) {
  const b = Buffer.from(vhod)
  if (b.length < 44 || b.length > 8 * 1024 * 1024 || !b.subarray(0, 4).equals(Buffer.from('wOFF')) || b.readUInt32BE(8) !== b.length) throw napaka('neveljaven WOFF1')
  const n = b.readUInt16BE(12)
  if (!n || n > 256 || 44 + n * 20 > b.length) throw napaka('neveljaven imenik tabel WOFF')
  const out = new Map()
  let skupaj = 0
  for (let i = 0; i < n; i++) {
    const p = 44 + i * 20, tag = b.toString('ascii', p, p + 4)
    if (b.subarray(p, p + 4).some((x) => x < 0x20 || x > 0x7e)) throw napaka('neveljavno ime tabele WOFF')
    const od = b.readUInt32BE(p + 4), stisnjeno = b.readUInt32BE(p + 8), izvirno = b.readUInt32BE(p + 12)
    skupaj += izvirno
    if (out.has(tag) || od < 44 + n * 20 || od + stisnjeno > b.length || stisnjeno > izvirno || izvirno > 4 * 1024 * 1024)
      throw napaka('neveljavne meje tabel WOFF')
    if (skupaj > 8 * 1024 * 1024) throw napaka('prevelike tabele WOFF')
    let data = b.subarray(od, od + stisnjeno)
    if (stisnjeno !== izvirno) data = inflateSync(data, { maxOutputLength: izvirno })
    if (data.length !== izvirno) throw napaka('napačna dolžina tabele WOFF')
    out.set(tag, data)
  }
  return { tabele: out, sha256: createHash('sha256').update(b).digest('hex') }
}

function imenaPost(post) {
  if (!post || post.length < 34 || post.readUInt32BE(0) !== 0x20000) throw napaka('post nima podprtih imen glifov (potreben post2)')
  const n = post.readUInt16BE(32), konec = 34 + n * 2
  if (!n || konec > post.length) throw napaka('odrezana tabela post')
  const lastna = []
  for (let i = konec; i < post.length;) {
    const len = post[i++]
    if (!len || len > 63 || i + len > post.length) throw napaka('neveljavno ime post')
    const raw = post.subarray(i, i + len), ime = raw.toString('ascii')
    if (raw.some((b) => b > 0x7f) || !/^[A-Za-z0-9._]+$/.test(ime)) throw napaka('neveljaven ASCII v post')
    lastna.push(ime); i += len
  }
  return Array.from({ length: n }, (_, i) => {
    const indeks = post.readUInt16BE(34 + i * 2)
    if (indeks >= 258) {
      if (lastna[indeks - 258] == null) throw napaka('manjkajoče ime post')
      return unicodeIme(lastna[indeks - 258])
    }
    return indeks >= 3 && indeks <= 97 ? String.fromCharCode(indeks + 29) : standardni.get(indeks) ?? null
  })
}

// Nekatere številke/datum nimajo imen (post3). Sprejmemo le natančne obrise
// vizualno pregledane pisave: brez OCR, podobnosti ali vezave na indeks glifa.
function imenaObrisov(tabele) {
  const head = tabele.get('head'), maxp = tabele.get('maxp'), loca = tabele.get('loca'), glyf = tabele.get('glyf')
  if (!head || head.length < 54 || !maxp || maxp.length < 6 || !loca || !glyf)
    throw napaka('post3 nima podprtih tabel obrisov')
  const n = maxp.readUInt16BE(4), format = head.readInt16BE(50)
  if (!n || n > 4096 || ![0, 1].includes(format) || head.readUInt16BE(18) !== datumskiGlifi.unitsPerEm)
    throw napaka('post3 nima podprte oblike obrisov')
  const velikost = format ? 4 : 2
  if (loca.length !== (n + 1) * velikost) throw napaka('post3: odrezan loca')
  const odmiki = Array.from({ length: n + 1 }, (_, i) => format ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2)
  if (odmiki[0] !== 0 || odmiki.some((x, i) => x > glyf.length || (i > 0 && x < odmiki[i - 1]))) throw napaka('post3: neveljavne meje glyf')
  return Array.from({ length: n }, (_, i) => {
    if (odmiki[i] === odmiki[i + 1]) return null
    const hash = createHash('sha256').update(glyf.subarray(odmiki[i], odmiki[i + 1])).digest('hex')
    return datumskiGlifi.glyphs[hash] ?? null
  })
}

/** WOFF1 → preslikava Unicode v pregledani znak, vezana na hash vhodne pisave. */
export function preslikavaPisave(vhod) {
  const { tabele, sha256 } = tabeleWoff(vhod)
  const post = tabele.get('post')
  const imena = post?.length === 32 && post.readUInt32BE(0) === 0x30000 ? imenaObrisov(tabele) : imenaPost(post)
  const cmap = tabele.get('cmap')
  if (!cmap || cmap.length < 4 || 4 + cmap.readUInt16BE(2) * 8 > cmap.length) throw napaka('neveljaven cmap')
  let tabela = null
  for (let i = 0; i < cmap.readUInt16BE(2); i++) {
    const p = 4 + i * 8, platform = cmap.readUInt16BE(p), encoding = cmap.readUInt16BE(p + 2), od = cmap.readUInt32BE(p + 4)
    if (od + 4 > cmap.length) throw napaka('odrezan cmap')
    if (!(platform === 0 || (platform === 3 && encoding === 1)) || cmap.readUInt16BE(od) !== 4) continue
    const len = cmap.readUInt16BE(od + 2)
    if (od + len > cmap.length || len < 16) throw napaka('odrezan cmap4')
    tabela = cmap.subarray(od, od + len); break
  }
  if (!tabela) throw napaka('pisava nima podprtega Unicode cmap4')
  const n = tabela.readUInt16BE(6) / 2
  if (!Number.isInteger(n) || !n || 16 + n * 8 > tabela.length) throw napaka('neveljavni segmenti cmap4')
  const znaki = new Map()
  let zadnji = -1
  for (let i = 0; i < n; i++) {
    const doK = tabela.readUInt16BE(14 + i * 2), odK = tabela.readUInt16BE(16 + n * 2 + i * 2)
    const delta = tabela.readInt16BE(16 + n * 4 + i * 2), roPos = 16 + n * 6 + i * 2, ro = tabela.readUInt16BE(roPos)
    if (odK > doK || odK <= zadnji) throw napaka('prekrivajoči se segmenti cmap4')
    zadnji = doK
    for (let cp = odK; cp <= doK; cp++) {
      let gid
      if (!ro) gid = (cp + delta) & 0xffff
      else {
        const p = roPos + ro + 2 * (cp - odK)
        if (p < 16 + n * 8 || p + 2 > tabela.length) throw napaka('odrezan indeks cmap4')
        gid = tabela.readUInt16BE(p)
        if (gid) gid = (gid + delta) & 0xffff
      }
      if (!gid) continue
      if (gid >= imena.length) throw napaka('glif cmap4 izven post')
      znaki.set(cp, imena[gid])
    }
  }
  return { znaki, sha256 }
}

/** Sprejme že razpakirane entitete HTML, ne celega HTML odlomka. */
export function dekodirajIme(besedilo, pisava) {
  return [...String(besedilo)].map((c) => {
    const cp = c.codePointAt(0)
    if (pisava.znaki.has(cp) && pisava.znaki.get(cp) != null) return pisava.znaki.get(cp)
    if (pisava.znaki.has(cp) || zaseben(cp)) throw napaka(`nerazrešen glif U+${cp.toString(16).toUpperCase()}`)
    return c
  }).join('')
}
