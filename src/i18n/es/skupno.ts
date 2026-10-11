// `skupno` en español (fuente: src/i18n/sl/skupno.ts).
// Términos como en LaLiga Fantasy / Biwenger: portero, defensa, centrocampista, delantero.
import type { Prevod } from '../jedro.ts'

export const skupno: NonNullable<Prevod['skupno']> = {
  pozicija: {
    GK: 'Portero',
    DEF: 'Defensa',
    MID: 'Centrocampista',
    FWD: 'Delantero',
  },
  pozicijaKratko: {
    GK: 'POR',
    DEF: 'DEF',
    MID: 'CEN',
    FWD: 'DEL',
  },
  // Español (Intl.PluralRules('es')): one = 1, many = millones exactos (1 000 000),
  // other = todo lo demás, incluidos 0 y decimales ("1,5 puntos").
  besede: {
    tocke: { one: 'punto', many: 'puntos', other: 'puntos' },
    tockRodilnik: { one: 'punto', many: 'puntos', other: 'puntos' },
    tockeTozilnik: { one: 'punto', many: 'puntos', other: 'puntos' },
    igralci: { one: 'jugador', many: 'jugadores', other: 'jugadores' },
    ekipe: { one: 'equipo', many: 'equipos', other: 'equipos' },
    tekme: { one: 'partido', many: 'partidos', other: 'partidos' },
    goli: { one: 'gol', many: 'goles', other: 'goles' },
    glasovi: { one: 'voto', many: 'votos', other: 'votos' },
    krogi: { one: 'jornada', many: 'jornadas', other: 'jornadas' },
  },
  cena: '{v} M€',
  nalaganje: 'Cargando …',
  shrani: 'Guardar',
  preklici: 'Cancelar',
  zapri: 'Cerrar',
  nazaj: 'Atrás',
  napaka: 'Error: {sporocilo}',
  // Errores de la base de datos (RPC), traducidos en src/lib/napake.ts.
  napakeRpc: {
    miniLigaNi: 'No hay ninguna miniliga con este código.',
    niTvojaEkipa: 'Este no es tu equipo.',
    imeMiniLige: 'El nombre de la miniliga debe tener entre 2 y 40 caracteres.',
    prijavaMiniLiga: 'Inicia sesión para usar las miniligas.',
    niDovoljenja: 'No tienes permiso para editar este equipo.',
    kodaNeUstvarjena: 'No se ha podido crear el código de la miniliga. Inténtalo de nuevo.',
    golOdlocen: 'Este gol ya está decidido; la votación está cerrada.',
    zePoznavalec: 'Ya eres experto de esta liga.',
    prosnjaCaka: 'Tu solicitud para esta liga ya está pendiente.',
    prosnjaZavrnjena: 'Tu solicitud para esta liga se rechazó hace poco. Puedes enviar otra 14 días después del rechazo.',
    klubNeIgra: 'El club seleccionado no juega en esta liga.',
  },
}
