// Azərbaycan lüğəti (latın qrafikası). Çatışmayan sloven dilindən gəlir; `npm run prevodi -- az` nəyin tərcümə olunmadığını göstərir.
import type { Prevod } from '../jedro.ts'
import { skupno } from './skupno.ts'
import { aplikacija } from './aplikacija.ts'
import { domov } from './domov.ts'
import { mojaEkipa } from './mojaEkipa.ts'
import { igralci } from './igralci.ts'
import { lestvice } from './lestvice.ts'
import { tekme } from './tekme.ts'
import { racun } from './racun.ts'

export const az: Prevod = { skupno, aplikacija, domov, mojaEkipa, igralci, lestvice, tekme, racun }
