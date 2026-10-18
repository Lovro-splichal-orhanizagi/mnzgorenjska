import { Navigate, Route, Routes } from 'react-router-dom'
import { Okvir } from './Okvir'
import { SejaProvider } from './seja'
import { Hvala } from './strani/Hvala'
import { Izdelek } from './strani/Izdelek'
import { Katalog } from './strani/Katalog'
import { Kosarica } from './strani/Kosarica'
import { Narocila } from './strani/Narocila'
import { Odstop } from './strani/Odstop'
import { Pogoji } from './strani/Pogoji'
import { Prijava } from './strani/Prijava'

export function App() {
  return (
    <SejaProvider>
      <Okvir>
        <Routes>
          <Route path="/" element={<Katalog />} />
          <Route path="/p/:slug" element={<Izdelek />} />
          <Route path="/cart" element={<Kosarica />} />
          <Route path="/thanks" element={<Hvala />} />
          <Route path="/orders" element={<Narocila />} />
          <Route path="/terms" element={<Pogoji />} />
          <Route path="/withdrawal" element={<Odstop />} />
          <Route path="/login" element={<Prijava />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Okvir>
    </SejaProvider>
  )
}
