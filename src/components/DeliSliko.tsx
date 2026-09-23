// Gumbi za deljenje slike — skupni plakatu kroga in kartici igralca.
//
// Na telefonu "Deli sliko" odpre sistemski meni s SLIKO (WhatsApp, Instagram,
// Facebook, Messenger). Računalniki tega večinoma ne znajo; tam ostane prenos.
// "Deli povezavo" pošlje povezavo — Facebook in WhatsApp iz nje sama naredita
// predogled.
import { useEffect, useRef, useState } from 'react'

function znaDelitiSliko(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'slff.png', { type: 'image/png' })] })
    )
  } catch {
    return false
  }
}

export default function DeliSliko({
  narisi,
  kljuc,
  naslov,
  besedilo,
  povezava,
  imeSlike,
}: {
  /** Izriše sliko; klic mora biti ponovljiv. */
  narisi: () => Promise<Blob | null>
  /** Vsebina slike v obliki niza — ko se spremeni, se slika izriše znova. */
  kljuc: string
  naslov: string
  besedilo: string
  povezava: string
  imeSlike: string
}) {
  const [dela, setDela] = useState(false)
  const [sporocilo, setSporocilo] = useState<string | null>(null)
  const [delitevSlike, setDelitevSlike] = useState(false)
  // Slika je izrisana vnaprej: iOS dovoli sistemski meni le takoj po kliku,
  // risanje (pisave, grbi) pa lahko traja dlje od tega okna.
  const pripravljena = useRef<{ kljuc: string; blob: Blob } | null>(null)
  const narisiRef = useRef(narisi)
  narisiRef.current = narisi

  useEffect(() => {
    setDelitevSlike(znaDelitiSliko())
  }, [])

  useEffect(() => {
    if (!delitevSlike) return
    let veljavno = true
    narisiRef
      .current()
      .then((blob) => {
        if (veljavno && blob) pripravljena.current = { kljuc, blob }
      })
      .catch(() => {})
    return () => {
      veljavno = false
    }
  }, [kljuc, delitevSlike])

  async function deliPovezavo() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${naslov} — SLFF`, text: besedilo, url: povezava })
      } catch {
        // Uporabnik je meni zaprl — to ni napaka.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(`${besedilo} ${povezava}`)
      setSporocilo('Povezava je kopirana.')
    } catch {
      setSporocilo(povezava)
    }
  }

  async function deliSliko() {
    setSporocilo(null)
    let blob = pripravljena.current?.kljuc === kljuc ? pripravljena.current.blob : null
    if (!blob) {
      setDela(true)
      try {
        blob = await narisi()
      } finally {
        setDela(false)
      }
    }
    if (!blob) {
      setSporocilo('Slike ni bilo mogoče pripraviti.')
      return
    }
    const datoteka = new File([blob], imeSlike, { type: 'image/png' })
    try {
      // Povezava gre v besedilo: ob sliki jo aplikacije (WhatsApp) obdržijo,
      // polje `url` pa mnoge zavržejo.
      await navigator.share({ files: [datoteka], text: `${besedilo} ${povezava}` })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      // Brskalnik je zavrnil (risanje je trajalo predolgo) — slika je zdaj
      // pripravljena, drugi pritisk jo deli takoj.
      pripravljena.current = { kljuc, blob }
      setSporocilo('Pritisni še enkrat, da odpreš meni za deljenje.')
    }
  }

  async function prenesi() {
    setDela(true)
    setSporocilo(null)
    try {
      const blob = await narisi()
      if (!blob) throw new Error('slike ni bilo mogoče izrisati')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = imeSlike
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      // Naslova ne sprostimo takoj: brskalnik prenos šele začenja.
      setTimeout(() => {
        URL.revokeObjectURL(url)
        a.remove()
      }, 30000)
      setSporocilo('Slika je shranjena — objavi jo na Instagramu, Facebooku ali WhatsAppu.')
    } catch (e) {
      setSporocilo(`Slike ni bilo mogoče pripraviti: ${(e as Error).message}`)
    } finally {
      setDela(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {delitevSlike ? (
          <button onClick={deliSliko} disabled={dela} className="gumb-glavni px-3 py-2 text-sm disabled:opacity-60">
            {dela ? 'Pripravljam …' : 'Deli sliko'}
          </button>
        ) : (
          <button onClick={prenesi} disabled={dela} className="gumb-tih px-3 py-2 text-sm disabled:opacity-60">
            {dela ? 'Pripravljam …' : 'Prenesi sliko za objavo'}
          </button>
        )}
        <button onClick={deliPovezavo} className="gumb-tih px-3 py-2 text-sm">
          Deli povezavo
        </button>
        {delitevSlike && (
          <button onClick={prenesi} disabled={dela} className="gumb-tih px-3 py-2 text-sm disabled:opacity-60">
            Shrani sliko
          </button>
        )}
      </div>
      {delitevSlike && !sporocilo && (
        <p className="text-xs text-slate-500">WhatsApp, Instagram, Facebook … — izberi v meniju, ki se odpre.</p>
      )}
      {sporocilo && <p className="text-xs text-slate-400">{sporocilo}</p>}
    </div>
  )
}
