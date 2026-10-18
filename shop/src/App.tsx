import { Component, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { t } from './besede'
import { Okvir } from './Okvir'
import { SejaProvider } from './seja'
import { Admin } from './strani/Admin'
import { Hvala } from './strani/Hvala'
import { Izdelek } from './strani/Izdelek'
import { Katalog } from './strani/Katalog'
import { Kosarica } from './strani/Kosarica'
import { Narocila } from './strani/Narocila'
import { Odstop } from './strani/Odstop'
import { Personalizirano } from './strani/Personalizirano'
import { Pogoji } from './strani/Pogoji'
import { Prijava } from './strani/Prijava'

/** Napaka pri izrisu ne sme pustiti prazne strani: sporočilo in ponovno nalaganje. */
export class VarnaStran extends Component<{ children: ReactNode }, { napaka: boolean }> {
  state = { napaka: false }
  static getDerivedStateFromError() {
    return { napaka: true }
  }
  componentDidCatch(e: unknown) {
    console.error(e)
  }
  render() {
    if (!this.state.napaka) return this.props.children
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-16 text-center" role="alert">
        <p className="text-lg text-slate-200">{t('napaka.stran')}</p>
        <a href={typeof location === 'undefined' ? '/' : location.href} className="gumb-glavni inline-block">{t('napaka.osvezi')}</a>
      </div>
    )
  }
}

export function App() {
  return (
    <VarnaStran>
      <SejaProvider>
        <Okvir>
          <Routes>
            <Route path="/" element={<Katalog />} />
            <Route path="/p/:slug" element={<Izdelek />} />
            <Route path="/personalised" element={<Personalizirano />} />
            <Route path="/cart" element={<Kosarica />} />
            <Route path="/thanks" element={<Hvala />} />
            <Route path="/orders" element={<Narocila />} />
            <Route path="/terms" element={<Pogoji />} />
            <Route path="/withdrawal" element={<Odstop />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Prijava />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Okvir>
      </SejaProvider>
    </VarnaStran>
  )
}
