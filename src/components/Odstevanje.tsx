import { useEffect, useState } from 'react'
import { t, datumUra } from '../i18n'

// Živi odštevalnik do roka. Osveži se vsakih 30 s (dovolj natančno za
// prikaz v dnevih/urah, brez podpisa vsake sekunde).
export default function Odstevanje({
  do: doIso,
  ozadje,
}: {
  do?: string | null
  ozadje?: boolean
}) {
  const [zdaj, setZdaj] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setZdaj(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  if (!doIso) return null
  const rok = new Date(doIso).getTime()
  const preostanek = rok - zdaj
  const zapadel = preostanek <= 0

  const abs = Math.abs(preostanek)
  const d = Math.floor(abs / 86400000)
  const h = Math.floor((abs % 86400000) / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)

  const nizComponents: string[] = []
  if (d > 0) nizComponents.push(t('aplikacija.odstevanje.dni', { n: d }))
  if (h > 0 || d > 0) nizComponents.push(t('aplikacija.odstevanje.ur', { n: h }))
  nizComponents.push(t('aplikacija.odstevanje.minut', { n: m }))
  const niz = nizComponents.join(' ')

  const skoraj = !zapadel && preostanek < 3600000 // < 1 h
  const barva = zapadel
    ? 'text-rose-300'
    : skoraj
      ? 'text-amber-300'
      : 'text-gnl-300'

  return (
    <span
      className={`tabular-nums ${barva} ${
        ozadje ? 'rounded-lg bg-slate-950/40 px-2 py-1' : ''
      }`}
      title={datumUra(doIso)}
    >
      {zapadel
        ? t('aplikacija.odstevanje.zaklenjenoPred', { cas: niz })
        : t('aplikacija.odstevanje.se', { cas: niz })}
    </span>
  )
}
