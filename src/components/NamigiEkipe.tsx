// Dva majhna okvirčka na vrhu Moje ekipe: gibanje cen od zadnjega obiska in
// namigi za prestope. Oba se dasta zapreti; podatke in odločitve pripravi
// stran (`lib/namigiEkipe.ts`), tu je le izris.
import { useState } from 'react'
import { formatirajCeno, prikazniIme } from '../lib/pomozno'
import type { RazlogSibkosti, SibkoMesto } from '../lib/namigiEkipe'
import { t, tx, stevilo } from '../i18n'

/** Koliko šibkih mest pokažemo, preden je treba klikniti "Pokaži vse". */
const NAJVEC_MEST = 3

const ime = (polno: string | null | undefined) => prikazniIme(polno) || t('mojaEkipa.igralec')

const znak = (c: number) => (c > 0 ? '+' : '−')

function Zapri({ oznaka, naKlik }: { oznaka: string; naKlik: () => void }) {
  return (
    <button
      onClick={naKlik}
      aria-label={oznaka}
      title={oznaka}
      className="shrink-0 rounded-lg px-2 py-0.5 text-slate-500 hover:bg-white/10 hover:text-slate-200"
    >
      ✕
    </button>
  )
}

export interface GibanjeZaIzpis {
  player_id: number
  ime: string | null
  iz: number
  v: number
  razlikaC: number
}

export function OdZadnjegaObiska({
  igralci,
  skupajC,
  zadnjiObisk,
  naZapri,
}: {
  igralci: GibanjeZaIzpis[]
  skupajC: number
  zadnjiObisk: boolean
  naZapri: () => void
}) {
  if (igralci.length === 0) return null
  return (
    <section className="kartica p-3 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {zadnjiObisk ? t('mojaEkipa.odZadnjegaObiska.naslov') : t('mojaEkipa.odZadnjegaObiska.naslovTeden')}
          </h2>
          <p className="mt-0.5 text-slate-300">
            {tx(
              'mojaEkipa.odZadnjegaObiska.vrednost',
              { znak: skupajC === 0 ? '±' : znak(skupajC), cena: formatirajCeno(Math.abs(skupajC) / 100) },
              {
                znesek: (b) => (
                  <strong
                    className={`tabular-nums ${skupajC > 0 ? 'text-gnl-300' : skupajC < 0 ? 'text-rose-300' : 'text-slate-200'}`}
                  >
                    {b}
                  </strong>
                ),
              },
            )}
          </p>
        </div>
        <Zapri oznaka={t('mojaEkipa.odZadnjegaObiska.zapri')} naKlik={naZapri} />
      </div>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {igralci.map((i) => {
          const gor = i.razlikaC > 0
          return (
            <li
              key={i.player_id}
              className={`znacka tabular-nums ${gor ? 'bg-gnl-500/15 text-gnl-200' : 'bg-rose-500/15 text-rose-200'}`}
            >
              <span aria-label={gor ? t('mojaEkipa.odZadnjegaObiska.gor') : t('mojaEkipa.odZadnjegaObiska.dol')}>
                {gor ? '▲' : '▼'}
              </span>{' '}
              {ime(i.ime)} {formatirajCeno(i.iz)} → {formatirajCeno(i.v)}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Kar namigi potrebujejo o igralcu za izpis. */
export interface IgralecNamiga {
  id: number
  full_name?: string | null
  team_short?: string | null
  team_name?: string | null
  value?: number | string | null
  form?: number | string | null
}

const BARVA_RAZLOGA: Record<RazlogSibkosti, string> = {
  neaktiven: 'bg-rose-500/20 text-rose-200',
  poskodba: 'bg-rose-500/20 text-rose-200',
  odsotnost: 'bg-amber-500/20 text-amber-200',
  brezTekme: 'bg-white/10 text-slate-300',
}

export function NamigiZaPrestope<T extends IgralecNamiga>({
  krog,
  mesta,
  naZamenjaj,
  naSkrij,
}: {
  krog: number | null
  mesta: SibkoMesto<T & { id: number }>[]
  naZamenjaj: (stari: T, novi: T) => void
  naSkrij: () => void
}) {
  const [vse, setVse] = useState(false)
  if (mesta.length === 0) return null
  const vidna = vse ? mesta : mesta.slice(0, NAJVEC_MEST)
  return (
    <section className="kartica border-amber-400/25 p-3 text-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-200">
            💡 {t('mojaEkipa.namigi.naslov')}
          </h2>
          {krog != null && (
            <p className="mt-0.5 text-xs text-slate-400">{t('mojaEkipa.namigi.zaKrog', { krog })}</p>
          )}
        </div>
        <Zapri oznaka={t('mojaEkipa.namigi.skrij')} naKlik={naSkrij} />
      </div>
      <ul className="mt-2 space-y-2">
        {vidna.map(({ igralec, razlog, zamenjave }) => (
          <li key={igralec.id} className="border-t border-white/5 pt-2 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-slate-100">{ime(igralec.full_name)}</span>
              <span className="text-xs text-slate-500">{igralec.team_short ?? igralec.team_name}</span>
              <span className={`znacka text-[10px] ${BARVA_RAZLOGA[razlog]}`}>
                {t(`mojaEkipa.namigi.razlog.${razlog}`)}
              </span>
            </div>
            {zamenjave.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {zamenjave.map((k) => {
                  const namig = t('mojaEkipa.namigi.zamenjajNamig', {
                    ime: ime(igralec.full_name),
                    novi: ime(k.full_name),
                  })
                  return (
                    <button
                      key={k.id}
                      onClick={() => naZamenjaj(igralec, k)}
                      title={namig}
                      aria-label={namig}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-left text-xs transition hover:border-gnl-400/50 hover:bg-gnl-500/10"
                    >
                      <span aria-hidden className="text-gnl-300">⇄ </span>
                      <span className="font-semibold text-slate-100">{ime(k.full_name)}</span>{' '}
                      <span className="text-slate-500">{k.team_short ?? k.team_name}</span>{' '}
                      <span className="tabular-nums text-slate-400">
                        {t('mojaEkipa.namigi.kandidat', {
                          cena: formatirajCeno(k.value),
                          forma: stevilo(Number(k.form ?? 0), { maximumFractionDigits: 1 }),
                        })}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">{t('mojaEkipa.namigi.niZamenjave')}</p>
            )}
          </li>
        ))}
      </ul>
      {!vse && mesta.length > NAJVEC_MEST && (
        <button onClick={() => setVse(true)} className="mt-2 text-xs text-slate-400 underline hover:text-slate-200">
          {t('mojaEkipa.opozorila.pokaziVse', { n: mesta.length })}
        </button>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{t('mojaEkipa.namigi.opomba')}</p>
    </section>
  )
}
