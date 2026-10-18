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
    posljiPotrditevZnova: 'Reenviar el correo de confirmación',
    potrditevPoslanaZnova:
      'Te hemos enviado un nuevo correo de confirmación. Revisa también la carpeta de spam.',
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
    predlogEposte: '¿Quisiste decir {eposta}?',
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
    push: 'Notificaciones push',
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
  nastavitve: {
    naslov: 'Ajustes de la cuenta',
    moraPrijava: 'Para editar tu cuenta tienes que <prijava>iniciar sesión</prijava>.',
    nalagam: 'Cargando …',
    napakaNalaganja: 'No se han podido cargar los ajustes.',
    shranjujem: 'Guardando …',
    shranjeno: 'Guardado.',
    napakaShranjevanja: 'No se ha podido guardar. Inténtalo de nuevo.',
    profilNaslov: 'Perfil',
    mojProfil: 'Ver tu perfil público',
    prikaznoIme: 'Nombre visible',
    imeOpis: 'Los demás lo ven en las clasificaciones. De 3 a 24 caracteres; puedes cambiarlo una vez cada 7 días.',
    imeNaslednjic: 'Podrás volver a cambiar el nombre el {datum}.',
    shraniIme: 'Guardar nombre',
    avatar: 'Avatar',
    avatarOpis: 'Elige un color y tus iniciales o un icono de fútbol.',
    barva: 'Color',
    barvaN: 'Color {n}',
    slika: 'Imagen',
    zacetnice: 'Iniciales',
    ikone: {
      zoga: 'Balón',
      gol: 'Portería',
      pokal: 'Copa',
      copat: 'Bota de fútbol',
      rokavice: 'Guantes de portero',
      dres: 'Camiseta',
      zastavica: 'Banderín de córner',
      navijac: 'Aficionado',
    },
    klubNaslov: 'El club del que eres',
    klubOpis: 'Aparece en tu perfil y tus puntos cuentan para el club en la clasificación de aficiones.',
    klubIsci: 'Busca un club …',
    klubNiZadetkov: 'No se ha encontrado ningún club.',
    klubBrez: 'Aún no has elegido club.',
    klubOdstrani: 'Quitar club',
    jezikNaslov: 'Idioma y país',
    jezikOpis: 'El idioma de la web y el país cuyas ligas ves. La elección se aplica en este navegador.',
    obvestilaNaslov: 'Avisos',
    zasebnostNaslov: 'Privacidad',
    javniProfil: 'Perfil público',
    javniProfilOpis: 'Los demás ven en tu perfil tus equipos, tu club y tus logros. Si lo desactivas, solo se ve tu nombre visible.',
    prijavaNaslov: 'Inicio de sesión y contraseña',
    prijavljenZ: 'Has iniciado sesión con {email}.',
    geslo: 'Cambiar contraseña',
    gesloOpis: 'Te enviamos por correo un enlace para establecer una nueva contraseña.',
    gesloPoslano: 'Hemos enviado el enlace a {email}. Revisa tu correo (también el spam).',
    gesloNapaka: 'No se ha podido enviar el enlace. Inténtalo de nuevo en unos minutos.',
    eposta: 'Para cambiar tu dirección de correo, escríbenos a <eposta>info@slff.eu</eposta>.',
    napake: {
      dolzina: 'El nombre visible debe tener de 3 a 24 caracteres.',
      znaki: 'El nombre visible contiene caracteres no permitidos.',
      rezervirano: 'Este nombre está reservado para el equipo de SLFF. Elige otro.',
      neprimerno: 'Este nombre no es adecuado. Elige otro.',
      prepogosto: 'Solo puedes cambiar el nombre visible una vez cada 7 días.',
      zasedeno: 'Este nombre visible ya está en uso.',
    },
  },
  profil: {
    naslov: 'Perfil',
    niProfila: 'Este perfil no existe. Puede que la cuenta se haya eliminado.',
    nazaj: 'A la clasificación',
    zaseben: 'Este perfil es privado.',
    tvojZaseben: 'Tu perfil es privado: los demás solo ven tu nombre visible.',
    uredi: 'Editar perfil',
    clanOd: 'Miembro desde el {datum}',
    navija: 'Es del',
    ekipe: 'Equipos',
    brezEkip: 'Aún no tiene equipo en las ligas activas.',
    mesto: 'Puesto {mesto} de {ekip}',
    miniLige: 'Miniligas en común',
    dosezki: 'Logros',
    sezone: 'Temporadas',
    krogi: 'Jornadas jugadas',
    najboljsiKrog: 'Mejor jornada',
  },
  izbris: {
    naslov: 'Eliminar cuenta',
    moraPrijava: 'Para eliminar la cuenta tienes que <prijava>iniciar sesión</prijava>.',
    opis: 'Eliminaremos la cuenta {email}: el perfil, todos tus equipos con su historial de puntos, tus votos y las miniligas que hayas creado. No se puede deshacer. Al borrar la cuenta también termina la insignia de jugador verificado, y la suscripción se detiene sin reembolso.',
    gumb: 'Eliminar cuenta',
    potrdi: 'Sí, eliminar para siempre',
    preklici: 'Cancelar',
    brisem: 'Eliminando …',
    napaka: 'No se ha podido eliminar la cuenta: {napaka}',
  },
  pravno: {
    naslov: 'Privacidad y condiciones',
    zadnjaSprememba: 'Última modificación: 16 de octubre de 2026',
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
      'No guardamos tu número de teléfono ni los datos de tu tarjeta, y tu dirección solo si pides una insignia impresa (ver abajo). No usamos cookies de seguimiento ni herramientas publicitarias. En el navegador se guardan tu sesión, la marca de conversación del chat de ayuda si lo abres y marcas de sesión con las que contamos una sola vez cada visita a una página. Cuánta gente ha abierto cada página lo contamos solo como total diario, sin tu nombre, cuenta, dispositivo ni dirección IP. Las estadísticas generales de visitas (qué páginas, de dónde llegan los visitantes, tipo de dispositivo y país, algunas acciones como hacer un equipo) las registra <b>Umami</b> en nuestro servidor: sin cookies, sin guardar la dirección IP y sin relacionar la visita con tu cuenta. Si el navegador tiene activada la opción «No rastrear», no se registra nada.',
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
      'Puedes eliminar tu cuenta y todos tus datos tú mismo cuando quieras: en el menú de la cuenta elige <b>Eliminar cuenta</b> (slff.eu/account). Para corregir tu nombre visible o si la eliminación falla, escríbenos a <eposta>info@slff.eu</eposta>. Al eliminarla, tu equipo también desaparece de la clasificación. El registro de la compra de la insignia de jugador verificado se conserva 10 años, como exige la normativa contable, y la dirección de envío según la regla de arriba.',
    pravilaNaslov: 'Reglas del juego',
    pravila:
      'Una persona, una cuenta. La votación de asistencias y posiciones sirve para corregir de verdad; votar mal a propósito estropea el juego a todos y puede llevar a eliminar la cuenta. La puntuación y los precios pueden cambiar durante la temporada si algo resulta injusto; anunciaremos esos cambios.',
    jamstvoNaslov: 'Sin garantía',
    jamstvo:
      'La web funciona tal cual. Nos esforzamos por que los datos sean correctos y por que esté disponible, pero no podemos garantizarlo: las actas pueden llegar tarde y las estadísticas pueden contener errores. Esto se aplica al juego gratuito. Los servicios de pago se rigen por las condiciones de la sección Servicios de pago y por tus derechos legales como consumidor.',
    kajJePlacljivo:
      'Lo único de pago es la insignia opcional de jugador verificado (ver Servicios de pago abajo).',
    podatkiPlacilo:
      '<b>Compra de la insignia de jugador verificado (solo si la compras).</b> Guardamos el registro de la compra (qué, cuándo, importe y tu identificador de cliente en Stripe) durante 10 años, como exige la normativa contable. Guardamos la dirección de envío de la insignia impresa durante 90 días tras el envío o la cancelación del pedido, y como máximo 12 meses desde el pedido; después solo queda el país.',
    dostopStripe:
      'Los pagos de la insignia de jugador verificado los procesa <b>Stripe</b> (Stripe Payments Europe, Irlanda): recibe tu nombre, tu correo, la dirección de facturación y, para la insignia impresa, la dirección de envío. Los datos de la tarjeta los introduces directamente en Stripe; nosotros no los vemos.',
    placljivoNaslov:
      'Servicios de pago: jugadores verificados',
    placljivoUvod:
      'El juego es y seguirá siendo gratis. Solo es de pago la insignia opcional de jugador verificado, que puede comprar el jugador que ha confirmado que el perfil es suyo. La insignia nunca influye en los puntos, los precios, los equipos fantasy ni las reglas del juego. Estas condiciones se aplican a esa compra.',
    prodajalec:
      '<b>Vendedor:</b> SPACE GUARDIAN, računalniško programiranje, d.o.o., Ulica Hermana Potočnika 5, 1000 Ljubljana, Eslovenia, inscrita en el registro judicial del Tribunal de Distrito de Liubliana. Número de registro 9850538000, NIF-IVA SI42765153. Contacto: <eposta>info@slff.eu</eposta>.',
    kupis:
      '<b>Qué compras.</b> Un check azul junto al nombre del jugador y extras de perfil (descripción más larga, enlaces, banner, color, un partido o una estadística destacados, un mensaje a la afición). La suscripción anual cuesta 9,99 € y se renueva automáticamente cada año. La opción para siempre cuesta 29 € una sola vez y vale mientras SLFF ofrezca este servicio. Con la opción para siempre puedes añadir una insignia impresa con tu nombre por 5 € más 2 € de envío (Eslovenia) o 4 € (otro país de la UE). Solo enviamos a países de la UE; la entrega suele tardar de 2 a 3 semanas. Todos los precios incluyen IVA.',
    placilo:
      '<b>Pago.</b> El pago lo procesa Stripe. No vemos ni guardamos los datos de tu tarjeta. Solo puedes comprar si tienes al menos 18 años. El contrato se celebra cuando Stripe confirma el pago.',
    odpoved:
      '<b>Cancelar la suscripción.</b> Puedes cancelar la suscripción en cualquier momento con el botón Gestionar suscripción en la página de tu cuenta (slff.eu/account) o en el perfil del jugador. La cancelación surte efecto al final del año pagado; hasta entonces la insignia se mantiene. No devolvemos el dinero de un año ya empezado, salvo en los casos de abajo.',
    odstop:
      '<b>Derecho de desistimiento.</b> El contenido digital (el check y los extras) se facilita inmediatamente después del pago. Antes de pagar aceptas expresamente el suministro inmediato y reconoces que así pierdes el derecho de desistimiento de 14 días (art. 16, letra m, de la Directiva 2011/83/UE; ZVPot-1 esloveno). La insignia impresa se fabrica según tus indicaciones (el nombre en la insignia), por lo que no tiene derecho de desistimiento (art. 16, letra c). Tus derechos legales de garantía se mantienen: si la insignia llega dañada, equivocada o no llega, escríbenos y la cambiamos gratis o te devolvemos el dinero.',
    konec:
      '<b>Cuándo termina la insignia.</b> La insignia termina si resulta que el perfil no es tuyo y anulamos la confirmación, si ocultamos el nombre del jugador a petición suya o de la federación, o si borras tu cuenta. En ese caso la suscripción se detiene automáticamente y no se vuelve a cobrar. Si reclamas el pago ante tu banco (chargeback), se retira la insignia.',
    vracila:
      '<b>Reembolsos.</b> No reembolsamos en caso de abuso o de una confirmación falsa del perfil. Si la insignia termina por un error nuestro, a petición de la federación o porque cerramos el servicio, devolvemos la parte proporcional de los meses no usados de la suscripción anual. En la opción para siempre devolvemos el importe íntegro durante los primeros 12 meses tras la compra y, después, la parte proporcional de lo que quede de 5 años desde la compra. La insignia impresa y el envío no se reembolsan si cerramos el servicio (la insignia sigue siendo tuya), solo en caso de defecto.',
    pritozbe:
      '<b>Preguntas y reclamaciones.</b> Escribe a <eposta>info@slff.eu</eposta>; respondemos en un plazo de 8 días hábiles. No reconocemos ninguna entidad de resolución extrajudicial de litigios de consumo. Se aplica la ley eslovena; esto no te quita la protección que te da la ley del país donde vives.',
    scoutNaslov: 'SLFF Scout: búsqueda de jugadores para clubes',
    scoutKaj:
      'A partir de las mismas actas públicas calculamos indicadores de los jugadores de ligas sénior: porcentaje de minutos, goles, impacto en el campo, goles encajados, tarjetas y evolución a lo largo de las temporadas, ajustados a la fuerza de la liga. Son indicadores de datos de partidos, no una valoración de la persona. Los verán los clubes con suscripción a SLFF Scout que buscan jugadores; la decisión la toma siempre una persona del club. No tratamos ligas juveniles. Quien haya jugado alguna vez en una liga juvenil queda excluido hasta que tenga minutos en una liga sénior e indique en su perfil un año de nacimiento según el cual cumple al menos 19 años este año.',
    scoutPodlaga:
      'La base jurídica es el interés legítimo (artículo 6, apartado 1, letra f, del RGPD): ayudar a los clubes a encontrar jugadores a partir de resultados publicados públicamente. Recalculamos los indicadores cada día y solo conservamos los últimos cálculos. Registraremos las consultas de los clubes durante 12 meses para evitar abusos y poder decir a un jugador, si lo pide, qué clubes lo han consultado.',
    scoutPrivolitev:
      'Un jugador con perfil reclamado puede añadir que está abierto a un traspaso, su año de nacimiento, las regiones que prefiere y el permiso para ser contactado. Es un consentimiento (artículo 6, apartado 1, letra a, del RGPD): solo lo ven los clubes de Scout, se puede retirar en cualquier momento en el perfil y, al retirarlo, borramos los datos. Un club escribe al jugador solo a través de Scout y no ve su correo electrónico.',
    scoutUgovor:
      'Oposición: en un perfil reclamado pulsa Ocúltame de Scout o escribe a <eposta>info@slff.eu</eposta> con un enlace a la página del jugador. En un plazo de 14 días ocultamos al jugador en Scout en todas nuestras ligas de ese país, también en importaciones posteriores. En el juego fantasy sigue.',
    trgovinaNaslov: 'Tienda SLFF (shop.slff.eu)',
    trgovinaKaj:
      'Al comprar tratamos tu nombre, correo electrónico, dirección de entrega, los productos comprados y los importes, y, si has iniciado sesión, tu cuenta de SLFF. El pago lo gestiona Stripe: no vemos ni guardamos los datos de la tarjeta. El nombre y la dirección los recibe Pošta Slovenije para la entrega. Para limitar abusos, en una compra no finalizada guardamos temporalmente un hash (irreversible) de la dirección IP; se borra al pagar o al caducar la compra. El texto de personalización (nombre, número) y el nombre del equipo fantasy en el producto forman parte del pedido; el texto lo recibe también la imprenta que fabrica el producto.',
    trgovinaPodlaga:
      'La base jurídica es la ejecución de un contrato (artículo 6.1.b RGPD) y las obligaciones legales (contabilidad, impuestos), y para el hash de la dirección IP el interés legítimo en prevenir abusos (artículo 6.1.f RGPD). El responsable es SPACE GUARDIAN, računalniško programiranje, d.o.o.',
    trgovinaHramba:
      'Conservamos los datos de pedidos y facturas el tiempo que exigen la ley del IVA y la normativa contable (10 años desde el año de emisión de la factura). El correo para avisos del pedido solo se usa para ese pedido. Para acceso, rectificación u oposición escribe a <eposta>info@slff.eu</eposta>.',
  },
  klubskiRacun: {
    naslov: 'Cuenta oficial del club',
    aktiven: 'Esta cuenta representa a {klub}.',
    pravice: 'Como club puedes editar posiciones, añadir jugadores y aprobar los perfiles de tus jugadores.',
    vprasanje: '¿Representas a un club?',
    pojasnilo: 'Si inicias sesión con la dirección oficial del club que tenemos, obtienes una cuenta de club automáticamente. Si no la tenemos, solicítala abajo y la comprobaremos.',
    klub: 'Club',
    isciKlub: 'Buscar club …',
    vloga: 'Tu papel en el club',
    vloge: {
      predsednik: 'presidente',
      tajnik: 'secretario',
      trener: 'entrenador',
      vodstvo: 'directiva del club',
      drugo: 'otro',
    },
    dokaz: 'Enlace donde está publicada la dirección (web, Facebook, federación)',
    opomba: 'Nota (opcional)',
    naslovRacuna: 'Dirección que verificamos: {email}',
    poslji: 'Enviar solicitud',
    caka: 'Tu solicitud para {klub} está pendiente de revisión.',
    cakaBrezKluba: 'Tu dirección es una de las oficiales, pero aún tenemos que vincularla al club. Lo resolvemos pronto.',
    cakaPolno: 'El club ya tiene 5 cuentas. Lo revisaremos y te avisaremos.',
    zavrnjeno: 'La solicitud fue rechazada: {razlog}',
    nepotrjen: 'Primero confirma el correo de tu cuenta.',
    napake: {
      zeKlub: 'Ya representas a un club.',
      caka: 'Tu solicitud ya está pendiente de decisión.',
    },
  },
}
