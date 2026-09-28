// "Deli tedenski pregled" — pokoncna slika ekipe po koncanem krogu.
//
// Racun (mesto, kapetan, postavitev) je v `lib/tedenskiPregled.ts`; tu se
// preberejo podatki in slika izrise. Ozadje, pisava in barve so iste kot pri
// plakatu kroga (`Plakat.tsx`), deljenje gre prek `DeliSliko`.
//
// Komponenta se ne pokaze, dokler krog ni koncan: pregled s tockami, ki se
// jutri spremenijo, bi manager delil enkrat in nikoli vec.
import { useEffect, useState } from 'react'
import DeliSliko from './DeliSliko'
import { supabase } from '../lib/supabase'
import { vseVrstice } from '../lib/strani'
import { formatirajTocke, tockZ } from '../lib/pomozno'
import type { VrsticaTuje } from '../lib/tujaEkipa'
import {
  SIRINA_P,
  VISINA_P,
  KREM,
  krogKoncan,
  danesIso,
  mestoVLigi,
  igralciPregleda,
  postaviPregled,
  imeDatotekePregleda,
  type PodatkiPregleda,
  type ElementPregleda,
} from '../lib/tedenskiPregled'
import { t } from '../i18n'

const CRNILO = '#10251B'
const pisava = (teza: number, px: number) => `${teza} ${px}px Inter, system-ui, sans-serif`

function naloziSliko(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const s = new Image()
    // Grb z drugega streznika brez CORS bi platno "umazal" in toBlob bi
    // padel. Z `anonymous` se tak grb raje ne nalozi in dobi zacetnice.
    if (/^https?:/.test(src)) s.crossOrigin = 'anonymous'
    s.onload = () => resolve(s)
    s.onerror = () => resolve(null)
    s.src = src
  })
}

/** Floodlit igrisce kot pri plakatu, le raztegnjeno na pokoncno. */
async function ozadje(c: CanvasRenderingContext2D) {
  const foto = await naloziSliko('/foto/igrisce.jpg')
  if (foto) {
    const r = Math.max(SIRINA_P / foto.width, VISINA_P / foto.height)
    c.drawImage(foto, (SIRINA_P - foto.width * r) / 2, (VISINA_P - foto.height * r) / 2, foto.width * r, foto.height * r)
  } else {
    c.fillStyle = '#0E1F17'
    c.fillRect(0, 0, SIRINA_P, VISINA_P)
  }
  // Reflektor ostane v zgornjem pasu ob znaku; kvadrat z besedilom je temen.
  const g = c.createLinearGradient(0, 0, 0, VISINA_P)
  g.addColorStop(0, 'rgba(8,24,17,.40)')
  g.addColorStop(0.2, 'rgba(8,24,17,.55)')
  g.addColorStop(0.34, 'rgba(6,18,13,.86)')
  g.addColorStop(0.55, 'rgba(6,18,13,.94)')
  g.addColorStop(1, 'rgba(6,18,13,.98)')
  c.fillStyle = g
  c.fillRect(0, 0, SIRINA_P, VISINA_P)
}

async function narisiElement(c: CanvasRenderingContext2D, e: ElementPregleda) {
  if (e.vrsta === 'pravokotnik') {
    c.fillStyle = e.barva
    c.fillRect(e.x, e.y, e.w, e.h)
  } else if (e.vrsta === 'besedilo') {
    c.font = pisava(e.teza, e.px)
    c.fillStyle = e.barva
    c.textAlign = e.poravnava
    c.letterSpacing = `${e.razmik ?? 0}px`
    c.fillText(e.besedilo, e.x, e.y)
    c.letterSpacing = '0px'
    c.textAlign = 'left'
  } else if (e.vrsta === 'znak') {
    const znak = await naloziSliko('/logo/slff-grb.png')
    if (znak) c.drawImage(znak, e.x, e.y, e.d, e.d)
  } else {
    // Grb v kremni okrogli znacki: JPG grbi z belim ozadjem sicer izgledajo
    // kot bel kvadrat na temnem.
    c.beginPath()
    c.arc(e.x, e.y, e.d / 2, 0, Math.PI * 2)
    c.fillStyle = KREM
    c.fill()
    const grb = e.url ? await naloziSliko(e.url) : null
    if (grb) {
      const r = (e.d * 0.7) / Math.max(grb.width, grb.height)
      c.drawImage(grb, e.x - (grb.width * r) / 2, e.y - (grb.height * r) / 2, grb.width * r, grb.height * r)
    } else {
      c.fillStyle = CRNILO
      c.textAlign = 'center'
      c.font = pisava(900, e.d * 0.34)
      c.fillText(e.zacetnice || '·', e.x, e.y + e.d * 0.12)
      c.textAlign = 'left'
    }
  }
}

/** Izvoz pri dvakratni velikosti (2160x3840), kot plakat — besedilo ostane ostro. */
const MERILO = 2

export async function narisiPregled(p: PodatkiPregleda): Promise<Blob | null> {
  const platno = document.createElement('canvas')
  platno.width = SIRINA_P * MERILO
  platno.height = VISINA_P * MERILO
  const c = platno.getContext('2d')
  if (!c) return null
  c.scale(MERILO, MERILO)
  await document.fonts?.ready
  await ozadje(c)
  const elementi = postaviPregled(p, (s, px, teza) => {
    c.font = pisava(teza, px)
    return c.measureText(s).width
  })
  for (const e of elementi) await narisiElement(c, e)
  return new Promise((resolve) => platno.toBlob((b) => resolve(b), 'image/png'))
}

/** Prebere vse za pregled; null, ce krog se ni koncan ali ekipa v njem ni igrala. */
async function naloziPregled(
  ekipaId: number,
  krogId: number,
  ekipa: string,
  liga: string,
): Promise<PodatkiPregleda | null> {
  const { data: krog } = await supabase
    .from('rounds')
    .select('id, number, season, competition_id')
    .eq('id', krogId)
    .maybeSingle()
  if (!krog || krog.competition_id == null) return null
  const ligaId = krog.competition_id

  const [tekme, krogi, tocke, postava] = await Promise.all([
    supabase.from('matches').select('played_on, imported_at, kontumacija').eq('round_id', krogId),
    supabase.from('rounds').select('id, number').eq('competition_id', ligaId).eq('season', krog.season),
    // Tocke vseh ekip lige do tega kroga — iz njih mesto zdaj in krog prej.
    vseVrstice((od, do_) =>
      supabase
        .from('fantasy_round_points')
        .select('round_id, fantasy_team_id, points')
        .eq('competition_id', ligaId)
        .eq('season', krog.season)
        .lte('round_number', krog.number)
        .order('round_id')
        .order('fantasy_team_id')
        .range(od, do_),
    ),
    supabase.rpc('tuja_postava', { p_team: ekipaId, p_round: krogId }),
  ])
  if (!krogKoncan(tekme.data ?? [], danesIso())) return null
  const moje = tocke.find((v) => v.fantasy_team_id === ekipaId && v.round_id === krogId)
  if (!moje) return null

  const stevilke = new Map<number, number>((krogi.data ?? []).map((k) => [k.id, k.number]))
  const { mesto, odEkip, premik } = mestoVLigi(tocke, stevilke, ekipaId, krog.number)
  const { kapetan, najboljsi } = igralciPregleda((postava.data ?? []) as VrsticaTuje[])

  // Grbi klubov obeh igralcev — tuja_postava vrne le ime kluba.
  const ids = [kapetan?.player_id, najboljsi?.player_id].filter((x): x is number => x != null)
  if (ids.length) {
    const { data } = await supabase.from('players').select('id, teams(logo_url)').in('id', ids)
    const grbi = new Map((data ?? []).map((v) => [v.id, v.teams?.logo_url ?? null]))
    if (kapetan) kapetan.grb = grbi.get(kapetan.player_id) ?? null
    if (najboljsi) najboljsi.grb = grbi.get(najboljsi.player_id) ?? null
  }

  return {
    ekipa,
    liga,
    krog: krog.number,
    tocke: Number(moje.points ?? 0),
    mesto,
    odEkip,
    premik,
    kapetan,
    najboljsi,
  }
}

export default function TedenskiPregled({
  ekipaId,
  krogId,
  ekipa,
  liga,
  povezava,
}: {
  ekipaId: number
  krogId: number
  ekipa: string
  liga: string
  povezava: string
}) {
  const [podatki, setPodatki] = useState<PodatkiPregleda | null>(null)

  useEffect(() => {
    let veljavno = true
    setPodatki(null)
    naloziPregled(ekipaId, krogId, ekipa, liga)
      .then((p) => {
        if (veljavno) setPodatki(p)
      })
      // Pregled je dodatek: ce se ne nalozi, ga preprosto ni.
      .catch(() => {})
    return () => {
      veljavno = false
    }
  }, [ekipaId, krogId, ekipa, liga])

  if (!podatki) return null
  const tocke = formatirajTocke(podatki.tocke)
  const besedilo =
    podatki.mesto != null
      ? t('lestvice.pregled.deliBesediloMesto', { ekipa, tocke, beseda: tockZ(podatki.tocke), krog: podatki.krog, mesto: podatki.mesto })
      : t('lestvice.pregled.deliBesedilo', { ekipa, tocke, beseda: tockZ(podatki.tocke), krog: podatki.krog })
  return (
    <section className="kartica space-y-2 border-gnl-400/30 bg-gnl-500/5 p-3 sm:p-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gnl-300">
        {t('lestvice.pregled.naslov', { krog: podatki.krog })}
      </h2>
      <p className="text-xs text-slate-400">{t('lestvice.pregled.opis')}</p>
      <DeliSliko
        narisi={() => narisiPregled(podatki)}
        kljuc={JSON.stringify(podatki)}
        naslov={ekipa}
        besedilo={besedilo}
        povezava={povezava}
        imeSlike={imeDatotekePregleda(ekipa, podatki.krog)}
        gumbDeli={t('lestvice.pregled.deli')}
        gumbPrenesi={t('lestvice.pregled.prenesi')}
      />
    </section>
  )
}
