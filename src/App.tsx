import { Routes, Route, Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider } from './lib/useAuth'
import { TekmovanjeProvider } from './lib/tekmovanje'
import Navbar from './components/Navbar'
import PrviObisk from './components/PrviObisk'
import VirPodatkov from './components/VirPodatkov'
import RokKroga from './components/RokKroga'
import OpozoriloEkipe from './components/OpozoriloEkipe'
import NapakaOprijem from './components/NapakaOprijem'
import Podpora from './components/Podpora'
import VstopDrzave from './components/VstopDrzave'
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

// Poti so angleške, ker jih vidi vsaka država (slovaški obiskovalec ne
// odpira "moja-ekipa"). Stari slovenski naslovi ostanejo kot preusmeritve.
const STARE_POTI: [string, string][] = [
  ['/moja-ekipa', '/my-team'],
  ['/glasovanje', '/assists'],
  ['/pozicije', '/positions'],
  ['/odsotnosti', '/absences'],
  ['/igralci', '/players'],
  ['/igralec/:id', '/player/:id'],
  ['/lestvica', '/standings'],
  ['/slovenija', '/national'],
  ['/mini-lige', '/mini-leagues'],
  ['/ekipa/:id', '/team/:id'],
  ['/klub/:id', '/club/:id'],
  ['/rezultati', '/results'],
  ['/tekma/:id', '/match/:id'],
  ['/prijava', '/login'],
  ['/pravno', '/legal'],
  ['/opomniki', '/reminders'],
]

function StaraPot({ na }: { na: string }) {
  const { id } = useParams()
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: na.replace(':id', id ?? ''), search, hash }} replace />
}
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
              {/* Vstopni povezavi za državo (kampanje, objave): slff.eu/sk */}
              <Route path="/sk" element={<VstopDrzave drzava="SK" />} />
              <Route path="/si" element={<VstopDrzave drzava="SI" />} />
              <Route path="/my-team" element={<MojaEkipa />} />
              <Route path="/assists" element={<Glasovanje />} />
              <Route path="/positions" element={<Pozicije />} />
              <Route path="/absences" element={<Odsotnosti />} />
              <Route path="/players" element={<Igralci />} />
              <Route path="/player/:id" element={<Igralec />} />
              <Route path="/standings" element={<Lestvica />} />
              <Route path="/national" element={<Slovenija />} />
              <Route path="/mini-leagues" element={<MiniLige />} />
              <Route path="/l/:koda" element={<VstopVMiniLigo />} />
              <Route path="/team/:id" element={<Ekipa />} />
              <Route path="/club/:id" element={<Klub />} />
              <Route path="/results" element={<Rezultati />} />
              <Route path="/match/:id" element={<Tekma />} />
              <Route path="/login" element={<Prijava />} />
              <Route path="/new-password" element={<NovoGeslo />} />
              {/* Povezava za ponastavitev gesla je vpisana pri Supabase in nosi
                  žeton v #; preusmeritev bi ga lahko izgubila — stran velja na
                  obeh naslovih. */}
              <Route path="/novo-geslo" element={<NovoGeslo />} />
              <Route path="/legal" element={<Pravno />} />
              <Route path="/reminders" element={<Opomniki />} />
              {/* Stari slovenski naslovi (deljene povezave, e-pošta, iskalniki)
                  vodijo na nove — s parametri, poizvedbo in #. */}
              {STARE_POTI.map(([staro, novo]) => (
                <Route key={staro} path={staro} element={<StaraPot na={novo} />} />
              ))}
              <Route path="/admin" element={<Administracija />} />
              <Route path="*" element={<NiStrani />} />
            </Routes>
            </NapakaOprijem>
          </main>
          <Podpora />
          <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
            <Link to="/legal" className="underline hover:text-slate-200">
              {t('aplikacija.noga.zasebnost')}
            </Link>
            <VirPodatkov />
          </footer>
        </div>
      </TekmovanjeProvider>
    </AuthProvider>
  )
}
