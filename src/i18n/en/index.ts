// Angleški slovar — za tujce (IP iz države brez lig) in za vsakogar, ki
// angleščino izbere v izbirniku jezika. Služi obema državama, zato imena
// držav v nizih niso (Slovenija, Slovensko ostaneta v izbirniku države).
// `npm run prevodi -- en` izpiše, kaj še ni prevedeno.
import type { Prevod } from '../jedro.ts'
import { skupno } from './skupno.ts'
import { aplikacija } from './aplikacija.ts'
import { domov } from './domov.ts'
import { mojaEkipa } from './mojaEkipa.ts'
import { igralci } from './igralci.ts'
import { lestvice } from './lestvice.ts'
import { tekme } from './tekme.ts'
import { racun } from './racun.ts'

export const en: Prevod = { skupno, aplikacija, domov, mojaEkipa, igralci, lestvice, tekme, racun }
