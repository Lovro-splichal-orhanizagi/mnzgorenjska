// Error boundary — ujame vsako izjemo iz React drevesa in jo prikaže na
// zaslonu, namesto tihe prazne strani. Uporabno v produkciji, ko developer
// nima dostopa do brskalnika uporabnika.
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
    return (
      <div className="mx-auto max-w-3xl p-4 text-sm">
        <div className="rounded-2xl border-2 border-rose-500/60 bg-rose-900/30 p-4 text-rose-100">
          <div className="mb-2 text-lg font-black">
            ⚠ Stran se je zataknila
          </div>
          <div className="mb-3 text-xs opacity-80">
            To sporočilo je začasno — pomaga razvijalcu videti, kaj se je
            zgodilo. Prosim, pošljite screenshot.
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-3 text-[11px] leading-tight">
            {this.state.napaka.name}: {this.state.napaka.message}
            {'\n\n'}
            {this.state.napaka.stack ?? ''}
            {this.state.info?.componentStack ?? ''}
          </pre>
          <div className="mt-3 text-xs">
            <a href="/" className="underline">
              Poskusi znova
            </a>
          </div>
        </div>
      </div>
    )
  }
}
