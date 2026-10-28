# 2026-10-28: Configuracion, tarea 11 de 11

## Cierre 2026-10-28: aprobacion visual de David

David aprueba visualmente la pantalla unificada y autoriza commit, push y PR de
feat/43-settings-refresh hacia main. Esta aprobacion reemplaza todos los pendientes
visuales historicos de esta nota. Sin navegador en el cierre.

* Se conserva la rama feat/43-settings-refresh y el alcance de trece rutas propias,
  incluida esta nota como unico archivo nuevo. Backend, AGENTS.md y .idea intactos.
* Suite completa real del cierre: 1426/1426 correctas en 65 archivos, en una sola
  corrida exitosa despues de la pantalla unificada. Duracion 429,86 s; pool threads
  con un trabajador. Sin errores de trabajadores ni reintentos en este cierre.
  Las 1420 pruebas anteriores y las 426 parciales quedan como evidencia historica.
* Balance frente a main: 1407 base + 20 casos nuevos - 1 retirado = 1426.
  Frente a las 1420 anteriores a la pantalla unificada: + 7 nuevos - 1 retirado.
  SettingsPage pasa de 17 a 35 casos, AppShell agrega dos variantes del menu movil
  y settingsForms retira el caso del parser de pestanas eliminado.
* Ocho definiciones existentes ajustadas frente a main: seis en SettingsPage
  (navegacion/pantalla unificada, parametro usuarios, perfil antiguo y nombre de sesion,
  roles de solo lectura, guardado independiente en lugar del cambio de pestana y salida
  con guardian comun); una de menu movil en AppShell (ambos enlaces de Configuracion)
  y una en controls (ya no exigir TabList en una pantalla sin pestanas). Se conservan
  aserciones de valores, payloads, normalizacion, unidades, precision e invalidaciones.
* Guardados independientes, proteccion de cambios simultaneos, descarte unico y
  compatibilidad de /configuracion?tab=financiera cubiertos con API simulada en
  Vitest/jsdom. Sin comprobacion real del backend ni modificaciones de datos reales.
* Build y lint del cierre correctos, sin advertencias; git diff check correcto.
  Se revisan las trece rutas explicitas y su diff staged, con comprobacion cached,
  sin secretos ni temporales incluidos. Mensaje de commit y titulo de PR exactos:
  feat/43-settings-refresh; PR hacia main con cuerpo en espanol sin tildes mediante
  archivo externo al repo, retirado despues de usarlo. Sin coautores.
* Limitaciones conservadas: comision de tarjeta guardada para uso futuro, sin aplicarse
  a ventas o reportes; ceros iniciales no distinguen ausencia de configuracion de una
  configuracion guardada en cero. Unidades, precision y reglas financieras sin cambio.
  Las pruebas de roles validan la interfaz, no certifican permisos reales del servidor.
* Tras el merge que realizara David, el bloque de rediseno queda completado.
  Los pendientes de integracion y entrega del MVP continuan. Sin merge ni checkout
  en este cierre, sin detener procesos ajenos.

## Correccion 2026-10-28: pantalla unificada

Se puede continuar con la revision visual de David. Aprueba la direccion de
settings-unified-proposal-v1.png; la implementacion sigue pendiente de su aprobacion
visual. Esta correccion reemplaza la composicion con pestanas documentada mas abajo.
La evidencia previa se conserva como historial, no como nueva corrida de pruebas.

* Se continua en feat/43-settings-refresh con los cambios propios de la entrega
  anterior. Main de origen 35f02c1, PR 44 mergeado. Sin checkout, commit, push o PR.
  Backend, AGENTS.md y cambios ajenos intactos; sin navegador ni auditoria visual.
* Propuesta inspeccionada en la ruta indicada por David. Sidebar y logo actuales
  conservados. SettingsPage usa todo el ancho del shell, encabezado y menu movil
  existentes. Desde 1000 px de contenedor muestra Datos 3fr y Finanzas 4fr,
  aproximadamente 43/57 por ciento, con separacion de 16 px y alineacion arriba.
  items-start evita estirar el panel corto. Debajo apila Datos primero y Finanzas despues.
* Ambos formularios permanecen montados y tienen nombres accesibles. NIT/telefono
  pasan a dos columnas desde 400 px disponibles en Datos; Gastos/Renta desde 480 px
  en Finanzas. ICA, nombre y codigo ocupan todo el ancho. Sin alturas fijas, recortes,
  campos nuevos ni copias de los valores de muestra.
* Guardados independientes: cada formulario conserva valores, initial, errores,
  envio, permisos y boton propios. Guardar uno no envia, valida ni reinicia el otro.
  Se mantienen codigo readOnly y ayuda de comision todavia no aplicada a ventas/reportes.
* Un solo UnsavedChangesGuard en SettingsPage agrega los dos estados dirty.
  Se retiran los guardianes de cada formulario para evitar multiples bloqueadores
  de React Router. Con cualquiera pendiente se protegen salida y beforeunload;
  guardar uno no libera la proteccion del otro. El descarte de navegacion es unico.
* `?tab=financiera` espera las dos cargas iniciales o sus errores y despues desplaza
  y enfoca el contenedor financiero. Una vez por entrada de historial; guardar no
  repite el salto. Entrada normal sin parametro no desplaza. Cambiar solo la query
  conserva los dos formularios y sus cambios, sin modal de descarte.
* settingsApi y reglas financieras intactos; settingsForms solo pierde parser,
  tipos y opciones de pestanas sin uso. Misma normalizacion, unidades, precision,
  limites, payloads, cache, invalidaciones y reportError. Dos acciones primarias,
  una por formulario; sin cambios de estilos ni componentes compartidos.

### Pruebas de la correccion

* Ejecucion parcial real: 426/426 correctas en siete archivos, con pool threads y
  un trabajador. SettingsPage, settingsForms, AppShell, controls, reportError, copy
  y designSystem. API simulada en Vitest/jsdom, sin comprobacion real de backend.
* Referencia anterior: 1420 casos en 65 archivos, comprobados conjuntamente en
  la entrega previa con reintento del trabajador de UserMenu. No se repite la suite
  completa en esta correccion y no se atribuye a esta corrida parcial ese total.
* Siete casos nuevos: enlace financiero frente a entrada normal con cargas
  pendientes (dos); ambos ordenes de guardado con cambios simultaneos (dos);
  descarte conjunto sin enviar; enlace financiero con error de Datos; enlace
  financiero dentro de la pagina conservando ambos cambios.
* Casos existentes adaptados: dos cargas por panel, dos ciclos de guardar/revertir,
  pantalla unificada y parametro desconocido, parametro usuarios, dos roles de solo
  lectura, guardado de datos con otro formulario invalido, guardado financiero con
  NIT invalido, dos salidas de ruta con mensaje comun y disponibilidad simultanea
  en el caso de perfil antiguo. controls deja de exigir TabList en Configuracion.
  Se conserva el resto de sus comprobaciones compartidas y las aserciones de cuerpos.
* Un caso retirado: parser de pestanas eliminado, sustituido por cobertura real de
  compatibilidad de enlaces en SettingsPage. Total esperado del repo: 1426
  (1420 anteriores + 7 nuevos - 1 obsoleto); no es una nueva suite completa.
* Se verifican payloads exactos, valores pendientes, errores sin revelar del otro
  formulario, botones independientes, un solo modal, Escape, foco, beforeunload y
  ausencia de nuevos desplazamientos tras guardar. Sin pruebas nuevas de clases CSS.
* Build, lint y git diff check correctos, sin advertencias. Se conservan los trece
  archivos propios de la rama; no se arrancan servidores ni se detienen procesos ajenos.

### Archivos y revision de esta correccion

* SettingsPage.tsx y SettingsPage.test.tsx; TenantProfileTab.tsx y FinancialSettingsTab.tsx;
  settingsForms.ts y settingsForms.test.ts; components/controls.test.tsx.
* Arquitectura, decisiones, sistema de diseno y esta nota actualizados. AppShell y su
  prueba conservan los cambios de la entrega inicial, sin nuevos cambios en esta correccion.
* Arranque: npm run dev. Revisar http://localhost:5173/configuracion y
  http://localhost:5173/configuracion?tab=financiera, usando el puerto anunciado por Vite.
  David revisa distribucion, alturas naturales, campos, ayudas, ambos guardados,
  errores, enlace financiero, permisos, movil y teclado. Sin certificar apariencia
  ni ausencia de desbordes con jsdom. Pendiente de aprobacion visual y cierre.

## Estado y alcance

Pendiente de aprobacion visual de David. No se declara completado el rediseno ni
se autoriza su cierre por los resultados automaticos. Sin navegador ni auditoria
visual automatizada; sin commit, push ni PR.

* Main inicialmente limpio; fetch origin correcto, main y origin/main en 35f02c1,
  merge del PR frontend 44 confirmado. Rama libre local/remota antes de crear
  feat/43-settings-refresh. Se conserva esa rama al terminar.
* Referencia configuracion.png inspeccionada desde la ruta proporcionada, como
  guia de composicion. Prevalecen campos, textos y contratos existentes.
* Backend no leido ni modificado. AGENTS.md y .idea intactos. Sin dependencias,
  estilos globales, servidores, navegadores ni temporales nuevos.

## Presentacion y contratos

* SettingsPage usa ListHeader con titulo, descripcion existente y menu movil
  suministrado por AppShell. Solo /configuracion se agrega a las rutas que omiten
  la barra superior. Marca, sidebar, foco, SkipLink y titulo del documento intactos.
* Ancho maximo 1024 px. TabList fill conserva seleccion, flechas, Inicio/Fin y
  asociacion tab/tabpanel. Ningun cambio del componente compartido.
* Superficies compartidas con borde superior border-accent, radio surface y
  relleno 16/24 px. Separadores en cabecera y acciones. Guardar ocupa el ancho
  disponible en movil; sin alturas fijas ni controles o indicadores decorativos.
* Datos: nombre comercial y codigo a ancho completo; NIT y telefono pasan a dos
  columnas desde 576 px disponibles dentro de la tarjeta. Ayudas y errores
  conservados. Codigo readOnly, sin incluirlo en el PUT.
* Finanzas: fieldsets Precio sugerido (gastos, renta e ICA) y Pagos con tarjeta
  (comision), misma rejilla adaptable. Aviso de recalculo sobre canvas y advertencia
  de categorias conservados, sin nueva vista de calculo ni ejemplos persistidos.
* NIT y telefono obligatorios, normalizacion, trim, payloads, consultas y claves
  de cache intactos. Guardar sigue deshabilitado solo sin cambios o al enviar;
  con errores se permite intentar para mostrarlos y enfocar el primero.
* Solo ADMIN edita en la interfaz. Se mantiene bloqueo tras 403, reportError,
  alertas/toasts, descarte al cambiar pestana, salida de ruta y beforeunload.
  Historial entre pestanas mantiene su comportamiento previo.
* settingsApi.ts y settingsForms.ts intactos: porcentajes sobre 100, ICA sobre
  1000, cuatro/tres decimales de entrada, seis en fracciones, advertencia del divisor,
  invalidacion de productos/categorias y actualizacion de nombre/KPIs sin cambio.

## Verificacion

* Evidencia de interfaz y cuerpos HTTP exclusivamente con API simulada en
  Vitest/jsdom. Sin verificacion real de backend, cifras de pantalla, exportaciones,
  permisos del servidor o aislamiento multi-tenant en esta tarea.
* Se interrumpio solo el proceso propio de la primera corrida de Vitest, que con
  el pool forks no entregaba resultados. No se presenta como suite base aprobada.
  Se uso pool threads con un trabajador, sin cambiar vite.config.ts ni package.json.
* Primera verificacion dirigida: 60/60 correctas en SettingsPage, settingsForms
  y AppShell, antes de incorporar los diez casos nuevos y ampliar los existentes.
* Primera suite completa: 1419 correctas y un fallo de expectativa en la prueba nueva
  del 403 financiero, sobre 1420 en 65 archivos. El comportamiento previo produce
  alerta en formulario y toast; la prueba esperaba una sola alerta. Se ajusta a
  comprobar los anuncios existentes sin modificar el manejo de errores.
* Base confirmada por el total y el diff de casos: 1407, mas 13 adicionales
  (10 nuevos y tres variantes de parametrizaciones), cuatro pruebas existentes
  ajustadas y cero retiradas. Total actual: 1420 casos en 65 archivos.
* Repeticion completa despues de corregir la expectativa: 1407/1407 correctas
  en 64 archivos, sin fallos de aserciones. Vitest reporto un error de infraestructura:
  Timeout waiting for worker to respond al iniciar UserMenu.test.tsx; ese archivo
  no llego a ejecutar sus trece casos. No se presenta esa corrida como exitosa.
* Reintento aislado de UserMenu.test.tsx con el mismo pool y un trabajador:
  13/13 correctas. Evidencia final conjunta: 1420/1420 casos aprobados en los
  65 archivos, en dos ejecuciones complementarias. Sin una corrida unica completa
  exitosa despues de la correccion, por el timeout del trabajador, no por aserciones.
* Comandos finales: npm test con pool threads y maxWorkers=1 para toda la suite;
  despues el mismo comando limitado a src/layout/UserMenu.test.tsx. No se cambia
  la configuracion de pruebas ni se ignora ningun caso. Configuracion pasa sus 28
  casos en la repeticion completa, incluida la nueva prueba del 403 corregida.
* npm run build y npm run lint correctos, sin advertencias; git diff check correcto.
* Ajustadas: navegacion por pestanas verifica ausencia de barra y asociacion ARIA;
  guardado de datos deja de buscar el banner retirado, conserva payload/nombre;
  solo lectura amplifica las comprobaciones de campos y agrega MECANICO ademas de
  CAJERO; menu movil del shell agrega ambas pestanas, Enter/Escape, inert y foco.
* Casos nuevos: dos cargas pendientes; dos ciclos de editar/revertir/guardar con
  envio pendiente, payload exacto, proteccion de recarga y exito; agrupacion semantica
  y ayudas; recuperacion de error de carga financiera; errores 403 y 500 al guardar;
  descarte financiero con teclado y escape; salida financiera con cancelar/descartar.
* Las aserciones existentes de normalizacion, campos obligatorios, unidades,
  precision, limites, cuerpos enviados e invalidacion se conservan. Sin pruebas
  nuevas que repliquen clases CSS.

Valores de pruebas con API simulada, sin atribuirlos a datos reales de una serviteca:

| Entrada en formulario | Esperado en PUT | Obtenido en PUT |
|-|-|-|
| Gastos 10 % | 0.1 | 0.1 |
| Renta deducible 5 % | 0.05 | 0.05 |
| ICA 8,2 por mil | 0.0082 | 0.0082 |
| Comision 3 % | 0.03 | 0.03 |
| Gastos 34,3333 % | 0.343333 | 0.343333 |
| NIT 900.123.456-7 | 900123456-7 | 900123456-7 |

Sin diferencias en esos cuerpos. El caso de datos envia solo name, nit y phone,
sin slug. Configuracion no ofrece archivos exportados para comparar.

## Revision manual y arranque

* Desde frontend: npm run dev. URL habitual http://localhost:5173/configuracion
  y http://localhost:5173/configuracion?tab=financiera; usar el puerto anunciado por
  Vite si 5173 esta ocupado. Proxy existente a localhost:8080, sin cambios.
* David revisa ambas pestanas, campos y ayudas, permisos, Guardar y Guardando,
  errores, descarte, movil y teclado. No se certifica apariencia ni ausencia de
  desbordes con jsdom. El rediseno completo sigue pendiente de aprobacion y cierre.

## Archivos

* src/settings/SettingsPage.tsx, TenantProfileTab.tsx, FinancialSettingsTab.tsx
  y SettingsPage.test.tsx.
* src/layout/AppShell.tsx y AppShell.test.tsx.
* docs/ai-context/01-ARCHITECTURE.md, 03-DECISIONS.md, 05-DESIGN-SYSTEM.md y esta nota.

Verificacion final: git diff check correcto, diez archivos de la tarea y rama
feat/43-settings-refresh conservada. Sin commit, push, PR ni procesos propios
pendientes; procesos ajenos intactos. Estado final: pendiente de aprobacion visual
de David.
