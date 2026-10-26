# 2026-10-26: Acabado de Inventario

Estado: revision tecnica y visual aprobadas por David, incluida la ayuda En el catalogo.
El agente no abrio ni automatizo navegadores, no tomo capturas ni verifico desbordes.

## Cierre autorizado

Rama feat/34-inventory-refresh confirmada y remoto origin en
Davidaguilar03/servibox-frontend. GitHub CLI autenticado fuera del sandbox y sin PR
existente para esta rama. Suite completa npm test: 1326 = 1321 base + 5 nuevas,
64 archivos, cero fallos, bajas u omisiones. npm run build, npm run lint y
git diff con comprobacion de espacios: salida 0. Solo archivos de esta tarea;
AGENTS.md intacto y backend sin cambios de codigo de este trabajo. El backend
conserva dos modificaciones ajenas en .idea que no se incluyen. No hay servidores
propios activos ni se detuvieron procesos ajenos. David aprobo el resultado visual
manualmente; el agente no hizo recorridos de navegador ni auditoria de desbordes.

## Ayuda de Total de productos

Se agrego "En el catalogo" como ayuda bajo la cifra del primer IndicatorCard,
con el mismo estilo y eje de las otras ayudas. Sin cambios en datos ni diseno.
Prueba existente de ProductsPage: 15 correctas, cero nuevas o ajustadas.
npm run lint: salida 0. Revision visual pendiente de David.

## Referencia aprobada para los KPI de Productos

David aprobo como referencia local
C:/Users/PC/.codex/generated_images/01a17450-985c-7f83-b7f1-d9073cccb0a7/exec-b8db0a51-6939-4cfe-b594-a5669abb009b.png.
Se inspecciono antes de editar. Solo se adopto la composicion de los cuatro KPI:
icono a la izquierda y centrado verticalmente; titulo, cifra y ayuda alineados a
la izquierda en el bloque derecho. Los tres conteos ocupan columnas iguales y
Valor en inventario recibe 1,35 veces ese ancho desde 2xl. En menor espacio,
dos o una columna. Sin ancho natural independiente ni altura fija; la rejilla
iguala la altura por fila. Se conservan textos, cifras, acentos, carga y error.
Esta seccion reemplaza el centrado y los anchos naturales de la siguiente.
No se copiaron otras zonas de la imagen.

Verificacion de esta correccion: 279 pruebas afectadas correctas en cuatro
archivos (Productos, Inicio, diseno y contraste), cero nuevas, ajustadas o bajas;
npm run build, npm run lint y git diff con comprobacion de espacios: salida 0.
Ultima suite completa comprobada: 1325; hay 1326 pruebas en el arbol por la
nueva prueba de importes de la correccion anterior, sin repetir la suite completa.
David debe comprobar la implementacion contra la imagen aprobada;
el agente no abrio navegador ni midio el resultado visual.

## Ajuste posterior de los cuatro KPI de Productos

Solo los KPI de Productos cambian: IndicatorCard compact usa iconLg en caja de 48 px
a la izquierda, centrado verticalmente con el bloque derecho. Titulo, cifra de
32/36 y ayuda se centran dentro de ese bloque. count y money comparten estructura;
money tiene minimo mas amplio y el ancho natural crece con el importe. Las tarjetas
se envuelven en mas filas cuando falta espacio y ocupan una fila cada una en movil.
Se mantienen acentos, radios, textos, carga, error y reintento. Inicio usa la variante
anterior. No cambian consultas, formulas, conteos, stock cero ni formato monetario.

Pruebas afectadas: 279 correctas en ProductsPage, DashboardPage, guarda de diseno y
contraste. Una nueva de Productos compara valor completo con centavos y conteos:
para 9 unidades a costo 12.345.678,91, esperado y obtenido $ 111.111.110,19;
total y en stock, esperado y obtenido 1. Ninguna prueba ajustada o eliminada.
Build, lint y diff: salida 0, sin errores. Ultima suite completa comprobada: 1325;
con la nueva prueba hay 1326 en el arbol, sin repetir la suite completa en esta
correccion puntual. Revision visual de David pendiente; no se midieron
anchos ni se verificaron importes en un navegador. Backend y Vite ajenos intactos.

## Correccion posterior solicitada por David

* Productos omite la barra superior, sin reservar su altura. El mismo boton movil del
  shell va junto al titulo; conserva foco, inert, Escape y SkipLink. El titulo de
  pestana sigue en el shell. Categorias y formularios mantienen sus breadcrumbs.
* Los cuatro KPI usan la variante compact de IndicatorCard: relleno y espacios menores,
  cifras y ayuda centradas. Inicio conserva la variante anterior. Datos y acentos
  intactos; el simbolo monetario queda unido a la cifra.
* Categoria pasa de TabList a SelectField dentro de FilterBar, junto a Buscar.
  Todas las categorias es la opcion inicial; las reales se ordenan por nombre y
  usan sus ids. El parametro `categoria`, seleccion al recargar, historial, mezcla
  de filtros, retorno a pagina 1 y trato de ids desconocidos siguen iguales.
  TabList compartido no cambia. FilterBar distribuye los cuatro controles en dos
  columnas hasta 2xl y en una fila desde 2xl; cada selector tiene ancho acotado.
* Esta seccion reemplaza las menciones a pestanas de Productos de la entrega inicial
  debajo. Se conservan sus cambios de tabla, tarjetas, Categorias y formularios.

Pruebas de esta correccion: npm test completo, 1325 = 1321 base comprobada en esta
tarea + 4 nuevas; 64 archivos, cero fallos y bajas. Nuevas: tres en ProductsPage
(URL por id, combinacion de filtros con pagina e historial, id desconocido, 40
categorias y nombre largo) y una en AppShell (encabezado, menu movil y breadcrumbs
de rutas vecinas). Ajustadas: dos existentes de ProductsPage cambian la seleccion
por pestana a selector y conservan conteos, stock cero, importes, tabla y limpiar;
una guarda de controls.test deja de exigir TabList en Productos y exige SelectField.
Se ajusto el nombre de un caso de AppShell al ampliar la excepcion del header.
No se cambiaron expectativas de negocio. npm run build y npm run lint: salida 0;
git diff con comprobacion de espacios: sin errores.

Datos de respuestas simuladas: categoria 2 en URL y selector, esperado y obtenido 2;
al cambiar desde pagina 2, esperado y obtenido pagina 1 con busqueda, estado y orden
conservados. Atras restauro pagina 2 y Todas las categorias; Adelante restauro
categoria 2. Id 999 mostro Todas y cuatro productos, conservando `?categoria=999`.
40 categorias produjeron 41 opciones con Todas; seleccionar id 40 mostro vacio por
filtro. Los KPI mantuvieron 30 productos al filtrar en el caso paginado. No se
consulto un backend real ni exportaciones y no se midieron anchos en navegador.
Revision visual de David aun pendiente. No se arrancaron ni detuvieron backend o
Vite ajenos.

## Base y referencias

Arbol inicial limpio; fetch completado. main, HEAD y origin/main coincidieron en
bb1cc5eb09164d5a6dd91f695b34f14e4004c5a7. El log confirma el merge del PR 35.
La CLI gh no pudo leer su configuracion local. Rama feat/34-inventory-refresh creada
desde ese commit. Se leyeron AGENTS.md, contexto numerado, ultima sesion y fuentes
relevantes. Referencias locales: inventario.png, inicio.png y configuracion.png en
C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/.
Solo guiaron composicion y jerarquia.

## Cambios por pantalla

* Productos, primera entrega: ListHeader y aviso financiero con su condicion y enlace intactos.
  Cuatro IndicatorCard con acentos e iconos del sistema, rejilla responsive y valores
  largos con envoltura. TabList mantiene Todas y categorias con conteos y teclado.
  FilterBar embedded y listado comparten superficie; busqueda y selectores conservan
  URL, orden y paginacion. Selectores con ancho maximo local. DataTable conserva
  prioridades, encabezado y separadores. Descripciones y categorias extensas pueden
  envolver. Las tarjetas moviles incluyen costo, sugerido y Editar accesible.
* Categorias: ListHeader, DataTable, tarjetas y Modal conservados. Nombres extensos
  pueden envolver; el modal apila los umbrales para leer rotulos y ayudas. Se conservan
  impuestos, margen, productos por categoria, validacion, errores y descarte.
* Nuevo y Editar producto: codigo y categoria comparten fila cuando cabe; descripcion
  ocupa la fila, costo y stock tienen ancho acotado. PricePanel conserva su posicion
  lateral desde lg y debajo en movil, con borde superior tenue y cifra calculada con
  el rol monto. Cancelar, Guardar, foco, errores y cambios sin guardar siguen iguales.
* Componentes reutilizados: ListHeader, IndicatorCard, TabList, FilterBar, DataTable,
  CellLink, Modal, PricePanel, StatusBadge y campos existentes. FilterBar embedded solo
  lo usa Productos. La envoltura de cifras en IndicatorCard tambien afecta Inicio;
  su prueba y guardas pasaron. No se modificaron shell, Inicio, rutas ni backend.

## Datos y contratos comprobados

Las pruebas usan respuestas API simuladas, no datos de un backend real ni archivos
exportados. Casos existentes y tarjeta movil ampliada:

| Caso | Esperado | Obtenido |
|-|-|-|
| Productos, en stock, alertas, sin stock | 4, 3, 3, 1 | 4, 3, 3, 1 |
| Valor por cantidad positiva y costo sin IVA | $ 3.777.000 | $ 3.777.000 |
| Producto sin stock, costo y sugerido en tarjeta | 0, $ 168.000, $ 307.440 | 0, $ 168.000, $ 307.440 |
| Costo 30.000, IVA y sugerido del panel | $ 5.700, $ 42.857 | $ 5.700, $ 42.857 |
| Costo editado 32.000, IVA y sugerido | $ 6.080, $ 45.714 | $ 6.080, $ 45.714 |
| PUT de edicion, costo y stock | 32000, sin quantity | 32000, sin quantity |

Producto en cero sigue en alertas por stockAlerts; indicadores y pestanas usan todo
el inventario. La formula, tasas, redondeo a pesos enteros y costo heredado decimal
no cambiaron. El cuerpo de POST y PUT, permisos reales, guardias y reportError siguen
en sus rutas anteriores. La prueba de costo heredado conserva su cuerpo original.

## Pruebas y limites

npm test completo: 1321 = 1321 base + 0 nuevas, 64 archivos, cero fallos. Se ajusto
una prueba existente de ProductsPage para acotar Editar a la tabla porque la tarjeta
movil ahora tiene el mismo enlace visible en DOM; se amplio ese caso con costo, precio
y accion de tarjeta. Sin bajas ni expectativas de negocio cambiadas. Pasaron las
guardas de copy, diseno y contraste. npm run build y npm run lint: salida 0.
git diff con comprobacion de espacios: sin errores. No se arrancaron ni detuvieron
backend o Vite; no quedan procesos propios.

Limites: no se compararon datos de un backend real ni exportaciones porque la tarea
solo cambia presentacion; las cifras se compararon con cuerpos API simulados y el
PUT capturado. David debe revisar visualmente escritorio, movil y teclado, incluidos
los nombres e importes largos, filtros, estados, modal y panel de margen.
