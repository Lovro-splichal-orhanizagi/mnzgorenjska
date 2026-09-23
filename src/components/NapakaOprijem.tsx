// Error boundary — ujame vsako izjemo iz React drevesa in namesto tihe prazne
// strani pokaže prijazno sporočilo. Podrobnosti (sled sklada) le v razvoju.
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Stanje {
  napaka: Error | null
  info: ErrorInfo | null
}

export default class NapakaOprijem extends Component<
  { children: ReactNode },
  Stanje
> {
  state: Stanje = { napaka: null, info: null }

  static getDerivedStateFromError(napaka: Error): Partial<Stanje> {
    return { napaka }
  }

  componentDidCatch(napaka: Error, info: ErrorInfo) {
    this.setState({ info })
    // Naj bo tudi v konzoli, ne le v DOM-u — za primer, ko admin
    // pogleda skozi devtools.
    console.error('NapakaOprijem:', napaka, info)
  }

  render() {
    if (!this.state.napaka) return this.props.children
    // Sled sklada je za razvijalca; obiskovalcu v produkciji ne pove nič in
    // razkrije notranjost kode. Ta v konzoli ostane (componentDidCatch).
    const razvoj = import.meta.env.DEV
    return (
      <div className="mx-auto max-w-3xl p-4 text-sm">
        <div role="alert" className="rounded-2xl border-2 border-rose-500/60 bg-rose-900/30 p-4 text-rose-100">
          <h1 className="mb-2 text-lg font-black">
            <span aria-hidden="true">⚠ </span>Stran se je zataknila
          </h1>
          <p className="mb-3 opacity-90">
            Nekaj je šlo narobe pri prikazu te strani. Osveži stran ali se vrni
            na začetek — če se ponavlja, nam piši prek klepeta na začetni strani.
          </p>
          {razvoj && (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-3 text-[11px] leading-tight">
              {this.state.napaka.name}: {this.state.napaka.message}
              {'\n\n'}
              {this.state.napaka.stack ?? ''}
              {this.state.info?.componentStack ?? ''}
            </pre>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            {/* Navaden <a>: oprijem je lahko nad usmerjevalnikom, polno
                nalaganje pa počisti tudi stanje, ki je napako povzročilo. */}
            <a href="/" className="underline">
              Nazaj na začetno stran
            </a>
            <button type="button" onClick={() => window.location.reload()} className="underline">
              Osveži stran
            </button>
          </div>
        </div>
      </div>
    )
  }
}
