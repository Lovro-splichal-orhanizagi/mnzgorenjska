import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { AuthProvider } from './lib/useAuth'
import { TekmovanjeProvider } from './lib/tekmovanje'
import Navbar from './components/Navbar'
import PrviObisk from './components/PrviObisk'
import VirPodatkov from './components/VirPodatkov'
import RokKroga from './components/RokKroga'
import OpozoriloEkipe from './components/OpozoriloEkipe'
import NapakaOprijem from './components/NapakaOprijem'
import Podpora from './components/Podpora'
import Domov from './pages/Domov'
import Igralci from './pages/Igralci'
import Igralec from './pages/Igralec'
import Lestvica from './pages/Lestvica'
import Slovenija from './pages/Slovenija'
import MiniLige from './pages/MiniLige'
import Ekipa from './pages/Ekipa'
import Klub from './pages/Klub'
import Rezultati from './pages/Rezultati'
import Tekma from './pages/Tekma'
import Prijava from './pages/Prijava'
import NovoGeslo from './pages/NovoGeslo'
import Pravno from './pages/Pravno'
import MojaEkipa from './pages/MojaEkipa'
import Glasovanje from './pages/Glasovanje'
import Pozicije from './pages/Pozicije'
import Odsotnosti from './pages/Odsotnosti'
import Administracija from './pages/Administracija'
import VstopVMiniLigo from './pages/VstopVMiniLigo'
import Opomniki from './pages/Opomniki'
import { useKanonicni, useNaslov } from './lib/naslov'
import { t } from './i18n'

function NiStrani() {
  useNaslov(t('aplikacija.niStrani.naslov'))
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-black naslov">{t('aplikacija.niStrani.naslov')}</h1>
      <p className="text-slate-400">{t('aplikacija.niStrani.opis')}</p>
      <Link to="/" className="inline-block text-gnl-300 underline">
        {t('aplikacija.niStrani.nazaj')}
      </Link>
    </div>
  )
}

export default function App() {
  // Napaka na eni strani naj ne ostane prilepljena na vse naslednje: nov
  // ključ ob navigaciji oprijem ponastavi.
  const { pathname, search } = useLocation()
  useKanonicni(pathname, search)
  return (
    <AuthProvider>
      <TekmovanjeProvider>
        <div className="min-h-screen overflow-x-hidden">
          <PrviObisk />
          <RokKroga />
          <Navbar />
          <OpozoriloEkipe />
          <main className="mx-auto max-w-5xl px-4 py-8">
            <NapakaOprijem key={pathname}>
            <Routes>
              <Route path="/" element={<Domov />} />
              <Route path="/moja-ekipa" element={<MojaEkipa />} />
              <Route path="/glasovanje" element={<Glasovanje />} />
              <Route path="/pozicije" element={<Pozicije />} />
              <Route path="/odsotnosti" element={<Odsotnosti />} />
              <Route path="/igralci" element={<Igralci />} />
              <Route path="/igralec/:id" element={<Igralec />} />
              <Route path="/lestvica" element={<Lestvica />} />
              <Route path="/slovenija" element={<Slovenija />} />
              <Route path="/mini-lige" element={<MiniLige />} />
              <Route path="/l/:koda" element={<VstopVMiniLigo />} />
              <Route path="/ekipa/:id" element={<Ekipa />} />
              <Route path="/klub/:id" element={<Klub />} />
              <Route path="/rezultati" element={<Rezultati />} />
              <Route path="/tekma/:id" element={<Tekma />} />
              <Route path="/prijava" element={<Prijava />} />
              <Route path="/novo-geslo" element={<NovoGeslo />} />
              <Route path="/pravno" element={<Pravno />} />
              <Route path="/opomniki" element={<Opomniki />} />
              <Route path="/admin" element={<Administracija />} />
              <Route path="*" element={<NiStrani />} />
            </Routes>
            </NapakaOprijem>
          </main>
          <Podpora />
          <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
            <Link to="/pravno" className="underline hover:text-slate-200">
              {t('aplikacija.noga.zasebnost')}
            </Link>
            <VirPodatkov />
          </footer>
        </div>
      </TekmovanjeProvider>
    </AuthProvider>
  )
}
