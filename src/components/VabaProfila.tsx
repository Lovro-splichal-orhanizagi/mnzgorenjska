// Okno "Tvoj profil" na lastnem profilu: ogledi profila in fantasy ekipe, ki
// igralca imajo, z njegovo vlogo v vsaki (kapetan, postava, klop), brez
// ostalega kadra. Brez kljukice lastnik vidi isto okno zamegljeno in gumb za
// preverjen profil; baza mu številk sploh ne pošlje (`vaba_profila`), zamegljene
// so izmišljene. Kdor ni lastnik, dobi null in okna ni.
import { useEffect, useId, useState, type ReactNode } from 'react'
import { t, stevilo } from '../i18n'
import { vabaProfila, type EkipaVabe, type Vaba } from '../lib/ogledi'
import { zLigo } from '../lib/tekmovanje'
import { Link } from './Povezava'

const PRVIH = 8

const VLOGA: Record<EkipaVabe['vloga'], () => string> = {
  kapetan: () => t('igralci.vaba.vloga.kapetan'),
  podkapetan: () => t('igralci.vaba.vloga.podkapetan'),
  postava: () => t('igralci.vaba.vloga.postava'),
  klop: () => t('igralci.vaba.vloga.klop'),
}

export default function VabaProfila({ igralecId }: { igralecId: number }) {
  const [vaba, setVaba] = useState<Vaba | null>(null)

  useEffect(() => {
    let velja = true
    setVaba(null)
    void vabaProfila(igralecId).then((v) => velja && setVaba(v))
    return () => {
      velja = false
    }
  }, [igralecId])

  if (!vaba) return null
  return vaba.preverjen ? <Odklenjeno vaba={vaba} /> : <Zaklenjeno />
}

function Okvir({ children, oznaka }: { children: ReactNode; oznaka: string }) {
  return (
    <section aria-labelledby={oznaka} className="izbranost-reflektor space-y-4 rounded-2xl p-4 sm:p-5">
      <h2 id={oznaka} className="text-lg font-black text-white sm:text-xl">
        {t('igralci.vaba.naslov')}
      </h2>
      {children}
    </section>
  )
}

function Stevec({ vrednost, oznaka }: { vrednost: ReactNode; oznaka: string }) {
  return (
    <div>
      <p className="text-4xl font-black tabular-nums leading-none text-white">{vrednost}</p>
      <p className="mt-1 text-xs text-slate-300">{oznaka}</p>
    </div>
  )
}

/** Izmišljena številka pod meglo; bralniki zaslona slišijo "skrito". */
function Megla({ kaj }: { kaj: string }) {
  return (
    <>
      <span aria-hidden="true" className="select-none blur-md">{kaj}</span>
      <span className="sr-only">{t('igralci.vaba.skrito')}</span>
    </>
  )
}

function Zaklenjeno() {
  const id = useId()
  return (
    <Okvir oznaka={id}>
      <div className="grid grid-cols-3 gap-3">
        <Stevec vrednost={<Megla kaj="248" />} oznaka={t('igralci.vaba.ogledi7')} />
        <Stevec vrednost={<Megla kaj="37" />} oznaka={t('igralci.vaba.vEkipah')} />
        <Stevec vrednost={<Megla kaj="9" />} oznaka={t('igralci.vaba.kapetan')} />
      </div>
      <ul aria-hidden="true" className="select-none space-y-2 blur-sm">
        {['FC Zmagovalci', 'Nedeljska liga', 'Ekipa sanj'].map((ime, i) => (
          <li key={ime} className="flex justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span className="text-white">{ime}</span>
            <span className="text-slate-300">#{i * 7 + 3}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-200">{t('igralci.vaba.zaklenjeno')}</p>
      <Link to="/verified" className="gumb-glavni inline-flex min-h-11 w-full items-center justify-center text-sm sm:w-auto sm:px-5">
        {t('igralci.vaba.odkleni')}
      </Link>
    </Okvir>
  )
}

function Odklenjeno({ vaba }: { vaba: Extract<Vaba, { preverjen: true }> }) {
  const id = useId()
  const [vse, setVse] = useState(false)
  const kapetanov = vaba.ekipe.filter((e) => e.vloga === 'kapetan').length
  const naKlopi = vaba.ekipe.filter((e) => e.vloga === 'klop').length
  const najvec = Math.max(1, ...vaba.tedni.map((w) => w.ogledi))
  const prikazane = vse ? vaba.ekipe : vaba.ekipe.slice(0, PRVIH)

  return (
    <Okvir oznaka={id}>
      <div className="grid grid-cols-3 gap-3">
        <Stevec vrednost={stevilo(vaba.ogledi_7)} oznaka={t('igralci.vaba.ogledi7')} />
        <Stevec vrednost={stevilo(vaba.ekipe.length)} oznaka={t('igralci.vaba.vEkipah')} />
        <Stevec vrednost={stevilo(kapetanov)} oznaka={t('igralci.vaba.kapetan')} />
      </div>

      {vaba.tedni.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-300">{t('igralci.vaba.tedni')}</p>
          <div className="flex h-16 items-end gap-1" role="img" aria-label={t('igralci.vaba.skupaj', { n: stevilo(vaba.ogledi_skupaj) })}>
            {vaba.tedni.map((w) => (
              <div key={w.teden} className="flex-1 rounded-t bg-gnl-400/80" style={{ height: `${Math.max(6, (w.ogledi / najvec) * 100)}%` }} />
            ))}
          </div>
        </div>
      )}

      {vaba.drzave.length > 0 && (
        <p className="text-sm text-slate-200">
          <span className="font-semibold">{t('igralci.vaba.drzave')}</span>{' '}
          {vaba.drzave.map((d) => `${d.drzava} ${stevilo(d.ogledi)}`).join(' · ')}
        </p>
      )}

      <div className="space-y-2 border-t border-white/10 pt-3">
        <h3 className="font-semibold text-slate-100">
          {t('igralci.vaba.ekipe')}
          {naKlopi > 0 && <span className="ml-2 text-xs font-normal text-slate-400">{t('igralci.vaba.naKlopi', { n: naKlopi })}</span>}
        </h3>
        {vaba.ekipe.length === 0 ? (
          <p className="text-sm text-slate-300">{t('igralci.vaba.brezEkip')}</p>
        ) : (
          <ul className="space-y-2">
            {prikazane.map((e) => (
              <Ekipa key={e.id} e={e} />
            ))}
          </ul>
        )}
        {!vse && vaba.ekipe.length > PRVIH && (
          <button type="button" onClick={() => setVse(true)} className="text-sm font-semibold text-gnl-300 underline">
            {t('igralci.vaba.vse', { n: vaba.ekipe.length })}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">{t('igralci.vaba.zasebnost')}</p>
    </Okvir>
  )
}

function Ekipa({ e }: { e: EkipaVabe }) {
  return (
    <li>
      <Link
        to={zLigo(`/team/${e.id}`, e.liga)}
        className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold text-white">{e.ime}</span>
          {e.lastnik && <span className="block truncate text-xs text-slate-400">{e.lastnik}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-xs font-semibold text-gnl-300">{VLOGA[e.vloga]()}</span>
          {e.mesto != null && <span className="block text-xs tabular-nums text-slate-400">#{e.mesto}</span>}
        </span>
      </Link>
    </li>
  )
}
