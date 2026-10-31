# 2026-10-31: Panel de plataforma, detalle de serviteca (4 de 4)

Rama feat/49-platform-tenant-detail desde main en 9c3bd3e (merge PR 50,
feat/48-platform-tenants). Sin commit, push ni PR: quedan para el prompt de cierre.
Sin navegador ni capturas; la revision visual es de David. Pruebas con API simulada
en Vitest, sin HTTP real. Ningun endpoint de escritura se llamo contra el backend de
revision; no se inicio, detuvo ni reinicio nada de ese entorno.

## Hallazgos del paso 0

* Main limpio, igual a origin/main, incluye el PR 50. Numero libre del frontend: 49.
* Backend en solo lectura (main bfe982e): PlatformTenantController, PlatformTenantService,
  DTO de platform.dto, PlatformTenantConflictException, UserRepository, Role,
  GlobalExceptionHandler y nota 2026-10-30-platform-tenants-users.md.
* GET /api/platform/tenants/{id}: {tenant:{id,name,slug,nit,phone,status,version,
  createdAt,suspendedAt,suspensionReason}, totalUsers, userCounts:[{role,active,count}],
  registrationRequest:{id,status,createdAt,reviewedAt} o null}. Coincide con el prompt.
  userCounts solo trae combinaciones con usuarios (group by); roles ADMIN, MECANICO, CAJERO.
* GET /{id}/users: page (defecto 0) y size (defecto 25, 1 a 100; fuera de rango 400
  Paginacion invalida); orden id ascendente; item {id, username, fullName (puede ser
  null), email (puede ser null), role, active, createdAt, updatedAt}. Sin hash ni
  authVersion. 404 Tenant no encontrado si no existe.
* POST /{id}/suspend y /{id}/reactivate: {expectedVersion, reason}; 200 con el detalle.
  Orden: motivo (recortado; vacio es null; mas de 500 da 400), version esperada nula da
  400 "La version esperada es obligatoria", bloqueo, 404, version distinta 409, transicion
  409. La version solo sube aqui. Reactivar borra fecha y motivo de suspension.
* POST /{id}/users/{userId}/revoke y /{id}/revoke-sessions: cuerpo OPCIONAL con solo
  reason (no lo pide el prompt; no se envia). Revoke de usuario es idempotente y devuelve
  el usuario; revoke-sessions devuelve {tenantId, revokedUsers}, que cuenta TODOS los
  usuarios del tenant (activos e inactivos), no solo los que tenian sesion.
* Mensajes exactos: 404 "Tenant no encontrado", 404 "Usuario no encontrado", 400
  "El motivo de suspension es obligatorio", 400 "El motivo no puede superar 500
  caracteres", 409 "El tenant ya esta suspendido", 409 "El tenant ya esta activo",
  409 por version "El recurso cambio; actualiza e intenta de nuevo" (mismo texto que
  Solicitudes, ya mapeado con la palabra solicitud), 400 "La version esperada es
  obligatoria" (tambien compartido).
* Diferencias con el prompt: ninguna de contrato. Matiz: revokedUsers no es "sesiones
  activas cerradas" sino usuarios tocados; el texto dice "Sesiones cerradas: N usuarios".
* Imagen guia platform-tenant-detail-v1.png: Volver, nombre con insignia, Datos y Acceso
  lado a lado, Usuarios con tres tarjetas de cifras, tabla con Cerrar sesion solo en
  activos y paginacion. Cifras, nombres y bordes superiores de color son de maqueta.

## Decisiones

* Ruta /plataforma/servitecas/:id con migas Servitecas y Detalle de serviteca. La fila
  del listado lleva CellLink "Ver detalle" con la query string; Volver la restaura.
* Datos: Codigo, NIT, Telefono, Creada; Suspendida desde y Motivo solo si esta suspendida.
  Version e id no se muestran (la version solo viaja en expectedVersion).
* Solicitud de registro: estado, Recibida, Revisada y enlace a /plataforma/solicitudes/:id;
  si es null, "Sin solicitud asociada: se registro directamente."
* Usuarios: resumen en dl (Total, Activos, Inactivos y una linea por rol presente) en vez
  de tarjetas KPI de la maqueta, para no repetir el Resumen. Tabla Usuario (y nombre),
  Correo, Rol, Estado, Creado, Actualizado y Acciones. Pagina de usuarios en estado local
  (no en la URL, donde pagina es del listado). Carga, error con Reintentar y vacio propios.
* Suspender y Cerrar todas las sesiones solo con la serviteca activa; Reactivar solo
  suspendida. Cerrar sesiones por usuario solo en usuarios activos de serviteca activa:
  los inactivos no pueden entrar y la suspension ya cerro todo. Asi lo muestra la guia.
* Motivo con TextField y contador en la ayuda ("Obligatorio. N de 500 caracteres.");
  se valida al salir y al confirmar sobre el texto recortado; escribir limpia el error.
  No se usa maxLength para no cortar en silencio un texto pegado.
* 409: la confirmacion relee el detalle sin cerrarse, conserva el motivo, muestra el
  mensaje del backend y toma la version nueva; si el estado ya no permite la accion,
  avisa y deshabilita confirmar. Si la relectura falla, bloquea confirmar y ofrece
  Actualizar serviteca. 404 en una accion: toast, cierra y el detalle muestra la vuelta.
* Contexto 'tenant' en userMessage, mapBackendMessage y reportError (TENANT_RULES) para
  los dos mensajes compartidos con Solicitudes; Solicitudes no cambia.
* Exito invalida ['platform','tenants'] y ['platform','metrics']; la cache comercial no
  se toca. Doble envio: bloqueo sincrono con ref mas botones deshabilitados.

## Mensajes agregados a errorMessages.ts

| Backend | Pantalla |
|-|-|
| Tenant no encontrado | No encontramos esta serviteca. Puede que ya no exista. |
| Usuario no encontrado | No encontramos ese usuario en esta serviteca. Puede que ya no exista. |
| El motivo de suspension es obligatorio | Escribe el motivo de la suspensión. |
| El motivo no puede superar 500 caracteres | El motivo no puede superar 500 caracteres. |
| El tenant ya esta suspendido | La serviteca ya estaba suspendida. Revisa los datos actualizados. |
| El tenant ya esta activo | La serviteca ya estaba activa. Revisa los datos actualizados. |
| El recurso cambio; actualiza e intenta de nuevo (contexto tenant) | La serviteca cambió mientras la revisabas. Revisa los datos actualizados antes de confirmar. |
| La version esperada es obligatoria (contexto tenant) | Actualiza la serviteca antes de continuar. |

## Archivos

Nuevos: src/pages/PlatformTenantDetailPage.tsx, src/platform/platformTenantDetail.test.tsx
y esta nota. Modificados: src/platform/platformApi.ts, src/pages/PlatformTenantsPage.tsx,
src/routes.tsx, src/api/errorMessages.ts, src/api/reportError.ts,
src/api/errorMessages.test.ts, src/platform/platformTenants.test.tsx y
docs/ai-context/01-ARCHITECTURE.md, 03-DECISIONS.md, 05-DESIGN-SYSTEM.md y 06-COPY.md.

Componentes reutilizados: ListHeader, DataTable con tarjetas, Pagination, StatusBadge
(ACTIVE, SUSPENDED, ACTIVO, INACTIVO y estados de solicitud), CellLink y CellButton,
DiscardableModal, TextField, ErrorSummary, Alert, Button, EmptyState, ErrorState,
Skeleton, showToast, useReportedError, roleLabel y formatPlatformDate.

## Evidencia

* Suite completa npm test: 69 archivos, 1611/1611 aprobadas, cero fallos, 84.40 s.
  Base 1569 mas 42 nuevas: 33 en platformTenantDetail.test.tsx, 7 en
  errorMessages.test.ts (6 filas de la lista BACKEND y 1 caso de contexto) y 2 guardas
  parametrizadas (designSystem y copy) por el archivo de codigo nuevo.
* Una prueba base ajustada: platformTenants.test.tsx, el caso de campos del contrato
  esperaba que no hubiera enlace de detalle; ahora espera la columna Acciones y el enlace
  "Ver detalle de Serviteca El Roble" a /plataforma/servitecas/7. Ninguna retirada;
  guardas sin cambios.
* npm run build y npm run lint: salida 0, sin advertencias. Comprobacion de whitespace del diff sin
  hallazgos; archivos nuevos comprobados con diff sin indice.
* Primera corrida: 10 fallos de las propias pruebas (tabla y tarjetas
  duplican textos y botones, token comercial recalculado con otra hora, href sin "?",
  espera sincrona del error) y 2 de producto corregidos: el contador quedaba oculto por
  un error ya corregido (ahora escribir limpia el error) y la relectura tras 409 repetia
  la consulta del detalle (ahora invalida sin volver a pedirlo).
* Cobertura simulada: activa y suspendida, con y sin solicitud de origen, desglose por
  rol y estado, campos del contrato sin hash ni authVersion aunque la API los enviara,
  sin version ni id, paginacion de usuarios (page=1 al ir a la pagina 2, 26 a 26 de 30)
  sin tocar la URL del listado, carga, error y vacio de usuarios independientes, enlace
  del listado y vuelta con filtros, suspender con motivo obligatorio, espacios, 501 y
  500 caracteres, cuerpo {expectedVersion:2, reason:"Mora"} recortado, reactivar sin
  motivo {expectedVersion:3} y con motivo, limite al reactivar, doble envio con Escape
  y Cancelar bloqueados, 409 por version (segundo envio con version 5), 409 por estado
  en suspender y reactivar, relectura fallida, tres 400 mapeados, 404 al cargar y
  durante una accion, revocar usuario sin cuerpo, revocar todas con cantidad (3 y 1),
  cancelar sin POST, error 500 con reintento, invalidacion de listado, metricas,
  detalle y usuarios sin tocar ['tenant'], redireccion sin sesion de plataforma y 401
  que cierra solo la de plataforma.

## Limitaciones

* Pruebas solo con API simulada. No se probo contra el backend de revision porque las
  acciones mutan datos reales.
* revokedUsers cuenta usuarios del tenant, no sesiones abiertas; no hay forma de saber
  cuantas sesiones existian.
* Sin auditoria visible, borrado (tarea 5B), edicion ni gestion de usuarios: la API no
  lo permite. updatedAt de un usuario no cambia al cerrar sus sesiones.
* Tenants suspendidos antes de V11 pueden no tener motivo: se muestra un guion.

## Revision manual de David

Con el backend de revision disponible: npm run dev y abrir
http://localhost:5173/plataforma/servitecas (o el puerto de Vite).

* Ver detalle desde la tabla y desde tarjetas (movil); Volver conserva busqueda, estado
  y pagina; recarga del detalle.
* Datos frente a GET /api/platform/tenants/{id}: activa, suspendida con motivo, la
  reactivada sin motivo, y demo (sin solicitud de origen). Enlace a la solicitud.
* Resumen de usuarios frente a userCounts y tabla frente a /users; usuario sin nombre
  o correo; Cerrar sesiones solo en activos.
* Confirmaciones: textos, contador, error de motivo, foco, Escape, descartar cambios.
  Solo en una serviteca de prueba: suspender, reactivar, cerrar sesiones de un usuario y
  de toda la serviteca, y comprobar que el usuario debe iniciar sesion de nuevo.
* Distribucion lg (Datos y Acceso lado a lado), apilado en movil, nombres y motivos
  largos, teclado.
