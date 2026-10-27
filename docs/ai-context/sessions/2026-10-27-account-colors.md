# 2026-10-27: Selector persistente de color de cuentas

## Base y alcance

* Rama feat/38-account-colors, libre local y remotamente antes de crearla.
  Frontend main y origin/main coincidian en ae12ad9, PR 39 integrado,
  arbol limpio y fetch realizado. Backend PR 42 integrado segun David.
* Se leyeron AGENTS, contexto frontend, accounts-refresh y account-colors
  del backend. No se modificaron backend ni AGENTS. Los cambios ajenos en
  .idea/compiler.xml y .idea/servibox-backend.iml permanecen intactos.
* Este extra ocupa feat/38-account-colors. Reportes es la siguiente tarea
  del rediseno; hay que actualizar la numeracion de las ramas posteriores
  del plan antes de iniciarlas. La entrega inicial fue sin commit, push ni PR;
  el cierre posterior fue autorizado por David.

## Implementacion y archivos

* Nuevos accountColors.ts y AccountColorField.tsx en src/accounts: paleta
  Azul, Ambar, Gris y Violeta basada en tokens, selector nativo y codigo
  elegido visible. Controles con nombres accesibles, marca, aria-pressed,
  fieldset y foco de teclado independiente. Sin localStorage ni borrado.
* AccountModals.tsx y accountForms.ts comparten color entre paleta y selector;
  Nueva propone azul. Editar precarga persistido o fallback estable por id
  con null. Confirmar una propuesta null guarda ese color; cancelar sin
  modificarla cierra sin escribir. Un cambio solo de color habilita guardar
  y activa el descarte. Enter en el selector nativo no envia el formulario.
* accountsApi.ts y dashboard/dashboardApi.ts amplian los tipos. AccountsPage
  prioriza color persistido en borde, icono, punto y seleccion. Mantiene
  contorno de ancho fijo sin superposicion; textos e importes legibles con
  tokens, fondos mezclados al 8% e iconos al 35% con text. Todas incluye
  cada cuenta con su acento y la seleccion individual sigue siendo unica.
* errorMessages.ts y su prueba agregan el mensaje exacto del backend;
  glossary.ts incorpora Color de la cuenta. Actualizados 01-ARCHITECTURE,
  02-CONVENTIONS, 03-DECISIONS, 05-DESIGN-SYSTEM y 06-COPY.

## Contrato enviado

* POST /api/treasury/accounts: name, type, initialBalance y color.
  PUT /api/treasury/accounts/{id}: name, initialBalance y color, sin type.
* Color es #RRGGBB opaco. El control nativo puede enviar letras minusculas;
  el servidor normaliza a mayusculas. Account incluye color string o null.
  Alta omitida/null permite null; PUT omitido/null conserva el color anterior.
  La interfaz siempre envia una propuesta y no ofrece quitar color.
* Error exacto: `El color debe tener el formato #RRGGBB`, HTTP 400.
  Se muestra mediante reportError y mapa, con punto final, sin perder campos.
* Alta y edicion invalidan la clave treasury y el listado vuelve a tomar
  el valor del servidor. No se redondean datos monetarios por introducir color.
  Movimientos, transferencias, periodo, grafico, URL y exportaciones intactos.

## Pruebas y limites

* Base real ejecutada en copia temporal de main: 1351 correctas, cero fallos,
  en 65 archivos. Sin instalar dependencias; reutiliza node_modules por junction.
* Suite completa final: 1371 correctas en 65 archivos, cero fallos, cero
  pendientes. Comparacion de nombres de casos contra la ejecucion de main:
  20 nuevas y cero bajas. Build, lint y git diff check correctos.
* Nuevas: seis en EditAccountModal, cuatro en AccountsPage, una en
  accountsView, una del mapa de errores, cuatro de contraste y cuatro
  guardas automaticas de copy/diseno por los dos archivos nuevos.
* Nuevos casos de comportamiento: alta con color personalizado y respuesta
  normalizada; edicion solo de color; precarga persistida; fallback null;
  guardar propuesta intacta; cancelar propuesta; teclado y sincronizacion;
  descarte solo de color en alta/edicion; rechazo con campos conservados;
  invalidacion, remontaje con cache nueva, seleccion agregada e individual.
* Ajustadas AccountsPage (cuerpo exacto del POST con color y conservacion
  tras 409; fixtures de cuenta heredada con null),
  EditAccountModal (fixture con color persistido, tres cuerpos PUT y valores
  del validador) y accountForms (cuerpo POST con color). Ajustes de fixtures
  por color obligatorio en accountsView, money, manualMovements y newPurchase,
  sin alterar expectativas monetarias ni sus casos de negocio.
  controls.test amplia la excepcion de paletas al segmentado unico con el
  archivo exacto AccountColorField, conservando la guarda para los demas.
  En total, ocho archivos con adaptaciones de pruebas existentes; otros dos
  archivos de pruebas solo suman cobertura. No se eliminaron pruebas.
* API simulada con fetchMock, sin comprobacion HTTP real. No habia backend
  escuchando en 8080/8081. No se arranco backend ni se alteraron cuentas reales.
  No se abrio navegador ni se hizo auditoria visual o lectura de XLSX real.
* Esperado frente a obtenido en simulacion: envio 100,105 = 100.105 exacto;
  PUT solo de color conserva inicial 100000.57; #abcdef vuelve #ABCDEF y
  se conserva al remontar con nueva cache. Colores extremos blanco, negro,
  amarillo y azul oscuro mantienen texto 4.5:1 e iconos 3:1 en pruebas numericas.
* La validacion monetaria anterior permanece, incluido el rechazo de un saldo
  inicial heredado negativo al editar. No se modificaron precision ni formulas.
* No hay procesos propios de backend, Vite o navegador. La revision automatica
  rechazo la limpieza del temporal propio por politica, sin motivo adicional.
  No se reintento. Queda en
  C:/Users/PC/AppData/Local/Temp/servibox-38-base-c7e9d19d43bb4f86a2bd2582809c32b6,
  con la copia main, resultados JSON y junction a node_modules del frontend.
  El marcador servibox-38-base-path.txt tambien queda en Temp. El temporal
  bloqueado del PR backend no se toco ni se intento eliminar.

## Revision visual de David

* David aprobo la interfaz el 2026-10-27 y autorizo commit, push y PR. Esta
  aprobacion reemplaza la revision pendiente de la entrega inicial. El
  agente no abrio navegador en el cierre. Los puntos siguientes describen
  el alcance de la revision solicitada en esa entrega.

* Revisar Nueva/Editar, paleta y Otro color, precarga, guardar/cancelar y
  persistencia tras recarga. En cuenta heredada null, confirmar Guardar sin
  tocar otro campo debe persistir el color propuesto.
* Probar blanco y negro personalizados, legibilidad de nombre e importe,
  icono, indicador y contorno. Alternar Todas y una cuenta individual.
* Revisar movil y teclado: Tab, Espacio/Enter en paleta, selector nativo,
  foco, cierre con cambios y restauracion del foco al modal/tarjeta.

## Cierre autorizado

* Rama y mensaje de commit: feat/38-account-colors. PR hacia main con el
  mismo titulo. Solo rutas explicitas de esta tarea, sin AGENTS, backend,
  .idea, secretos, temporales ni dependencias nuevas.
* Se reutiliza la evidencia de 1371 pruebas correctas (1351 base + 20 nuevas),
  build y lint: no cambio codigo ni pruebas desde su ejecucion. El resultado
  JSON final conservado en el temporal registra cero fallos y cero pendientes;
  no hay archivos de src modificados despues de ese resultado. Solo cambia
  documentacion de cierre. Comprobaciones del diff correctas.
* Reportes queda como siguiente tarea del rediseno; ajustar la numeracion de
  sus ramas y las posteriores antes de iniciarlas. No hacer merge ni checkout.
* Temporales bloqueados conservados tal como se documenta arriba, sin nuevos
  intentos de borrado. El cuerpo del PR se prepara en un archivo externo al repo.
