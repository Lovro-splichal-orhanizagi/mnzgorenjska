// Zgodbe za Instagram na svojem profilu (SLF-373): zgodba po zadnji tekmi
// (preverjeni), "Moja sezona" (preverjeni polno, ostali napoved z vabilom na
// /verified) in povezava na CV (preverjeni). Kaj kdo dobi, odloči baza.
import { useEffect, useState } from 'react'
import DeliSliko from './DeliSliko'
import { Link } from './Povezava'
import { supabase } from '../lib/supabase'
import { izvor } from '../lib/platforma'
import { imeZgodbe, narisiSezono, narisiZgodboTekme, type MojaSezona, type ZadnjaTekma } from '../lib/zgodbe'
import { t } from '../i18n'

/** Highlight video: ekipa SLFF ga zmontira iz 6 odobrenih posnetkov (`moj_highlight`). */
type Highlight = { posnetkov: number; potrebnih: number; stanje: 'kontaktiran' | 'v_delu' | 'oddan' | null }

export default function ZgodbeIgralca({ igralecId }: { igralecId: number }) {
  const [sezona, setSezona] = useState<MojaSezona | null>(null)
  const [tekma, setTekma] = useState<ZadnjaTekma | null>(null)
  const [highlight, setHighlight] = useState<Highlight | null>(null)

  useEffect(() => {
    let velja = true
    void Promise.resolve(supabase.rpc('moja_sezona', { p_player_id: igralecId })).then(
      ({ data }) => velja && setSezona((data as MojaSezona | null) ?? null),
    )
    void Promise.resolve(supabase.rpc('zadnja_tekma_zgodba', { p_player_id: igralecId })).then(
      ({ data }) => velja && setTekma((data as ZadnjaTekma | null) ?? null),
    )
    void Promise.resolve(supabase.rpc('moj_highlight', { p_player_id: igralecId })).then(
      ({ data }) => velja && setHighlight((data as Highlight | null) ?? null),
    )
    return () => {
      velja = false
    }
  }, [igralecId])

  if (!sezona && !tekma) return null
  const povezava = `${izvor()}/player/${igralecId}`

  return (
    <section aria-labelledby="zgodbe-igralca" className="kartica space-y-4 p-4">
      <div>
        <h2 id="zgodbe-igralca" className="text-sm font-bold uppercase tracking-wide text-slate-300">
          {t('igralci.zgodbe.naslov')}
        </h2>
        <p className="text-sm text-slate-400">{t('igralci.zgodbe.opis')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tekma && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">{t('igralci.zgodbe.zgodbaTekme')}</h3>
            <DeliSliko
              narisi={() => narisiZgodboTekme(tekma)}
              kljuc={`tekma-${tekma.tekma}-${tekma.tocke}`}
              naslov={tekma.ime}
              besedilo={t('igralci.zgodbe.besediloTekme', { domaci: tekma.domaci, gostje: tekma.gostje, izid: `${tekma.hg}:${tekma.ag}` })}
              povezava={povezava}
              imeSlike={imeZgodbe(tekma, 'tekma')}
            />
          </div>
        )}
        {sezona && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-200">{t('igralci.zgodbe.mojaSezona')}</h3>
            <DeliSliko
              narisi={() => narisiSezono(sezona)}
              kljuc={`sezona-${sezona.sezona}-${sezona.preverjen}-${sezona.minute}-${sezona.goli}`}
              naslov={sezona.ime}
              besedilo={t('igralci.zgodbe.besediloSezone', { sezona: sezona.sezona })}
              povezava={povezava}
              imeSlike={imeZgodbe(sezona, 'sezona')}
            />
            {!sezona.preverjen && (
              <p className="text-xs text-slate-400">
                {t('igralci.zgodbe.napovedOpis')}{' '}
                <Link to="/verified" className="text-sky-300 underline">
                  {t('preverjeni.vec')}
                </Link>
              </p>
            )}
          </div>
        )}
      </div>

      {highlight && <HighlightVideo h={highlight} />}

      {sezona?.preverjen && (
        <Link to={`/cv/${igralecId}`} className="gumb-tih inline-flex min-h-11 items-center px-4 text-sm">
          {t('igralci.zgodbe.cv')}
        </Link>
      )}
    </section>
  )
}

function HighlightVideo({ h }: { h: Highlight }) {
  const polno = h.posnetkov >= h.potrebnih
  const opis = h.stanje
    ? t(`igralci.highlight.stanje.${h.stanje}`)
    : polno
      ? t('igralci.highlight.polno')
      : t('igralci.highlight.manj', { n: h.potrebnih - h.posnetkov })
  return (
    <div className="preverjeni-zlato space-y-2 rounded-2xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-amber-100">{t('igralci.highlight.naslov')}</h3>
        <span className="text-sm font-black tabular-nums text-white">
          {Math.min(h.posnetkov, h.potrebnih)}/{h.potrebnih}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, (h.posnetkov / h.potrebnih) * 100)}%` }} />
      </div>
      <p className="text-sm text-slate-300">{opis}</p>
    </div>
  )
}
