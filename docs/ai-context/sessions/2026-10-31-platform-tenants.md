# 2026-10-31: Panel de plataforma, Servitecas (3 de 4)

Rama feat/48-platform-tenants desde main en 3e26235 (merge PR 49). Sin commit, push
ni PR: quedan para el prompt de cierre. Sin navegador ni capturas; la revision visual
es de David. Pruebas con API simulada en Vitest, sin HTTP real.

## Hallazgos del paso 0

* Main limpio y al dia con origin/main; incluye PR 48 (feat/46-platform-overview) y
  PR 49 (feat/47-platform-requests). Numero libre del frontend: 48.
* Backend en solo lectura (main bfe982e): PlatformTenantController, PlatformTenantService,
  TenantRepository.search, PlatformTenantResponse y nota 2026-10-30-platform-tenants-users.md.
  Se conservan sus cambios ajenos en .idea; no se inicio ni reinicio nada.
* GET /api/platform/tenants: status (enum ACTIVE o SUSPENDED, opcional), q opcional,
  page (defecto 0) y size (defecto 25, 1 a 100; fuera de rango 400 Paginacion invalida).
* q: trim y minusculas en backend; mas de 100 caracteres da 400 "La busqueda no puede
  superar 100 caracteres". Busca "contiene" con lower() SOLO en name y slug, con %, _ y
  barra invertida escapados (literales). No busca NIT, telefono ni otros campos.
  La maqueta dice "Nombre, codigo o NIT": no coincide con el contrato; se sigue el codigo.
* Respuesta {items,page,size,totalElements,totalPages}; item {id,name,slug,nit,phone,
  status,version,createdAt,suspendedAt,suspensionReason}, fechas UTC sin zona.
  Orden fijo createdAt desc e id desc. Reactivar borra suspendedAt y suspensionReason.
* /api/platform/metrics solo tiene tenants.ACTIVE y tenants.SUSPENDED, ya mostrados como
  KPI en el Resumen. No hay filtros de responsable ni de fecha para servitecas.
* Referencia platform-tenants-v1.png: titulo, tres KPI, Buscar y Estado, tabla con
  Ver detalle, paginacion numerada y pie de acceso limitado. Cifras y nombres de maqueta.

## Decisiones

* Sin KPI: repetirian el Resumen y el total filtrado ya sale en la paginacion.
* Sin columna de acciones ni enlace de fila: el detalle es de la entrega 4.
* Columnas Serviteca (nombre y codigo), NIT, Telefono, Estado y Creada (fecha y hora de
  Bogota con formatPlatformDate, como Solicitudes). id y version no se muestran.
* Estado con StatusBadge nuevo ACTIVE (Activa, success) y SUSPENDED (Suspendida,
  warning, mismo acento del KPI de suspendidas). Motivo bajo la insignia si existe,
  text-small muted, line-clamp-2 y title con el texto completo.
* Filtros: SearchField Buscar (placeholder Nombre o codigo) y SelectField Estado
  (Todas, Activas, Suspendidas). URL q, estado (ACTIVE o SUSPENDED) y pagina, mismo
  patron que Solicitudes; valores invalidos no se envian. Texto largo no se trunca.
* Vacio: "Todavia no hay servitecas registradas." frente a "No hay servitecas que
  coincidan con estos filtros." Error: DataTable con Reintentar y mensaje por reportError.
* Clave ['platform','tenants','list',estado,q,pagina]: se borra con la sesion.
* Sin pie de acceso limitado, rotulo PLATAFORMA ni paginacion numerada: no forman parte
  de los patrones aprobados (Pagination existente).

## Archivos

Nuevos: src/pages/PlatformTenantsPage.tsx, src/platform/platformTenants.test.tsx y esta nota.
Modificados: src/platform/platformApi.ts, PlatformShell.tsx, platform.test.tsx,
src/routes.tsx, src/components/StatusBadge.tsx, src/copy/glossary.ts,
src/api/errorMessages.ts, docs/ai-context/01-ARCHITECTURE.md, 03-DECISIONS.md,
05-DESIGN-SYSTEM.md y 06-COPY.md.

Mensaje 400 agregado a errorMessages.ts: La busqueda no puede superar 100 caracteres.

## Evidencia

* Suite completa npm test: 68 archivos, 1569/1569 aprobadas, cero fallos, 84.27 s.
  Base 1551 mas 18 nuevas: 16 casos en platformTenants.test.tsx y 2 guardas
  parametrizadas (designSystem y copy) por el archivo de codigo nuevo.
* Una prueba base ajustada: platform.test.tsx, navegacion del shell ahora espera
  Resumen, Solicitudes y Servitecas. Ninguna retirada; guardas sin cambios.
* npm run build y npm run lint: salida 0, sin advertencias. comprobacion de whitespace del diff sin hallazgos;
  archivos nuevos comprobados con diff sin indice.
* Primera corrida del archivo nuevo: dos fallos de la propia prueba (filas leidas durante
  el skeleton y espera de texto de un 500 que va por toast); corregidas las pruebas, sin
  cambiar producto.
* Cobertura simulada: campos y encabezados, motivo, sin id, version, enlaces ni acciones;
  solo consulta /me y /tenants; enlace activo en el shell; sin token de plataforma
  redirige a /plataforma/login aun con sesion de serviteca; Authorization de plataforma;
  401 cierra solo plataforma; parametros enviados por fetch con estado, q y pagina;
  historial; debounce con replace, recorte y % _ literales; limpiar con parametros
  ajenos; parametros invalidos; pagina fuera de rango; vacio y sin coincidencias;
  carga, error 500 y Reintentar; 400 de busqueda larga con texto conservado.
* Cifras simuladas: total 51, pagina 2: esperado y obtenido 26 a 26 de 51; pagina 3:
  51 a 51 de 51. Pagina 9 con total 26: ajusta a pagina 2, 26 a 26 de 26.
  Sin comparacion con HTTP real.

## Limitaciones

* Datos de revision (9 servitecas mas demo) caben en una pagina de 25; la paginacion
  solo esta probada con API simulada.
* Tenants suspendidos antes de V11 pueden no tener motivo: se muestra solo la insignia.
* Sin detalle, usuarios, suspender, reactivar ni revocar (entrega 4).

## Revision manual de David

Con el backend de revision ya disponible: npm run dev y abrir
http://localhost:5173/plataforma/servitecas (o el puerto de Vite).

* Enlace Servitecas en el shell (expandido, compacto y movil) y pagina activa.
* Tabla frente a GET /api/platform/tenants: 6 activas, 2 suspendidas con motivo,
  la reactivada como Activa sin motivo, y demo.
* Buscar por nombre y por codigo; buscar un NIT no debe encontrar nada (contrato).
* Estado Todas/Activas/Suspendidas, Limpiar filtros, URL, atras y recarga.
* Texto de mas de 100 caracteres: mensaje y campo conservado.
* Tarjetas bajo md, motivos largos y teclado.
