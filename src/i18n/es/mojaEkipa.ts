// `mojaEkipa` en español (fuente: src/i18n/sl/mojaEkipa.ts).
// Términos: plantilla (15), once inicial / titulares, banquillo, capitán,
// vicecapitán, fichajes, mercado, presupuesto; `klop_plus` es "Banquillo+".
import type { Prevod } from '../jedro.ts'

export const mojaEkipa: NonNullable<Prevod['mojaEkipa']> = {
  naslov: 'Mi equipo',
  igralec: 'Jugador',
  vprasanjeZapustitve: 'Tienes cambios del equipo sin guardar. ¿Seguro que quieres salir de la página?',
  oznaka: {
    kapetan: 'C',
    namestnik: 'V',
  },

  pravila: {
    pozicije: {
      GK: 'Porteros',
      DEF: 'Defensas',
      MID: 'Centrocampistas',
      FWD: 'Delanteros',
    },
    kaderPoln: 'La plantilla está completa ({n} jugadores).',
    pozicijaPolna: '{pozicija}: ya tienes {n} en la plantilla.',
    premaloProracuna: 'No te llega el presupuesto: el jugador cuesta {cena} y te quedan {preostalo}.',
    izKluba: 'Ya tienes {n} jugadores del {klub}.',
    velikostEkipe: 'El equipo debe tener {n} jugadores (ahora {trenutno}).',
    velikostPostave: 'El once inicial debe tener {n} jugadores (ahora {trenutno}).',
    brezPozicije: {
      one: '{n} jugador elegido aún no tiene la posición confirmada: ayuda en la sección Posiciones.',
      many: '{n} jugadores elegidos aún no tienen la posición confirmada: ayuda en la sección Posiciones.',
      other: '{n} jugadores elegidos aún no tienen la posición confirmada: ayuda en la sección Posiciones.',
    },
    niVecVLigi: '{ime} ya no está en la liga: cámbialo.',
    pozicijaVKadru: '{pozicija} en la plantilla: {n}; tienen que ser {kader}.',
    pozicijaVPostavi: '{pozicija} en el once inicial: {n}; se permiten {min}–{max}.',
    dolociKapetana: 'Elige capitán: en la jornada puntúa por {n}.',
    enKapetan: 'Solo puede haber un capitán.',
    dolociNamestnika: 'Elige un vicecapitán, que se queda el brazalete si el capitán no juega.',
    istiKlub: 'Del mismo club puedes elegir como mucho {n} jugadores.',
    presegelProracun: 'Te has pasado del presupuesto en {cena}.',
  },

  napake: {
    zeImas: 'Ya tienes un equipo en esta liga: recarga la página.',
    dovoljenje: 'No tienes permiso para esto. Vuelve a iniciar sesión e inténtalo otra vez.',
    povezava: 'No hay conexión con el servidor. Comprueba internet e inténtalo de nuevo.',
    shranjevanje: 'No se ha podido guardar. Inténtalo de nuevo.',
    nalaganjePovezava: 'No hay conexión con el servidor: comprueba internet.',
    nalaganje: 'No se han podido cargar los datos del equipo.',
    nalaganjeNiCelo:
      'Hasta que el equipo no se cargue entero no se puede guardar; si no, al guardar se borrarían los jugadores que no se han cargado.',
    poskusiZnova: 'Reintentar',
    vpisiIme: 'Primero escribe el nombre del equipo.',
    osvezitev:
      'El equipo está guardado, pero no se ha podido actualizar la vista: recarga la página antes de volver a editarlo.',
    najprejShrani: 'Primero guarda el equipo.',
    izberiKrog: 'Elige la jornada en la que quieres usar el comodín.',
    prihodnjiKrog: 'Elige una jornada futura, no cerrada y con fecha de cierre.',
    zeUporabil: 'Ya has usado este comodín esta temporada.',
    niPreklica: 'El comodín de esta jornada ya no se puede cancelar.',
  },

  sporocila: {
    niIgralcevNaTrgu: 'En esta liga aún no hay jugadores en el mercado.',
    pocakaj: 'Espera a que termine de guardarse.',
    niPredloga: 'Por ahora no se puede formar un equipo válido con esta liga.',
    predlogSestavljen: 'Equipo hecho: cambia a quien quieras y pulsa Guardar.',
    kaderDopolnjen: 'Se han cubierto los huecos: revisa y pulsa Guardar.',
    niDopolnitve:
      'No se puede completar la plantilla con el dinero que te queda. Cambia a alguno de los jugadores caros y vuelve a intentarlo.',
    kapetanNaKlop: '{ime} ha pasado al banquillo: elige un nuevo capitán.',
    namestnikNaKlop: '{ime} ha pasado al banquillo: elige un nuevo vicecapitán.',
    brezPozicije: 'El jugador aún no tiene la posición confirmada, así que no se puede poner en el campo.',
    niProstora:
      'En el once no hay sitio para otro jugador en esta posición: primero manda a alguien al banquillo.',
    niVecNamestnik: '{ime} ya no es vicecapitán: elige otro.',
    niVecKapetan: '{ime} ya no es capitán: elige otro.',
    rokPotekel: 'El cierre de la jornada {krog} ya ha pasado, así que los cambios valen desde la jornada siguiente.',
    shranjenaZaKrog: 'Equipo guardado y listo para la jornada {krog}.',
    shranjenaVeljavna: 'Equipo guardado; cumple las reglas.',
    osnutekShranjen:
      'Borrador guardado: el equipo aún no cumple las reglas, así que en esta jornada no puntuaría.',
    prodaja: 'Las ventas te han dado +{cena}.',
    nakupi: 'Las compras han costado {cena}.',
    wildcardVlozen: 'Wildcard activado: los fichajes de esta jornada son gratis.',
    klopPlusVlozen: 'Banquillo+ activado.',
    wildcardPreklican: 'Wildcard cancelado: lo tienes disponible para otra jornada.',
    klopPlusPreklican: 'Banquillo+ cancelado: lo tienes disponible para otra jornada.',
    zapriOpozorilo: 'Cerrar el aviso',
    zapriObvestilo: 'Cerrar la notificación',
    odstranjen: '{ime} eliminado.',
    razveljavi: 'Deshacer',
  },

  brezPrijave: {
    opis: 'Puedes hacer tu equipo sin cuenta. Se queda en este navegador hasta que lo guardes.',
    shrani: 'Guardar y crear cuenta',
    pripravljena: 'Tu equipo está listo: guárdalo.',
  },
  locenaLiga:
    'El equipo en la liga <liga>{liga}</liga> va aparte de los equipos de otras ligas, con su propio presupuesto y su propia clasificación. Los puntos cuentan desde la jornada {krog}, porque hasta entonces siguen los traspasos y los cambios entre categorías.',

  vec: 'Más: comodines, historial, reglas',

  prestopi: {
    medSezono: {
      one: 'Te unes con la temporada en marcha: hasta el cierre de la jornada {krog} montas tu equipo sin penalización. Después tienes {n} fichaje gratis por jornada; cada uno extra cuesta −{kazen}.',
      many: 'Te unes con la temporada en marcha: hasta el cierre de la jornada {krog} montas tu equipo sin penalización. Después tienes {n} fichajes gratis por jornada; cada uno extra cuesta −{kazen}.',
      other: 'Te unes con la temporada en marcha: hasta el cierre de la jornada {krog} montas tu equipo sin penalización. Después tienes {n} fichajes gratis por jornada; cada uno extra cuesta −{kazen}.',
    },
    stevec: 'Fichajes: {n}/{prosti}',
    wildcard: 'wildcard: sin penalización',
    odbitek: 'penalización de {tock} en esta jornada',
    prosti: {
      one: 'queda {n} gratis, luego −{kazen} por cada uno',
      many: 'quedan {n} gratis, luego −{kazen} por cada uno',
      other: 'quedan {n} gratis, luego −{kazen} por cada uno',
    },
  },

  namigi: {
    naslov: 'Consejos de fichajes',
    zaKrog: 'Quién probablemente no jugará en la jornada {krog} y a quién te puedes permitir en su lugar.',
    razlog: {
      neaktiven: 'ya no está en la liga',
      poskodba: 'lesionado',
      odsotnost: 'ausente',
      brezTekme: 'su club no juega',
    },
    kandidat: '{cena} · forma {forma}',
    zamenjajNamig: 'En lugar de {ime}, mete a {novi} en la plantilla',
    niZamenjave: 'No hay ningún cambio que permitan el presupuesto y las reglas.',
    opomba: 'El clic solo prepara el cambio; el equipo lo guardas tú. Cada consejo va por separado.',
    skrij: 'Ocultar hasta la próxima jornada',
    zamenjano: '{novi} está en la plantilla en lugar de {ime}. Cuando estés conforme, guarda el equipo.',
  },

  odZadnjegaObiska: {
    naslov: 'Desde tu última visita',
    naslovTeden: 'En la última semana',
    vrednost: 'Valor del equipo <znesek>{znak}{cena}</znesek>',
    gor: 'sube',
    dol: 'baja',
    zapri: 'Cerrar',
  },

  povzetek: {
    urediIme: 'Editar el nombre del equipo {ime}',
    bogastvo:
      'patrimonio <vrednost>{bogastvo}</vrednost><razlika></razlika> · plantilla {kader} <placano>pagado</placano>',
    razlika: '({znak}{cena})',
    shranjujem: 'Guardando …',
    shraniEkipo: 'Guardar equipo',
    neshranjeno: 'Cambios sin guardar',
    imeEkipe: 'Nombre del equipo',
    privzetoIme: 'CF {ime}',
    primerImena: 'p. ej. Los Héroes del Domingo',
  },

  vodic: {
    napredek: '{trenutni} / {skupaj}',
    naprej: 'Siguiente',
    razumem: 'Entendido',
    sestaviNaslov: 'Equipo en un clic',
    sestaviOpis: 'Pulsa aquí y te hacemos un equipo válido dentro del presupuesto. Luego cambia a quien quieras.',
    igrisceNaslov: 'Este es tu equipo',
    igrisceOpis: 'Pulsa en un jugador para ver sus datos o cambiarlo. Puntúa el once inicial, un suplente entra si alguien no juega.',
    shraniNaslov: 'Último paso: Guardar',
    shraniOpis: 'Al guardar, sumas puntos ya en la próxima jornada. Puedes cambiar el equipo hasta el cierre.',
  },
  zacetek: {
    naslov: '¿Por dónde empiezo?',
    sestaviMi: 'Hazme el equipo',
    opisPredloga:
      'Elegimos al azar un equipo válido dentro del presupuesto, uno distinto con cada clic. Después cambia a quien quieras y guarda.',
    sam: 'Prefiero hacerlo yo',
    drugPredlog: 'Otra propuesta',
    opisDrugegaPredloga:
      '¿No te gusta? Sortea un equipo nuevo: mientras no lo guardes, es gratis.',
    dopolni: 'Completar equipo',
    opisDopolnitve:
      'Huecos libres en la plantilla: {n}. Tus elecciones se quedan y el resto lo rellenamos al azar dentro del presupuesto.',
    korak1: 'Arriba te hemos propuesto un nombre de equipo; puedes cambiarlo cuando quieras.',
    korak2:
      'Haz clic en <krepko>＋</krepko> en un hueco vacío del campo. En el móvil, en la barra de abajo también está el botón <krepko>＋ Añadir</krepko>; en el ordenador eliges en el <krepko>mercado de jugadores</krepko> de la derecha.',
    korak3:
      'La plantilla tiene {n} jugadores: {gk} POR, {def} DEF, {mid} CEN, {fwd} DEL. Del mismo club, como mucho {klub}.',
    korak4:
      'Cuando estén cubiertos los huecos, elige <krepko>capitán</krepko> y <krepko>vicecapitán</krepko> y pulsa <krepko>Guardar equipo</krepko> (en el móvil, <krepko>Guardar</krepko> en la barra de abajo).',
  },

  trak: {
    naslov: 'Brazalete',
    kapetan: 'Capitán (×{n})',
    namestnik: 'Vicecapitán',
    nihce: '— nadie —',
  },

  kajCe: {
    prinesla: 'Tu once actual habría sumado en la <krog>jornada {krog}</krog> ({sezona})',
    opis: 'Simulación "¿y si…?": no es un resultado histórico y cambia con cada cambio. Los puntos reales de jornadas pasadas están en la clasificación y en el historial de alineaciones.',
  },

  status: {
    manjka: 'Para guardarlo del todo aún falta algo:',
    vpisiIme: 'Escribe el nombre del equipo (en el campo de arriba).',
    osnutekZdaj: 'También puedes guardar un borrador ahora y completar las reglas más tarde.',
    brezTock: '<krepko>En la jornada {krog}</krepko>, tal como está, <krepko>NO puntuarás</krepko>.',
    kajPomeni:
      '<krepko>¿Qué significa "Guardar"?</krepko> Tus cambios (plantilla, once, capitán) se guardan en la base de datos. Para la jornada actual vale cómo esté el equipo en el cierre. Hasta el cierre puedes cambiar lo que quieras y volver a pulsar Guardar: vale la última versión. <krepko>"Guardar borrador"</krepko> es lo mismo, solo que con la nota de que el equipo aún no cumple todas las reglas (para puntuar necesitas corregirlo: mira la lista de arriba).',
    kajPomeniRok:
      '<krepko>¿Qué significa "Guardar"?</krepko> Tus cambios (plantilla, once, capitán) se guardan en la base de datos. Para la jornada actual vale cómo esté el equipo en el cierre (<krepko>jornada {krog}: {rok}</krepko>). Hasta el cierre puedes cambiar lo que quieras y volver a pulsar Guardar: vale la última versión. <krepko>"Guardar borrador"</krepko> es lo mismo, solo que con la nota de que el equipo aún no cumple todas las reglas (para puntuar necesitas corregirlo: mira la lista de arriba).',
  },

  pripomocki: {
    klopPlusNaslov: 'Comodín Banquillo+',
    klopPlusVlozenZa: 'Activado para la jornada {krog} ({sezona}): en ella también puntúa el banquillo.',
    klopPlusVlozen: 'Banquillo+ ya está activado: en esa jornada también puntúa el banquillo.',
    klopPlusOpis:
      'Una vez por temporada: en la jornada elegida se suman también los puntos de los cuatro suplentes.',
    wildcardNaslov: 'Comodín Wildcard',
    wildcardVlozenZa: 'Activado para la jornada {krog} ({sezona}): los fichajes de esa jornada son gratis.',
    wildcardVlozen: 'El Wildcard ya está activado: los fichajes de esa jornada son gratis.',
    wildcardOpis:
      'Una vez por temporada: en esta jornada puedes cambiar a todos los jugadores que quieras sin perder puntos.',
    zaklenjen: 'cerrado',
    preklici: 'cancelar',
    prekliciDo: 'Puedes cancelarlo hasta <odstevanje></odstevanje>',
    izberiKrog: 'Elige jornada …',
    niKroga: 'No hay ninguna jornada futura con cierre',
    krogSezona: 'Jornada {krog} ({sezona})',
    vlozi: 'Activar',
    vloziZa: 'Activar para la jornada {krog}',
    potrdiWildcard: '¿Activas el Wildcard para la jornada {krog}? Solo tienes uno por temporada.',
  },

  zgodovina: {
    naslov: 'Historial de alineaciones',
    posnetkov: {
      one: '{n} jornada guardada',
      many: '{n} jornadas guardadas',
      other: '{n} jornadas guardadas',
    },
    krog: 'Jornada {krog}',
    podrobnost: 'Jornada {krog} · temporada {sezona}',
    podrobnostSkupaj: 'Jornada {krog} · temporada {sezona} · total <krepko>{tocke}</krepko>',
    deli: 'Compartir la jornada {krog}',
  },

  telefon: {
    ostane: 'quedan',
    predalPovzetek: 'quedan <krepko>{cena}</krepko> · {n}/{velikost}',
    popravi: 'corregir ↑',
    neshranjeno: 'sin guardar',
    dodaj: '＋ Añadir',
    osnutekNamig: 'El equipo aún no cumple las reglas: se guarda como borrador.',
    neIzpolnjuje: 'el equipo aún no cumple las reglas',
    zapriTrg: 'Cerrar el mercado',
    zapri: '✕ Cerrar',
  },

  trg: {
    naslov: 'Mercado de jugadores',
    iskanje: 'Buscar por nombre …',
    pocistiIskanje: 'Borrar búsqueda',
    vsi: 'todos',
    vsiKlubi: 'Todos los clubes',
    niZadetkov: 'Sin resultados.',
    pocistiFiltre: 'Quitar filtros',
    statLetos: '{goli} G · {minute} min',
    statLani: 'la temporada pasada {goli} G',
    brezNastopov: 'sin partidos',
    niVecVLigi: 'ya no está en la liga',
    tockeZadnjiKrog: 'Puntos en la última jornada jugada',
    podatki: 'Datos del jugador {ime}',
    podatkiNamig: 'Estadísticas, evolución del precio, próximos partidos',
    profilVNovemZavihku: 'Abrir el perfil del jugador en una pestaña nueva',
    odstrani: '✕ quitar',
    dodaj: '⊕ añadir',
    prvih: 'Se muestran los {n} primeros: afina la búsqueda.',
    noga: 'Del mismo club puedes elegir como mucho {n} jugadores. Los goles y los minutos son de la temporada actual.',
  },

  rok: {
    krog: 'Jornada {krog}',
    potekel: 'El cierre ya ha pasado: <krepko>{rok}</krepko>',
    rok: 'Cierre: <krepko>{rok}</krepko>',
    niDolocen: 'Aún no hay fecha de cierre.',
  },

  igrisce: {
    naKlop: 'Pasar al banquillo',
    vPostavo: 'Meter en el once inicial',
    niVecVLigiNamig: 'El jugador ya no está en la liga: una plantilla con él no puntúa.',
    niVecVLigi: 'ya no está en la liga',
    poskodba: 'lesión',
    odsoten: 'ausente',
    kapetan: 'Capitán: puntúa el triple',
    namestnik: 'Vicecapitán',
    tockeKroga: 'Puntos en la última jornada: {tocke}',
    tockeKrogaKapetan: 'Puntos en la última jornada: {tocke} × 3 (capitán)',
    odstraniIzKadra: 'Quitar de la plantilla',
    odstrani: 'Quitar a {ime}',
    prej: 'Antes en el orden de cambios',
    prejIme: '{ime}: antes en el orden de cambios',
    pozneje: 'Después en el orden de cambios',
    poznejeIme: '{ime}: después en el orden de cambios',
    izberi: 'Elige: {pozicija}',
    klop: 'Banquillo',
    klopOpis:
      'Si un titular no juega, lo sustituye el primer suplente de la misma posición, por orden de izquierda a derecha.',
    brezPozicije: 'Sin posición confirmada: no se pueden poner en el campo',
  },

  igrisceTocke: {
    opis: '{ime}: {deli}',
    minut: '{n} min',
    goli: '{n} × gol',
    asistence: '{n} × asistencia',
    brezPrejetega: 'portería a cero',
    prejetih: '{n} encajados',
    rumeni: 'tarjeta amarilla',
    rdeci: 'tarjeta roja',
    skupaj: '{tocke} puntos',
    brezPostave: 'El acta no indica la alineación de este equipo.',
    klop: 'Banquillo',
    vstopilo: '{n} entraron en juego',
  },

  enajsterica: {
    kapetan: 'Capitán',
    namestnik: 'Vicecapitán con brazalete',
  },

  opozorila: {
    naslov: 'Avisos en tus equipos',
    naslovNapakEna: 'Uno de tus equipos no puntuará',
    naslovNapak: {
      one: '{n} de tus equipos no puntuará',
      many: '{n} de tus equipos no puntuarán',
      other: '{n} de tus equipos no puntuarán',
    },
    nimasEkipe: 'Aún no tienes equipo<liga>({liga})</liga>: sin él no puntuarás en la próxima jornada.',
    sestavi: 'Haz tu equipo →',
    popravi: 'Corregir →',
    poglej: 'Ver →',
    skrij: 'Ocultar aviso: {besedilo}',
    skrijNamig: 'Ocultar hasta que haya un aviso nuevo',
    pokaziVse: 'Mostrar todos ({n})',
    razlog: 'El equipo no cumple las reglas.',
    brezTockKrog: 'En la jornada {krog} no puntuará.',
    brezTockRok: 'En el próximo cierre no puntuará.',
    nepopolna: 'El equipo no está completo: esta jornada aún se cierra, pero desde la siguiente no puntuará.',
    igralec: {
      kapetan: {
        poskodba: 'El capitán {ime} está lesionado.',
        odsotnost: 'El capitán {ime} está ausente.',
        izstop: 'El capitán {ime} ya no jugará: su club se ha retirado de la liga.',
      },
      namestnik: {
        poskodba: 'El vicecapitán {ime} está lesionado.',
        odsotnost: 'El vicecapitán {ime} está ausente.',
        izstop: 'El vicecapitán {ime} ya no jugará: su club se ha retirado de la liga.',
      },
      vPostavi: {
        poskodba: '{ime} está lesionado y es titular.',
        odsotnost: '{ime} está ausente y es titular.',
        izstop: '{ime} es titular y ya no jugará: su club se ha retirado de la liga.',
      },
      naKlopi: {
        poskodba: '{ime}, en el banquillo, está lesionado.',
        odsotnost: '{ime}, en el banquillo, está ausente.',
        izstop: '{ime}, en el banquillo, ya no jugará: su club se ha retirado de la liga.',
      },
    },
    posledica: {
      kapetan: 'Si no juega, el brazalete pasa al vicecapitán; quizá mejor elige otro capitán.',
      namestnik: 'Si no juegan ni el capitán ni el vicecapitán, no hay puntos triples.',
      vPostavi: 'Si no juega, lo sustituye el primer suplente de la misma posición.',
      naKlopi: 'En el cambio automático, el sistema se lo saltará si no juega.',
      izstop: 'Ya no puntuará para ti: cámbialo. El equipo con él sigue siendo válido.',
    },
  },
}
