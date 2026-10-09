// Anonimiziran igralec (GDPR, migracija 20261009180000) ima ime "#<id>".
// Uvoz iz virov brez šifre igralca ga najde po zgoščenem izvirnem imenu v
// zaprti tabeli `anonimizirani_igralci`; zgoščevanje mora biti enako kot v
// SQL `anonimiziraj_igralca`: sha256("<competition_id>|<full_name>").
import { createHash } from 'node:crypto'

export const imeHash = (competitionId, polnoIme) =>
  createHash('sha256').update(`${competitionId}|${polnoIme}`, 'utf8').digest('hex')
