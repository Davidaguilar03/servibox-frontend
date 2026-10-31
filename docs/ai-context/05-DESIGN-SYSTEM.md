# Sistema de diseno base

Tokens en `src/styles/tokens.css` (bloque `@theme` de Tailwind v4), roles `monto` y `codigo`
en `src/index.css` y constantes de icono en `src/components/icons.ts`. La guarda
`src/styles/designSystem.test.ts` recorre los `.tsx`, `.ts` y `.css` de `src` y falla si algo
se sale de estas reglas. Colores y pares de contraste: ver 02-CONVENTIONS y `tokens.test.ts`
(incluidos los nuevos pares de seleccion lateral).

## Plataforma (2026-10-30)

* Shell de plataforma: el mismo AppShell (sidebar oscuro, marca, compacto, movil, foco,
  SkipLink y movimiento reducido) con navegacion propia y encabezado dentro del contenido.
  Marca y favicon sin cambios; sin rotulo adicional bajo el logo.
* Acceso de plataforma: tarjeta centrada en canvas con Wordmark, TextField, Button y Alert
  existentes; sin fotografia ni textos comerciales.
* Resumen, correccion 2026-10-31: cuatro IndicatorCard compact de Productos (success,
  warning, brand-strong, info), icono izquierdo y titulo, cifra text-kpi y ayuda a la
  derecha. Rejilla con gap-4, una columna en movil, dos desde sm y cuatro desde 2xl;
  misma altura por fila y contenido alineado arriba sin filas de ayuda vacias. El
  desglose de usuarios sigue bajo el total; cifras largas envuelven sin recorte.
* Solicitudes conserva DataTable y tarjetas bajo md. Bloques 3/5 y 2/5 desde xl,
  alineados arriba. Correos tiene altura natural, relleno 16 px y filas compactas con
  Clock, MailCheck y MailX (iconMd), etiquetas y contador a la derecha. Fondos de icono
  warning-bg, success-bg y error-bg con sus tonos ink; aclaracion de envio conservada.
* Desde la entrega 2, Ver todas y Revisar enlazan a Solicitudes y su detalle.
  Listado con ListHeader, FilterBar, SelectField, DataTable, tarjetas y Pagination.
  Correccion de filtros: Serviteca y Responsable usan TextField; Desde y Hasta
  reutilizan DateRangeFields de PeriodPicker (misma implementacion, sin otro selector).
  FilterBar requests reparte los cinco controles en una columna bajo sm, dos desde
  sm, tres desde xl y fila completa desde 2xl, con Limpiar filtros al final.
  Detalle en ruta separada, superficies apiladas y datos en dos columnas desde sm;
  confirmaciones con DiscardableModal y componentes existentes. Sin barra redundante.
  Estados con texto y StatusBadge: aprobada info, rechazada error, cancelada neutral
  y activada success; mismos pares de contraste ya verificados, sin tokens nuevos.
* Diferencias deliberadas con la referencia: dos filtros de nombre segun contrato,
  sin tabla y detalle simultaneos, sin bloque Usuarios repetido, sin aviso global de correos
  ni gradientes o sombras. Fallidos usa texto error solo si es mayor que cero.
  David aprobo visualmente la ultima correccion el 2026-10-31, incluidos KPI compactos,
  alineacion, altura natural de Correos, iconos y distribucion movil.
  David tambien aprobo visualmente Solicitudes y sus nuevos filtros al autorizar
  el cierre de la entrega 2 el 2026-10-31.
* Servitecas (entrega 3): ListHeader, FilterBar con SearchField (Buscar, Nombre o
  codigo) y SelectField Estado, DataTable con tarjetas bajo md y Pagination. Columnas
  Serviteca (nombre y codigo), NIT, Telefono, Estado y Creada. StatusBadge ACTIVE
  success y SUSPENDED warning (mismos pares ya verificados, sin tokens nuevos); motivo
  de suspension bajo la insignia en text-small muted con line-clamp-2. Sin KPI (ya
  estan en el Resumen), pie de acceso limitado ni rotulo PLATAFORMA. Desde la entrega 4,
  columna Acciones con CellLink Ver detalle (y al final de cada tarjeta).
* Detalle de serviteca (entrega 4): mismo patron que el detalle de solicitud. ListHeader
  con Volver a servitecas; desde lg, Datos (2/3) y Acceso (1/3) en rejilla, apilados
  debajo. Datos: nombre text-section con StatusBadge, dl en dos columnas desde sm (codigo
  y NIT con rol codigo), fecha y motivo de suspension solo si aplica, y bloque Solicitud
  de registro con StatusBadge, fechas y CellLink. Acceso: botones secondary con su
  consecuencia en texto muted; confirmaciones con DiscardableModal, confirmar danger
  (suspender y cerrar sesiones) o primary (reactivar). Usuarios: resumen en dl (total,
  activos, inactivos y por rol) en vez de tarjetas KPI, DataTable con tarjetas bajo md,
  StatusBadge ACTIVO e INACTIVO y CellButton Cerrar sesiones solo en usuarios activos de
  una serviteca activa. Motivo con TextField y contador en la ayuda (sin componente
  nuevo de area de texto). Sin tokens, colores ni clases nuevas; sin bordes superiores
  de color, gradientes ni tarjetas de cifras de la maqueta.

## Configuracion (2026-10-28)

* ListHeader con descripcion y acceso al menu movil dentro del contenido. Solo esta
  ruta deja de montar la barra superior; sidebar y marca actuales conservados.
* Correccion aprobada por David: pantalla unificada sin pestanas, a todo el ancho
  del shell. Desde 1000 px disponibles, Datos 3fr y Finanzas 4fr (43/57 por ciento),
  separacion 16 px, alineacion superior y alturas naturales. Debajo apila Datos y Finanzas.
* Tarjetas con borde superior border-accent, superficie blanca, radio surface,
  relleno 16/24 px y separadores border. Nombre y codigo a ancho completo.
  NIT y telefono pasan a dos columnas desde 400 px disponibles en la tarjeta,
  con consultas de contenedor locales; una columna por debajo. Sin alturas fijas.
* Finanzas usa fieldsets Precio sugerido y Pagos con tarjeta; las tres tasas del
  primero muestran Gastos/Renta en dos columnas desde 480 px, e ICA a todo el ancho. Ayudas y errores junto al campo,
  aviso de recalculo en canvas. Guardar separado por borde, ancho completo en movil.
  Sin iconos, indicadores ni controles nuevos, ni cambios de tokens o estilos globales.
* Dos botones primarios, uno por formulario independiente; guardado, errores y estado
  propios. Un solo guardian protege cambios en cualquiera. El enlace financiero previo
  enfoca la seccion sin ocultar Datos; entrada normal sin salto.
* David aprueba visualmente la pantalla unificada el 2026-10-28 y autoriza su cierre.
  La aprobacion reemplaza los pendientes de distribucion, alturas, enlace, movil y teclado.

## Reportes (2026-10-28)

* ListHeader con menu movil dentro del contenido, sin barra superior redundante. Logo y
  sidebar actuales intactos. Rejilla por contenedor: desde 960 px, 3fr/5fr; debajo apila.
  Superficies con borde superior border-accent, radios y relleno 16/24 del sistema.
* KPI de resultados usan IndicatorCard compact, iconos y variaciones existentes; numeros
  text-kpi, sin cambio de tokens. Utilidad bruta sobre canvas y peso 600; neta con fondos
  success/error segun signo sin redondear. Se conservan las seis filas con moneda entera.
* PeriodPicker agrega layout form, selector a ancho completo y fechas auto-fit de minimo
  160 px. No altera stacked, inline o toolbar. Tipos con radio nativo y formatos con el
  SegmentedControl existente, una sola accion primaria y estados de foco/carga conservados.
* Movimientos usa DataTable dense y tarjetas bajo md con fecha, cuenta global, tipo,
  concepto/categoria e importe con signo. Totales discretos sobre canvas y paginacion
  compartida; estados reales, sin graficos ni acciones de edicion.
* David aprueba presentacion general; correccion posterior limita a diez filas por pagina,
  rango compacto y Pagination compartida. Sin scroll interno. David aprueba visualmente
  tambien altura y controles el 2026-10-28; sin navegador ni auditoria visual automatizada.

## Registro (2026-10-28)

* RegisterPage.css acota todas las reglas bajo #register. Desde lg foto 44%
  y panel neutral-100 56%, formulario integrado max640 px sin tarjeta.
  Foto decorativa cover 60%/35%, con velo gradual solo en la escena.
  Cobertura exclusiva del hijo directo register-photo. Marca compartida
  con simbolo 48x48, palabra 32/40 y ancho natural; capas 0/1/2 para foto,
  velo y contenido. No modifica Login, marca global, favicon ni tokens.
* Controles de texto y boton 52 px; casilla de terminos conserva su tamano.
  Etiquetas 14/20, titulo 32/40 y 44/52 desde lg; mensaje ambiental 36/44.
  Son variantes locales de los patrones del Login aprobado.
* Formulario con dos fieldsets y sus ocho campos actuales. Dos columnas
  desde sm solo con contenedor de al menos 440 px, una en movil. Altura
  determinada por contenido, min-height 100svh sin altura fija ni overflow
  que recorte formulario, errores o footer. Bajo lg foto oculta y marca
  visible sobre formulario con Volver al inicio.
* TextField, terminos explicitos, resumen de errores y foco conservados.
  Formulario con nombre accesible y aria-busy; envio con status y bloqueo.
  Logo, textos y navegacion en HTML. Fotografia generada decorativa, sin
  testimonio real. Sin navegador ni auditoria visual automatizada.
  Revision visual aprobada por David el 2026-10-28.

## Login (2026-10-28)

* LoginPage.css acota todas las reglas bajo #login. Desde lg dos columnas
  iguales, foto ambiental a sangre con cover y posicion 50%/35%; degradado
  overlay arriba y abajo para logo y mensaje blanco, centro sin velo.
  WordmarkLink onDark existente arriba a la izquierda; favicon intacto.
  Reglas de cobertura solo para el hijo directo login-photo: el simbolo
  compartido tambien es un img y debe quedar fuera de esas reglas. Marca
  local con simbolo 48x48, palabra 32/40 y ancho max-content. Foto en capa
  0, velo en 1, marca y texto en 2; sin oscurecer el contenido.
* Superficie neutral-100, formulario integrado max480 px, sin tarjeta;
  controles y boton 52 px, etiquetas 14/20. Titulo local 32/40 y 44/52 desde
  lg; mensaje ambiental 36/44 con Montserrat. Son variantes locales de
  presentacion, sin nuevos tokens, colores ni cambios a componentes comunes.
* Bajo lg foto y mensaje se ocultan, marca y regreso quedan sobre el
  formulario. Panel con min-height 100svh, contenido en flujo natural y
  padding vertical; sin height fija ni overflow que recorte campos o errores.
* Boton conserva estados y foco compartidos, flecha decorativa, aria-busy
  en formulario y status de carga. TextField conserva mostrar/ocultar por
  teclado y autocompletado. Errores en Alert, sesion vencida en status.
* Crear cuenta y Terminos enlazan rutas existentes. Ayuda WhatsApp omitida
  hasta configurar contacto real; no se publica el numero demostrativo en
  Login. La fotografia generada es decorativa y no representa un cliente real.
* Sin navegador ni auditoria visual automatizada. David aprueba visualmente
  el Login el 2026-10-28, incluida la correccion de logo. La ayuda permanece
  omitida por falta de numero real; no se afirma un enlace funcional.

## Landing (2026-10-27)

* Contenedor util fluido maximo 1760 px: ventana menos 32 px bajo lg
  y 48 desde lg, centrado. Reemplaza limite 1360 y margenes anteriores.
  Medidas definidas en px solo en LandingPage.css; raiz, html y tokens intactos.
  Cuerpo y h3 16 px, 18 desde lg; ayudas 14. Las variantes de titulo conservan
  prioridad propia. Sin zoom, transform scale ni anchos minimos de contenido.
* Banner exterior a ancho de ventana compartido por navbar y portada; foto
  ambiental desde arriba del navbar hasta el final de portada, independiente
  del contenedor interior 40/60 desde lg. Grupo de barra blanca relativo con
  z30, banner aislado con z0 y contenido con z10. Se
  eliminan offsets negativos de foto y se recorta solo la capa ambiental,
  con pointer-events none; no se recorta el header ni la pagina completa.
  Mascaras laterales e inferiores integran la foto al
  fondo claro. Acento tenue border-accent; imagen con radio surface y sombra
  raised discreta. Excepcion de sombra documentada en la guarda solo para
  LandingPage para esa imagen y la accion final autorizada; sin borde grueso.
  Cada vista de producto usa landing-product-frame con radio local 20 px y
  recorte de sus propias esquinas, sin doble marco, nuevo fondo ni cambio
  de radios globales. Se retira el bloque del piloto y sus lineas decorativas.
* Limites responsive separados del ancho de seccion: venta y stock de pasos
  max440 px, pago max320, centrados, con height auto. Titulos de paso 22/28,
  24/32 desde lg; descripciones 18 y 20 desde lg con interlineado 1,6.
  Funciones con stock max580 px y cuentas/utilidad max460, sin estirar
  tarjetas. Desde lg pistas minmax(0,580px)/minmax(0,460px), gap32 y
  conjunto centrado: se compacta solo el grupo de recursos. Seccion sobre
  canvas existente, a ancho de ventana, pasos sobre neutral-100 sin cambios.
  Reportes max520 px centrado; desde lg
  max-width min(520px,56svh), manteniendo ratio natural y titulo 44/48.
* Las seis imagenes product-visuals-v2 son representaciones generadas, no
  capturas reales. No llevan pies visibles de captura, referencia o ilustracion.
  Pasos con flechas horizontales y tres columnas desde lg, verticales debajo;
  items-start y sin espaciadores flexibles. Limites de imagen no amplian
  recursos en ventanas pequenas ni imponen altura a otras columnas.
* Beneficios con columnas independientes y alineacion inicial: inventario
  sin row-span, stock-panel reutilizado en dos ubicaciones con una unica fuente.
  Sin titulos visibles repetidos ni marcos anidados. Reportes con alt breve y
  seis conceptos accesibles en HTML, sin otra tarjeta. Parrafos largos limitados a 64ch;
  otros textos conservan sus limites de lectura dentro de las columnas.
* FAQ y cierre en contexto ambiental comun: escena absoluta arriba/izquierda,
  panorama 1942x809 al 100% desde lg, minimo visual 840 px debajo para el
  recorte izquierdo movil, limitado por la capa decorativa. Img height auto,
  sin cover ni altura vinculada al acordeon. Fundido desde el 27% hacia la
  derecha hasta 44%, suavizado solo en el ultimo 10% inferior desde lg.
  Debajo: fundido horizontal 28 a 60% y vertical 60 a 82%, antes de las
  preguntas apiladas. Velo radial amplio neutral-100 solo en pseudo-elemento
  de escena z0, sin limite inferior ligado a la caja del texto ni capa blanca
  global. Fondo con pointer-events none; texto y acordeon en z10, opacidad plena.
  Capa decorativa sin eventos ni altura de flujo, sin rectangulo detras del
  titulo, ni opacity o blur sobre texto o preguntas.
  Acordeon y panel rojo opacos en z10. Sin ventana de imagen, min-height o
  desplazamientos laterales; espacio FAQ/cierre 48 px desde lg, 32 debajo.
* Accion final local landing-closing-action: blanco surface, texto text
  semibold, altura 56 px, texto 16 y 18 desde lg, padding horizontal 24/32,
  radio surface 12, borde border y shadow-raised corto existente. Flecha
  Lucide decorativa, hover y active de secondary, foco inverso. Se agrupa
  bajo el mensaje y reserva la zona derecha de rueda; no cambia otros botones.
  Rueda transparente en el cuarto derecho del cierre desde lg y en flujo bajo
  el CTA en movil. Texto y acciones fuera de imagenes ambientales; sin falsos
  controles de navegacion ni toast ficticio.
* Composicion guiada por landing.png: navegacion clara, portada de dos columnas
  desde lg, flujo en tres pasos, beneficios asimetricos, franja nav de reportes,
  FAQ en dos columnas, cierre action y footer nav. En movil los bloques se apilan
  y la navegacion envuelve sin ocultar enlaces ni necesitar un menu.
* Reutiliza marca, simbolo y favicon existentes. Sin cambios en tokens globales,
  componentes compartidos o pantallas aprobadas. Excepcion autorizada solo en
  LandingPage.css, selectores bajo #landing: landing-title 36/40 y 56/60 desde
  lg; landing-heading 28/32 y 36/40; landing-feature-title 20/28 y 24/32. Pesos
  display y title ya existentes. Las demas pantallas conservan la escala habitual.
* Texto rojo sobre claro en brand-ink; texto inverso sobre nav y action;
  texto auxiliar oscuro en neutral-300. Boton secundario claro en el cierre.
  El enfasis brand del titulo oscuro es texto grande, con el contraste de
  brand sobre nav ya comprobado a 3:1. Sin animaciones ni capturas falsas.
  Todas las imagenes declaran dimensiones naturales; solo el panel de Inicio
  tiene alta prioridad, las inferiores son diferidas. Dimensiones y pesos
  actualizados en el inventario de la nota de sesion. Producto en WebP
  lossless desde originales, sin redimensionar ni aplicar filtros al panel;
  revision visual final aprobada por David el 2026-10-28.
* Sin navegador en el cierre ni mediciones de rendimiento de carga.

## Cuentas (2026-10-27)

* Cuentas reutiliza ListHeader con menu movil en contenido y omite la barra
  superior. Una tarjeta de ancho completo combina saldo global, reparto por
  tipo, periodo y flujos globales. El acceso a Todas las cuentas es un boton
  secundario junto a Tus cuentas, separado del selector de periodo.
* Correccion visual de David: PeriodPicker usa layout toolbar solo en Cuentas.
  Etiqueta, selector compacto y rango auxiliar comparten fila cuando caben;
  Personalizado agrega Desde y Hasta en una rejilla horizontal adaptable;
  desde lg el grupo ocupa la mitad derecha y se apila si falta espacio.
  Los demas usos de PeriodPicker y SelectField conservan su layout habitual.
  El reparto por tipo usa warning-bg/ink para Efectivo, info-bg/ink para
  Bancos y violet-bg/ink para Digital. Violet es un token nuevo con contraste
  comprobado; los iconos siguen el type real.
* El resumen usa cuatro grupos informativos iguales: Todas las cuentas,
  Efectivo, Bancos y Digital. Cada uno tiene icono de 24 px en fondo tenue de
  48 px, etiqueta small semibold e importe summary de 20 px. El total usa
  acento neutral y Layers; los tipos conservan warning, info y violet.
  Los cuatro grupos tienen solo etiqueta e importe junto al icono, sin
  ayuda adicional bajo el total.
  La rejilla pasa de una a dos y cuatro columnas segun el espacio. El
  importe completo puede ocupar otra linea sin separar simbolo y cifra.
* AccountTile dentro de AccountsPage muestra las cuentas individuales en
  rejilla de una, dos o tres columnas. Icono de 48 px a la izquierda, nombre,
  importe y tipo; lapiz independiente. El acento prioriza color persistido.
  Solo con null usa el fallback estable por id: info, warning-ink o neutral-600.
  Son identificadores de cuenta, sin significado financiero.
  Icono, fondo, borde superior y punto comparten ese acento. El contorno de
  2 px tiene ancho fijo en todos los estados: al seleccionar, lados y base
  toman el acento sin superponer un anillo al borde superior. La seleccion
  conserva fondo tenue, marca, texto y foco independiente. En Todas las
  cuentas, cada tarjeta usa su propio acento y muestra Incluida en Todas las
  cuentas; `aria-pressed` sigue reservado a la cuenta individual elegida.
* AccountColorField en Nueva/Editar ofrece Azul, Ambar, Gris y Violeta, mas
  selector nativo Otro color. El fieldset tiene leyenda Color de la cuenta;
  botones con nombre, marca y aria-pressed; el codigo elegido tambien es texto.
  controls.test registra esta paleta como excepcion puntual al segmentado unico.
  El control nativo y los botones comparten el valor y foco visible independiente.
  Se admiten colores libres como dato persistido, no como nuevos tokens.
* Fondo seleccionado e icono mezclan 8% del color con surface; el trazo del
  icono mezcla 35% con text para mantener contraste incluso con blanco. Nombre,
  importe y seleccion usan text, ayuda text-muted. Bordes por lado evitan
  conflictos de propiedades al cambiar seleccion y no superponen anillos.
  David aprobo visualmente la nueva integracion el 2026-10-27, sin navegador del agente.
* Los importes envuelven si es necesario y conservan juntos simbolo y primer
  digito. PeriodPicker es compacto en periodos fijos y amplio en Personalizado.
  Los flujos globales mantienen acentos semanticos y etiquetas explicitas.
* MovementChart usa SVG sin animacion y tres etiquetas de eje como maximo.
  Se agrupa por dia, semana o mes segun longitud del rango, con unidad visible.
  Un detalle nativo accesible por teclado lista importes completos por grupo;
  DataTable y tarjetas moviles conservan movimientos y paginacion.
  Los tres modales usan DiscardableModal y campos comunes.
* Revision visual de Cuentas aprobada por David. Estas reglas no verifican anchos reales.

## Ventas (2026-10-26)

* Las rutas /ventas muestran un solo encabezado en contenido. ListHeader admite
  leading para el boton movil del shell; nueva venta y detalle tienen regreso
  dentro del contenido. Compras adopta el mismo patron en esta tarea.
* IndicatorCard compact se reutiliza en Facturas de venta, Clientes y Otros
  ingresos: icono de 48 px a la izquierda, titulo, cifra y ayuda alineados a la
  izquierda, cifra text-kpi tabular y altura segun contenido. Inicio conserva la
  variante estandar. Las rejillas pasan de una a dos y luego tres columnas antes
  de comprimir importes.
* FilterBar sales usa cuatro controles sin columna vacia cuando Limpiar no aparece.
  Con periodo personalizado, PeriodPicker ocupa una fila amplia en 2xl para que
  Desde y Hasta compartan linea cuando hay espacio. FilterBar embedded comparte
  borde y divisor con el listado de Ventas, Clientes, Papelera y Otros ingresos.
  Compras reutiliza la superficie integrada y el layout sales de FilterBar
  para sus cuatro filtros, con los periodos predefinidos existentes.
* Revision visual aprobada por David; no hay comprobacion de anchos en navegador del agente.

## Compras (2026-10-26)

* Todas las rutas /compras omiten la barra superior. El menu movil se integra
  en ListHeader o junto al regreso al listado en los formularios y detalles.
  SkipLink, main y titulos de pestana siguen en AppShell.
* Facturas de compra, Proveedores y Gastos reutilizan IndicatorCard compact
  con icono a la izquierda y texto alineado. Rejillas de una, dos o tres
  columnas dejan espacio para importes largos. Inicio y Ventas no cambian.
* FilterBar embedded integra filtros y DataTable o tarjetas en Facturas de
  compra, Papelera, Proveedores y Gastos. Los periodos y filtros URL mantienen
  su contrato; no se agregan fechas personalizadas a Facturas de compra.
* Nueva compra conserva la rejilla de lineas desde xl y situa el resumen
  lateral solo desde 2xl. El detalle apila el resumen antes de xl. Las cifras
  grandes pueden envolver sin separar el simbolo del primer digito.
* Revision visual aprobada por David; no hay comprobacion de anchos en navegador del agente.

## Inventario (2026-10-26)

* Correccion visual de David: Productos conserva ListHeader pero no monta barra superior;
  el boton movil del shell va en su encabezado, sin hueco reservado. Categorias y
  formularios conservan breadcrumb. El titulo de pestana sigue viniendo del shell.
* Categoria deja TabList y pasa a SelectField dentro de FilterBar, junto a Buscar.
  La opcion inicial es Todas las categorias; las demas son ids reales ordenados por
  nombre. El parametro `categoria` en URL y su comportamiento no cambian. TabList
  compartido permanece para Configuracion y otras pantallas.
* Cuatro IndicatorCard usan info, success, warning y brand-strong, con iconos de
  producto, disponibilidad, alerta y bodega. La variante compact nace en Productos
  tiene dos columnas: iconLg en fondo tenue de 48 px, centrado verticalmente;
  titulo, cifra y ayuda alineados a la izquierda en el bloque derecho. Usa relleno
  de 16 px y text-kpi de 32/36 con numeros tabulares. La rejilla ocupa el ancho del
  contenedor: una columna en movil, dos desde sm y cuatro desde 2xl. En una fila,
  los tres conteos tienen ancho igual y el valor monetario recibe 1,35 veces ese
  ancho. La altura sale del contenido y es igual dentro de cada fila. Inicio
  conserva su composicion y text-figure.
  El simbolo monetario se une al primer digito; la envoltura de cifras es compartida.
* FilterBar admite embedded solo en Productos: filtros y listado quedan en una
  superficie con divisor; inventory distribuye cuatro filtros en dos columnas hasta
  2xl y en una fila cuando cabe. Los otros listados conservan su disposicion. Los
  selectores de categoria y stock tienen ancho maximo de 240 px; orden, 288 px.
  DataTable conserva
  contorno, encabezado y columnas por prioridad. Las tarjetas moviles muestran
  costo, precio y accion Editar.
* Categorias mantiene DataTable y modal compartidos; nombres extensos pueden envolver.
  El modal apila umbrales para que rotulos y ayudas tengan espacio. En alta y edicion,
  codigo y categoria comparten fila desde sm, descripcion ocupa el ancho disponible,
  costo y stock se acotan, y PricePanel queda junto al formulario desde lg y debajo
  en movil. El panel usa un borde superior tenue para distinguir los importes calculados.
* Revision visual pendiente de David. Estas reglas CSS no demuestran ausencia de
  desbordes en un navegador.

## Marca provisional y superficies del rediseno (2026-10-26)

* Correccion de Inicio solicitada por David: sin barra superior ni breadcrumb redundante;
  conserva h1, titulo de pestana y el boton movil del shell dentro del encabezado de Inicio.
  PeriodPicker admite layout inline y action, usados solo en Inicio: etiqueta visible,
  accion alineada al control (24 px de etiqueta y separacion), ayuda debajo. Desde 720 px
  reales del contenedor, selector, fechas y accion comparten fila; por debajo, las fechas
  pasan juntas a una segunda fila. Desde/Hasta usan columnas de minimo 144 px y separacion
  de 16: dos cuando caben (304 px), una en contenedores menores. Default stacked conserva
  la disposicion previa de las demas pantallas.
  Los periodos predefinidos de Inicio usan grupo de ancho natural a la derecha; solo
  Personalizado activa crecimiento y contencion inline. Selector inline de 192 px como
  maximo disponible; el rango envuelve debajo sin ensanchar el selector ni mover la accion.
* IndicatorCard agrega acento brand-strong: solo cambia el color del borde superior de
  border-accent a brand, manteniendo 2 px y la geometria. Inicio lo usa solo en Utilidad
  neta; valores positivos y negativos mantienen sus colores semanticos. Tablas intactas.
  Cuentas de Inicio: Landmark para BANCO, Wallet para EFECTIVO y Smartphone para DIGITAL,
  iconMd sobre canvas, decorativos y elegidos por tipo real, sin logos comerciales.

* Inicio: PeriodPicker existente junto a Registrar venta, una sola accion primaria.
  Cuatro IndicatorCard con acentos aprobados (neta reforzada con brand-strong), una columna, dos desde sm y cuatro desde
  2xl. Simbolo monetario y cifra unidos por espacio inseparable.
  Solo en Inicio, la variante dense reduce el relleno vertical a 16 px y
  mantiene el horizontal de 24 px; Utilidad bruta muestra importe y
  explicacion sin porcentaje auxiliar. Los otros indicadores conservan
  sus ayudas y los KPI de otras pantallas no usan esta variante.
  Stock y saldos en proporcion 3:2 desde xl, apilados por debajo; ventas debajo. Aclaracion
  comun de estado actual para stock y saldos. Total disponible sobre canvas con radio
  control; encabezados, enlaces, bordes y separadores reutilizan componentes y tokens.
  No cambian logo, sidebar ni usuario. Revision visual aprobada por David tras las
  correcciones de encabezado, periodo, iconos, acento y ancho compacto del selector.

* Referencia provisional: logo-reference.png, sin recurso oficial disponible. BrandSymbol
  usa src/brand/symbol.svg, S blanca inclinada dentro de un cuadrado rojo redondeado.
  Wordmark agrega ServiBox inclinado con Montserrat existente: Servi carbon sobre claro o
  blanco sobre oscuro y Box rojo. Proporciones conservadas, sin imagen raster ni fuentes
  descargadas. El compacto usa el mismo SVG, con nombre accesible ServiBox.
* Favicon: index.html declara ese mismo SVG con type image/svg+xml y sizes any. Vite
  procesa el recurso para produccion; no hay manifest, apple-touch-icon ni PWA nuevos.
  La legibilidad en pestana a 16 y 32 px queda para David.
  Correccion posterior: la S usa un contorno de Montserrat 700 existente, convertido a
  coordenadas vectoriales con inclinacion incorporada y centro en 32/32 dentro del viewBox
  de 64. No depende de fuentes al renderizar, ni usa skew externo, recortes o una variante
  distinta para favicon. Detalles de huella de llanta pendientes de propuesta grafica
  aprobada, sin implementar por falta de referencia.
* Sidebar carbon nav, hover nav-hover y seleccion nav-active (#522b30), texto blanco,
  borde lateral brand e icono brand. El acento diferencia la ruta activa sin depender solo
  del fondo; aria-current se conserva. Configuracion va abajo en Administracion; el unico
  UserMenu va debajo con identidad y rol reales. Nunca se presupone Administrador.
* Pie sin superposicion sobre enlaces: navegacion operativa desplazable, pie fuera de ese
  scroll. Panel del usuario hacia arriba con altura limitada al viewport y scroll propio;
  el compacto conserva acceso a Cerrar sesion. La revision de poco alto y cortes es manual.
* Se conservan 240/72 px, compacto por defecto entre 1024 y 1279, expandido desde 1280 y
  eleccion recordada con try/catch. Movil conserva inert, trampa de foco y Escape.
  Contraer/expandir vive en la cabecera: junto al logo expandido, en una fila propia debajo
  del simbolo compacto; area de 44, nombre accesible, title, foco visible y aria-expanded.
  No se duplica en el pie ni se agrega un control de ancho en movil.
* Superficies: blanco surface sobre canvas, radio surface, borde border. DataTable agrega
  contorno y borde superior de 2 px border-accent (#f4ccc8), encabezado canvas y separadores
  border. Estados vacio y error conservan sus mensajes; no se agregan estados ficticios.
* IndicatorCard: borde superior de 2 px, acentos brand (border-accent), success, warning o
  info; icono opcional sobre fondo tenue con tinta de contraste. Inicio usa ventas success,
  costo warning, bruta info y neta brand. Son contextos, no una clasificacion del resultado:
  el signo y el texto no cambian y una perdida sigue en error aunque el borde sea otro.
* Sin degradados, glassmorphism, brillos, sombras en tarjetas, iconos repetidos sin utilidad
  ni movimiento ornamental. No se agregan controles, metricas ni textos para llenar espacio.
  Se conservan tipografia, espaciado, radios, alturas y una accion primaria por contexto.
* Revision visual manual de David antes del cierre, ver 02-CONVENTIONS. Ningun resultado
  automatico equivale a aprobacion visual ni garantiza ausencia de desbordes.

Alcance: toda la app, tambien la landing, el login, el registro y `/terminos` desde el
2026-10-25. Los tokens de legado (`--text-display` 48, `--text-h1` a `--text-h3`,
`--radius-tag`, `--radius-card`, `--radius-container`, `--shadow-card`, `--shadow-menu`,
`--shadow-modal`) se eliminaron de `tokens.css` y la guarda ya no excluye ninguna pagina.

## Tipografia: tres tamanos de contenido y los de componente

| Clase | Tamano | Interlineado | Peso | Uso |
|-|-|-|-|-|
| `text-title` | 24 px | 32 px | 600 | Solo el titulo de pantalla (`h1`) y el nombre de la marca (Wordmark) |
| `text-body` | 15 px | 1.6 (24 px) | 400 | Cuerpo, celdas de tabla, campos, textos de modal |
| `text-section` | 15 px | 1.6 (24 px) | 600 | Titulos de seccion y de modal (`h2`, `h3`). Es body con peso 600: no es un tamano nuevo |
| `text-small` | 13 px | 1.5 | 400 | Ayudas, subtitulos, pies, metadatos, badges, migas, menu lateral |
| `text-label` | 12 px | 16 px | 600 | Rotulos de campo, leyendas de grupo, encabezados de columna (estos en mayusculas) |
| `text-button` | 14 px | 1 | 600 | Botones, paginacion, segmentos y chips que actuan como boton |
| `text-summary` | 20 px | 24 px | 600 | Cifras de los cuatro grupos del resumen superior de Cuentas |
| `text-figure` | 24/28 bajo md, 28/32 desde md | | 600 | Componente: valor de indicadores y totales destacados (total de factura, saldo pendiente, saldos y totales de Cuentas, total disponible). Inter con numeros tabulares (rol monto) |
| `text-kpi` | 32/36 con tokens display de tamano y figure de peso | | 600 | Solo cifra de la variante compact de IndicatorCard en Productos; Inter con numeros tabulares |
| `text-display` | 32/36 bajo md, 40/44 desde md | | 700 | Componente con excepcion unica: solo el titular (`h1`) de la landing. Montserrat |

* El peso va en el token (`--text-*--font-weight`): no hace falta `font-semibold` con estas
  clases. Solo hay dos pesos en la app: 400 y 600 (`font-semibold` para rotulos y enfasis).
  `font-medium`, `font-[500]` y `font-weight: 500` estan prohibidos (regla `weight` de la
  guarda).
* body, small y button son los del manual v1.0. title (24/32/600) es el titulo de pantalla; el
  manual tenia H1 32, H2 24, H3 18. Desde el 2026-10-25 title sube de 20 a 24 y los titulos de
  seccion y de modal bajan a `text-section`: title 20 en todo aplanaba la jerarquia. label pasa
  de 11 px con tracking a 12/16 sin tracking para servir de rotulo de campo (2026-10-24).
* `text-figure` es una utilidad de `index.css` con los tokens `--figure-*` de `tokens.css`;
  no cuenta como tamano de contenido. Tres tamanos de contenido por pantalla: title 24, body 15
  (con section) y small 13.
* La guarda solo deja `text-title` en un `h1` (y en Wordmark), `text-section` en un
  `h2` o `h3`, `text-figure` en la lista `FIGURE_FILES` y `text-display` en el `h1` de
  `LandingPage.tsx` (`DISPLAY_FILES`, mas su definicion en `index.css`).
* **Excepcion documentada de la landing:** `text-display` (tokens `--display-*`, utilidad en
  `index.css`) solo en su `h1`, y sus titulos de seccion (`h2`) en `text-title`
  (`TITLE_H2_FILES`). No cuenta como tamano de contenido: la landing usa title 24, body 15 (con
  section) y small 13 mas display y button.
* **Desvio del manual v1.0:** el manual define label en 11 px con tracking 0,06em; aqui es
  12/16/600 sin tracking. Pendiente de validar con el disenador.
* Una pantalla usa como maximo title, body (y section) y small mas label, button y figure. Prohibidos
  `text-xs`, `text-sm`, `text-base`, `text-lg` y mayores, `text-[...]` y los de legado.
* Titulos en Montserrat (estilo base de `h1`, `h2`, `h3`); el resto en Inter.

## Roles de fuente

| Clase | Definicion | Uso |
|-|-|-|
| `monto` | Inter con `font-variant-numeric: tabular-nums` | Todo valor en dinero: celdas (a la derecha, `align: 'right'`), tarjetas moviles, resumenes, cifras de indicadores, campos de solo lectura (`TextField valueRole="monto"`) y campos de precio |
| `codigo` | IBM Plex Mono con `white-space: nowrap` | Numero de factura (tambien en el titulo del detalle), codigo de producto y NIT o documento (`TextField valueRole="codigo"`). No se parte en dos lineas: la columna toma el ancho del codigo y el texto vecino es el que envuelve |

* IBM Plex Mono solo con `codigo`; `font-mono` esta prohibido. Origen en Cuentas
  (`VENTA FV-0003`) no es un codigo: va en Inter.
* Otros numeros (cantidades, fechas, paginacion) pueden usar `tabular`; `table` ya lo aplica.

## Sombras: solo lo que flota

| Token | Valor | Uso |
|-|-|-|
| `--shadow-raised` | `0 4px 12px rgb(0 0 0 / 10%)` | Menus desplegables (combobox, menu de usuario), toasts, tooltips, barra fija del formulario de producto, enlace "Saltar al contenido" (shell y landing) |
| `--shadow-overlay` | `0 16px 40px rgb(0 0 0 / 16%)` | Modales y menu movil abierto (`lg:shadow-none` en escritorio) |

Tarjetas, tablas, paneles, tarjetas de indicador y estados no llevan sombra: se separan con
`border border-border`. La guarda tiene la lista explicita de archivos que pueden usar cada
sombra (`FLOATING_SHADOWS`). Los anillos de seleccion (`ring-*`) no son sombra.

## Espaciado: rejilla de 4 px

* `--spacing: 4px`: `p-1` 4, `p-2` 8, `p-3` 12, `p-4` 16, `p-5` 20, `p-6` 24...
* Prohibidos los medios pasos (`*-0.5`, `*-1.5`, `*-2.5`, `*-3.5`) y los px arbitrarios que no
  sean multiplo de 4 (`w-[110px]`). Excepciones: bordes de 1 px, anillos y desplazamientos de
  foco (`outline-offset-2`), `-mb-px` de las pestanas de `TabList` (solapa el borde) y
  `mt-px` del icono de `Alert` (lo centra con la primera linea). Estan en `ONE_PX_OFFSETS`.

## Radios

| Token | Valor | Uso |
|-|-|-|
| `--radius-control` | 8 px | Campos, botones, selectores, menus, bloques internos, skeleton, contorno de foco de enlaces |
| `--radius-surface` | 12 px | Tarjetas (tambien las moviles), tablas, modales, alertas, toasts |
| `--radius-pill` | 999 px | Badges, chips, avatares, control segmentado y sus segmentos |

`rounded-none` se permite para anular un radio (lineas de factura en `xl`).

## Iconos

| Token | Constante | Valor | Uso |
|-|-|-|-|
| `--icon-sm` | `iconSm` | 16 px | En linea con texto y dentro de botones y campos |
| `--icon-md` | `iconMd` | 20 px | Menu lateral, cerrar modal, acciones de fila |
| `--icon-lg` | `iconLg` | 24 px | Estados vacio y de error, encabezados de "no encontrado" |

Un solo trazo, `ICON_STROKE` 1.5. Uso: `<X {...iconSm} aria-hidden />`. La guarda prohibe
`size={n}` y `strokeWidth={n}` en los `.tsx`.

## Movimiento

| Token | Valor | Uso |
|-|-|-|
| `--duration-fast` | 120 ms | Hover y foco (`duration-(--duration-fast)`); duracion por defecto de toda transicion |
| `--duration-base` | 200 ms | Menu movil, barra lateral, entrada del toast |
| `--duration-slow` | 320 ms | Modales (sin animacion hoy) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Curva por defecto de toda transicion y del toast |

`--default-transition-duration` y `--default-transition-timing-function` apuntan a fast y a
ease-standard, asi que `transition-*` ya los usa. Prohibidos `duration-<n>`, `duration-[...]` y
`ease-in`/`ease-out`/`ease-in-out`/`ease-linear`. `index.css` anula animaciones y
transiciones con `prefers-reduced-motion`. Sin rebotes ni parallax.

Sidebar agrupado (2026-10-30): Ingresos usa TrendingUp y Egresos TrendingDown,
distintos de Facturas de venta (ShoppingCart) y de compra (Truck). Otros ingresos
usa CirclePlus; Clientes, Users; Gastos operativos, Receipt; Proveedores, Truck.
Padres e hijos usan iconMd, trazo 1.5, iconos decorativos con aria-hidden, mismo
espaciado icono/texto y colores de estado existentes, sin color propio por opcion.

Los submenus animan su altura natural con rejilla de 0fr a 1fr y viceversa,
sin alturas maximas, timers ni desmontaje al cerrar. El indicador gira suavemente;
ambos usan duration-base y ease-standard, con transition-none en movimiento reducido.
El estado inicial refleja la ruta activa sin una fase oculta de entrada.
El cierre aplica inmediatamente inert, aria-hidden y tabIndex negativo a los hijos;
la lista sigue montada solo para completar el movimiento visual, con espacio interior
para el anillo de foco junto al recorte. El foco vuelve
al padre o al control de ancho antes de perder acceso; la trampa movil excluye inert.
David aprobo visualmente sidebar, iconos y animaciones el 2026-10-30.
La revision manual Docker sigue aplazada y obligatoria antes de publicar.

## Alturas de control y areas tactiles

| Token | Valor | Uso |
|-|-|-|
| `--control-height` (`h-control`) | 40 px | Botones y campos desde lg |
| `--control-height-touch` (`h-control-touch`) | 44 px | Botones y campos bajo lg |
| `--hit-min` (`size-touch`, `min-h-touch`) | 44 px | Area tactil minima de todo control bajo lg |
| `--hit-row` (`size-hit-row`) | 36 px | Acciones de fila con icono (y `IconButton`) desde lg |

* Bajo 1024 px (lg) todo control interactivo mide al menos 44 x 44 de area tactil; desde lg
  botones y campos miden 40 y las acciones de fila con icono 36. Separacion minima de 8 px
  entre objetivos adyacentes bajo lg (`gap-2 lg:gap-1` en acciones de fila, menu lateral y
  paginacion).
* `buttonClasses` y los campos (`TextField`, `SelectField`, `SearchField`, `ComboboxField` y
  los campos de linea de factura) usan `h-control-touch lg:h-control`.
* `IconButton` (`components/IconButton.tsx`, y `IconLink` para enlaces): boton de solo icono
  con `aria-label` obligatorio en el tipo, `size-touch lg:size-hit-row`, icono de 16 o 20.
  Lo usan cerrar del modal, editar y eliminar de fila, nueva factura del tercero y quitar
  linea. Paginacion: `size-touch lg:size-control`.
* Cuando el aspecto debe ser menor que el area (enlaces de texto: Ver detalle, Editar, Ver
  todas, Nuevo cliente), la utilidad `hit-area` agrega un `::after` centrado de al menos 44
  (36 desde lg) sin cambiar el aspecto. No sirve dentro de `overflow: hidden` (migas: llevan
  `leading-11` y `px-1` bajo lg).
* Casillas y radios: el rotulo es parte del area de clic y mide 44 (`min-h-touch`).

## SegmentedControl y TabList

`components/SegmentedControl.tsx`, unica implementacion de elegir una opcion entre pocas:

* `SegmentedControl`: `role="radiogroup"` con botones `role="radio"` y `aria-checked`;
  opciones en pildora (`rounded-pill`), seleccionada en `dark`, 44 bajo lg y 40 desde lg;
  envuelve (`flex-wrap`) o recibe la disposicion por `className` (`grid grid-cols-2`).
* `TabList`: `role="tablist"` con `role="tab"`, `aria-selected` y `aria-controls` opcional;
  subrayado `brand`; desplazamiento horizontal si no cabe.
* Los dos: flechas (con vuelta), Inicio y Fin mueven el foco y eligen (activacion
  automatica); un solo elemento en el orden de tabulacion (roving tabindex).
* Excepciones con comportamiento propio (no son segmentados de texto): tarjetas de cuenta con
  su saldo (`aria-pressed`), muestras de color de categoria y tarjetas de tipo de reporte con
  descripcion (radios nativos). Las lista `controls.test.tsx`.

## Foco

* Un solo anillo: `--focus-ring` (2 px solido `brand`) con `--focus-ring-offset` 2 px.
  Utilidades en `index.css`: `focus-ring` (`:focus-visible`, botones, enlaces, segmentados,
  items de menu, summary), `focus-ring-field` (`:focus`, campos) y `focus-ring-within`
  (rotulo que envuelve un control oculto). Prohibido quitar el outline sin reemplazo.
* Campos: al enfocarse muestran el anillo y conservan el borde `border-control` (o `error`);
  ya no hay `ring-brand/20`.
* Contraste del anillo (3 a 1, `tokens.test.ts`): brand sobre surface 3,55, canvas 3,19, nav
  4,14, row-alt 3,42 y neutral-100 3,39. Sobre los fondos -bg de `Alert` brand no llega (info
  2,91, error 2,90): ahi `--focus-ring-on-tint` usa brand-ink (4,27 a 4,75). Sin cambio de
  colores.
* "Saltar al contenido" es `components/SkipLink.tsx`, el mismo en la landing y en el shell:
  relleno 8/16 al enfocarse, `rounded-control`, `shadow-raised`, y foco real en
  `main#contenido`.

## Boton de texto

La variante `text` tiene la misma altura y el mismo relleno (`px-button-x`) que las demas,
sin fondo ni borde; las pantallas no le ponen `px-2` ni `h-auto`. Hover `neutral-100`, foco
`focus-ring`, deshabilitado igual que las demas.

## Listados

Componentes compartidos de `src/components` que usan todos los listados (Facturas de venta y
de compra, Papeleras, Gastos e Ingresos, Cuentas, Clientes, Proveedores, Productos y
Categorias):

* `ListHeader`: `h1`, subtitulo, una sola accion primaria y las secundarias en un grupo.
  Desde 2 secundarias, bajo lg van en el menu "Mas" (boton secundario con `aria-expanded`,
  patron disclosure de UserMenu: Esc cierra y devuelve el foco, clic fuera y cambio de ruta
  cierran); desde lg en linea. Sin `matchMedia` (pruebas) se comporta como escritorio.
  `note` lleva el texto de ayuda bajo las acciones (Cuentas).
* `FilterBar`: busqueda, filtros y `PeriodPicker` en una rejilla (una columna, dos desde sm y
  una fila desde lg); "Limpiar filtros" solo con filtros activos (distintos del estado que
  deja limpiar).
* `PeriodPicker`: selector nativo con los periodos que pasa cada pantalla (Hoy, Esta semana,
  Este mes, Mes anterior, Ultimos 30 dias, Este ano, Todas, Personalizado), el rango como
  ayuda en `small` ("1 oct. 2026 al 24 oct. 2026") y, con Personalizado, Desde y Hasta con sus
  errores. El rango se calcula en `lib/period.ts` con `businessToday()` (zona del negocio).
  Unico selector de periodo de la app.
* `CellLink` y `CellButton`: un solo estilo de enlace o accion de celda (`text-small`,
  600, `brand-ink`, subrayado al hover y al foco, `hit-area`).
* `PendingBalance`: saldo pendiente de una factura (`pendingBalance` del backend) en rol
  monto: `—` si esta anulada, `$ 0` en `text-muted` si no debe nada y el saldo en `text`.
* Facturas: columnas en el orden N.o factura, Fecha, Tercero, Vence, Forma de pago, Estado,
  Total, Saldo pendiente y acciones. Encabezados en rol label (los pone `DataTable`), dinero
  en rol monto a la derecha y sin partir, estados con `StatusBadge`.
* `TabList` con `fill`: las pestanas se reparten el ancho y la etiqueta pasa a
  dos lineas. Sin `fill`, las pestanas se desplazan horizontalmente y la seleccionada
  se lleva a la vista (`scrollIntoView`). Productos usa SelectField desde esta correccion.
* Tablas por prioridad (misma tecnica que las facturas: `useElementWidth` sobre el recuadro y
  `DataTable dense` en compacto). Bajo el ancho completo, las columnas de menor prioridad pasan
  a una segunda linea en `small` y `text-muted` bajo la celda principal:

  | Tabla | Ancho completo | En compacto |
  |-|-|-|
  | Productos | 940 | categoria y costo bajo la descripcion |
  | Categorias | 840 | impuestos bajo el nombre |
  | Papeleras de venta y compra | 820 | fecha y forma de pago bajo el tercero |
  | Clientes y Proveedores | 820 | correo y celular bajo el nombre |
  | Movimientos de Cuentas | 800 | origen bajo el concepto |
  | Gastos y Otros ingresos | 760 | observaciones bajo el concepto |

  Criterio: 0 px de desplazamiento a 1024 con la barra contraida (recuadro 854) y con la barra
  expandida (686), y a 1280 (942).
* Barra lateral: contraida por defecto de 1024 a 1279 px (72 px, iconos con `title`) y
  expandida desde 1280; la eleccion del usuario se recuerda.

## Formularios, modales y avisos

* Tabla de facturas por ancho del recuadro (`useElementWidth`, ResizeObserver; no por el
  ancho de la ventana): desde 1120 px de recuadro todas las columnas; desde 820 Vence y Forma
  de pago pasan a una segunda linea en `small` bajo el tercero; por debajo tambien la Fecha y
  las celdas pasan a relleno de 8 (`DataTable dense`). Numero, tercero, estado, total, saldo
  pendiente y acciones siempre se ven. Columnas en `components/invoiceColumns.tsx`.
* Panel de margen del producto (`inventory/PricePanel.tsx`): "Como se calcula el precio" con
  Costo de compra, IVA del costo, Margen de la categoria y Precio sugerido sin IVA en
  `text-figure`; borde sin sombra; a la derecha y `sticky` desde lg, debajo por debajo. Sin
  datos muestra "—" y la nota para completarlos.
* Confirmacion de descartar (`DiscardChangesModal`): titulo "¿Descartar los cambios?",
  "Seguir editando" primario y con el foco (Esc tambien sigue editando) y "Descartar"
  secundario. La usan `DiscardableModal`, `UnsavedChangesGuard`, Categorias y Configuracion.
  El modal se cierra tambien con clic fuera.
* Toast: abajo a la derecha, maximo 3 (se retira el mas antiguo), boton "Cerrar aviso"
  (`IconButton`). Exito: `role="status"`, se cierra a los 5 s; error: `role="alert"`, queda.
  El temporizador se pausa con el cursor encima o el foco dentro y retoma lo que le quedaba.
  Los errores de red, 5xx, 403 y 404 van aqui (regla en [06-COPY.md](06-COPY.md)); el WhatsApp
  del texto de red es un enlace.
* Errores de formulario: bajo cada campo con `aria-invalid` y `aria-describedby`; tras enviar,
  `ErrorSummary` (oculto, `role="alert"`) dice cuantos campos revisar.

## Guarda

`src/styles/designSystem.test.ts`:

* Por cada archivo de la app, `violations()` debe devolver `[]`. Quita comentarios antes de
  buscar.
* Prueba negativa con una cadena de ejemplo (sin tocar archivos) que debe reportar cada regla,
  y una positiva con lo permitido.
* Comprueba el valor de cada token nuevo, que las constantes de icono coincidan con los tokens
  y que `monto` y `codigo` existan en `index.css`.

`src/styles/surfaces.test.tsx` comprueba que tabla, indicador y estado vacio no llevan sombra
y que modal y toast si.

## Desvios pendientes

Pendientes de decidir o validar con el disenador (detalle en
[sessions/2026-10-24-design-system-base.md](sessions/2026-10-24-design-system-base.md)):

1. **Resuelto el 2026-10-25:** las cifras destacadas usan `text-figure` (24 a 28 px) y la
   jerarquia de titulos se corrige con title 24 en el `h1` y `text-section` en secciones y
   modales.
2. `IndicatorCard` aplica `text-figure` (numeros tabulares) tambien a conteos (productos,
   clientes, movimientos).
3. Wordmark usa `text-title` con `font-bold italic` como marca provisional; el simbolo es
   SVG compartido. Pendiente de sustituir por los recursos oficiales cuando existan.
4. **Resuelto el 2026-10-25:** los enlaces de celda usan `CellLink` (rol small, 600).
5. **Actualizado el 2026-10-28:** Configuracion ya no usa pestanas; Productos
   usa SelectField de categoria. Menu lateral y badges siguen en `small`.
6. **Resuelto el 2026-10-25:** sin `font-medium`; los 55 usos pasaron a 600.
7. **Resuelto el 2026-10-25:** tokens de legado eliminados; landing, login y registro usan la
   escala (excepcion `text-display` en el `h1` de la landing).

Ademas: label 12/16/600 sin tracking es un desvio del manual (11 px con tracking 0,06em).
