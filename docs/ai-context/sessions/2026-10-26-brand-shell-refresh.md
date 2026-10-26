# 2026-10-26: Marca provisional y base compartida del shell

Revision tecnica y revision visual aprobadas por David tras corregir la S y mover el
control del sidebar arriba. El cierre autoriza commit, push y PR a main. No se abrieron
ni automatizaron navegadores, no se tomaron capturas ni se declara una auditoria visual
propia. La regla de revision manual reemplaza las instrucciones previas de
navegador del agente; queda en 02-CONVENTIONS y 03-DECISIONS sin modificar AGENTS.md.

## Correccion posterior a la revision de David

Se conserva la rama y todos los cambios anteriores. David aprobo la ubicacion inferior de
Configuracion y usuario y los acentos de Inicio; se conservan sin extender KPIs ni cambiar
el periodo. David aprobo despues la revision visual de esta tarea, incluidas las correcciones.

* Causa de la S: trazado manual asimetrico y sesgado externo. Sus limites transformados
  eran x=7.2224 a 45.9614, y=15 a 52, centro aproximado 26.59/33.5 en un cuadrado de 64.
  No se encontro dependencia de fuente, falta de viewBox o recorte de extremos: el defecto
  encontrado es de forma y alineacion del vector, no de carga del recurso.
* Solucion: contorno de la S de Montserrat 700 ya instalada en node_modules, convertido a
  path con escala uniforme e inclinacion de 12 grados incorporada en las coordenadas.
  Limites nuevos x=17.072 a 46.928, y=16 a 48, centro 32/32. Sin transformacion externa,
  texto SVG ni fuente requerida en ejecucion. preserveAspectRatio explicito; Wordmark y
  su composicion no cambian. El mismo SVG sirve como simbolo y favicon, sin variante optica.
  FontTools ya disponible se uso solo para preparar el contorno, sin agregar dependencias.
* Control de ancho movido del pie a la cabecera del sidebar. Expandido: junto al logo;
  compacto: fila propia debajo del simbolo. Boton de 44, title y nombre accesible,
  aria-expanded y foco visible; conserva preferencia y puntos de corte. En movil no se
  agrega boton de ancho ni se altera el cierre existente por Escape, fondo y navegacion.
  Configuracion y usuario conservan ubicacion, orden y acciones aprobados.
* Huella de llanta: no hay referencia documentada. Recuperarla queda como propuesta
  grafica pendiente de aprobacion, no implementada.
* Pruebas: 3 casos nuevos sobre base actual 1258: geometria del vector sin
  transformaciones externas, control superior expandido y compacto con teclado, foco,
  estado y persistencia. Se amplia el caso movil existente para descartar botones de
  ancho redundantes. Sin pruebas eliminadas. Suite completa: 1261 correctas, 64 archivos,
  0 fallos u omisiones, 64.50 s. Se conservan usuario, cierre de sesion, foco y persistencia.
* Verificacion de esta correccion: npm run build y npm run lint con salida 0, sin
  advertencias; git diff con comprobacion de espacios sin errores. dist/index.html declara
  un unico favicon assets/symbol-D3o0acvJ.svg, comprobado identico al vector fuente.
  Estos resultados actualizan los de la primera entrega, conservados abajo como registro.
* Archivos tocados en esta correccion: symbol.svg, AppShell.tsx, Wordmark.test.tsx,
  AppShell.test.tsx, 01-ARCHITECTURE.md (ubicacion del control), 05-DESIGN-SYSTEM.md y
  esta nota. No se agregaron archivos nuevos, dependencias ni cambios en otros componentes.
* No se abrieron navegadores ni se tomaron capturas. No se detuvieron backend o Vite de
  David. Revision visual aprobada por David, incluida la S y el control superior.

## Git y referencias

Rama feat/32-brand-shell-refresh. Arbol inicial limpio, fetch completado; main, HEAD y
origin/main coincidieron en 41a9f8d2c641540efbc02139efcf05aa6693ac58. PR 33 del frontend,
fix/31-monetary-compatibility, MERGED el 2026-10-26T01:21:34Z. Rama local ausente antes
de crearla. No se modifico ni se consulto el backend.

Leidos AGENTS.md, documentos numerados y notas touch-targets-and-controls y
monetary-compatibility (ultima tarea mergeada), log y fuentes relevantes.
Inspeccionadas las cinco referencias autorizadas en
C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/:
logo-reference.png, inicio.png, inventario.png, ventas.png y configuracion.png.
No se copiaron imagenes de referencia al repositorio ni datos o controles generados.

## Cambios

* symbol.svg dibuja la S blanca inclinada dentro del cuadrado rojo redondeado. BrandSymbol
  lo reutiliza y Wordmark compone el nombre inclinado con Montserrat existente. Es una
  interpretacion provisional, pendiente de archivos oficiales. Compacto y expandido
  comparten simbolo, proporciones y nombre accesible. Los enlaces publicos conservan /;
  el shell enlaza su marca a /inicio con area tactil y nombre accesible.
* index.html declara un solo favicon SVG desde el mismo recurso. Sin iconos anteriores,
  manifest, apple-touch-icon ni dependencias nuevos. Titulos descriptivos intactos.
* Sidebar carbon, seleccion nav-active con borde lateral e icono brand. Operaciones sin
  cambios de rutas; Configuracion separada abajo. UserMenu unico en el pie con identidad,
  serviteca y rol reales, panel hacia arriba y scroll propio con altura limitada. En
  compacto sigue disponible con iniciales, nombre accesible y title. No se agregan acciones.
* Navegacion operativa con scroll y min-h-0, pie fuera de ese scroll. Se conservan defaults
  1024/1280, preferencia con try/catch, inert, foco atrapado, Escape, retorno de foco,
  SkipLink, breadcrumbs y titulos. Escape en UserMenu cierra primero ese panel en movil.
* IndicatorCard admite acento e icono opcionales. Inicio muestra ventas success, costo
  warning, bruta info y neta brand con datos, orden, formulas y signo sin cambios.
  DataTable comparte contorno y borde superior tenue, tambien en sus tarjetas moviles.
  Sin sombras en tarjetas, degradados ni movimiento ornamental.
* Tokens nuevos nav-active y border-accent. Se amplian pares de contraste y se restringe
  la excepcion de text-title de marca a Wordmark; AppShell ya no dibuja una S tipografica.
  Se mantienen guardas de diseno y copy. Sin cambios monetarios, de API o autenticacion.

## Pruebas y ajustes existentes

Base informada: 1233. No se ejecuto main ni una copia para contarla. Suite completa final:
1258 = 1233 + 25, 64 archivos, 0 fallos, bajas u omisiones, 58.61 s. Los 25 adicionales
son 4 de marca/favicon, 5 de shell, 3 de UserMenu, 4 de acentos, 7 pares de contraste y 2
comprobaciones de guardas sobre BrandSymbol. Build y lint finales con salida 0.

Casos nuevos: marca completa/compacta y enlaces publicos, favicon unico y compartido con
el simbolo y su token; Configuracion separada/activa; limites 1024, 1279 y 1280; fallo de
lectura/escritura de la preferencia; usuario compacto y cierre de sesion; Escape anidado
en movil y ciclo de foco desde Cerrar sesion; cuatro acentos sin cambiar texto, signo ni
error; nuevos pares de contraste. Las guardas recorren tambien BrandSymbol.

Pruebas existentes ajustadas, sin bajas:

* AppShell.test.tsx: foco inicial en el nuevo enlace de marca y ultimo control movil en
  UserMenu, conservando la trampa de foco y Escape.
* UserMenu.test.tsx: ubicacion inferior y ausencia del usuario en el header, con rol real.
  Se conservan pruebas de apertura, cierre, foco, clic fuera, cambio de ruta y logout.
* DashboardPage.test.tsx: usuario y serviteca en el sidebar; breadcrumbs siguen arriba.
* SettingsPage.test.tsx: nombre actualizado tras PUT en el sidebar y ausente del header;
  cuerpo del PUT e identidad guardada siguen comprobados.
* designSystem.test.ts: se retira AppShell de la excepcion de marca para text-title; no se
  relajan reglas. tokens.test.ts y surfaces.test.tsx agregan casos, sin quitar anteriores.

La primera suite completa detecto una expectativa antigua en SettingsPage: buscaba el
nombre guardado en la barra superior. Se ajusto al pie lateral conservando el proposito.
Dos fallos iniciales de pruebas nuevas fueron corregidos: matcher sobre documento XML
separado y mock de preferencia que interferia con la sesion. La prueba del recurso compartido
tambien se ajusto para comparar el SVG real cuando Vite lo incluye como data URI en lugar
de exigir la misma URL que el favicon. Los cuatro casos de marca y luego la suite completa
pasaron tras ese ajuste.

## Verificacion automatica

* npm run build: salida 0, sin advertencias. Vite emite assets/symbol-DFdvvGoh.svg.
* npm run lint: salida 0, sin advertencias.
* Recursos de produccion: un favicon en dist/index.html, archivo emitido identico al SVG
  fuente y marca incluida en el JavaScript de produccion. Peticiones HTTP a preview
  temporal: HTML 200 y SVG 200 con Content-Type image/svg+xml y contenido identico.
  Servidor temporal cerrado al terminar, sin navegador.
* git diff y archivos nuevos revisados: 20 modificados y 4 nuevos, sin referencias raster
  copiadas, temporales, credenciales ni dependencias nuevas. git diff con comprobacion de
  espacios: salida 0. AGENTS.md y archivos de dependencias intactos. Git en el sandbox
  avisa que no puede leer el ignore global del usuario; status y diff se completaron.

## Archivos de la tarea

Modificados:

* index.html.
* src/brand/Wordmark.tsx y WordmarkLink.tsx.
* src/layout/AppShell.tsx, AppShell.test.tsx, UserMenu.tsx y UserMenu.test.tsx.
* src/components/IndicatorCard.tsx y DataTable.tsx.
* src/pages/DashboardPage.tsx y DashboardPage.test.tsx.
* src/settings/SettingsPage.test.tsx.
* src/styles/tokens.css, tokens.test.ts, designSystem.test.ts y surfaces.test.tsx.
* docs/ai-context/01-ARCHITECTURE.md, 02-CONVENTIONS.md, 03-DECISIONS.md y
  05-DESIGN-SYSTEM.md.

Nuevos: src/brand/BrandSymbol.tsx, src/brand/symbol.svg, src/brand/Wordmark.test.tsx y
esta nota de sesion.

## Limites y revision manual de David

El logotipo es provisional; no se presenta como marca oficial. La prueba de fallo de
localStorage cubre la preferencia del sidebar; no cambia el almacenamiento de sesion.
No hubo pruebas visuales ni comparacion de pantalla/API/exportados en esta tarea de
presentacion. Las pruebas monetarias existentes siguen siendo la comprobacion automatica;
la revision visual de esta tarea fue aprobada por David. No se declara auditoria global
de desbordes propia.

Arranque desde el frontend: npm run dev con host 127.0.0.1 y port 5173 (opciones habituales
de Vite); URL http://127.0.0.1:5173/inicio. Requiere backend ya disponible, proxy por defecto
http://localhost:8080. No se dejaron procesos de la app activos.

La lista entregada a David incluia logo publico/privado y favicon a 16/32 px; expandido/compacto y
persistencia; movil y poco alto; usuario inferior, apertura hacia arriba y Cerrar sesion;
Configuracion y rutas activas; bordes de indicadores/tablas y cifras con centavos.

Estado: revision tecnica y visual aprobadas por David; cierre autorizado en esta rama,
sin merge ni cambio de rama. Los resultados anteriores describen cada etapa; las cifras
finales del cierre se registran a continuacion.

## Verificacion de cierre del 2026-10-26

* Revision tecnica y visual aprobadas por David tras la correccion de la S y la ubicacion
  superior del control. La aprobacion es de David, sin auditoria de navegador propia.
* npm test: 1261 = 1233 base + 28 nuevas, 64 archivos, sin bajas, fallos u omisiones,
  77.24 s. Las 28 adicionales son las 25 de la primera entrega y las 3 de la correccion.
* npm run build y npm run lint: salida 0, sin advertencias. Favicon final
  assets/symbol-D3o0acvJ.svg comprobado por HTTP 200, Content-Type image/svg+xml y contenido
  identico al SVG fuente; HTML tambien 200. Preview temporal propio cerrado al terminar.
* Revision de status, diff y nuevos: 20 modificados y 4 nuevos, solo de esta tarea.
  Sin credenciales, capturas de referencia, scripts temporales, logs ni mediciones.
  Backend y AGENTS.md no modificados. No se detuvieron procesos ajenos.
* GitHub CLI autenticado y sin PR existente para la rama al iniciar el cierre. Se autoriza
  commit con mensaje feat/32-brand-shell-refresh, push y PR a main con el cuerpo exacto
  solicitado. Hash, estadisticas y URL se reportan despues de publicar, sin merge ni
  cambio de rama. El archivo temporal del cuerpo se elimina despues de usarlo.
* Pendientes: marca oficial y propuesta aprobada para la huella de llanta, modernizacion
  especifica de las demas pantallas y posible selector de periodo en la tarea de Dashboard.
  No se declara auditoria global de desbordes propia.
