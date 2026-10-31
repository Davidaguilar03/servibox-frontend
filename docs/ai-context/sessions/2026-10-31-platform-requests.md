# 2026-10-31: Panel de plataforma, Solicitudes (2 de 4)

David aprobo visualmente Solicitudes y sus nuevos filtros el 2026-10-31 y autorizo
commit, push y PR del frontend con nombre feat/47-platform-requests.
API simulada en Vitest: sin HTTP real, navegador, correos reales ni operaciones
sobre las solicitudes del entorno local de revision.

## Cierre autorizado (2026-10-31)

* Suite completa nueva del cierre: 67 archivos, 1551/1551 aprobadas, cero fallos,
  errores y pendientes, 87.98 s. Base 1486 mas 65 nuevas; no es la parcial 645
  ni la corrida completa anterior de 1533.
* Build y lint ejecutados de nuevo en el cierre: salida 0, sin advertencias de
  compilacion ni lint. Comprobaciones de whitespace del diff de trabajo y staged
  correctas. Diff staged revisado, coincidente con los archivos de trabajo aprobados.
  Seleccion explicita de los 19 archivos de la tarea, cuatro nuevos y 15 modificados;
  no incluye archivos del backend, configuracion local, fixtures ni artefactos.
* Aprobacion visual de David sobre listado, detalle, confirmaciones y nuevos filtros.
  Autoriza solo publicar frontend; sin merge, checkout, rama siguiente ni cierre backend.
* Dependencia: requiere el backend que implementa tenantName, contactName, receivedFrom
  y receivedTo, documentado en 2026-10-31-registration-request-filters.md, rama backend
  feat/48-registration-request-filters. Su cierre y publicacion son independientes;
  este PR no los realiza ni supone que ya esten integrados en main o desplegados.
  El backend anterior a esos filtros no satisface la busqueda de esta pantalla.
* Rutas finales: /plataforma/solicitudes y /plataforma/solicitudes/:id; accesos desde
  shell y Resumen. Aprobar/rechazar con expectedVersion; reenvio sin cuerpo, solo
  aprobadas vigentes. Confirmaciones, 409 con actualizacion explicita, 429 sin
  reintentos automaticos y cache platform aislada conservados.
* Cobertura revisada: listado y detalle, estados y reserva, coincidencias, payloads,
  doble envio, rechazo con motivo, 429, 409 y recuperacion, invalidaciones, sesiones,
  filtros individuales y combinados enviados por fetch, URL, historial, detalle y
  regreso, debounce, fechas abiertas, rango, total filtrado y pagina fuera de rango.
* Nuevas frente a base 1486: 61 casos en platformRequests.test.tsx mas cuatro guardas
  parametrizadas por los dos archivos nuevos de codigo, total 65. Tres casos de la
  base ajustados en platform.test.tsx: navegacion, accesos del Resumen y selector de
  celda ante el enlace nuevo. Cero retiradas. El ajuste de texto vacio durante la
  correccion afecto un caso nuevo de esta entrega, no una cuarta prueba de la base.
* Sin HTTP real ni envio real de correo verificado. Transporte y recepcion pendientes.
  Sin secretos, fixtures locales o artefactos temporales entre los archivos de la tarea.
  Backend, AGENTS.md, credenciales, datos y procesos del entorno de revision intactos.
* Continuidad: tarea 3, Servitecas; no se inicia ni se abre su rama en este cierre.

## Correccion: filtros de Solicitudes (2026-10-31)

Reemplaza las restricciones originales de solo Estado y ausencia de filtros de
nombre de esta nota. No modifica el detalle, tabla, acciones ni sus invalidaciones.
Continua en feat/47-platform-requests, conservando todo el trabajo anterior.

Contrato verificado en nota backend 2026-10-31-registration-request-filters.md,
PlatformRegistrationRequestController y RegistrationRequestService, dentro de la
estructura Maven anidada del repo hermano. Solo lectura, sin operaciones Git de escritura.

* GET listado agrega tenantName y contactName: contiene, sin distinguir mayusculas,
  sensible a acentos, texto recortado, maximo 100 caracteres, vacio equivale a ausencia;
  %, _ y barra inversa literales, escape hecho en backend, no en frontend.
* receivedFrom y receivedTo: YYYY-MM-DD como cadenas, dias completos incluidos en
  America/Bogota. Opcionales de forma independiente; ambos combinables con nombres
  y status. Respuesta, orden, page y size sin cambios; totalElements ya filtrado.
* URL con serviteca, responsable, desde, hasta, estado y pagina. Campos con debounce
  compartido de 300 ms, commit con Enter o blur y replace para no crear historial
  por letra. Cambiar cualquier filtro reinicia pagina. Limpiar borra solo esos seis
  parametros y conserva los ajenos. Detalle sigue conservando query string completa.
* Cache agrega objeto con tenantName, contactName, receivedFrom, receivedTo (vacios
  como cadena vacia y textos recortados). Mismo prefijo registration-requests:
  las invalidaciones de aprobar, rechazar y reenviar siguen incluyendo la cola.
* Rango invertido muestra error bajo Hasta y no consulta; admite Desde o Hasta solos.
  No usa UTC ni toISOString. Error de servidor conserva todos los valores y URL;
  textos largos se conservan para corregirlos, sin truncarlos silenciosamente.
* Diferencia ausencia de solicitudes de filtros sin coincidencias. Conteo y paginas
  usan totalElements del servidor; no descarga todo ni filtra filas en el cliente.
* FilterBar requests con columnas 1/2/3/6 segun ancho, campos y etiquetas sin comprimir
  en movil, Estado compartiendo fila en escritorio. DateRangeFields reutiliza Desde
  y Hasta de PeriodPicker, sin nuevo selector de periodo ni debilitar guardas.
  La extraccion mantiene la interfaz y disposicion de los periodos existentes.

Mensajes 400 exactos agregados a errorMessages.ts:

* El filtro de texto no puede superar 100 caracteres
* La fecha debe tener formato AAAA-MM-DD
* La fecha inicial no puede ser posterior a la final

Archivos de esta correccion: src/pages/PlatformRequestsPage.tsx,
src/platform/platformApi.ts, platformRequests.test.tsx, src/components/FilterBar.tsx,
PeriodPicker.tsx, src/api/errorMessages.ts y los cuatro docs de contexto ya modificados,
ademas de esta nota. Sin cambios en fixtures, credenciales, backend ni procesos locales.
Los handlers nuevos de Vitest simulan respuestas; no alteran fixtures del entorno local.

Verificacion de la correccion: 645/645 pruebas afectadas en nueve archivos, cero
fallos y cero pendientes. Incluye platformRequests, platform, useUrlTextParam,
errorMessages, lists, controls, designSystem, copy y tokens. Son 18 casos nuevos
en platformRequests.test.tsx (61 casos en ese archivo). Una prueba existente
ajustada: el vacio sin filtros ahora espera No hay solicitudes de registro;
ninguna retirada, sin modificar guardas. Al terminar esa correccion, la ultima suite
completa ejecutada era 1533/1533 en 67 archivos, 81.17 s, de la implementacion
anterior. La nueva corrida completa del cierre esta registrada al inicio de esta nota.
Primera parcial detecto campos de fecha fuera del modulo compartido; se reutilizo
PeriodPicker mediante extraccion de sus campos, sin tocar la guarda.

Evidencia numerica simulada: total filtrado 27, pagina indice 1, una fila: esperado
y obtenido 26 a 26 de 27. Cero coincidencias: esperado y obtenido 0 a 0 de 0.
Parametros combinados verificados en fetch: nombres recortados, caracteres % y _
literales, mismas cadenas de fecha, status y page=1 para pagina 2. Fecha abierta
consulta sin el otro limite. Rango invertido hace cero llamadas al listado y
conserva ambas fechas hasta corregirlo. Sin comparacion con HTTP real ni exportados.
Build y lint de esta correccion: salida 0, sin advertencias. Comprobacion final
de whitespace del diff y de los archivos nuevos sin hallazgos. Sin servidores
ni navegador iniciados; procesos y datos del entorno local conservados.

URL: http://localhost:5173/plataforma/solicitudes (o el puerto indicado por Vite).
Checklist de David: distribucion, busquedas combinadas, fechas abiertas y rango,
limpiar, paginacion filtrada, regreso del detalle, movil y teclado.
Revision visual de esta correccion aprobada por David; publicacion autorizada en el cierre.
Sin navegador ni HTTP real del agente.

## Git y limites

* Main limpio y actualizado con origin/main en d67d456, merge del PR frontend 48.
  Commit anterior 0f962235e043d6c01ad69c43624e2f49bf2c76af confirmado en el historial.
  Rama feat/47-platform-requests libre local y remota, creada desde ese main.
* Backend hermano solo lectura: controladores, DTO, servicios, excepciones,
  configuracion y pruebas RegistrationRequestTest y RegistrationActivationTest.
  Sin cambios en backend, AGENTS.md, contact.ts, contactos, login comercial,
  dependencias ni credenciales. Conserva .idea/compiler.xml y .idea/servibox-backend.iml.
* No se iniciaron ni detuvieron backend, Vite, Edge o procesos ajenos.

## Contratos verificados

Base /api/platform/registration-requests, identidad PLATFORM separada.

| Operacion | Contrato |
|-|-|
| GET listado | status, tenantName, contactName, receivedFrom y receivedTo opcionales y combinables; page desde cero, size de 1 a 100 (25 en pantalla). Sin orden configurable. createdAt e id descendentes. |
| Respuesta paginada | items, page, size, totalElements, totalPages. matches null en listado. |
| GET /{id} | Detalle con matches: requestsWithSameNit, requestsWithSameEmail, tenantsWithSameNit. Solo cantidades, sin identidades comerciales. |
| POST /{id}/approve | {expectedVersion}, 200 con detalle. Solo PENDING y reserva vigente. Encola activacion, no crea serviteca ni sesion. |
| POST /{id}/reject | {expectedVersion,reason}, 200 con detalle. Solo PENDING, incluso vencida. Motivo obligatorio tras trim, hasta 500 caracteres; libera reserva. |
| POST /{id}/resend-activation | Sin cuerpo ni expectedVersion. 202 con detalle, solo APPROVED con reserva vigente. Revoca enlaces abiertos y encola nuevo correo. |

Campos de detalle: id, status, businessName, nit, phone, slug, contactName,
contactEmail, createdAt, reservationExpiresAt, reservationExpired, reviewedAt,
reviewerId, rejectionReason, version, matches. Las fechas LocalDateTime vienen
en UTC sin zona; listado y detalle las muestran con hora de Bogota. El Resumen
conserva su fecha, su orden y sus cinco pendientes originales.

Estados PENDING, APPROVED, REJECTED, CANCELLED, ACTIVATED. La reserva puede vencer
sin cambiar inmediatamente el estado. Rechazar sigue permitido si es PENDING.
No se confunde reservationExpiresAt con vencimiento del enlace de activacion.
El frontend tambien comprueba esa fecha al confirmar aprobar o reenviar.
Las coincidencias no bloquean decisiones ni demuestran duplicidad.

Configuracion actual por defecto: intervalo de reenvio 60 s, cinco reenvios en
24 h moviles, reserva pendiente 7 d, aprobada 30 d, enlace 24 h. Son configurables;
el DTO no expone ultimo envio, cupo, vencimiento del enlace ni espera restante.
La pantalla no inventa cifras ni temporizadores: conserva mensajes 429 del servidor
y ofrece solo reintento manual. Aceptacion del transporte no garantiza recepcion.
No se detectaron incompatibilidades que impidieran las acciones pedidas.

## Rutas, navegacion y cache

* /plataforma/solicitudes: todos los estados por defecto, filtros Serviteca, Responsable,
  Desde, Hasta y Estado; 25 filas por pagina del servidor. URL con serviteca, responsable,
  desde, hasta, estado y pagina; pagina de interfaz desde uno.
  Cambiar filtro reinicia pagina. Parametros invalidos no se envian al backend.
  Si desaparece la pagina actual, replace a la ultima disponible o a la primera.
* /plataforma/solicitudes/:id: recargable; conserva parametros de listado y
  Volver a solicitudes los restaura. Acceso directo sin parametros vuelve sin filtro.
* Shell agrega Solicitudes; Resumen agrega Ver todas (PENDING) y Revisar por fila
  y tarjeta. Consulta del Resumen conserva status=PENDING, page=0, size=5.
* Claves de listado: ['platform','registration-requests','list',estado,pagina,filtros].
  Detalle: ['platform','registration-requests','detail',id]. Tras exito se invalida
  registration-requests (tambien las cinco pendientes) y ['platform','metrics'].
  La sesion comercial y su cache permanecen aisladas. 401 cierra solo plataforma.

## Confirmaciones y recuperacion

* Identifican nombre comercial, codigo y correo. Una sola confirmacion activa,
  botones ocupados y bloqueo sincrono contra doble envio. Durante envio no cierra.
* Aprobar explica enlace y creacion mediante activacion. Rechazar explica liberacion
  de reserva y valida motivo al salir y enviar, con foco y anuncio accesible.
  Reenviar confirma revocacion del anterior y limites del servidor.
* DiscardableModal protege el motivo al cerrar con cambios. Modal compartido
  conserva teclado, foco inicial, ciclo de Tab, Escape y retorno al disparador.
* Error mantiene formulario. reportError inlineOnly dentro de la confirmacion
  permite ver validacion, 403, 404, 409, 429 y errores de red sin perder el motivo.
  Un 409 o 404 durante una accion bloquea confirmar y ofrece Actualizar solicitud.
  La version inicial de la confirmacion no cambia por refetch de fondo.
* Actualizacion explicita relee detalle y mantiene motivo; si falla, conserva error
  y bloqueo. Si el nuevo estado impide la accion, informa y no permite enviarla.
  Si permite, requiere otra confirmacion con la version actualizada.
* Carga, error con Reintentar, sin resultados y detalle inexistente diferenciados.
  El 404 del GET detalle no genera toast. No se muestran secretos ni enlaces de acceso.

## Mensajes exactos agregados al mapa

* Paginacion invalida
* Solicitud no encontrada
* El motivo de rechazo es obligatorio
* El motivo de rechazo no puede superar 500 caracteres
* La version esperada es obligatoria
* El codigo solicitado no esta disponible
* La solicitud ya no permite esta operacion
* El recurso cambio; actualiza e intenta de nuevo
* Espera un momento antes de reenviar la activacion
* Se alcanzo el limite diario de reenvios de esta solicitud

Los dos limites usan 429; version, estado y codigo 409; validacion 400; inexistente
404. El 410 pertenece al consumo publico de la activacion, fuera de esta entrega;
aprobar y reenviar con reserva vencida responden 409, no 410.

## Diseno y diferencias deliberadas

Referencia platform-requests-v1.png inspeccionada como archivo local, sin navegador.
No se regenero ni se agrego al bundle. Reutiliza shell, ListHeader, FilterBar,
SelectField, DataTable, CellLink, Pagination, StatusBadge, Button, TextField, Alert,
ErrorSummary y DiscardableModal. Sin tokens nuevos ni barra superior redundante.
La tabla y el detalle tienen pantallas separadas para lectura y recarga.
Filtros de nombre y fechas segun contrato, sin datos ficticios copiados ni enlaces a
Servitecas sin implementar.
Tarjetas bajo md con los mismos datos y accion; detalle apila secciones y distribuye
datos en dos columnas desde sm. Revision movil y visual aprobada por David.

## Archivos

Nuevos: src/pages/PlatformRequestsPage.tsx, PlatformRequestDetailPage.tsx,
src/platform/platformRequests.test.tsx y esta nota.
Modificados: src/platform/platformApi.ts, PlatformShell.tsx, platform.test.tsx,
src/pages/PlatformOverviewPage.tsx, src/routes.tsx, src/components/StatusBadge.tsx,
src/copy/glossary.ts, src/api/errorMessages.ts, src/lib/format.ts,
src/components/FilterBar.tsx y PeriodPicker.tsx,
docs/ai-context/01-ARCHITECTURE.md, 03-DECISIONS.md, 05-DESIGN-SYSTEM.md, 06-COPY.md.

## Evidencia anterior al cierre

* Parcial funcional: platform.test.tsx y platformRequests.test.tsx, 68/68 aprobadas.
* npm run build y npm run lint: salida 0, sin advertencias.
* Suite completa npm test: 67 archivos, 1533/1533 aprobadas, cero fallos y cero
  pendientes, 81.17 s. Total 1486 base mas 47 nuevas. Sin navegador ni HTTP real.
* git diff con comprobacion de whitespace: salida 0. Archivos nuevos comprobados
  tambien con diff sin indice contra NUL, sin errores de whitespace.
* Base 1486. Nuevas: 43 casos de comportamiento y mensajes en platformRequests.test.tsx
  y cuatro guardas parametrizadas (dos archivos de codigo nuevos, diseno y copy).
  Ninguna prueba retirada ni guarda debilitada.
* Tres pruebas existentes ajustadas en platform.test.tsx: navegacion del shell incluye
  Solicitudes; limite de cinco verifica accesos nuevos; datos de solicitud identifica
  la celda sin confundirla con el enlace Revisar. Conservan comprobaciones anteriores
  de datos, orden, limite, fechas y aislamiento aplicables.
* Comparacion numerica simulada: API total 51, pagina indice 1 con una fila:
  esperado y obtenido 26 a 26 de 51. Pagina fuera de rango, total 26:
  esperado y obtenido ultima pagina 2 y 26 a 26 de 26.
  Coincidencias API 2/3/1, esperado y obtenido pantalla 2/3/1. Resumen sigue size=5.
  Version esperada 3 en aprobar/rechazar; tras conflicto, esperado y obtenido 4.
* Primeras ejecuciones parciales detectaron selectores ambiguos por los enlaces nuevos
  y aserciones durante skeleton; corregidas las pruebas para esperar datos.
  No se adapto producto para ocultar errores de pruebas.
* Sin HTTP real ni comparacion con la API del entorno local; sin archivos exportados
  porque esta pantalla no exporta. No se enviaron correos ni se mutaron datos locales.
* Revision original antes de filtros: 17 archivos de la tarea, sin cambios ajenos en frontend; backend
  conserva solo sus dos cambios previos de .idea. Sin commit, push ni PR.

## Revision manual y continuidad

Desde la raiz frontend, con el backend de revision ya disponible: npm run dev.
Usar el puerto que indique Vite (habitualmente http://localhost:5173).

* /plataforma/login y /plataforma: acceso y enlaces del Resumen.
* /plataforma/solicitudes: listado, filtro, limpiar, paginas y URL.
* /plataforma/solicitudes/:id: detalle, recarga, regreso, coincidencias y reserva.
* Confirmaciones: identidad, consecuencias, motivo, cancelar y conservar cambios.
* Errores y conflictos: actualizar explicitamente, mantener motivo y version nueva.
* Reenvio: solo aprobadas vigentes, 429 sin temporizador ni garantia de entrega.
* Movil y teclado: menu, tarjetas, datos largos, Tab, Shift+Tab, Escape y foco.

No ejecutar aprobar, rechazar o reenviar sobre el entorno local sin autorizacion
especifica de David; los comportamientos que mutan datos ya usan fixtures simulados.
Siguientes entregas: Servitecas y detalle con usuarios. No implementados aqui.
