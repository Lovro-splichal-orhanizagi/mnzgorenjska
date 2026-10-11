// `domov` en español (fuente: src/i18n/sl/domov.ts): página de inicio.
import type { Prevod } from '../jedro.ts'

export const domov: NonNullable<Prevod['domov']> = {
  napakaNalaganja: 'No se han podido cargar los datos.',
  delNiNalozen: 'Una parte de los datos no se ha cargado: {napaka}',
  uvod: {
    // Los textos de Gorenjska son publicitarios y se quedan tal cual.
    gorenjskaMladinci: 'Gorenjska nogometna liga — mladinci',
    gorenjskaClani: '1. Gorenjska nogometna liga',
    geslo: 'Haz tu equipo. Suma puntos. Gana.',
    opis: 'Los puntos salen de las actas oficiales de {zveza}: goles, minutos, porterías a cero, tarjetas. Todo menos las asistencias, que decide la comunidad.',
    vecLig: 'Puedes jugar en varias ligas: <krepko>la liga se elige arriba a la izquierda</krepko> y cada una tiene su equipo y su clasificación.',
    zacetekSezone: '<krepko>La temporada empieza el {datum}</krepko>: haz tu equipo antes del cierre.',
    zamudniki: '<krepko>¿Te has perdido el inicio?</krepko> En la <lestvica>Clasificación</lestvica> compites desde la jornada en la que te unes.',
    sestaviEkipo: 'Haz tu equipo',
    rezultati: 'Resultados y alineaciones',
  },
  asistence: {
    cakajo: {
      one: '{n} gol espera asistencia',
      many: '{n} goles esperan asistencia',
      other: '{n} goles esperan asistencia',
    },
  },
  rok: {
    seZaklene: 'La jornada {krog} se cierra',
  },
  krog: 'Jornada {krog}',
  brezKroga: 'Sin jornada',
  minut: '{n} min',
  zadnjiRezultati: {
    naslov: 'Últimos resultados',
    vsi: 'Todos los resultados →',
    poglejTekmo: 'Ver las alineaciones y los puntos de este partido',
  },
  najboljsi: {
    igralecSezone: 'Jugador de la temporada',
    celaLestvica: 'Clasificación completa de jugadores →',
    vodilni: {
      strelec: 'Máximo goleador',
      podajalec: 'Máximo asistente',
      mreze: 'Más porterías a cero',
    },
  },
  idealna: {
    naslov: 'Once ideal',
    krogSezona: 'Jornada {krog} · temporada {sezona}',
    opis: 'Los 11 mejores de la última jornada; bajo la camiseta, los puntos.',
  },
  povabi: {
    naslov: 'Invita a un amigo a la liga',
  },
  skupnost: {
    brezAsistence: '{goli} sin asistencia',
    povejKdo: {
      one: 'Dinos quién dio el pase: {n} voto lo confirma',
      many: 'Dinos quién dio el pase: {n} votos lo confirman',
      other: 'Dinos quién dio el pase: {n} votos lo confirman',
    },
    ugibanaPozicija: '{igralci} con posición supuesta',
    pozicijaOdloca: 'La posición decide cuánto vale un gol',
    odsotnosti: 'Lesiones y ausencias',
    javi: 'Avisa de quién no va a jugar: a los demás les ahorras una jornada',
  },
  naslednje: {
    naslov: 'Próximos partidos',
    proti: 'vs',
  },
  kakoIgras: {
    naslov: 'Cómo se juega',
    registracija: '1. Registro',
    registracijaOpis: 'Crea una cuenta con Google o con correo y contraseña e inventa un nombre para tu equipo.',
    kader: '2. Haz tu plantilla',
    kaderOpis: 'En el campo eliges 15 jugadores: 2 porteros, 5 defensas, 5 centrocampistas y 3 delanteros, como mucho 3 del mismo club y dentro de un presupuesto de 100.',
    enajsterica: '3. Elige tu once',
    enajstericaOpis: 'Once salen al campo y cuatro al banquillo. El capitán puntúa el triple; si no juega, el brazalete pasa al vicecapitán.',
    poKrogu: '4. Después de cada jornada',
    poKroguOpis: 'Los puntos se calculan a partir de las actas. Un jugador sin minutos lo sustituye automáticamente un suplente de la misma posición, y una vez por temporada puedes usar Banquillo+ para que puntúe todo el banquillo.',
  },
  kakoSeTockuje: 'Cómo se puntúa',
  moja: {
    tocke: 'Puntos',
    mesto: 'Posición',
    mestoOd: '{mesto}.º de {n}',
    uredi: 'Mi equipo →',
  },
  taTeden: 'Esta semana',
  klepet: 'Chat y sugerencias',
}
