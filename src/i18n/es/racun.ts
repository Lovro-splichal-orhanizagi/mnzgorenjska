// `racun` en español (fuente: src/i18n/sl/racun.ts).
import type { Prevod } from '../jedro.ts'

export const racun: NonNullable<Prevod['racun']> = {
  prijava: {
    naslovPrijava: 'Iniciar sesión',
    naslovRegistracija: 'Registro',
    naslovPozabljeno: 'Contraseña olvidada',
    googleNiNaVoljo: 'Ahora mismo no se puede iniciar sesión con Google. Usa el correo electrónico.',
    appleNiNaVoljo: 'Ahora mismo no se puede iniciar sesión con Apple. Usa el correo electrónico.',
    poslanaPonastavitev:
      'Te hemos enviado un enlace para restablecer la contraseña. Revisa tu correo (también la carpeta de spam).',
    racunUstvarjen:
      'Cuenta creada. Te hemos enviado un enlace de confirmación por correo: ábrelo y vuelve aquí.',
    prijavljenKot: 'Has iniciado sesión como {email}.',
    zGooglom: 'Continuar con Google',
    zApplom: 'Continuar con Apple',
    aliZEposto: 'o con correo electrónico',
    prikaznoIme: 'Nombre visible',
    eposta: 'Correo electrónico',
    geslo: 'Contraseña',
    posiljam: 'Enviando …',
    ustvariRacun: 'Crear cuenta',
    posljiPovezavo: 'Enviar enlace',
    gumbPrijava: 'Iniciar sesión',
    zeImasRacun: '¿Ya tienes cuenta? Inicia sesión',
    nimasRacuna: '¿No tienes cuenta? Regístrate',
    pozabljenoGeslo: '¿Has olvidado la contraseña?',
    nazajNaPrijavo: '← Volver a iniciar sesión',
  },
  napake: {
    napacnaPrijava: 'Correo electrónico o contraseña incorrectos.',
    niPotrjen: 'Tu correo aún no está confirmado. Haz clic en el enlace del mensaje que te hemos enviado.',
    zeRegistriran: 'Este correo ya está registrado. Inicia sesión o restablece la contraseña.',
    prevecPoskusov: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
    sibkoGeslo: 'La contraseña es demasiado débil. Usa al menos 6 caracteres, mejor una mezcla de letras y números.',
    istoGeslo: 'La nueva contraseña debe ser distinta de la anterior.',
    neveljavenNaslov: 'El correo electrónico no es válido.',
  },
  novoGeslo: {
    naslov: 'Nueva contraseña',
    gesliSeNeUjemata: 'Las contraseñas no coinciden.',
    preverjam: 'Comprobando el enlace …',
    neveljavna:
      'El enlace no es válido o ha caducado. En la página de <prijava>inicio de sesión</prijava> vuelve a pedir que se restablezca la contraseña.',
    novoGeslo: 'Nueva contraseña',
    ponovi: 'Repite la contraseña',
    shranjujem: 'Guardando …',
    shrani: 'Guardar contraseña',
  },
  opomniki: {
    naslov: 'Avisos',
    napakaNalaganja: 'No se ha podido cargar la configuración.',
    napakaShranjevanja: 'No se ha podido guardar. Inténtalo de nuevo.',
    nalagam: 'Cargando …',
    moraPrijava: 'Para editar los recordatorios tienes que <prijava>iniciar sesión</prijava>.',
    opis: 'Antes del cierre de cada jornada te mandamos un mensaje corto a {email} para que no te olvides de preparar el equipo.',
    posiljaj: 'Recordatorios por correo',
    shranjujem: 'Guardando …',
    vklopljeni: 'Recordatorios activados.',
    izklopljeni: 'Ya no te enviaremos recordatorios.',
    odjavaVprasanje: '¿No quieres recibir más correos de SLFF (recordatorios antes del cierre y avisos sobre tu equipo)?',
    odjavaGumb: 'Darme de baja',
    odjavaNapaka: 'El enlace no es válido. Inicia sesión y desactiva los recordatorios en la configuración.',
    push: 'Notificaciones push (aplicación móvil)',
    pushOpis: 'El día antes del cierre, el móvil te avisa si tu equipo aún no está listo.',
    pushVklopljena: 'Notificaciones push activadas.',
    pushIzklopljena: 'Ya no te enviaremos notificaciones push.',
    pushZavrnjeno: 'Las notificaciones están desactivadas en el móvil. Actívalas en Ajustes → SLFF → Notificaciones.',
    pushDovoli: 'Permitir notificaciones',
    povezava: 'Configuración de avisos',
  },
  potrditev: {
    naslov: 'Confirmando …',
    preverjam: 'Comprobando el enlace …',
    neveljavna: 'El enlace ya no es válido o ya se ha usado. <prijava>Inicia sesión</prijava> o pide uno nuevo.',
  },
  izbris: {
    naslov: 'Eliminar cuenta',
    moraPrijava: 'Para eliminar la cuenta tienes que <prijava>iniciar sesión</prijava>.',
    opis: 'Eliminaremos la cuenta {email}: el perfil, todos tus equipos con su historial de puntos, tus votos y las miniligas que hayas creado. No se puede deshacer.',
    gumb: 'Eliminar cuenta',
    potrdi: 'Sí, eliminar para siempre',
    preklici: 'Cancelar',
    brisem: 'Eliminando …',
    napaka: 'No se ha podido eliminar la cuenta: {napaka}',
  },
  pravno: {
    naslov: 'Privacidad y condiciones',
    zadnjaSprememba: 'Última modificación: 9 de octubre de 2026',
    kajJeNaslov: 'Qué es SLFF',
    kajJe:
      'SLFF (Sunday League Fantasy Football) es una liga fantasy hecha por aficionados para ligas de fútbol regionales y aficionadas. La llevamos de forma voluntaria y no tiene relación con las federaciones territoriales, la federación nacional ni los clubes. El juego es gratuito, sin apuestas ni premios.',
    podatkiNaslov: 'Qué datos guardamos',
    podatkiEposta:
      '<b>Correo electrónico y contraseña.</b> Los necesitamos para iniciar sesión. La contraseña se guarda cifrada y no la vemos.',
    podatkiIme:
      '<b>Nombre visible y nombre del equipo.</b> Se ven en la clasificación. Si no quieres usar tu nombre, usa un apodo.',
    podatkiEkipa:
      '<b>Tu equipo y tus votos.</b> La composición de la plantilla, el capitán, los fichajes y los votos sobre asistencias o posiciones.',
    podatkiNaprava:
      '<b>Token del dispositivo para notificaciones.</b> Si en la aplicación móvil permites las notificaciones, guardamos un token con el que te enviamos un recordatorio antes del cierre de la jornada. Al cerrar sesión lo borramos.',
    neHranimo:
      'No guardamos dirección postal, número de teléfono ni datos de pago. No usamos cookies de seguimiento ni herramientas publicitarias. En el navegador se guardan tu sesión, la marca de conversación del chat de ayuda si lo abres y marcas de sesión con las que contamos una sola vez cada visita a una página. Cuánta gente ha abierto cada página lo contamos solo como total diario, sin tu nombre, cuenta, dispositivo ni dirección IP. Las estadísticas generales de visitas (qué páginas, de dónde llegan los visitantes, tipo de dispositivo y país, algunas acciones como hacer un equipo) las registra <b>Umami</b> en nuestro servidor: sin cookies, sin guardar la dirección IP y sin relacionar la visita con tu cuenta. Si el navegador tiene activada la opción «No rastrear», no se registra nada.',
    dostopNaslov: 'Quién tiene acceso a los datos',
    dostop:
      'Los datos están en nuestro servidor del proveedor <b>Hetzner</b> (Alemania, UE) y el tráfico hasta él pasa por <b>Cloudflare</b> (protección y entrega de la web). Los correos de confirmación y de restablecimiento salen de nuestro servidor de correo (también en Hetzner) y las notificaciones de la aplicación móvil, por <b>Google Firebase Cloud Messaging</b> (solo el token del dispositivo y el texto del aviso). El chat de ayuda de la esquina inferior derecha funciona con <b>HelpStack</b>: allí llega lo que escribes y, si has iniciado sesión, tu nombre visible, para saber a quién respondemos. Cuando el asistente del chat te ayuda, también puede ver en qué página y en qué liga estás y si tu equipo es válido. No le pasamos tu correo. No cedemos los datos a nadie más ni los vendemos.',
    statistikaNaslov: 'Datos de los futbolistas',
    statistika:
      'De los futbolistas de las ligas que cubrimos mostramos nombre, club, dorsal, partidos, minutos, goles y tarjetas. La fuente son las actas oficiales publicadas de la federación indicada en el pie de página. Las posiciones y las asistencias, que el acta no recoge, las decide la comunidad por votación, así que pueden ser incorrectas. Con todo ello calculamos los puntos y el precio del jugador en el juego. Si algo está mal, haz clic en el jugador y avísanos.',
    statistikaPodlaga:
      'La finalidad es un juego fantasy gratuito hecho por aficionados. La base jurídica es el interés legítimo (artículo 6.1.f del RGPD): permitir a los aficionados jugar con los resultados publicados de su liga. Mostramos los datos mientras el jugador juegue en una liga que cubrimos. En las ligas austriacas, igual que la ÖFB, ocultamos el nombre del jugador 18 meses después de su último partido.',
    statistikaUgovor:
      'Un jugador puede oponerse al tratamiento o pedir que se borre: escribe a <eposta>info@slff.eu</eposta> e incluye el enlace a la página del jugador. En 14 días sustituimos su nombre por una etiqueta neutra en todas nuestras ligas de ese país en las que lo encontremos, también en importaciones posteriores. Las estadísticas se quedan sin nombre. Hacemos lo mismo si lo pide la federación.',
    grbi:
      'Los escudos de los clubes son propiedad de cada club y se muestran solo para reconocer al equipo. Si un club no lo quiere, que nos escriba y quitaremos el escudo.',
    fotografijeNaslov: 'Fotografías',
    fotografije:
      'La fotografía de la página de inicio es obra de Abigail Keenan y está publicada en <unsplash>Unsplash</unsplash> con su licencia, que permite el uso libre. No muestra a jugadores de nuestras ligas.',
    praviceNaslov: 'Tus derechos',
    pravice:
      'Puedes eliminar tu cuenta y todos tus datos tú mismo cuando quieras: en el menú de la cuenta elige <b>Eliminar cuenta</b> (slff.eu/account). Para corregir tu nombre visible o si la eliminación falla, escríbenos a <eposta>info@slff.eu</eposta>. Al eliminarla, tu equipo también desaparece de la clasificación.',
    pravilaNaslov: 'Reglas del juego',
    pravila:
      'Una persona, una cuenta. La votación de asistencias y posiciones sirve para corregir de verdad; votar mal a propósito estropea el juego a todos y puede llevar a eliminar la cuenta. La puntuación y los precios pueden cambiar durante la temporada si algo resulta injusto; anunciaremos esos cambios.',
    jamstvoNaslov: 'Sin garantía',
    jamstvo:
      'La web funciona tal cual. Nos esforzamos por que los datos sean correctos y por que esté disponible, pero no podemos garantizarlo: las actas pueden llegar tarde y las estadísticas pueden contener errores.',
  },
}
