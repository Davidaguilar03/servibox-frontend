# 2026-10-26: Inicio por periodo y filtro exacto de Ventas

Estado: revision tecnica y revision visual aprobadas por David, incluida la correccion
del ancho del selector. Cierre autorizado con commit, push y PR, sin merge ni cambio de
rama. Sin navegador, automatizacion ni capturas del agente. Los estados pendientes de
las secciones siguientes corresponden al registro historico de cada entrega.

## Cierre autorizado del 2026-10-26

Rama feat/33-dashboard-refresh confirmada. GitHub CLI autenticado y sin PR previo para
la rama al iniciar el cierre. No hay servidores propios pendientes de detener; no se
detuvieron procesos ajenos. Revision de status, diff y archivo nuevo: 19 modificados y
una nota de sesion nueva, solo de esta tarea y el ajuste autorizado de Ventas. Sin
credenciales, capturas, scripts temporales, logs ni artefactos de medicion agregados.
AGENTS.md intacto. Backend sin cambios del agente: su status muestra dos modificaciones
ajenas en .idea/compiler.xml y .idea/servibox-backend.iml, que se dejan intactas y fuera
del commit del frontend. Sin modificaciones de codigo backend.

El cierre confirmo npm test: 1321 = 1261 base + 60 nuevas, 64 archivos, cero fallos u
omisiones, 67.27 s. npm run build y npm run lint: salida 0, sin advertencias. git diff
con comprobacion de espacios: sin errores. La ultima correccion no agrego pruebas y
paso antes sus 459 pruebas afectadas. Revision tecnica y visual aprobadas por David.
Se usara el cuerpo exacto autorizado para el PR, con archivo temporal fuera del repo
eliminado al terminar. Hash, estadisticas y URL se reportan despues de publicar.

## Correccion puntual del ancho del periodo

Rama feat/33-dashboard-refresh confirmada; se conservan los cambios anteriores y la base
comprobada de 1321 pruebas. En Inicio, los periodos predefinidos recuperan un grupo de
ancho natural alineado a la derecha junto a Registrar venta, sin la base de 640 px ni
crecimiento flex que solo necesitan las fechas. El selector inline mantiene 192 px,
limitados al ancho disponible; el rango auxiliar envuelve debajo sin definir ese ancho.
Solo Personalizado activa el crecimiento del grupo y la contencion inline para distribuir
Desde/Hasta segun las reglas existentes. Al salir de Personalizado se retira ese espacio.
En movil el grupo puede envolver segun el espacio real. No se modifican filtros, URL,
consultas, datos, acciones ni el layout stacked de otros PeriodPicker.

Archivos de codigo: DashboardPage.tsx y PeriodPicker.tsx. Se actualizan esta nota y el
contrato de disposicion inline en 03/05. Sin pruebas nuevas ni aserciones de clases CSS;
se conservan los casos funcionales del selector, personalizados y traslado a Ventas.
Revision visual pendiente de David, sin navegador ni afirmacion de ausencia de desbordes.
Verificacion puntual: 459 pruebas afectadas correctas en 8 archivos, 17.96 s; ninguna
nueva, ajustada ni eliminada. Ultimo total completo comprobado: 1321, sin repetir la
suite completa en esta correccion de disposicion. npm run build y npm run lint con
salida 0, sin advertencias; git diff con comprobacion de espacios sin errores.

## Correcciones posteriores a la revision visual de David

Se conserva feat/33-dashboard-refresh y todos los cambios previos. Base realmente
comprobada de esta rama: 1317 pruebas. Las dos capturas adjuntas no se leyeron; las
indicaciones escritas de David definen estas correcciones. Se inspecciono inicio.png
en su ruta autorizada para los iconos de cuentas.

* AppShell no monta su header solo en Inicio, sin reservar los 64 px anteriores. h1 y
  titulo de pestana se conservan; las demas rutas mantienen barra y breadcrumb. El boton
  movil del shell pasa por contexto de Outlet al encabezado de Inicio, con su misma
  referencia, estado, controles ARIA, trampa de foco y retorno de foco. SkipLink, main,
  sidebar y usuario inferior intactos.
* PeriodPicker agrega layout inline y action opcionales, solo usados en Inicio. La
  etiqueta sigue visible y asociada; la accion se alinea al control dejando 24 px para
  etiqueta y separacion, sin alinearla con el rango auxiliar. Desde 720 px reales del
  contenedor, selector, fechas y accion comparten fila. Por debajo las fechas van juntas
  en segunda fila; sus columnas de minimo 144 px y gap 16 permiten dos desde 304 px, o
  una con menor espacio. Selector y accion tambien pueden envolver en movil. El header
  permite que titulo y controles pasen a filas separadas segun el espacio disponible.
* Cuentas usan Landmark para BANCO, Wallet para EFECTIVO y Smartphone para DIGITAL,
  iconMd sobre canvas. Son decorativos, aria-hidden y elegidos por tipo, sin inferir por
  nombre ni usar marcas. Nombres completos, saldos, centavos y total conservados.
* Utilidad neta usa el acento compartido brand-strong: solo el borde superior cambia de
  border-accent a brand, con el mismo grosor de 2 px. No cambia el color del importe ni
  el tratamiento de perdidas; bordes de tablas y demas acentos intactos.
* Pruebas nuevas: tres casos de icono por tipo con nombre, centavos, total y enlace; un
  caso de navegacion Inicio/Ventas/atras que conserva titulo y breadcrumb donde aplica.
  Ajustadas: DashboardPage verifica h1 y titulo sin header ni hueco estructural;
  AppShell toma main como referencia del contenido y abre el menu movil con Enter,
  conservando inert, Escape y retorno de foco; UserMenu conserva su caso de usuario
  inferior sin duplicado en el contenido y verifica la serviteca en el subtitulo.
  Pruebas anteriores de periodos, fechas, URL y traslado a Ventas conservadas, sin bajas.
* Archivos de esta correccion: DashboardPage, PeriodPicker, AppShell, IndicatorCard,
  pruebas de DashboardPage/AppShell/UserMenu y contexto 01/03/05/esta nota. Sin cambios
  adicionales en Ventas, DataTable, backend, dependencias, marca ni permisos.
* Verificacion de la correccion: npm test completo, 1321 = 1317 comprobadas en la primera
  entrega + 4 nuevas; 64 archivos, cero fallos, bajas u omisiones, 66.89 s. Build con
  salida 0, sin advertencias; CSS emitido incluye la consulta de contenedor de 720 px.
  No equivale a verificacion visual. La corrida focalizada inicial detecto una expectativa
  incorrecta de texto exacto en UserMenu, corregida para buscar el subtitulo real completo;
  la suite completa posterior paso.
  npm run lint con salida 0 y sin advertencias; git diff con comprobacion de espacios
  sin errores. Rama conservada, cambios previos intactos, sin commit ni push.

Los limites anteriores son reglas de CSS, sin medicion visual del agente; no garantizan
ausencia de desbordes. No se abrieron navegadores ni se tomaron capturas. No se arrancaron
ni detuvieron backend/Vite ajenos. Revision visual pendiente de David.

Nueva lista manual de David: Inicio sin barra ni hueco residual; acceso al menu movil;
periodo alineado con Registrar venta; Desde/Hasta horizontales cuando caben; iconos por
tipo y saldos legibles; borde de Utilidad neta mas visible y tablas intactas.

Las secciones siguientes conservan el registro de la primera entrega; esta correccion
reemplaza su disposicion del encabezado y la exclusion previa de iconos en las cuentas.

## Git y contexto

Rama feat/33-dashboard-refresh. Arbol inicial limpio; fetch completado. main, HEAD y
origin/main coincidieron en 826cce82c7914165904a6d8d7e3fc4315f16d448. PR 34 del frontend
MERGED el 2026-10-26T11:41:59Z, con ese mismo commit de merge. Rama ausente antes de crearla.
Leidos AGENTS.md, contexto numerado, ultima sesion brand-shell-refresh, log y fuentes
relevantes. Backend no consultado ni modificado.

Referencia inspeccionada como archivo local:
C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/inicio.png.
Guia composicion y jerarquia, sin copiar datos, cifras ni controles inventados.

## Composicion y alcance

* Cuatro IndicatorCard existentes: Ventas sin IVA, Costo de lo vendido, Utilidad bruta y
  Utilidad neta. Acentos success, warning, info y brand aprobados. Sin formulas nuevas,
  graficos, comparaciones, dependencias ni permisos. Margen sin ventas omitido; perdidas
  pequenas conservan signo y tono. formatCurrency conserva centavos y precision.
* Rejilla de indicadores de una columna, dos desde sm y cuatro desde 2xl; evita una fila
  de tres con uno suelto. Stock y saldos en proporcion 3:2 desde xl, apilados por debajo;
  ventas debajo. Section conserva bordes y enlaces comunes, encabezado adaptable y
  relleno de 16/24. Total disponible sobre canvas. IndicatorCard une simbolo monetario
  y cifra con espacio inseparable; nombres largos pueden envolver sin truncado local.
* Diferencias intencionales frente a la imagen: controles en encabezado de contenido,
  conservando el shell aprobado; sin nueva pildora de alertas ni iconos decorativos de
  cuentas. Conserva conteos reales de stock, forma de pago Contado/Credito y hasta cinco
  ventas. No se copian los medios de pago inconsistentes ni las cifras de la referencia.
* Registrar venta es la unica accion primaria. Logo, favicon, sidebar, usuario inferior
  y boton superior intactos. No se declara ausencia de desbordes.

## Periodos, URL y ajuste autorizado

Inicio ofrece Este mes (por defecto), Mes anterior, Ultimos 30 dias, Este ano y
Personalizado. businessToday usa America/Bogota; lib/period calcula los rangos, Mes
anterior completo y Ultimos 30 con hoy incluido. URL con periodo; desde/hasta solo
en Personalizado. Fechas editables con useUrlTextParam, estado local y escritura
retrasada o al salir; selectores agregan historial, fechas reemplazan la entrada.

validateRange de Reportes valida ambas fechas ISO reales, orden y hasta 366 dias
inclusivos. No hay un limite local nuevo ni prohibicion adicional de fechas futuras.
Un rango incompleto o invalido muestra errores de campo, retira KPIs y ventas y no
consulta KPIs. Los datos siguen las fechas editadas, sin rotular cifras previas como
pertenecientes al nuevo rango. Clave de KPIs: kpis, desde, hasta; sin placeholderData.

David autorizo ampliar SalesFilters y el PeriodPicker existente de Ventas con Ultimos
30 dias y Personalizado. Ver todas envia siempre periodo=personalizado, desde y hasta
exactos, incluidos los periodos predefinidos de Inicio. Ventas muestra y permite editar
esas fechas, las conserva al paginar, recargar, cambiar otros filtros y usar historial.
Los indicadores Ventas del mes y Abonos del mes siguen mensuales. No cambia su
composicion, acciones, busqueda, estado, forma de pago ni orden.

Se conserva el contrato previo de los periodos antiguos de Ventas, incluido el filtro
por prefijo de mes/ano. Los nuevos usan limites exactos e inclusivos. Compras llama al
parser compartido sin periodos extendidos y Papeleras explicita su union anterior:
son ajustes de aislamiento de tipos y compatibilidad, sin opciones nuevas en esas vistas.
La validacion ISO real se agrega al validador compartido de Reportes, tambien usado por
Cuentas y movimientos; no cambia sus reglas de duracion ni mensajes anteriores.

## Semantica y estados

* KPIs: netSales, costOfSales, grossProfit, netProfit de /api/reporting/kpis con desde/hasta.
  Margen = grossProfit/netSales, un decimal; sin margen cuando netSales es cero.
* Ventas recientes: misma consulta /api/sales y clave sales, firma fetchSales intacta.
  Filtro inclusivo por invoiceDate, sin ANULADA, fecha descendente e id descendente,
  limite de cinco. El vacio explica que no hay ventas en el periodo elegido.
* Stock: productos/categorias actuales, umbrales, orden y conteos originales. Cuentas:
  currentBalance de cada cuenta y total de /treasury/balance, sin reconstruccion historica.
  Aclaracion visible comun: no dependen del periodo. Sus claves y datos no cambian al
  cambiarlo, ni se vuelven a pedir por ese motivo.
* Carga, vacio, error y reintento independientes. Cada consulta de Inicio pasa su error
  por useReportedError; el bloque mantiene error y reintento sin exponer mensajes crudos.

## Evidencia funcional automatica

Pruebas de integracion React con fetch simulado, sin navegador ni servidor propio.
Comprueban parametros reales de las llamadas y valores mostrados frente a las respuestas:

| Caso | Esperado | Obtenido |
|-|-|-|
| 2026-11-01 03:00 UTC, Este mes | 2026-10-01 a 2026-10-31 | Mismos parametros de KPIs y enlace |
| 2027-01-01 05:00 UTC, Este ano | 2027-01-01 a 2027-01-01 | Mismos parametros de KPIs y enlace |
| Mes anterior en marzo bisiesto 2028 | 2028-02-01 a 2028-02-29 | Mismos parametros de KPIs y enlace |
| Cambio al mes anterior | Sin cifra previa; respuesta netSales 123.45 | Sin cifra previa; $ 123,45 |
| netSales 20781907.45 y netProfit -0.1 | $ 20.781.907,45 y -$ 0,10 | Mismos valores; perdida negativa |
| Cuenta y balance total 123.45 | $ 123,45 en ambos | Mismos valores, nombre completo |
| Venta total 2180323.95 | $ 2.180.323,95 | Mismo valor en tabla y tarjeta |
| Orden reciente y limite | FV-7, FV-6, FV-5, FV-4, FV-3 | Misma secuencia, sin anuladas ni fuera de rango |
| Cambio de periodo valido | Una llamada a cada fuente actual y a sales | Una llamada por fuente |
| Personalizado invalido desde URL | Cero llamadas de KPIs en Inicio | Cero llamadas, errores claros |

No se comprobaron respuestas de un backend real ni archivos exportados: el filtro y los
formatos se verificaron por integracion con respuestas controladas. No se modifican las
exportaciones. La comprobacion visual y de datos reales de David sigue pendiente.

## Pruebas y verificaciones

Suite completa npm test: 1317 = 1261 base + 56 nuevas, 64 archivos, cero fallos, bajas u
omisiones, 68.00 s. Nuevas: 29 en DashboardPage, 12 en SalesInvoicesPage, 10 en salesList
y 5 en reports. No se ejecuto main ni una copia para contar la base. Build y lint con
salida 0, sin advertencias; git diff con comprobacion de espacios sin errores.
Las guardas existentes de copy, diseno y contraste
se conservan, sin relajar reglas ni agregar pruebas que solo repitan clases.

Pruebas existentes ajustadas, sin bajas:

* DashboardPage: fixture de ventas trasladada de septiembre a octubre dentro del periodo
  inicial; fechas esperadas correspondientes; subtitulo con rango exacto en datos y shell;
  etiqueta fija sustituida por selector y opciones; vacio especifico del periodo. El
  extractor de textos normaliza el espacio inseparable de moneda. Conserva aserciones
  de stock, sumas de API, margen, signo, tarjetas y reintento.
* SalesInvoicesPage, salesList y reports: solo agregan cobertura, sin cambiar casos previos.

Cobertura nueva: limites de mes/ano y bisiesto en Bogota; opciones e inicio; URL, recarga e
historial; validacion ISO, incompleto, inversion y limite compartido; parametros de KPIs,
ausencia de datos anteriores, independencia de fuentes actuales; filtro, anuladas, orden y
limite de ventas; traslado exacto a Ventas para los cinco periodos; edicion, otros filtros,
paginacion y compatibilidad; carga/error/reintento por fuente; centavos y nombres completos.

## Archivos y arranque

Modificados: DashboardPage y sus pruebas, SalesInvoicesPage y sus pruebas, salesList y sus
pruebas, reports y sus pruebas, IndicatorCard, PurchaseInvoicesPage, trashList y contexto
01, 02, 03 y 05. Unico archivo nuevo: esta nota. Sin cambios al backend, dependencias,
AGENTS.md ni recursos de marca.

Desde el frontend: `npm run dev -- --host 127.0.0.1 --port 5173`.
URL: http://127.0.0.1:5173/inicio. Backend requerido en http://localhost:8080 por defecto,
o API_PROXY_TARGET ya configurado por David. No se arranco ni detuvo backend/Vite ajeno;
no se dejaron servidores propios activos.

Revision manual de David: composicion, bordes y lectura de los cuatro indicadores;
periodos y fechas; ventas recientes y Ver todas con rango editable; aclaracion de stock
y saldos actuales; centavos y nombres largos; escritorio, movil y teclado.

Estado final: pendiente de revision tecnica y aprobacion visual de David.
