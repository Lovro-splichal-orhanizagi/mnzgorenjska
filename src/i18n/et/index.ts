// Eesti sõnastik. Mis puudub, tuleb sloveeni keeles — `npm run prevodi -- et` näitab, mis on tõlkimata.
import type { Prevod } from '../jedro.ts'
import { skupno } from './skupno.ts'
import { aplikacija } from './aplikacija.ts'
import { domov } from './domov.ts'
import { mojaEkipa } from './mojaEkipa.ts'
import { igralci } from './igralci.ts'
import { lestvice } from './lestvice.ts'
import { tekme } from './tekme.ts'
import { racun } from './racun.ts'

export const et: Prevod = { skupno, aplikacija, domov, mojaEkipa, igralci, lestvice, tekme, racun }
