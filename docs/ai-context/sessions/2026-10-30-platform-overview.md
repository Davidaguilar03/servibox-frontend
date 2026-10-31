# 2026-10-30: Panel de plataforma, acceso, shell y Resumen (1 de 4)

Se puede continuar con el cierre Git autorizado por David el 2026-10-31.
David aprobo visualmente la ultima correccion. Sin navegador ni auditoria del agente.
Verificacion solo con API simulada en Vitest; no se ejecuto backend real ni HTTP real.
La entrega de correo sigue sin verificar (pendiente de transporte real).

## Cierre autorizado y verificacion final (2026-10-31)

* Aprobacion visual realizada por David sobre la ultima correccion: KPI compactos,
  alineacion, altura natural de Correos, iconos y distribucion movil. Autoriza
  commit y titulo de PR feat/46-platform-overview, push de la rama y PR hacia main.
  Sin coautores, merge, checkout ni apertura de la tarea 2.
* Suite completa ejecutada en este cierre: 66 archivos, 1486/1486 aprobadas,
  0 fallos y 0 pendientes, 97.29 s. Es evidencia nueva posterior a las 1485 anteriores
  y a las 357 parciales de la correccion.
* Desde la base 1449: 37 casos nuevos, 25 funcionales en platform.test.tsx (24 de la
  primera entrega mas 1 de carga) y 12 guardas automaticas (6 de diseno y 6 de copy,
  una por cada archivo de codigo nuevo). Las guardas ya existian y se parametrizan
  automaticamente al agregar archivos. 0 casos existentes ajustados, 0 retirados.
  Ningun test de la base cambia; no se agregan pruebas que dupliquen clases CSS.
* npm run build y npm run lint ejecutados de nuevo en el cierre: salida 0, sin
  advertencias de compilacion o lint. Comprobaciones de whitespace del diff de
  trabajo y staged correctas; seleccion explicita de los 17 archivos de la tarea.
* Las verificaciones funcionales usan API simulada en Vitest; no prueban HTTP real
  ni entrega real de correo. La revision visual corresponde a David, sin navegador
  ni auditoria visual del agente. Aislamiento de sesion, token, 401 y cache entre
  plataforma y tenant conservado; se reutilizan los componentes existentes.
* Revision del diff completo y de archivos nuevos: solo los archivos enumerados en
  Archivos, sin secretos detectados, fixtures locales ni artefactos temporales.
  AGENTS.md, credenciales, dependencias, Vite, backend y entorno local intactos.
* Continuidad: tarea 2, Solicitudes, con cola completa, revision, aprobacion, rechazo
  y reenvio; este cierre no inicia esa implementacion. Correo real y revision manual
  Docker global siguen pendientes. Servitecas y usuarios quedan para tareas 3 y 4.

## Correccion de presentacion (2026-10-31)

David aprobo visualmente esta correccion y autorizo commit, push y PR el 2026-10-31.
Se conserva feat/46-platform-overview. Backend y procesos del entorno local de revision
intactos; sin servidores nuevos ni navegador. El cierre no hace merge ni cambia de rama.

* KPI: reutilizan IndicatorCard compact de Productos, sin cambiar el componente ni
  otras pantallas. Icono izquierdo, titulo, cifra text-kpi y detalle derecho; mismos
  acentos verde, ambar, rojo y azul. Rejilla de 1/2/4 columnas, separacion 16 px,
  alturas iguales por fila y bloques alineados arriba para conservar las cifras
  alineadas con el desglose de usuarios. Sin ayudas vacias; cifras largas envuelven.
* Correos: altura natural y alineacion superior junto a Solicitudes, sin h-full.
  Relleno 16 px, separaciones menores y filas con iconMd Clock, MailCheck y MailX,
  etiquetas y contadores a la derecha. Fondos semanticos tenues existentes; se
  conserva la aclaracion de aceptacion del servidor sin garantia de recepcion.
* Solicitudes, fixtures, orden, limite de cinco, datos, contratos, consultas,
  autenticacion, shell y manejo de errores no se modifican en esta correccion.
* Ejecucion parcial nueva: platform.test.tsx, designSystem.test.ts y copy.test.ts,
  357/357 aprobadas en 3 archivos, 0 fallos, 16.88 s. Incluye conteos KPI y correos
  frente a respuestas simuladas, datos ausentes, ayudas y reintentos de errores.
* Un caso nuevo verifica metricas en carga sin contadores inventados, ayuda de envio
  visible y resolucion con 23 usuarios, desglose 20/3 y 11 enviados. Esperado igual
  a obtenido. 0 casos existentes ajustados o retirados; el tipo del handler de pruebas
  permite promesas para controlar la carga, sin alterar fixtures.
* En esta correccion no se repitio la suite completa: los 1485/1485 eran evidencia
  anterior. La ejecucion completa del cierre se registra por separado mas abajo.
* npm run build y npm run lint: salida 0, sin advertencias de compilacion o lint.
  git diff con comprobacion de whitespace: salida 0. Tambien comprobados los dos
  archivos de codigo corregidos aun sin seguimiento, sin errores de whitespace.
* Sistema de diseno y decision actualizados. David realizo y aprobo la revision
  visual de la ultima correccion. Sin comprobacion visual del agente ni comparacion
  con API real.

## Git y alcance

Main del frontend limpio y al dia con origin/main en 61fb790 (merge del PR 47,
feat/45-sidebar-navigation). Rama feat/46-platform-overview libre local y remota,
creada desde ese main. Backend leido en modo lectura: main en e38b594 (PR 47 backend,
platform tenants users) con V8 a V11; conserva sus cambios ajenos en .idea/compiler.xml
y .idea/servibox-backend.iml. Backend, AGENTS.md y contact.ts sin cambios.

## Contratos verificados en el backend

* POST /api/platform/auth/login: {email, password}; responde {token, admin:{id,email}}.
  401 `Credenciales invalidas` generico.
* GET /api/platform/auth/me: {id, email}; requiere PLATFORM_IDENTITY.
* GET /api/platform/metrics: {tenants:{ACTIVE,SUSPENDED}, users:{total,active,inactive},
  registrationRequests:{PENDING,APPROVED,REJECTED,CANCELLED,ACTIVATED},
  outboxMessages:{PENDING,SENT,FAILED}}. outbox solo tiene la plantilla ACTIVATION.
* GET /api/platform/registration-requests?status&page&size (size 1 a 100): {items,
  page, size, totalElements, totalPages}, orden createdAt e id descendentes. Item con id,
  status, businessName, nit, phone, slug, contactName, contactEmail, createdAt (UTC sin
  zona), reservationExpiresAt, reservationExpired, reviewedAt, reviewerId,
  rejectionReason, version y matches (null en el listado).
* Cadena de plataforma separada: JWT con identityType PLATFORM y firma propia; JWT de
  serviteca en plataforma da 401; 403 JSON `Acceso denegado` en rutas no permitidas.

## Rutas

* /plataforma/login: acceso publico, sin enlace desde la landing ni el login.
* /plataforma: Resumen, protegido por PlatformRequireAuth y PlatformShell.
* /plataforma/*: vuelve a /plataforma (o al acceso sin sesion). Sin colisiones con rutas
  de serviteca; el comodin general sigue llevando a /inicio.
* Pendientes, sin enlaces activos: /plataforma/solicitudes (2/4), /plataforma/servitecas
  (3/4) y /plataforma/servitecas/:id con usuarios (4/4).

## Separacion de autenticacion y cache

* Claves propias en sessionStorage: servibox.platform.token, servibox.platform.identity y
  servibox.platform.sessionExpired. Mismo almacenamiento que la serviteca, sin persistencia
  adicional. Cerrar una sesion no toca la otra.
* readPlatformSession exige identityType PLATFORM, exp vigente e identidad guardada.
  decodeSession de serviteca rechaza identityType PLATFORM.
* apiFetch platform: true envia solo el token de plataforma; 401 cierra solo esa sesion
  y el acceso muestra "Tu sesion vencio". Las peticiones de serviteca no cambian.
* 403 en /me: pantalla Acceso denegado con Cerrar sesion, retry false, sin redireccion.
* Cache ['platform', ...]; PlatformRequireAuth la borra al quedar sin sesion.

## Componentes reutilizados y diferencias con la referencia

AppShell (con props nuevas y valores por defecto iguales al shell de serviteca), UserMenu
(cuenta explicita opcional), IndicatorCard, DataTable con tarjetas, StatusBadge PENDIENTE,
ErrorState, Skeleton, Alert, TextField, Button, Wordmark, reportError/useReportedError.
Diferencias deliberadas: sin rotulo PLATAFORMA bajo la marca, sin Ver solicitudes, Ver
todas ni Revisar, sin bloque Usuarios (activos e inactivos van como detalle del KPI),
sin aviso rosado de correos ni pie del usuario con boton de salida aparte (Cerrar sesion
vive en el UserMenu existente). Datos de la maqueta no copiados. Sin gradientes ni sombras.

## Archivos

Modificados: src/lib/api.ts, src/auth/session.ts, src/layout/AppShell.tsx,
src/layout/UserMenu.tsx, src/routes.tsx, docs/ai-context/01-ARCHITECTURE.md,
03-DECISIONS.md, 05-DESIGN-SYSTEM.md y 06-COPY.md.
Nuevos: src/platform/platformSession.ts, platformApi.ts, PlatformRequireAuth.tsx,
PlatformShell.tsx, platform.test.tsx; src/pages/PlatformLoginPage.tsx,
PlatformOverviewPage.tsx y esta nota.

## Pruebas y evidencia de la primera entrega, anteriores al cierre

* Suite completa: 66 archivos, 1485/1485 aprobadas, 0 fallos, 85.79 s.
  Total: 1449 base mas 36 nuevas: 24 en platform.test.tsx y 12 casos parametrizados
  de las guardas (designSystem.test.ts y copy.test.ts recorren los seis archivos de
  codigo nuevos). 0 pruebas existentes ajustadas, 0 retiradas.
* Primera corrida de platform.test.tsx: 5 fallos de la propia prueba (texto duplicado por
  tabla y tarjetas, tabla leida durante la carga); corregidas las consultas, sin cambiar
  el codigo de producto.
* npm run build y npm run lint: salida 0, sin advertencias. git diff --check correcto.
* Casos nuevos: acceso propio aun con sesion de serviteca, login con cuerpo exacto sin
  Authorization, credenciales invalidas, redireccion con sesion, ruta desconocida, token
  de serviteca rechazado en plataforma y viceversa, Authorization correcto, 401 aislado,
  403 sin bucle, cierre con cache descartada, lectura de sesion, navegacion propia y
  titulo, menu de usuario, shell de serviteca intacto, KPI contra API, conteo ausente,
  fallos parciales en ambos sentidos con reintento, limite y total, campos y fecha en
  Bogota, vacio, contadores de correos y contador ausente.

## Limitaciones y continuidad

* Pruebas de esta entrega con API simulada en Vitest, sin HTTP real; contratos
  verificados por lectura del codigo. Correo real sin verificar. No se modifica ni
  detiene el backend o el entorno local usado por David.
* La lista muestra las 5 mas recientes (orden del backend); la cola completa, revision,
  aprobacion, rechazo y reenvio llegan en la entrega 2 con sus mensajes de error
  (Paginacion invalida, Solicitud no encontrada, etc.) en errorMessages.ts.
* Servitecas, suspension, reactivacion, revocacion y usuarios en entregas 3 y 4.
* Revision visual realizada y aprobada por David tras la ultima correccion.
  Sin navegador ni auditoria visual del agente. No sustituye la revision manual Docker
  global aplazada, obligatoria antes de publicar.

## Revision manual

Desde la raiz del frontend, con el backend dev disponible y un administrador de
plataforma creado con el bootstrap privado del backend:

```powershell
npm run dev
```

Abrir http://localhost:5173/plataforma/login (o el puerto que indique Vite). Revisar acceso,
error de credenciales, Resumen (KPI frente a GET /api/platform/metrics, solicitudes frente al
listado PENDING, correos), carga y errores, expandido, compacto, movil, teclado, foco,
menu de usuario y Cerrar sesion, y que /inicio con sesion de serviteca siga igual en la
misma pestana. Detener con Ctrl+C.
