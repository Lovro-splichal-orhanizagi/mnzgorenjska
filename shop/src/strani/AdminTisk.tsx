import { useCallback, useEffect, useMemo, useState } from 'react'
import { opisPersonalizacije, supabase, type PostavkaTiska, type Serija, type SerijaPovzetek } from '../baza'
import { datum, t } from '../besede'
import { barvaRazlicice, conaZa } from '../mockup'
import { celicaCsv, oblikaSvg } from '../personalizacija'
import { coneMotiva, narisiMotiv, praznaCona, velikostMm, zVgrajenoPisavo } from '../risba'
import { Nalaganje } from '../seja'

// Zavihek "Za tisk": plačane personalizirane postavke (za_tisk) → serija →
// izvoz za tiskarno (CSV, za vsako postavko SVG; motiv: SVG in PNG za vsako
// cono) → "Poslano tiskarni" → "Natisnjeno" (postavke natisnjeno; naročilo gre
// med "Za pakiranje").
// ponytail: brez ZIP (ni knjižnice): datoteke se prenesejo vsaka posebej.

/** Datoteka motiva za tisk: neprazna cona postavke z merami cone nosilca v mm. */
export interface DatotekaTiska {
  cona: string
  /** <oznaka>-<cona>-<postopek>-<postavka>, brez končnice. */
  ime: string
  mm: { sirina: number; visina: number }
}

/** Datoteke motiva postavke (prazna cona se ne tiska); stara oblika → []. */
export function datotekeTiska(p: PostavkaTiska): DatotekaTiska[] {
  const motiv = p.personalizacija?.motiv
  if (!motiv) return []
  const polja = p.personalizacija?.polja ?? {}
  const barva = p.razlicica ? barvaRazlicice(p.razlicica) : null
  return coneMotiva(motiv).filter((cona) => !praznaCona(motiv, polja, cona)).map((cona) => {
    const c = conaZa(p.cone ?? [], cona, barva)
    return {
      cona,
      ime: `${p.javna_oznaka}-${cona}-${p.postopek ?? 'tisk'}-${p.postavka_id}`,
      mm: c ? { sirina: c.sirina_mm, visina: c.visina_mm } : velikostMm(motiv, cona),
    }
  })
}

/** Prirez 3 mm, rezilne oznake 5 mm zunaj prireza, 2 mm roba: motiv je ROB mm od roba lista. */
const PRIREZ = 3
const ZNAK = 5
export const ROB = PRIREZ + ZNAK + 2

/**
 * List za tiskarno: prava velikost cone v mm (+ prirez in oznake), motiv na
 * sredini cone, rezilne oznake v vogalih zunaj prireza. Pisave še ni (zVgrajenoPisavo).
 */
export function svgZaTisk(p: PostavkaTiska, d: DatotekaTiska): string {
  const { sirina: W, visina: H } = d.mm
  const S = W + 2 * ROB
  const V = H + 2 * ROB
  // Koren motiva dobi mere v enotah lista (mm), ne v pravih mm; overflow: kar sega čez rob, gre v prirez.
  const motiv = narisiMotiv(p.personalizacija!.motiv!, p.personalizacija?.polja ?? {}, p.barve ?? [], d.cona, d.mm)
    .replace(/^<svg\b[^>]*>/, (o) => o.replace(/\s(width|height)="[^"]*"/g, '')
      .replace(/^<svg/, `<svg x="${ROB}" y="${ROB}" width="${W}" height="${H}" overflow="visible"`))
  const a = ROB - PRIREZ // oznaka od a - ZNAK do a, enako na drugi strani
  const oznake = [
    ...[ROB, ROB + W].flatMap((x) => [`M${x} ${a - ZNAK}V${a}`, `M${x} ${V - a}V${V - a + ZNAK}`]),
    ...[ROB, ROB + H].flatMap((y) => [`M${a - ZNAK} ${y}H${a}`, `M${S - a} ${y}H${S - a + ZNAK}`]),
  ].join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${S}mm" height="${V}mm" viewBox="0 0 ${S} ${V}">`
    + `<path d="${oznake}" fill="none" stroke="#000" stroke-width="0.25" data-oznake="rez"/>${motiv}</svg>\n`
}

const crc32 = (b: Uint8Array): number => {
  let c = ~0
  for (const x of b) {
    c ^= x
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

/** Canvas zapiše PNG brez ločljivosti: za IHDR vstavimo pHYs 300 dpi (11811 px/m), da tiskarna vidi prave mere. */
export function s300dpi(png: Uint8Array<ArrayBuffer>): Blob {
  const kos = new Uint8Array(21)
  const v = new DataView(kos.buffer)
  v.setUint32(0, 9)
  kos.set([0x70, 0x48, 0x59, 0x73], 4) // pHYs
  v.setUint32(8, 11811)
  v.setUint32(12, 11811)
  kos[16] = 1
  v.setUint32(17, crc32(kos.subarray(4, 17)))
  const imaPhys = String.fromCharCode(...png.subarray(37, 41)) === 'pHYs'
  return new Blob(imaPhys ? [png] : [png.subarray(0, 33), kos, png.subarray(33)], { type: 'image/png' })
}

/** PNG 300 dpi iz SVG z vgrajeno pisavo (brskalnik riše SVG kot sliko, nato na <canvas>). */
export async function pngIzSvg(svg: string, sirinaMm: number, visinaMm: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const slika = new Image()
    slika.src = url
    await slika.decode()
    const platno = Object.assign(document.createElement('canvas'), {
      width: Math.round((sirinaMm / 25.4) * 300), height: Math.round((visinaMm / 25.4) * 300),
    })
    platno.getContext('2d')!.drawImage(slika, 0, 0, platno.width, platno.height)
    const png = await new Promise<Blob | null>((r) => platno.toBlob(r, 'image/png'))
    if (!png) throw new Error('PNG')
    return s300dpi(new Uint8Array(await png.arrayBuffer()))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** serija-<id>.csv: ločilo ;, BOM za Excel, vsaka celica v narekovajih. Motiv: vrstica na cono. */
export function csvSerije(s: Serija): string {
  const glava = [t('admin.tisk.oznaka'), t('admin.tisk.postavka'), t('admin.tisk.sku'), t('admin.tisk.izdelek'), t('admin.tisk.kolicina'),
    t('admin.tisk.besedilo'), t('admin.tisk.stevilka'), 'SVG', t('admin.tisk.motiv'), t('admin.tisk.postopek'), t('admin.tisk.cona'), 'PNG']
  const vrstice = s.postavke.flatMap((p) => {
    const osnova = [p.javna_oznaka, p.postavka_id, p.sku, p.ime, p.kolicina, p.personalizacija?.ime ?? null]
    const motiv = p.personalizacija?.motiv
    return !motiv ? [[...osnova, p.personalizacija?.stevilka ?? null, imeSvg(p), null, p.postopek ?? null, null, null]]
      : datotekeTiska(p).map((d) => [...osnova, null, `${d.ime}.svg`, motiv, p.postopek ?? null, d.cona, `${d.ime}.png`])
  })
  return `\ufeff${[glava, ...vrstice].map((v) => v.map(celicaCsv).join(';')).join('\r\n')}\r\n`
}

const imeSvg = (p: PostavkaTiska): string => `${p.javna_oznaka}-${p.postavka_id}.svg`
export const svgPostavke = (p: PostavkaTiska): string => oblikaSvg(p.personalizacija?.ime ?? null, p.personalizacija?.stevilka ?? null)

function prenesi(ime: string, vsebina: BlobPart, tip: string) {
  const url = URL.createObjectURL(new Blob([vsebina], { type: tip }))
  const a = Object.assign(document.createElement('a'), { href: url, download: ime })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const premor = () => new Promise((r) => setTimeout(r, 300))

/** Vse datoteke serije, ena za drugo (brskalnik sicer več hkratnih prenosov zavrne). */
async function prenesiVse(s: Serija) {
  for (const p of s.postavke) {
    const datoteke = datotekeTiska(p)
    if (!p.personalizacija?.motiv) {
      prenesi(imeSvg(p), svgPostavke(p), 'image/svg+xml')
      await premor()
    }
    for (const d of datoteke) {
      const svg = await zVgrajenoPisavo(svgZaTisk(p, d))
      prenesi(`${d.ime}.svg`, svg, 'image/svg+xml')
      await premor()
      prenesi(`${d.ime}.png`, await pngIzSvg(svg, d.mm.sirina + 2 * ROB, d.mm.visina + 2 * ROB), 'image/png')
      await premor()
    }
  }
}

export function AdminTisk({ zavrnjen }: { zavrnjen: () => void }) {
  const [za, setZa] = useState<PostavkaTiska[] | null>(null)
  const [serije, setSerije] = useState<SerijaPovzetek[]>([])
  const [izbrane, setIzbrane] = useState<Set<number>>(new Set())
  const [serija, setSerija] = useState<Serija | null>(null)
  const [napaka, setNapaka] = useState<string | null>(null)
  const [poteka, setPoteka] = useState(false)

  const nalozi = useCallback(async () => {
    const [a, b] = await Promise.all([supabase.rpc('trgovina_admin_za_tisk'), supabase.rpc('trgovina_admin_serije')])
    if (a.error?.code === '42501' || b.error?.code === '42501') return zavrnjen()
    setNapaka(a.error?.message ?? b.error?.message ?? null)
    setZa((a.data as unknown as PostavkaTiska[] | null) ?? [])
    setSerije((b.data as unknown as SerijaPovzetek[] | null) ?? [])
    setIzbrane(new Set())
  }, [zavrnjen])

  useEffect(() => void nalozi(), [nalozi])

  async function klic(f: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
    setPoteka(true)
    setNapaka(null)
    const { data, error } = await f()
    setPoteka(false)
    if (error) return setNapaka(error.message)
    setSerija(data as Serija)
    void nalozi()
  }

  if (za === null) return <Nalaganje />
  if (serija) {
    return (
      <div className="space-y-4">
        <button type="button" className="povezava text-sm" onClick={() => setSerija(null)}>← {t('admin.tisk.nazaj')}</button>
        <PogledSerije s={serija} />
        {napaka && <p className="opozorilo">{napaka}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="gumb-tih" onClick={() => prenesi(`serija-${serija.id}.csv`, csvSerije(serija), 'text/csv;charset=utf-8')}>{t('admin.tisk.csv')}</button>
          <button type="button" className="gumb-tih" disabled={poteka}
            onClick={() => {
              setPoteka(true)
              prenesiVse(serija).catch((e: unknown) => setNapaka(String(e))).finally(() => setPoteka(false))
            }}>
            {t('admin.tisk.vsiSvg')}
          </button>
          <span className="flex-1" />
          <button type="button" className="gumb-tih" disabled={poteka || Boolean(serija.poslana_at)}
            onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija_stanje', { p_id: serija.id, p_stanje: 'poslana' }))}>
            {t('admin.tisk.poslano')}
          </button>
          <button type="button" className="gumb-glavni" disabled={poteka || Boolean(serija.natisnjena_at)}
            onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija_stanje', { p_id: serija.id, p_stanje: 'natisnjena' }))}>
            {t('admin.tisk.natisnjeno')}
          </button>
        </div>
      </div>
    )
  }

  const preklopi = (id: number) => setIzbrane((s) => {
    const n = new Set(s)
    if (!n.delete(id)) n.add(id)
    return n
  })

  return (
    <div className="space-y-6">
      {napaka && <p className="opozorilo">{napaka}</p>}
      <section className="space-y-3">
        {za.length === 0 ? <p className="kartica p-5 text-slate-400">{t('admin.tisk.prazno')}</p> : (
          <ul className="kartica divide-y divide-white/5">
            {za.map((p) => (
              <li key={p.postavka_id}>
                <label className="flex items-center gap-3 p-3 text-sm">
                  <input type="checkbox" checked={izbrane.has(p.postavka_id)} onChange={() => preklopi(p.postavka_id)} />
                  <span className="font-mono">{p.javna_oznaka}</span>
                  <span className="flex-1"><b>{p.kolicina} ×</b> {p.ime} <span className="text-slate-500">{p.sku}</span></span>
                  <span className="font-semibold uppercase text-gnl-200">{opisPersonalizacije(p.personalizacija)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="gumb-glavni" disabled={poteka || izbrane.size === 0}
          onClick={() => void klic(() => supabase.rpc('trgovina_admin_nova_serija', { p_postavke: [...izbrane] }))}>
          {t('admin.tisk.novaSerija', { n: izbrane.size })}
        </button>
      </section>
      {serije.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">{t('admin.tisk.serije')}</h2>
          <ul className="kartica divide-y divide-white/5 text-sm">
            {serije.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                <b>{t('admin.tisk.serija', { id: s.id })}</b>
                <span className="text-slate-400">{t('admin.tisk.postavk', { n: s.postavk })} · {stanjeSerije(s)}</span>
                <span className="flex-1" />
                <button type="button" className="gumb-tih" onClick={() => void klic(() => supabase.rpc('trgovina_admin_serija', { p_id: s.id }))}>{t('admin.tisk.odpri')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

const stanjeSerije = (s: Pick<SerijaPovzetek, 'created_at' | 'poslana_at' | 'natisnjena_at'>): string =>
  s.natisnjena_at ? t('admin.tisk.natisnjena', { datum: datum(s.natisnjena_at) })
    : s.poslana_at ? t('admin.tisk.poslana', { datum: datum(s.poslana_at) })
    : t('admin.tisk.ustvarjena', { datum: datum(s.created_at) })

/** Serija s predogledom vsake oblike (ista SVG kot v izvozu). */
export function PogledSerije({ s }: { s: Serija }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">{t('admin.tisk.serija', { id: s.id })} <span className="text-sm font-normal text-slate-400">{stanjeSerije(s)}</span></h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {s.postavke.map((p) => (
          <li key={p.postavka_id} className="kartica space-y-2 p-3 text-sm">
            {p.personalizacija?.motiv
              ? datotekeTiska(p).map((d) => <SlikaTiska key={d.cona} p={p} d={d} />)
              : <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgPostavke(p))}`} alt={opisPersonalizacije(p.personalizacija)}
                className="aspect-square w-full rounded-lg bg-white" />}
            <p><span className="font-mono">{p.javna_oznaka}</span> · <b>{p.kolicina} ×</b> {p.ime}</p>
            <p className="text-slate-500">{p.sku}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Predogled lista za tisk (ista SVG kot v izvozu, s pisavo Anton). */
function SlikaTiska({ p, d }: { p: PostavkaTiska; d: DatotekaTiska }) {
  const svg = useMemo(() => svgZaTisk(p, d), [p, d.cona]) // eslint-disable-line react-hooks/exhaustive-deps
  const [s, setS] = useState(svg)
  useEffect(() => {
    let ziv = true
    void zVgrajenoPisavo(svg).then((z) => ziv && setS(z))
    return () => { ziv = false }
  }, [svg])
  return (
    <figure className="space-y-1">
      <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`} alt={`${opisPersonalizacije(p.personalizacija)} · ${d.cona}`}
        className="w-full rounded-lg bg-white" />
      <figcaption className="font-mono text-xs text-slate-500">{`${d.ime} · ${d.mm.sirina} × ${d.mm.visina} mm`}</figcaption>
    </figure>
  )
}
