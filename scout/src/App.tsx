import { Navigate, Route, Routes } from 'react-router-dom'
import { Okvir } from './Okvir'
import { SejaProvider, ZahtevaSedez } from './seja'
import { Igralec } from './strani/Igralec'
import { Iskanje } from './strani/Iskanje'
import { Opazovani } from './strani/Opazovani'
import { Pogoji } from './strani/Pogoji'
import { Prijava } from './strani/Prijava'
import { Racun } from './strani/Racun'
import { Vrzeli } from './strani/Vrzeli'

export function App() {
  return (
    <SejaProvider>
      <Okvir>
        <Routes>
          <Route path="/" element={<ZahtevaSedez><Iskanje /></ZahtevaSedez>} />
          <Route path="/player/:id" element={<ZahtevaSedez><Igralec /></ZahtevaSedez>} />
          <Route path="/gaps" element={<ZahtevaSedez><Vrzeli /></ZahtevaSedez>} />
          <Route path="/watchlist" element={<ZahtevaSedez><Opazovani /></ZahtevaSedez>} />
          <Route path="/account" element={<Racun />} />
          <Route path="/login" element={<Prijava />} />
          <Route path="/terms" element={<Pogoji />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Okvir>
    </SejaProvider>
  )
}
