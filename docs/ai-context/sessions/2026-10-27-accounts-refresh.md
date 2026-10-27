# 2026-10-27: Acabado de Cuentas

## Base y referencia

* Tarea 6 de 11, rama feat/37-accounts-refresh. Arbol inicial limpio;
  main, HEAD y origin/main coincidian en 45637d8. PR 38 mergeado.
* Referencia autorizada: cuentas.png en
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/.
  Se inspecciono para composicion y jerarquia. Los importes, logos y cifras
  de esa imagen no definen contratos.

## Cambios y componentes

* Cuentas omite la barra superior; ListHeader recibe el menu movil desde
  AppShell. SkipLink, main, sidebar, usuario y titulo de pestana permanecen.
* Actualizado por la ampliacion: AccountTile queda en las cuentas por id,
  con iconos Wallet, Landmark y Smartphone segun EFECTIVO, BANCO y DIGITAL.
  El lapiz queda como boton hermano de la seleccion. Todas pasa al resumen.
* Rejilla de una, dos o tres columnas; saldos actuales completos en pesos
  de lectura, con simbolo unido al primer digito. PeriodPicker compacto en
  periodos fijos y amplio en Personalizado. Ingresos y egresos muestran el
  alcance del rango; movimientos conservan DataTable, tarjetas moviles,
  origen, estados y paginacion.
* Nueva cuenta y transferencia usan el rol monto en los campos, como Editar.
  No cambia el valor del campo, su validacion ni el cuerpo enviado.

## Reglas conservadas

* Los saldos de API son actuales y no dependen del periodo. Movimientos se
  consultan una vez por rango; cuenta, periodo, fechas y pagina siguen en URL.
  Seleccion y edicion son independientes. Totales incluyen las transferencias
  y conservan signos y sumas vigentes.
* Tipo inmutable al editar, inicial preciso en el campo, fondos exactos o
  insuficientes, origen distinto de destino, doble envio, errores, descarte,
  foco e invalidacion conservan sus contratos. Sin cambios a accountForms,
  accountsApi, accountsView, backend, rutas ni exportador.
* Exportar a Excel conserva accountId solo con cuenta concreta, desde/hasta,
  nombre devuelto por API y tratamiento de errores.

## Pruebas y limites

* Base de main declarada: 1331 pruebas, sin ejecutar esa suite para contarla.
  Dos pruebas nuevas de AccountsPage: tipos, importes largos y separacion del
  lapiz; saldos actuales frente al periodo e historial de cuenta. Total de
  esta rama: 1333, sin bajas.
* Ajustadas: AccountsPage deja de esperar breadcrumb en la barra y normaliza
  el espacio inseparable de importes; AppShell comprueba titulo y menu movil
  de Cuentas en contenido. La expectativa provisional de controls.test sobre
  una sola fuente de aria-pressed se reemplaza en la ampliacion; el archivo
  vuelve a su estado base. No cambian expectativas de negocio.
* La API en pruebas es simulada. Esperado y obtenido: Banco 123456789012,51
  mostrado $ 123.456.789.013; Caja 2500000,49 mostrado $ 2.500.000;
  Digital 6807530,08 mostrado $ 6.807.530; total 123466096543,08 mostrado
  $ 123.466.096.543. El rango inicial consultado fue 2026-10-01 a
  2026-10-18; cambiar a Mes anterior no repitio cuentas ni balance.
* No se consulto HTTP real ni se leyo un archivo XLSX. No se abrio ni
  automatizo navegador y no se declara ausencia de desbordes. Revision visual
  de escritorio, movil y teclado pendiente de David.
* npm test: 1333 correctas en 64 archivos. Build, lint y comprobacion de
  espacios de Git correctos. Sin commit, push ni procesos propios activos.

## Ampliacion aprobada por David

* Referencia adicional inspeccionada:
  C:/Users/PC/.codex/generated_images/01a17450-985c-7f83-b7f1-d9073cccb0a7/exec-577ec78f-6923-46cb-9f51-20a2f384a9c8.png.
  Sus cifras y nombres son ilustrativos.
* El resumen superior muestra saldo total actual desde /treasury/balance y
  reparto actual por type desde todas las cuentas. Un solo PeriodPicker usa
  el rango URL para ingresos y egresos globales, independientemente de la
  seleccion. Todas las cuentas se elige desde el resumen. Las cuentas
  individuales usan acentos provisionales por id, iconos por tipo y seleccion
  con marca y texto; el lapiz sigue separado.
* El desglose inferior filtra todos los movimientos activos por cuenta antes
  de paginar la tabla. MovementChart agrupa por dia hasta 45 dias, por semana
  desde 46 hasta 120, y por mes en rangos mayores. La semana inicia lunes.
  El detalle nativo lista cada grupo con importes completos de lectura.
  Dias sin movimiento se cuentan solo tras respuesta completa. Mayores
  ingresos y egresos usan dias reales y avisan los empates.
* Se conservan las dos patas de las transferencias internas en resumen,
  grafico y tabla; son flujos entre cuentas, no ingresos ni gastos del
  negocio. El saldo inicial no aparece como movimiento. Las facturas anuladas
  no llegan en esta consulta segun el contrato vigente del backend.
* Colores: paleta acotada de info, warning y neutral por id; no indica signo,
  ingreso, egreso ni alerta. Queda pendiente personalizacion persistente en
  una tarea backend y su integracion frontend. Sin selector ni almacenamiento
  local en esta tarea.
* La referencia no cambio contratos de API, exportacion, centavos editables,
  fondos, modales ni invalidacion. La prueba sigue usando API simulada y no
  incluye HTTP real ni lectura de XLSX. Revision visual de David pendiente.
* Suite final: 1343 correctas en 65 archivos, sin bajas. Frente a las 1333
  previas hay 10 casos nuevos: tres pruebas de AccountsPage, tres de
  movementTimeline y cuatro guardas automaticas de diseno y copy para los
  dos archivos nuevos de codigo. Las pruebas existentes de AccountsPage se
  ajustaron por el resumen global y el nuevo acceso a Todas, sin alterar
  expectativas de negocio. Modales, transferencia y exportacion conservan
  sus casos previos correctos. Build, lint y revision de espacios correctos.
* Datos simulados de reparto: Efectivo 100 menos 30,25 = 69,75, mostrado
  $ 70; Bancos -50, mostrado -$ 50; Digital 10, mostrado $ 10;
  total 29,75, mostrado $ 30. Serie simulada: 30 ingresos de 0,01 suman
  0,30; transferencia interna 10,25 aparece en ingreso y egreso global;
  el desglose de origen solo incluye su egreso. Dos fechas con ingreso
  25,50 quedan empatadas; dos dias sin movimientos en el rango de cuatro.

## Correcciones de revision visual de David

* En Cuentas, PeriodPicker usa layout toolbar: etiqueta, selector y rango
  auxiliar en horizontal cuando caben, sin ancho reservado para fechas en
  periodos predefinidos. Personalizado muestra Desde y Hasta en una rejilla
  adaptable, a la derecha desde lg cuando cabe. La URL, zona Bogota y
  validacion no cambian.
* El reparto por tipo distingue Efectivo en ambar, Bancos en azul y Digital
  en violeta con fondos tenues. Se agregan tokens violet, violet-bg y
  violet-ink, con pruebas de contraste. Cada tipo sigue determinado por type.
* Las tarjetas individuales usan su acento estable por id en icono, fondo,
  borde superior, punto y seleccion. El anillo ambar usa warning-ink para
  contraste sobre warning-bg. Check, Seleccionada, aria-pressed y foco siguen.
  No hay selector de color ni persistencia nueva.
* Grafico, agregacion, resumen por fechas, tabla, saldos, modales y
  exportacion no cambian. Revision visual de David pendiente; sin navegador
  ni mediciones visuales del agente.
* Verificacion de esta correccion: 501 pruebas afectadas correctas en nueve
  archivos; incluye Cuentas, Inicio, Ventas, Compras, listas, controles,
  copy, diseno y contraste. Cuatro casos nuevos de contraste en tokens.test:
  violet-ink sobre violet-bg, violet sobre surface, info sobre info-bg y
  neutral-600 sobre neutral-100. Se amplio una prueba existente de Cuentas
  para comprobar agrupacion accesible de Periodo, iconos por tipo y estado
  Seleccionada. No hay bajas ni cambios de expectativa de negocio. Build,
  lint y revision de espacios correctos. No se repitio la suite completa de
  1343; su ultimo resultado completo pertenece a la entrega anterior.
* Tras acotar el ancho de Personalizado desde lg, se repitieron las 52
  pruebas de Cuentas y listas: correctas. Build y lint volvieron a pasar.

## Correcciones posteriores de revision visual

* Reparto por tipo: caja tenue de 64 px e iconXl de 32 px; etiqueta body
  semibold e importe figure. La rejilla pasa a dos columnas cuando tres
  comprimen cifras. Se mantienen saldos completos, negativos y agrupacion
  por type. El saldo global no pierde ancho ni jerarquia.
* Ver todas las cuentas sale del bloque de saldo y va como boton secundario
  junto a Tus cuentas. Cuando esta activo, muestra check, texto Todas las
  cuentas seleccionadas y aria-pressed. El teclado activa la seleccion;
  URL, rango, desglose y movimientos conservan sus reglas.
* Cada tarjeta usa un contorno de 2 px en reposo y seleccion. El borde
  superior conserva la identidad; al seleccionar, solo lados y base toman
  el mismo acento. No se superpone otro anillo sobre las esquinas. Foco,
  check y texto Seleccionada permanecen. El color sigue estable por id.
* Personalizacion de color en Nueva y Editar sigue pendiente de persistencia.
  Contrato backend requerido: POST /api/treasury/accounts recibe color;
  PUT /api/treasury/accounts/{id} lo modifica sin cambiar type; las respuestas
  de POST y PUT y GET /api/treasury/accounts lo devuelven. El backend valida
  y guarda el color por tenant. Despues se conectaran los formularios y
  tarjetas del frontend. No se agrego selector ni guardado local; se resuelve
  en una tarea backend separada antes de Reportes.
* Grafico, periodo unico, transferencias, calculos, modales y exportacion
  intactos. Revision visual de David pendiente; sin navegador ni medidas
  visuales del agente.
* Verificacion parcial de estas correcciones: 437 pruebas correctas en seis
  archivos de Cuentas, shell, listas, diseno, contraste y copy. Una prueba
  nueva activa Todas con teclado y verifica URL y foco; designSystem.test
  suma un caso del token icon-xl y ajusta la guarda de iconos. Se ajustaron
  expectativas existentes de AccountsPage por la nueva ubicacion y el texto
  del boton activo. Sin bajas ni cambios de negocio. Build, lint y revision
  de espacios correctos. La ultima suite completa sigue siendo 1343 de la
  entrega anterior; esta correccion no ejecuto una suite completa.

## Seleccion agregada y cuatro grupos homogeneos

* El resumen presenta Todas las cuentas, Efectivo, Bancos y Digital con la
  misma estructura, icono de 24 px en fondo de 48 px, etiqueta small e
  importe summary de 20 px. El total incorpora Wallet neutral; el reparto
  mantiene warning, info y violet por type real. La rejilla usa mas filas
  antes de comprimir importes completos. El aumento anterior de 64/32 px
  queda reemplazado; el token icon-xl se retiro al quedar sin uso.
* Al elegir Todas las cuentas, cada tarjeta muestra su acento, contorno,
  check y texto Incluida en Todas las cuentas. `aria-pressed` de las cuentas
  sigue falso porque el filtro conserva un solo valor agregado. Al elegir
  una cuenta solo esa usa el texto Seleccionada y `aria-pressed` verdadero.
  Bordes de ancho fijo, foco, URL, historial, grafico y exportacion conservan
  su comportamiento. La accion agregada sigue junto a Tus cuentas.
* Cola obligatoria: 1) cerrar y mergear esta rama tras aprobacion visual de
  David; 2) tarea backend para persistir color por tenant y admitirlo en
  POST /api/treasury/accounts, PUT /api/treasury/accounts/{id} y respuestas
  de ambos y GET /api/treasury/accounts; 3) tarea frontend para selector en
  Nueva/Editar y uso del color persistido; 4) continuar con Reportes.
  No se implemento el selector ni almacenamiento local.
* Pruebas afectadas: seleccion agregada, individual, regreso por historial,
  URL y teclado en AccountsPage; expectativas del resumen ajustadas a los
  cuatro grupos. Guarda del token summary agregada y guarda icon-xl retirada.
  Sin bajas de pruebas de negocio. Se ejecutaron 439 pruebas en seis archivos,
  todas correctas; build y lint correctos. Ultima suite completa ejecutada:
  1343, anterior a las correcciones visuales posteriores. API simulada por
  fetchMock; sin comprobacion HTTP real ni navegador. Revision visual de
  David pendiente.

## Ajuste autorizado en Cuentas e Inicio

* Cuentas elimina la ayuda de cantidad bajo el total. Los cuatro grupos
  tienen el mismo contenido y alineacion de icono, titulo e importe; Layers
  distingue el total de Wallet de Efectivo. Se conservan escala, colores,
  importes, filtros y seleccion.
* Inicio elimina solo el porcentaje auxiliar de Utilidad bruta. Conserva su
  importe y el texto Ventas menos costo de lo vendido; los otros KPI
  conservan sus ayudas. La variante dense de IndicatorCard reduce solo el
  relleno vertical de los cuatro KPI de Inicio, sin cambiar Productos,
  Ventas o Compras.
* Se ajustaron pruebas existentes de Cuentas e Inicio para los textos e
  icono retirados, conservando importes y comportamiento. Sin cambios de
  API, formulas ni exportacion. Verificacion parcial: 429 pruebas correctas
  en siete archivos de Cuentas, Inicio, Productos, Ventas, Compras, diseno
  y copy; build y lint correctos. Ultima suite completa ejecutada: 1343,
  anterior a las correcciones visuales posteriores. API simulada en pruebas;
  sin HTTP real ni navegador. Revision visual de David pendiente.

## Cierre y aprobacion visual

* David aprobo visualmente Cuentas y el ajuste de los KPI de Inicio. Esta
  aprobacion reemplaza las menciones anteriores de revision pendiente en
  la cronologia de esta nota. El agente no abrio navegador en el cierre.
* Suite completa final: 1351 pruebas correctas en 65 archivos. Son ocho mas
  que las 1343 de la ultima suite completa: cuatro casos de contraste,
  una prueba de seleccion con teclado y URL y tres casos parametrizados del
  token text-summary. No hubo bajas de pruebas. Build, lint y
  `git diff --check` correctos.
* Las pruebas usan API simulada. No se comprobo HTTP con backend real ni se
  leyeron exportaciones reales en esta tarea. La pantalla presenta pesos
  enteros y los datos editables y exportados conservan centavos; por ello
  pueden diferir las sumas de importes mostrados tras redondear.
* Saldos actuales independientes del periodo; transferencias internas en
  ambas series sin representar ingresos o gastos del negocio. Colores
  provisionales estables por id, sin selector ni persistencia. Secuencia:
  persistencia backend del color, selector frontend en Nueva/Editar cuenta,
  y despues Reportes.
