// Anonimiziran igralec (GDPR, migracija 20261009180000) ima ime "#<id>" in
// nima šifre. Uvoz ga najde po zgoščenih ključih v zaprti tabeli
// `anonimizirani_igralci`; zgoščevanje mora biti enako kot v SQL
// `anonimiziraj_igralca` (`anonimizacijski_kljuc`).
import { createHash } from 'node:crypto'

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex')

export const imeHash = (drzavaId, polnoIme) => sha256(`${drzavaId}|${polnoIme}`)
export const regHash = (drzavaId, regSt) => sha256(`${drzavaId}|reg|${regSt}`)
