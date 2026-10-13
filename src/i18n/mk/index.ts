// Македонски речник. Што недостасува, доаѓа на словенечки; `npm run prevodi -- mk` покажува што не е преведено.
import type { Prevod } from '../jedro.ts'
import { skupno } from './skupno.ts'
import { aplikacija } from './aplikacija.ts'
import { domov } from './domov.ts'
import { mojaEkipa } from './mojaEkipa.ts'
import { igralci } from './igralci.ts'
import { lestvice } from './lestvice.ts'
import { tekme } from './tekme.ts'
import { racun } from './racun.ts'

export const mk: Prevod = { skupno, aplikacija, domov, mojaEkipa, igralci, lestvice, tekme, racun }
