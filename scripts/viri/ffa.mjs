// Vir: Football Federation of Armenia — ffa.am (Prva liga, Առաջին խումբ).
//
// FFA na ffa.am (Laravel + Livewire) objavi tekmovanja, ki jih vodi sama:
// Prvo ligo (raven 2) in amaterske lige (Amateur League A in B). Premier Liga
// je na svojem spletišču (premierleague.ffa.am) in je ta vir ne bere. HTML iz
// strežnika, spredaj Cloudflare brez izziva. Glej CLAUDE.md (Armenija — vir ffa).
//
// SEZONA je jesen–pomlad (avgust–maj): "2026/27".
//
// ŠIFRA LIGE je `<pot>/<skupina>`: `<pot>` je pot strani tekmovanja pod `/en/`
// (`first-league`), `<skupina>` id skupine (tekmovanja ene sezone) v podatkih
// gradnika Livewire `cascade-tour-matches` (902 = Prva liga 2026/27). Stran
// vedno pokaže TEKOČO skupino; druge sezone in skupine bi zahtevale zahtevek
// Livewire (POST), ki ga ne pošiljamo. Če stran pokaže drugo skupino (nova
// sezona), se uvoz ustavi — šifra se popravi v `competitions.source_league_code`.
//
// STRAN LIGE: krogi so `<tbody … tour="N">` (po vrsti pomešani), tekma je
// vrstica: domači, izid ("2:1"; tehnični izid "3:0(3:0)"; neodigrana " : "),
// gostje, termin ("04/08 17:00" brez leta, "Postponed" ali prazno), kraj in
// stadion; odigrana in razpisana imata povezavo `/en/match-info/f<id>`. Leto
// termina pove sezona (julij–december prvo leto, januar–junij drugo), ura je
// erevanska (UTC+4, brez poletnega časa) → ljubljanska.
//
// IZSTOP KLUBA: klub, ki je izstopil (Hayq 2026/27 po 4. krogu), ostane v
// razporedu z vrsticami brez termina, izida in povezave tudi v že odigranih
// krogih. Njegove neodigrane tekme izpustimo (CLAUDE.md: ob odstopu kluba
// neodigrane tekme proč, odigrane ostanejo); tehnični izidi pred izstopom so
// kontumacije.
//
// ZAPISNIK (`/en/match-info/f<id>`): glava ("… (2026-2027): 1" — sezona in
// krog, "04.08.2026 17:00" erevanski čas, imeni, izid), "Technical defeat" pri
// kontumaciji (zapisnik null), pod njo "Players" (začetniki) in "Substitutes"
// (klop), levi stolpec domači, desni gostje. Pri igralcu so dogodki ikone z
// minuto: `down.png` izstop, `up.png` vstop, `ball.png` gol, `yc.png` rumeni,
// `rc.png` rdeči. Levo je ikona pred minuto, desno minuta pred ikono (zrcalno) —
// zato razčlenjujemo HTML, ne besedila. Trenerjev, sodnikov in delegata
// ("Coaches", "Referee …") ne beremo.
//
// Šifer igralcev ni (ime + klub, kot fss, gff); vratar NI označen — prvi
// začetnik je vratar le kot namig (kot ffm, gff, mlsz).
//
// robots.txt: `User-agent: *` z `Disallow:` (prazno, nič prepovedano). Noga
// zahteva povezavo na ffa.am ob uporabi gradiva (`vir_url`). Beremo odkrito
// (User-Agent SLFF, 4 s med zahtevki, zapisnikov, starejših od tedna, ne
// beremo znova razen nepopolnih). Ob izzivu, CAPTCHI, 401, 403 ali 429 se uvoz
// ustavi — ne obhajaj.
import { razpakiraj } from '../klubi.mjs'
import { vPriimekIme } from './sportnet.mjs'
import { nastopi as nastopiPoImenu } from './fss.mjs'

const OSNOVNI = 'https://www.ffa.am'
const DOLZINA_TEKME = 90

/** "first-league/902" → { pot: 'first-league', skupina: '902' }. */
export function razberiKodo(koda) {
  const m = String(koda ?? '').trim().match(/^([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/(\d+)$/)
  if (!m) throw new Error(`ffa: šifra lige je "<pot>/<skupina>" (npr. first-league/902 = Prva liga 2026/27), ne "${koda}"`)
  return { pot: m[1], skupina: m[2] }
}

export const naslovLige = (koda) => `${OSNOVNI}/en/${razberiKodo(koda).pot}`
// Šifra zapisnika v bazi je `am<id>`: `matches.zapisnik_id` je enoličen čez
// vse vire, številke ffa.am (95922, 98467 …) pa so v prostoru drugih virov.
export const sifraZapisnika = (id) => `am${String(id).replace(/^am/, '').replace(/^f/, '')}`
export const naslovZapisnika = (id) => `${OSNOVNI}/en/match-info/f${String(id).replace(/^am/, '').replace(/^f/, '')}`
const imeLige = (koda) => `liga-${String(koda).replace(/[/:]/g, '-')}.html`
const imeZapisnika = (id) => `tekma-${String(id).replace(/^am/, '').replace(/^f/, '')}.html`

const brezSkript = (s) => String(s ?? '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '')
const besedilo = (html) => razpakiraj(String(html ?? '').replace(/<[^>]+>/g, ' '))

// --- zavrnitev -----------------------------------------------------------------

/** Zavrnitev (401, 403, 429) ali izziv: uvoz se ustavi in ne vzame shranjene strani. */
export class FfaZavrnitev extends Error {
  constructor(sporocilo, status = null) {
    super(sporocilo)
    this.name = 'FfaZavrnitev'
    this.status = status
    this.zavrnitev = true
  }
}
export const jeZavrnitev = (status) => status === 401 || status === 403 || status === 429
// Navadne strani nosijo Cloudflarov skript `/cdn-cgi/challenge-platform/…/jsd/`
// — to ni izziv; izziv je stran "Just a moment" s `cf_chl_opt` ali CAPTCHA.
export const jeIzziv = (html) =>
  /<title>\s*(Just a moment|Attention Required)|cf_chl_opt|cf-turnstile|g-recaptcha|hcaptcha|captcha/i.test(String(html ?? ''))

/**
 * `fetch` vira: 401, 403 in 429 ter izziv s katerimkoli statusom vržejo
 * `FfaZavrnitev` že ob odgovoru. Tako jih uvoz zapisnikov in razporeda (tudi
 * pot, ki bi ob napaki vzela shranjeno stran) ne more zamenjati za prehodno
 * napako; 429 se ne ponavlja.
 */
export async function ffaFetch(url, moznosti, fetchFn = fetch) {
  const odgovor = await fetchFn(url, moznosti)
  if (jeZavrnitev(odgovor.status)) {
    await odgovor.body?.cancel().catch(() => {})
    throw new FfaZavrnitev(`ffa: ${url} → HTTP ${odgovor.status} — uvoz ustavljen, ne obhajamo`, odgovor.status)
  }
  if (!odgovor.ok) {
    const telo = await odgovor.clone().text().catch(() => '')
    if (jeIzziv(telo)) throw new FfaZavrnitev(`ffa: ${url} vrne izziv (HTTP ${odgovor.status}) — uvoz ustavljen, ne obhajamo ga`, odgovor.status)
  }
  return odgovor
}

/**
 * Le prava stran sme v predpomnilnik: stran lige z gradnikom razporeda,
 * stran tekme z glavo tekme. Vzdrževalna stran ("Be right back") ali prazen
 * odgovor s statusom 200 bi sicer obveljal za vselej.
 */
export function zaPredpomnilnik(html, datoteka = '') {
  const s = String(html ?? '')
  if (jeIzziv(s)) return false
  if (/^tekma-/.test(datoteka)) return /single-game-teams__title/.test(s)
  if (/^liga-/.test(datoteka)) return /cascade-tour-matches/.test(s) && /<tbody[^>]*tour="/.test(s)
  return s.length > 0
}

// --- čas ----------------------------------------------------------------------

/** Minuta dogodka: "45+2" → 45, "90+5" → 90, "93" → 90. */
export function minuta(s) {
  const m = String(s ?? '').match(/(\d{1,3})(?:\s*\+\s*\d+)?/)
  if (!m) return null
  return Math.min(Math.max(Number(m[1]), 0), DOLZINA_TEKME)
}

const oblikaLjubljana = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Ljubljana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})
/** Erevanski čas (UTC+4, brez poletnega) → ljubljanski { datum, ura }. */
export function vLjubljanskiCas(datum, ura) {
  const u = String(ura ?? '').trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!datum || !u) return { datum: datum ?? null, ura: null }
  const ms = Date.parse(`${datum}T${u[1].padStart(2, '0')}:${u[2]}:00+04:00`)
  if (!Number.isFinite(ms)) return { datum, ura: null }
  const [d, h] = oblikaLjubljana.format(new Date(ms)).split(' ')
  return { datum: d, ura: h }
}

/** "2026-2027" ali "2026/27" → "2026/27". */
export function sezonaIz(s) {
  const m = String(s ?? '').match(/(\d{4})\s*[-/]\s*(\d{2,4})/)
  if (!m) return null
  return `${m[1]}/${m[2].slice(-2)}`
}

/** "04/08" v sezoni "2026/27" → "2026-08-04" (julij–december prvo leto). */
export function datumVSezoni(dm, sezona) {
  const m = String(dm ?? '').match(/^(\d{1,2})\/(\d{1,2})$/)
  const leto = Number(String(sezona ?? '').slice(0, 4))
  if (!m || !leto) return null
  const mesec = Number(m[2])
  if (mesec < 1 || mesec > 12) return null
  return `${mesec >= 7 ? leto : leto + 1}-${String(mesec).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

// --- stran lige -----------------------------------------------------------------

/** Podatki gradnika Livewire `cascade-tour-matches` (wire:initial-data). */
export function podatkiGradnika(html) {
  for (const m of String(html ?? '').matchAll(/wire:initial-data="([^"]*)"/g)) {
    const json = m[1].replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    let d
    try {
      d = JSON.parse(json)
    } catch {
      continue
    }
    if (d?.fingerprint?.name !== 'cascade-tour-matches') continue
    const meta = d.serverMemo?.dataMeta?.modelCollections ?? {}
    return {
      skupina: meta.groups?.id?.[0] != null ? String(meta.groups.id[0]) : null,
      skupine: (meta.rawGroups?.id ?? []).map(String),
      leta: d.serverMemo?.data?.years ?? [],
      klubov: meta.items?.id?.length ?? null,
    }
  }
  return null
}

/**
 * Sezona strani in preverba, da stran kaže skupino iz šifre. Sezona je leto
 * skupine v izbirniku (skupine in leta gradnik našteje vzporedno, najnovejše
 * prvo), sicer naslov strani ("… 2026/27-A1 խումբ").
 */
export function sezonaStrani(koda, html) {
  const { skupina } = razberiKodo(koda)
  const g = podatkiGradnika(html)
  if (!g) throw new Error(`ffa: stran lige ${koda} nima gradnika razporeda (cascade-tour-matches) — se je stran spremenila?`)
  if (g.skupina !== skupina)
    throw new Error(`ffa: stran kaže skupino ${g.skupina ?? '?'}, ne ${skupina} (${koda}) — nova sezona? Popravi source_league_code; uvoz ustavljen`)
  const i = g.skupine.indexOf(skupina)
  const sezona = (g.skupine.length === g.leta.length && i >= 0 ? sezonaIz(g.leta[i]) : null) ??
    sezonaIz(besedilo(brezSkript(html).match(/<h2 class="content_title"[^>]*>([\s\S]*?)<\/h2>/)?.[1]))
  if (!sezona) throw new Error(`ffa: sezone strani ${koda} ni mogoče razbrati — uvoz ustavljen`)
  return sezona
}

/** Izid "2:1" → { domaci, gostje, tehnicni: false }; "3:0(3:0)" → tehnični izid. */
export function izidIz(s) {
  const m = String(s ?? '').replace(/\s+/g, '').match(/^(\d+):(\d+)(\((\d+):(\d+)\))?$/)
  if (!m) return null
  return { domaci: Number(m[1]), gostje: Number(m[2]), tehnicni: !!m[3] }
}

/**
 * Tekme strani lige: { sezona, tekme: [{ krog, id, domaci, gostje, datum, ura,
 * izid, tehnicni, prestavljena }] }. Krogi z oznako, ki ni številka (play-off
 * "1/2-1", finale), niso krogi lige — izpustimo jih.
 */
export function tekmeStrani(koda, html) {
  const sezona = sezonaStrani(koda, html)
  const s = brezSkript(html)
  const tekme = []
  for (const tb of s.matchAll(/<tbody[^>]*\btour="([^"]*)"[^>]*>([\s\S]*?)<\/tbody>/g)) {
    if (!/^\d+$/.test(tb[1])) continue
    const krog = Number(tb[1])
    for (const tr of tb[2].matchAll(/<tr[\s\S]*?<\/tr>/g)) {
      const celice = [...tr[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => besedilo(c[1]))
      if (celice.length < 4) continue
      const [domaci, rez, gostje, termin] = celice
      if (!domaci || !gostje) continue
      const id = tr[0].match(/\/match-info\/f(\d+)/)?.[1] ?? null
      const t = termin.match(/^(\d{1,2}\/\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/)
      const cas = vLjubljanskiCas(t ? datumVSezoni(t[1], sezona) : null, t?.[2] ?? null)
      const izid = izidIz(rez)
      tekme.push({
        krog,
        id,
        domaci,
        gostje,
        datum: cas.datum,
        ura: cas.ura,
        izid: izid ? { domaci: izid.domaci, gostje: izid.gostje } : null,
        tehnicni: !!izid?.tehnicni,
        prestavljena: /postpone/i.test(termin),
      })
    }
  }
  tekme.sort((a, b) => a.krog - b.krog || String(a.datum ?? '9').localeCompare(String(b.datum ?? '9')))
  return { sezona, tekme }
}

/**
 * Klubi, ki so izstopili: vrstica brez izida, termina in povezave (ne
 * "Postponed") v krogu, v katerem je odigrana vsaj ena tekma, pomeni, da tekme
 * ne bo. Klub, ki je v takih vrsticah vsaj dvakrat (nasprotnik je vsakič drug)
 * in od prve take vrstice ni odigral nobene prave tekme (le tehnične izide),
 * je izstopil.
 */
export function izstopljeniKlubi(tekme) {
  const odigraniKrogi = new Set(tekme.filter((t) => t.izid).map((t) => t.krog))
  const prazne = new Map() // klub -> krogi praznih vrstic
  for (const t of tekme) {
    if (t.izid || t.id || t.datum || t.prestavljena || !odigraniKrogi.has(t.krog)) continue
    for (const k of [t.domaci, t.gostje]) prazne.set(k, [...(prazne.get(k) ?? []), t.krog])
  }
  const out = new Set()
  for (const [k, krogi] of prazne) {
    if (krogi.length < 2) continue
    const od = Math.min(...krogi)
    const igral = tekme.some((t) => t.izid && !t.tehnicni && t.krog >= od && (t.domaci === k || t.gostje === k))
    if (!igral) out.add(k)
  }
  return out
}

/**
 * Razpored v obliko uvoza razporeda. Neodigrane tekme kluba, ki je izstopil,
 * izpustimo; tehnični izid ("3:0(3:0)") je kontumacija.
 */
export function razporedIzTekem(tekme) {
  const izstopili = izstopljeniKlubi(tekme)
  const krogi = new Map()
  let izpuscenih = 0
  for (const t of tekme) {
    if (!t.izid && (izstopili.has(t.domaci) || izstopili.has(t.gostje))) { izpuscenih++; continue }
    if (!krogi.has(t.krog)) krogi.set(t.krog, { stevilka: t.krog, tekme: [] })
    krogi.get(t.krog).tekme.push({
      domaci: t.domaci,
      gostje: t.gostje,
      datum: t.datum,
      ura: t.ura,
      kontumacija: !!(t.izid && t.tehnicni),
      odigrana: !!t.izid,
      ffaId: t.id,
      izid: t.izid,
    })
  }
  return { krogi: [...krogi.values()].sort((a, b) => a.stevilka - b.stevilka), izstopili: [...izstopili], izpuscenih }
}

// --- zapisnik ------------------------------------------------------------------

const IKONE = { 'ball': 'gol', 'yc': 'rumeni', 'rc': 'rdeci', 'down': 'ven', 'up': 'noter' }

/**
 * Dogodki enega igralca iz `players__player-range-block`: [{ vrsta, minuta }].
 * Levo je ikona pred minuto, desno minuta pred ikono — pare tvorimo po
 * zaporedju, kakor stoji prvi žeton.
 */
export function dogodkiIgralca(blok) {
  const zetoni = [...String(blok ?? '').matchAll(/<img[^>]*src="[^"]*\/assets\/([a-z0-9_-]+)\.(?:png|gif|svg|jpg)"|<div[^>]*players__player-text[^>]*>([\s\S]*?)<\/div>/g)]
    .map((m) => (m[1] != null ? { ikona: m[1] } : { besedilo: besedilo(m[2]) }))
    .filter((z) => z.ikona || z.besedilo)
  const out = []
  const ikonaPrva = zetoni[0]?.ikona != null
  for (let i = 0; i + 1 < zetoni.length; i += 2) {
    const [ik, bes] = ikonaPrva ? [zetoni[i], zetoni[i + 1]] : [zetoni[i + 1], zetoni[i]]
    if (ik?.ikona == null || bes?.besedilo == null) {
      out.push({ vrsta: null, ikona: ik?.ikona ?? null, minuta: null })
      continue
    }
    out.push({ vrsta: IKONE[ik.ikona] ?? null, ikona: ik.ikona, minuta: minuta(bes.besedilo), surovo: bes.besedilo })
  }
  if (zetoni.length % 2) out.push({ vrsta: null, ikona: null, minuta: null })
  return out
}

/** Igralci enega stolpca (`players__box`): [{ st, polnoIme, dogodki }]. */
export function igralciStolpca(html) {
  const out = []
  for (const kos of String(html ?? '').split(/<div class="players__item[^"]*">/).slice(1)) {
    // Igralec ima dva dela: ime in dres (`name-box`) ter dogodke (`range-block`);
    // levo stojijo dogodki pred imenom, desno za njim.
    const iIme = kos.indexOf('players__player-name-box')
    const iDog = kos.indexOf('players__player-range-block')
    if (iIme < 0) continue
    const imeDel = kos.slice(iIme, iDog > iIme ? iDog : undefined)
    const dogDel = iDog < 0 ? '' : kos.slice(iDog, iIme > iDog ? iIme : undefined)
    const ime = besedilo(imeDel.match(/<div class="players__player-text[^"]*">([\s\S]*?)<\/div>/)?.[1])
    const st = imeDel.match(/<div class="players__player-number[^"]*">\s*(\d+)\s*<\/div>/)?.[1] ?? null
    if (!ime) continue
    out.push({ st: st != null ? Number(st) : null, polnoIme: ime, dogodki: dogodkiIgralca(dogDel) })
  }
  return out
}

/** Dva stolpca (domači, gostje) razdelka med `od` in `do`. */
function stolpca(s, od, doNaslova) {
  const i = s.indexOf(od)
  if (i < 0) return [[], []]
  const j = doNaslova ? s.indexOf(doNaslova, i + od.length) : -1
  const del = s.slice(i, j < 0 ? undefined : j)
  const levi = del.indexOf('players__box mr-2')
  const desni = del.indexOf('players__box ml-2')
  if (levi < 0 || desni < 0) return [[], []]
  return [igralciStolpca(del.slice(levi, desni)), igralciStolpca(del.slice(desni))]
}

/**
 * Strelci iz glave (pod imenom kluba, ki mu gol šteje): [{ ime, minuta,
 * avtogol, enajstmetrovka }]. Vrstica je "Khachatur Vardanyan 75 (11m), 90+1";
 * "(OG)" je avtogol igralca NASPROTNE ekipe, "(11m)" gol z 11 m.
 */
export function strelciIzGlave(blok) {
  const out = []
  for (const m of String(blok ?? '').matchAll(/single-game-teams__player-name[^"]*">([\s\S]*?)<\/div>/g)) {
    const t = besedilo(m[1])
    const i = t.search(/\d/)
    if (i <= 0) continue
    const ime = t.slice(0, i).trim()
    for (const del of t.slice(i).split(',')) {
      const min = minuta(del)
      if (min == null) continue
      out.push({ ime, minuta: min, avtogol: /\(\s*OG\s*\)/i.test(del), enajstmetrovka: /\(\s*11\s*m\s*\)/i.test(del) })
    }
  }
  return out
}

/** Ime za primerjavo: male črke, brez ločil, besede po abecedi ("Abayomi David" = "David Abayomi"). */
export const kljucImena = (ime) =>
  razpakiraj(String(ime ?? '')).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').filter(Boolean).sort().join(' ')

/**
 * Goli tekme: strelce pove glava (z vrsto gola), igralca v postavi pa ikona
 * žoge z isto minuto (glava ime včasih obrne: "Abayomi David"), sicer ime.
 * Avtogol je pri strelcu v njegovi ekipi (kot pri drugih virih). Brez glave
 * (stran je nima) štejejo ikone žoge.
 */
function goliIzGlave(strelci, ekipe, ikone, opozorila) {
  const ime = (idx) => ekipe[idx].ime
  if (!strelci.flat().length) {
    return ikone.map((x) => ({ ekipaIdx: x.ekipaIdx, st: x.igralec.st, ime: x.igralec.ime, minuta: x.minuta, avtogol: false, enajstmetrovka: false }))
  }
  const porabljene = new Set()
  const goli = []
  for (const [stran, seznam] of strelci.entries()) {
    for (const s of seznam) {
      const idx = s.avtogol ? 1 - stran : stran
      const vsi = [...ekipe[idx].postava, ...ekipe[idx].rezerve]
      const poIkoni = ikone.filter((x) => x.ekipaIdx === idx && x.minuta === s.minuta && !porabljene.has(x))
      const poImenu = vsi.filter((i) => kljucImena(i.polnoIme) === kljucImena(s.ime))
      let igralec = null
      const ikona = poIkoni.find((x) => poImenu.includes(x.igralec)) ?? (poIkoni.length === 1 ? poIkoni[0] : null)
      if (ikona) {
        porabljene.add(ikona)
        igralec = ikona.igralec
      } else if (poImenu.length === 1) igralec = poImenu[0]
      if (!igralec) opozorila.push(`${ime(idx)}: strelca "${s.ime}" (${s.minuta}') ni v postavi`)
      goli.push({
        ekipaIdx: idx,
        st: igralec?.st ?? null,
        ime: igralec?.ime ?? vPriimekIme(s.ime),
        minuta: s.minuta,
        avtogol: s.avtogol,
        enajstmetrovka: s.enajstmetrovka,
      })
    }
  }
  for (const x of ikone.filter((y) => !porabljene.has(y)))
    opozorila.push(`${ime(x.ekipaIdx)}: gol ${x.igralec.ime} (${x.minuta}') je le v postavi, ne v glavi`)
  return goli
}

/** Glava strani tekme: { sezona, krog, datum, ura, domaci, gostje, izid, tehnicni, strelci }. */
export function glavaTekme(html) {
  const s = brezSkript(html)
  const naslov = besedilo(s.match(/single-game-teams__title">([\s\S]*?)<\/div>/)?.[1])
  const cas = besedilo(s.match(/single-game-teams__date">([\s\S]*?)<\/div>/)?.[1]).match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}:\d{2})?/)
  const { datum, ura } = cas ? vLjubljanskiCas(`${cas[3]}-${cas[2]}-${cas[1]}`, cas[4] ?? null) : { datum: null, ura: null }
  const imena = [...s.matchAll(/single-game-teams__name[^"]*">([\s\S]*?)<\/div>/g)].map((m) => besedilo(m[1]))
  const iIzida = s.indexOf('single-game-teams__score"')
  // Izid sta dve številki `goals-num` takoj za oznako; neodigrana tekma ju nima.
  const blokIzida = iIzida < 0 ? '' : s.slice(iIzida, s.indexOf('single-game-teams__last', iIzida) >>> 0)
  const goli = [...blokIzida.matchAll(/goals-num">\s*(\d+)\s*<\/div>/g)].map((m) => Number(m[1]))
  // Strelci: levi stolpec glave (`__first`) do izida, desni (`__last`) do vrstice s kontumacijo/stadionom.
  const iPrvi = s.indexOf('single-game-teams__first')
  const iZadnji = s.indexOf('single-game-teams__last')
  const iKonec = s.indexOf('single-game-teams__stadium')
  const strelci = iPrvi < 0 || iZadnji < 0
    ? [[], []]
    : [strelciIzGlave(s.slice(iPrvi, iIzida < 0 ? iZadnji : iIzida)), strelciIzGlave(s.slice(iZadnji, iKonec < 0 ? undefined : iKonec))]
  return {
    naslov,
    sezona: sezonaIz(naslov.match(/\((\d{4}\s*-\s*\d{4})\)/)?.[1]),
    krog: Number(naslov.match(/:\s*(\d+)\s*$/)?.[1]) || null,
    datum,
    ura,
    domaci: imena[0] ?? null,
    gostje: imena[1] ?? null,
    izid: goli.length === 2 ? { domaci: goli[0], gostje: goli[1] } : null,
    tehnicni: /Technical defeat|Տեխնիկական պարտություն|Техническое поражение/i.test(s.slice(0, s.indexOf('class="players"') >>> 0)),
    strelci,
  }
}

/**
 * Zapisnik v obliko, ki jo dajo drugi viri. Null, če tekma nima izida, je
 * tehnični poraz (kontumacija) ali kateri od ekip manjka postava.
 */
export function vZapisnik(html, { id = null, url = null } = {}) {
  const s = brezSkript(html)
  const g = glavaTekme(s)
  if (!g.izid || g.tehnicni) return null
  // Konec postav: trenerji ("Coaches") ali sodniki; tega ne beremo.
  const konec = ['players__title players__title--bt">Coaches', 'scope="row">Referee', 'class="col-lg-3"'].map((x) => s.indexOf(x)).filter((x) => x > 0)
  const telo = s.slice(0, konec.length ? Math.min(...konec) : undefined)
  const zacetniki = stolpca(telo, 'players__title">Players', 'players__title players__title--bt">Substitutes')
  const klop = stolpca(telo, 'players__title players__title--bt">Substitutes', null)
  const opozorila = []
  const ekipe = [0, 1].map((idx) => ({
    ime: idx === 0 ? g.domaci : g.gostje,
    postava: zacetniki[idx].map((i) => ({ ...i, zacetnik: true })),
    rezerve: klop[idx].map((i) => ({ ...i, zacetnik: false })),
  }))
  if (!ekipe[0].postava.length || !ekipe[1].postava.length) return null

  const ikoneGolov = []
  const rumeni = []
  const rdeci = []
  const menjave = []
  for (const [idx, e] of ekipe.entries()) {
    // Vratar ni označen; prvi začetnik je vratar — namig (kot ffm, gff).
    e.postava.forEach((i, n) => { i.vratar = n === 0 })
    for (const i of [...e.postava, ...e.rezerve]) {
      i.ime = vPriimekIme(i.polnoIme)
      i.noter = null
      i.ven = null
      i.rdec = null
      const moji = { rumeni: [], rdeci: [] }
      for (const d of i.dogodki) {
        if (!d.vrsta || d.minuta == null) {
          opozorila.push(`${e.ime}: ${i.ime} — neznan dogodek (${d.ikona ?? '?'} ${d.surovo ?? ''})`.trim())
          continue
        }
        if (d.vrsta === 'gol') ikoneGolov.push({ ekipaIdx: idx, igralec: i, minuta: d.minuta })
        else if (d.vrsta === 'rumeni') moji.rumeni.push(d.minuta)
        else if (d.vrsta === 'rdeci') moji.rdeci.push(d.minuta)
        else if (d.vrsta === 'noter') {
          if (i.zacetnik) opozorila.push(`${e.ime}: začetnik ${i.ime} vstopi (${d.minuta}')`)
          else if (i.noter == null) i.noter = d.minuta
        } else if (d.vrsta === 'ven') {
          if (i.ven != null) opozorila.push(`${e.ime}: ${i.ime} gre ven dvakrat (${i.ven}' in ${d.minuta}')`)
          else i.ven = d.minuta
        }
      }
      // Drugi rumeni: stran ga pokaže kot rumeni in rdeči ob isti minuti (ali
      // dva rumena). Kot pri drugih virih: 1 rumeni + 1 rdeči.
      if (moji.rumeni.length >= 2 && !moji.rdeci.length) moji.rdeci.push(moji.rumeni[1])
      // Menjava, vpisana obrnjeno (rezerva "vstopi" po izstopu: 67 noter, 20
      // ven — Noah-2 : MIKA, f98471): rezerva ne more iti ven, preden vstopi.
      if (!i.zacetnik && i.noter != null && i.ven != null && i.ven < i.noter) {
        opozorila.push(`${e.ime}: ${i.ime} vstop ${i.noter}' in izstop ${i.ven}' sta zamenjana — popravljeno`)
        ;[i.noter, i.ven] = [i.ven, i.noter]
      }
      if (moji.rumeni.length) rumeni.push({ ekipaIdx: idx, st: i.st, ime: i.ime, minuta: moji.rumeni[0] })
      if (moji.rdeci.length) {
        i.rdec = Math.min(...moji.rdeci)
        rdeci.push({ ekipaIdx: idx, st: i.st, ime: i.ime, minuta: i.rdec })
      }
      if (!i.zacetnik && i.ven != null && i.noter == null) opozorila.push(`${e.ime}: ${i.ime} gre ven, ne da bi vstopil`)
    }
    // Menjave: pari izstop–vstop iste minute (za izpis; minute dajo noter/ven).
    const ven = e.postava.concat(e.rezerve).filter((i) => i.ven != null)
    for (const n of e.rezerve.filter((i) => i.noter != null)) {
      const v = ven.find((x) => x.ven === n.noter && !x.paran)
      if (v) v.paran = true
      menjave.push({ ekipaIdx: idx, minuta: n.noter, noter: { st: n.st, ime: n.ime }, ven: v ? { st: v.st, ime: v.ime } : null })
    }
    if (e.postava.length !== 11) opozorila.push(`${e.ime}: v postavi je ${e.postava.length} igralcev namesto 11`)
    const kljuci = new Map()
    for (const i of [...e.postava, ...e.rezerve]) kljuci.set(`${i.st}|${i.ime}`, (kljuci.get(`${i.st}|${i.ime}`) ?? 0) + 1)
    for (const [k, n] of kljuci) if (n > 1) opozorila.push(`${e.ime}: igralec ${k.split('|')[1]} je v zapisniku ${n}-krat`)
  }
  const goli = goliIzGlave(g.strelci, ekipe, ikoneGolov, opozorila)
  // Goli, ki se ne ujemajo z izidom, so opozorilo — izid ostane izid zapisnika.
  const zaEkipo = (idx) => goli.filter((x) => (x.avtogol ? 1 - x.ekipaIdx : x.ekipaIdx) === idx).length
  if (zaEkipo(0) !== g.izid.domaci || zaEkipo(1) !== g.izid.gostje)
    opozorila.push(`goli iz dogodkov (${zaEkipo(0)}:${zaEkipo(1)}) se ne ujemajo z izidom ${g.izid.domaci}:${g.izid.gostje}`)

  const vObliko = ({ polnoIme: _p, dogodki: _d, paran: _x, ...i }) => ({ ...i, pozicija: i.vratar ? 'GK' : null })
  return {
    zapisnikId: id,
    url,
    sezona: g.sezona,
    krog: g.krog,
    datum: g.datum,
    ura: g.ura,
    domaci: { ime: ekipe[0].ime, postava: ekipe[0].postava.map(vObliko), rezerve: ekipe[0].rezerve.map(vObliko) },
    gostje: { ime: ekipe[1].ime, postava: ekipe[1].postava.map(vObliko), rezerve: ekipe[1].rezerve.map(vObliko) },
    rezultat: { domaci: g.izid.domaci, gostje: g.izid.gostje },
    // Polčasa stran ne pove.
    polcas: null,
    goli,
    zgresene: [],
    rumeni,
    rdeci,
    menjave,
    opozorila,
  }
}

/** Nastopi po imenu in dresu (kot fss): začetnik od 0, rezerva od vstopa. */
export const nastopi = (z) => nastopiPoImenu(z)

// --- klubi ---------------------------------------------------------------------

// Ključ kluba: male črke, ločila v presledek, števke ostanejo — "Ararat-2"
// (druga ekipa) ni "Ararat"; armenske črke ostanejo.
export const kljucKlubaAm = (ime) =>
  razpakiraj(ime)
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, ' ')
    .trim()

/** Kratko ime: stran piše kratka imena ("BKMA-2", "Pyunik Academy"). */
export const kratkoImeAm = (polno) => razpakiraj(polno).trim().split(/\s+/).slice(0, 3).join(' ')

// --- prenos --------------------------------------------------------------------

/** Dni od datuma tekme ('YYYY-MM-DD'); brez datuma 0, da se tekma prebere. */
export const starostDni = (datum, zdaj = Date.now()) => (datum ? (zdaj - Date.parse(`${datum}T00:00:00Z`)) / 86400000 : 0)
/** Zapisnik zadnjega tedna se še popravlja: vedno sveže. */
export const SVEZE_DNI = 7
/** Do te starosti se nerazčlenjena ali nepopolna stran iz predpomnilnika prebere še enkrat. */
export const PONOVNO_DNI = 45
const golovSeNeUjema = (z) => z.opozorila.some((o) => /^goli iz dogodkov .* se ne ujemajo/.test(o))

/**
 * Zapisnik, ki ne obtiči v predpomnilniku: tekma zadnjega tedna se bere sveže;
 * starejša do `PONOVNO_DNI` iz predpomnilnika, a če se stran ne razčleni (ni
 * postav) ali goli dogodkov niso izid, še enkrat sveže. Starejših ne beremo
 * znova (kot `zapisnikSvez` v `zapisniki.mjs`).
 */
export async function zapisnikSvez(beriStran, razcleni, datum, zdaj = Date.now()) {
  const starost = starostDni(datum, zdaj)
  const sveze = starost <= SVEZE_DNI
  const z = razcleni(await beriStran(sveze))
  if (sveze || starost > PONOVNO_DNI || (z && !golovSeNeUjema(z))) return z
  return razcleni(await beriStran(true)) ?? z
}

/** Prenos, ki se ob izzivu ali zavrnitvi ustavi (vsaka pot branja gre skozi). */
export async function beri(prenesi, url, ime, sveze) {
  let html
  try {
    html = await prenesi(url, ime, sveze)
  } catch (e) {
    if (e.zavrnitev) throw e
    if (jeZavrnitev(e.status)) throw new FfaZavrnitev(`ffa: ${url} → HTTP ${e.status} — uvoz ustavljen, ne obhajamo`, e.status)
    throw e
  }
  if (jeIzziv(html)) throw new FfaZavrnitev(`ffa: ${url} vrne izziv (CAPTCHA) — uvoz ustavljen, ne obhajamo ga`)
  return html
}

const vir = {
  ime: 'ffa',
  polnoIme: 'Football Federation of Armenia (ffa.am)',
  drzava: 'AM',
  osnovniNaslov: OSNOVNI,
  glave: { 'User-Agent': 'SLFF fantasy (https://slff.eu)' },
  // robots.txt ničesar ne prepoveduje in nima Crawl-delay; strežnik je za
  // Cloudflarom — beremo počasi.
  premorMs: 4000,
  imaRegistracije: false,

  naslovRazporeda: naslovLige,
  naslovZapisnika: (_koda, id) => naslovZapisnika(id),
  jeIzziv,
  zaPredpomnilnik,
  fetch: (url, moznosti) => ffaFetch(url, moznosti),
  zavrnitev: (sporocilo, status = null) => new FfaZavrnitev(`ffa: ${sporocilo} — uvoz ustavljen, ne obhajamo`, status),

  async razporedVseStrani(koda, prenesi) {
    const { tekme } = tekmeStrani(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
    const r = razporedIzTekem(tekme)
    if (r.izpuscenih) console.log(`  izstopili: ${r.izstopili.join(', ')} — izpuščenih neodigranih tekem: ${r.izpuscenih}`)
    return r.krogi
  },

  async zapisniki(koda, prenesi) {
    const { sezona, tekme } = tekmeStrani(koda, await beri(prenesi, naslovLige(koda), imeLige(koda), true))
    const out = []
    // Tehnični izid je kontumacija (razpored jo označi); stran tekme nima tekme.
    for (const t of tekme.filter((x) => x.izid && x.id && !x.tehnicni)) {
      const url = naslovZapisnika(t.id)
      const z = await zapisnikSvez(
        (sveze) => beri(prenesi, url, imeZapisnika(t.id), sveze),
        (html) => vZapisnik(html, { id: t.id, url }),
        t.datum,
      )
      if (!z) continue
      // Ime kluba, krog in sezona z razporeda, da se tekma ujame z vrstico razporeda.
      z.domaci.ime = t.domaci
      z.gostje.ime = t.gostje
      z.krog = t.krog
      z.sezona = sezona
      z.datum ??= t.datum
      if (z.rezultat.domaci !== t.izid.domaci || z.rezultat.gostje !== t.izid.gostje)
        z.opozorila.push(`izid zapisnika ${z.rezultat.domaci}:${z.rezultat.gostje} ni izid razporeda ${t.izid.domaci}:${t.izid.gostje}`)
      z.zapisnikId = sifraZapisnika(t.id)
      out.push({ id: z.zapisnikId, z, url })
    }
    return out
  },

  nastopi,
  vBesedilo: (s) => String(s ?? '').split('\n'),

  kljucKluba: kljucKlubaAm,
  kratkoIme: kratkoImeAm,
  poenostavi: kljucKlubaAm,
}

export default vir
