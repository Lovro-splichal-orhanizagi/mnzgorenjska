import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { Link } from './components/Povezava'
import { AuthProvider } from './lib/useAuth'
import { TekmovanjeProvider } from './lib/tekmovanje'
import Navbar from './components/Navbar'
import PrviObisk from './components/PrviObisk'
import VirPodatkov from './components/VirPodatkov'
import RokKroga from './components/RokKroga'
import OpozoriloEkipe from './components/OpozoriloEkipe'
import NapakaOprijem from './components/NapakaOprijem'
import Podpora from './components/Podpora'
import Pivo from './components/Pivo'
import Facebook from './components/Facebook'
import VstopDrzave from './components/VstopDrzave'
import IzbiraDrzave from './components/IzbiraDrzave'
import IzbiraJezika from './components/IzbiraJezika'
import Domov from './pages/Domov'
import NativnePovezave from './components/NativnePovezave'
import PosodobiAplikacijo from './components/PosodobiAplikacijo'
import PotisnaObvestila from './components/PotisnaObvestila'
import { jeZasebna, useKanonicni, useNaslov, useNoindex } from './lib/naslov'
import { useObisk } from './lib/obiski'
import { jeNativno } from './lib/platforma'

// Strani razen naslovnice so svoji kosi: obiskovalec naslovnice ne prenaša
// administracije in Moje ekipe. Kos pride ob prvem obisku strani.
const Igralci = lazy(() => import('./pages/Igralci'))
const Igralec = lazy(() => import('./pages/Igralec'))
const Lestvica = lazy(() => import('./pages/Lestvica'))
const Slovenija = lazy(() => import('./pages/Slovenija'))
const MiniLige = lazy(() => import('./pages/MiniLige'))
const Ekipa = lazy(() => import('./pages/Ekipa'))
const Klub = lazy(() => import('./pages/Klub'))
const Rezultati = lazy(() => import('./pages/Rezultati'))
const Tabela = lazy(() => import('./pages/Tabela'))
const Tekma = lazy(() => import('./pages/Tekma'))
const Prijava = lazy(() => import('./pages/Prijava'))
const NovoGeslo = lazy(() => import('./pages/NovoGeslo'))
const Pravno = lazy(() => import('./pages/Pravno'))
const MojaEkipa = lazy(() => import('./pages/MojaEkipa'))
const Glasovanje = lazy(() => import('./pages/Glasovanje'))
const Pozicije = lazy(() => import('./pages/Pozicije'))
const Odsotnosti = lazy(() => import('./pages/Odsotnosti'))
const Administracija = lazy(() => import('./pages/Administracija'))
const VstopVMiniLigo = lazy(() => import('./pages/VstopVMiniLigo'))
const Opomniki = lazy(() => import('./pages/Opomniki'))
const Racun = lazy(() => import('./pages/Racun'))
const PotrditevPovezave = lazy(() => import('./pages/PotrditevPovezave'))

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
  useNoindex(true)
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
  useNoindex(jeZasebna(pathname))
  // Katero stran človek po registraciji sploh odpre — dnevni seštevki, brez
  // uporabnika in naprave (`src/lib/obiski.ts`).
  useObisk()
  return (
    <AuthProvider>
      <TekmovanjeProvider>
        <div className="min-h-screen overflow-x-clip">
          <NativnePovezave />
          <PosodobiAplikacijo />
          <PotisnaObvestila />
          <PrviObisk />
          <RokKroga />
          <Navbar />
          <OpozoriloEkipe />
          {/* min-h-screen: noga je pod robom zaslona, dokler se stran nalaga, in
              ne skače navzdol, ko pridejo podatki (premik postavitve, CLS). */}
          <main className="mx-auto min-h-screen max-w-5xl px-4 pb-32 pt-8 lg:pb-8">
            {/* Suspense zunaj oprijema s ključem poti: ob prehodu (React Router ga
                da v startTransition) ostane prejšnja stran, dokler kos nove ne
                pride, namesto praznega <main>. Ob prvem izrisu nadomestka ni —
                <main> že drži višino zaslona. */}
            <Suspense fallback={null}>
            <NapakaOprijem key={pathname}>
            <Routes>
              <Route path="/" element={<Domov />} />
              {/* Vstopni povezavi za državo (kampanje, objave): slff.eu/sk */}
              <Route path="/sk" element={<VstopDrzave drzava="SK" />} />
              <Route path="/hr" element={<VstopDrzave drzava="HR" />} />
              <Route path="/cz" element={<VstopDrzave drzava="CZ" />} />
              <Route path="/hu" element={<VstopDrzave drzava="HU" />} />
              <Route path="/at" element={<VstopDrzave drzava="AT" />} />
              <Route path="/rs" element={<VstopDrzave drzava="RS" />} />
              <Route path="/ro" element={<VstopDrzave drzava="RO" />} />
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
              <Route path="/table" element={<Tabela />} />
              <Route path="/match/:id" element={<Tekma />} />
              <Route path="/login" element={<Prijava />} />
              <Route path="/new-password" element={<NovoGeslo />} />
              {/* Povezava za ponastavitev gesla je vpisana pri Supabase in nosi
                  žeton v #; preusmeritev bi ga lahko izgubila — stran velja na
                  obeh naslovih. */}
              <Route path="/novo-geslo" element={<NovoGeslo />} />
              <Route path="/legal" element={<Pravno />} />
              <Route path="/reminders" element={<Opomniki />} />
              <Route path="/account" element={<Racun />} />
              <Route path="/auth/confirm" element={<PotrditevPovezave />} />
              {/* Stari slovenski naslovi (deljene povezave, e-pošta, iskalniki)
                  vodijo na nove — s parametri, poizvedbo in #. */}
              {STARE_POTI.map(([staro, novo]) => (
                <Route key={staro} path={staro} element={<StaraPot na={novo} />} />
              ))}
              {!jeNativno() && <Route path="/admin" element={<Administracija />} />}
              <Route path="*" element={<NiStrani />} />
            </Routes>
            </NapakaOprijem>
            </Suspense>
          </main>
          <Podpora />
          <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
            {/* Pivo je v nogi vsake strani; v aplikaciji ga ni (glej Pivo.tsx). */}
            <div className="mb-4 flex flex-wrap justify-center gap-2">
              {!jeNativno() && <Pivo src="noga" />}
              <Facebook />
            </div>
            <Link to="/legal" className="underline hover:text-slate-200">
              {t('aplikacija.noga.zasebnost')}
            </Link>
            <VirPodatkov />
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <IzbiraDrzave />
              <IzbiraJezika />
            </div>
          </footer>
        </div>
      </TekmovanjeProvider>
    </AuthProvider>
  )
}
