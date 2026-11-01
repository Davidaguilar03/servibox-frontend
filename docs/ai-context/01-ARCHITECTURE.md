# Arquitectura

## Stack tecnologico

* Vite 8, React 19, TypeScript en modo estricto (`noUncheckedIndexedAccess` incluido).
* Tailwind CSS v4 con el plugin `@tailwindcss/vite`. Los tokens viven en un solo archivo,
  ver Tokens visuales en [02-CONVENTIONS.md](02-CONVENTIONS.md).
* React Router 8 en modo datos (`createBrowserRouter`).
* TanStack Query para las peticiones al backend.
* lucide-react para iconos.
* Fuentes con `@fontsource`: Montserrat 600 y 700, Inter 400, 500 y 600, IBM Plex Mono 400.
* Vitest, jsdom y Testing Library para pruebas; ESLint con typescript-eslint y las reglas
  de React Hooks.
* Sin libreria de componentes ni estado global adicional: la sesion es un store minimo
  sobre `sessionStorage` (ver Autenticacion).

## Estructura de carpetas

```
src/
  main.tsx            entrada: fuentes, estilos y App
  App.tsx             QueryClientProvider y RouterProvider
  routes.tsx          tabla de rutas, la usan App y las pruebas
  index.css           Tailwind, tokens y estilos base
  styles/tokens.css   tokens del manual de estilos (bloque @theme)
  lib/api.ts          cliente API y ApiError
  lib/errorMessage.ts texto de error para el usuario segun el estado (ver 02-CONVENTIONS)
  lib/format.ts       formatos de moneda, fecha y valor vacio
  lib/stock.ts        estado de stock (umbrales de Autollantas)
  lib/pagination.ts   paginas de 25 y numeros de pagina a mostrar
  lib/useUrlTextParam.ts campo de texto atado a la URL (estado local y espera, ver 02-CONVENTIONS)
  lib/businessDate.ts hoy en Bogota, sumar dias y vencimiento por defecto (30, 60, 90)
  lib/accountPayment.ts medio de pago por tipo de cuenta (parametrizado por diccionario)
                      y cuenta de efectivo propuesta
  dashboard/          consultas del panel de control (y de ventas: kpis, sales)
  lib/text.ts         normalizar texto para buscar sin mayusculas ni tildes
  sales/              consultas de ventas y terceros, logica del listado y de la
                      nueva factura (newSale.ts)
  purchases/          consultas de compras (purchasesApi.ts), logica del listado
                      (purchasesList.ts), de la nueva factura de compra (newPurchase.ts)
                      y del detalle (purchaseDetail.ts)
  counterparties/     Clientes y Proveedores (CounterpartiesPage.tsx), su logica de saldos y
                      filtros (counterpartyList.ts), el formulario (counterpartyForm.ts) y el
                      modal compartido de crear y editar tercero
  trash/              papelera compartida de ventas y compras (TrashPage.tsx) y su logica
                      de filtros (trashList.ts)
  reports/            logica pura de Reportes (reports.ts)
  settings/           Configuracion: pagina unificada, formularios de datos y finanzas y consultas
  accounts/           consultas de Cuentas (accountsApi.ts), logica de periodos, totales y
                      origen (accountsView.ts), formularios (accountForms.ts) y los modales
                      de nueva cuenta, editar cuenta y transferencia (AccountModals.tsx)
  inventory/          consultas de Inventario (inventoryApi.ts), logica del listado
                      (productList.ts) y de los formularios de producto y categoria
  auth/               sesion, guard de rutas y llamada de login
  platform/           sesion, guard, shell y consultas del panel de plataforma
  components/         Button, TextField, SearchField, SelectField, ComboboxField, Alert,
                      IndicatorCard, StatusBadge, DataTable, Pagination, Modal, Toaster
                      (y su store toast.ts), CategoryDot, UnsavedChangesGuard, estados
  layout/AppShell.tsx barra lateral, barra superior y contenido
  brand/             Wordmark provisional, BrandSymbol y symbol.svg compartido con favicon
  pages/              una pagina por ruta
  test/               setup de Vitest y utilidades de prueba
```

## Rutas

| Ruta | Acceso | Pagina |
|-|-|-|
| `/` | publica | `LandingPage`, la landing. Con sesion muestra "Ir al panel" en lugar de iniciar sesion y crear cuenta |
| `/login` | publica | `LoginPage`. Con sesion activa redirige a la pagina pedida o a `/inicio` |
| `/registro` | publica | `RegisterPage`, solicitud de cuenta (POST /api/registration-requests). Con sesion activa redirige a `/inicio`. El registro inmediato se retiro el 2026-10-31 |
| `/activar` | publica | `ActivationPage`, activacion con el enlace del correo (`/activar#token=...`); no inicia sesion |
| `/terminos` | publica | `TermsPage` ("Proximamente") |
| `/crear-cuenta` | publica | redirige a `/registro` (enlace viejo del login), hoy la solicitud de cuenta |
| `/inicio` | privada | `DashboardPage`, el panel de control, dentro de `AppShell` |
| `/ventas` | privada | `SalesInvoicesPage`, Facturas de venta, dentro de `AppShell` |
| `/ventas/nueva` | privada | `NewSaleInvoicePage`, Nueva factura de venta, dentro de `AppShell` |
| `/ventas/:id` | privada | `SaleDetailPage`, Detalle de factura de venta; un id no numerico o un 404 muestran "Factura no encontrada" |
| `/ventas/papelera` | privada | `SalesTrashPage`, Papelera de ventas (`TrashPage` con la configuracion de ventas) |
| `/ventas/ingresos` | privada | `OccasionalIncomePage`, Otros ingresos (`ManualMovementsPage` con `INGRESO_OCASIONAL`) |
| `/ventas/clientes` | privada | `CustomersPage`, Clientes (`CounterpartiesPage` con el rol CLIENTE) |
| `/reportes` | privada | `ReportsPage`, Reportes, dentro de `AppShell` |
| `/inventario` | privada | `ProductsPage`, Productos, dentro de `AppShell` |
| `/inventario/nuevo` | privada | `ProductFormPage`, Nuevo producto |
| `/inventario/:id/editar` | privada | `ProductFormPage`, Editar producto; un id no numerico o un 404 muestran "Producto no encontrado" |
| `/inventario/categorias` | privada | `CategoriesPage`, Categorias, con el modal de crear y editar |
| `/cuentas` | privada | `AccountsPage`, Tesoreria: saldos, movimientos del periodo, nueva cuenta, transferencia y exportacion |
| `/compras` | privada | `PurchaseInvoicesPage`, Facturas de compra, dentro de `AppShell` |
| `/compras/nueva` | privada | `NewPurchaseInvoicePage`, Nueva factura de compra |
| `/compras/:id` | privada | `PurchaseDetailPage`, Detalle de factura de compra; un id no numerico o un 404 muestran "Factura no encontrada" |
| `/compras/papelera` | privada | `PurchasesTrashPage`, Papelera de compras (`TrashPage` con la configuracion de compras) |
| `/compras/gastos` | privada | `OperationalExpensesPage`, Gastos operativos (`ManualMovementsPage` con `GASTO_OPERATIVO`) |
| `/compras/proveedores` | privada | `SuppliersPage`, Proveedores (`CounterpartiesPage` con el rol PROVEEDOR) |
| `/configuracion` | privada | `SettingsPage`, Configuracion: Datos de la serviteca y Configuracion financiera visibles; `?tab=financiera` enfoca la segunda seccion |
| `/plataforma/login` | publica | `PlatformLoginPage`, acceso de plataforma. Con sesion de plataforma redirige a `/plataforma` |
| `/plataforma` | plataforma | `PlatformOverviewPage`, Resumen, dentro de `PlatformShell` |
| `/plataforma/solicitudes` | plataforma | `PlatformRequestsPage`, nombres, fechas, estado y pagina en URL, paginacion de servidor |
| `/plataforma/solicitudes/:id` | plataforma | `PlatformRequestDetailPage`, revision y coincidencias, conserva contexto del listado |
| `/plataforma/servitecas` | plataforma | `PlatformTenantsPage`, busqueda, estado y pagina en URL, paginacion de servidor, Ver detalle por fila |
| `/plataforma/servitecas/:id` | plataforma | `PlatformTenantDetailPage`, datos, solicitud de origen, usuarios de consulta, suspender, reactivar y cerrar sesiones; conserva contexto del listado |
| `/plataforma/*` | plataforma | redirige a `/plataforma` (sin sesion de plataforma, a su acceso) |
| cualquier otra | | redirige a `/inicio` (y de ahi a `/login` si no hay sesion) |

Las rutas publicas se declaran arriba en `routes.tsx`, sin `RequireAuth` ni `AppShell`. Las
privadas cuelgan de `RequireAuth` (ruta de layout sin path), que sin sesion valida redirige a `/login`
guardando la ruta pedida en `state.from`; tras el login se vuelve a ella. Cada ruta privada
declara su miga de pan en `handle` (Ingresos / Facturas de venta, por ejemplo).
Ingresos y Egresos son tramos sin enlace; no tienen rutas propias.
Una pagina que solo conoce el ultimo tramo con sus datos (el numero de una factura) lo
reemplaza con `useBreadcrumbTail` (`layout/breadcrumb.ts`) mientras esta montada.

## Cliente API

`lib/api.ts` expone `apiFetch<T>(path, { method, body, auth, platform, headers })`:

* Base `/api`. En desarrollo el proxy de Vite la envia al backend (ver Proxy).
* Con `auth` (por defecto true) agrega `Authorization: Bearer <token>`.
* Una respuesta no exitosa se convierte en `ApiError` con `message` y `status`, leidos del
  cuerpo que el backend devuelve siempre: `{"error": mensaje, "status": n}`. Si el cuerpo no
  es JSON se usan `statusText` y el codigo HTTP. `retryAfter` guarda los segundos de la
  cabecera Retry-After (429 de la solicitud, la activacion y los logins).
* `headers` agrega cabeceras extra (la solicitud de cuenta envia `Idempotency-Key`).
* Un 401 con `auth` cierra la sesion; el guard redirige a `/login`. Las rutas publicas
  (login) usan `auth: false`: no envian token y su 401 no cierra nada, solo se muestra.

`apiDownload(path)` descarga un archivo (GET) sin cambiar `apiFetch`:

* Mismo Bearer, con `Accept: */*`. Un 401 cierra la sesion igual que `apiFetch`.
* Un error se convierte en `ApiError` leyendo el JSON del backend; si el cuerpo no es JSON,
  el mensaje es el generico (`GENERIC_ERROR_MESSAGE`) y el codigo queda solo en `status`.
* En exito toma el blob, saca el nombre de `Content-Disposition` (`filename` o
  `filename*`; si falta, `FALLBACK_FILE_NAME`), lo descarga con `URL.createObjectURL` y un
  enlace temporal con `download`, libera la URL en la siguiente vuelta y devuelve el nombre.

## Proxy de produccion

Produccion local preparada con Dockerfile multietapa Node 24.15.0 y Nginx 1.30.2,
bases por digest, usuario 101. /api relativo llega al backend por red privada;
BACKEND_UPSTREAM y PORT se resuelven al arrancar, DNS dinamico IPv4/IPv6.
SPA sin cache, recursos con hash immutable y recursos ausentes 404; API sin cache
ni reintentos. /healthz comprueba Nginx e index.html, sin backend ni DB.
Contrato, limites, fuentes oficiales y reproduccion en [DEPLOYMENT](../DEPLOYMENT.md).
Solo validacion local, sin Railway ni dominio publicados. David aplaza la revision manual
hasta la regresion del nuevo bloque, obligatoria antes de publicar; sin aprobacion visual.

## Proxy de desarrollo

`vite.config.ts` reenvia `/api` a `API_PROXY_TARGET` (por defecto
`http://localhost:8080`). Se cambia en `.env.local`, ver `.env.example`. El backend no
configura CORS; el motivo esta en [03-DECISIONS.md](03-DECISIONS.md).

## Autenticacion

* `POST /api/auth/login` con `tenantSlug`, `username` y `password`; responde `token`,
  `user` (`username`, `role`, `fullName`, null en usuarios anteriores al registro) y
  `tenant` (`name`, `slug`).
* `POST /api/auth/register` (201) responde lo mismo que el login. Los dos guardan la sesion
  con `startSession` (`auth/authApi.ts`) y recuerdan el slug.
* El token se guarda en `sessionStorage` (`servibox.token`) y, junto a el, la identidad del
  login (`servibox.identity`: `username`, `role`, `tenantName`, `tenantSlug` y, si viene,
`fullName`). El slug de la
  serviteca se recuerda en `localStorage` (`servibox.tenantSlug`) para precargar el campo.
* `auth/session.ts` decodifica el payload del JWT solo para leer `sub`, `role` y `exp`; no
  verifica la firma, eso lo hace el backend en cada peticion. Un token ilegible o vencido
  no es sesion. Una sesion sin identidad guardada (o con una ilegible) usa el `sub` y el
  `role` del JWT y el slug recordado como nombre del tenant.
* `useSession()` lee el token y la identidad con `useSyncExternalStore`: `saveToken` y
  `clearSession` notifican a los suscriptores y la interfaz reacciona sin contexto ni store
  global.
* `RequireAuth` programa el cierre de sesion para el instante de `exp`. No hay refresh:
  sesion vencida es volver a ingresar.
* Roles: `ADMIN`, `MECANICO`, `CAJERO`, mostrados con `roleLabel` como Administrador,
  Mecanico y Cajero (con tilde en la interfaz). Por ahora solo se muestran; no hay
  permisos por rol.

## Panel de plataforma

Acceso, sesion, guard, shell y cache independientes de la serviteca. Decision en
[03-DECISIONS.md](03-DECISIONS.md).

* `POST /api/platform/auth/login` con `email` y `password`; responde `token` y `admin`
  (`id`, `email`). `GET /api/platform/auth/me` devuelve `{id, email}`.
* `platform/platformSession.ts`: `servibox.platform.token`, `servibox.platform.identity` y
  `servibox.platform.sessionExpired` en `sessionStorage`. Solo un JWT con `identityType`
  PLATFORM vigente es sesion. `PlatformRequireAuth` programa el cierre en `exp`, redirige a
  `/plataforma/login` y borra las consultas `['platform', ...]` al quedar sin sesion.
* `apiFetch(path, { platform: true })` usa el token de plataforma; un 401 cierra solo esa sesion.
* `PlatformShell` (desde 2026-10-31) no usa `AppShell`: barra superior fija propia con marca,
  rotulo Plataforma, Resumen, Solicitudes y Servitecas (desplegable bajo lg) y `UserMenu`
  con el correo (placement below). SkipLink, main `#contenido`, Toaster y titulo del documento
  desde el `handle` de la ruta; las paginas reciben `menuButton` null. Consulta `/me`; un 403
  muestra Acceso denegado con Cerrar sesion. `PlatformLoginPage` y `LoginPage` comparten
  `LoginLayout`.

| Bloque | Endpoint | Clave |
|-|-|-|
| KPI y Correos de activacion | `GET /api/platform/metrics` (`tenants`, `users`, `registrationRequests`, `outboxMessages`) | `['platform', 'metrics']` |
| Solicitudes por revisar | `GET /api/platform/registration-requests?status=PENDING&page=0&size=5` (`items`, `totalElements`) | `['platform', 'registration-requests', 'PENDING', 5]` |

Solicitudes usa claves `['platform', 'registration-requests', 'list', estado, pagina, filtros]`
y `['platform', 'registration-requests', 'detail', id]`. Mutaciones POST approve/reject
con expectedVersion, resend-activation sin cuerpo. Invalida ese prefijo y metrics;
el prefijo incluye las cinco pendientes del Resumen. Detalle sin reintentos automaticos.
Filtros admitidos: status, tenantName, contactName, receivedFrom, receivedTo, page y size;
sin orden configurable. URL con serviteca, responsable, desde, hasta, estado y pagina.
Los cuatro filtros nuevos entran en el objeto filtros de la clave, vacios como cadena
vacia, textos recortados. Nombres y fechas usan useUrlTextParam; limpiar conserva
parametros ajenos. Rango invertido no consulta; fechas abiertas admitidas y enviadas
como YYYY-MM-DD sin conversion UTC. Backend cuenta coincidencias antes de paginar.
Reglas de confirmacion y conflictos en [03-DECISIONS.md](03-DECISIONS.md).
Requiere backend con filtros de solicitudes, documentado en su nota
2026-10-31-registration-request-filters.md (feat/48-registration-request-filters).
El cierre y publicacion del backend son independientes del PR frontend.

Servitecas usa `GET /api/platform/tenants` con status (ACTIVE o SUSPENDED), q, page y
size 25; clave `['platform', 'tenants', 'list', estado, q, pagina]`. q va recortado y
el backend lo busca solo en nombre y slug (contiene, sin distinguir mayusculas, % y _
literales, maximo 100). URL con q, estado y pagina; q usa useUrlTextParam y limpiar
conserva parametros ajenos. Sin metricas propias: el Resumen ya muestra activas y
suspendidas. Cada fila enlaza a su detalle con la query string del listado.

Detalle de serviteca (entrega 4): `GET /api/platform/tenants/{id}` (tenant, totalUsers,
userCounts por rol y activo, registrationRequest o null) con clave
`['platform', 'tenants', 'detail', id]` y `GET /{id}/users?page&size=25` (orden id asc)
con clave `['platform', 'tenants', 'users', id, pagina]`; pagina de usuarios en la URL
como `usuarios` (la del listado sigue en `pagina` y viaja en la vuelta, que quita
`usuarios`). Mutaciones POST `/{id}/suspend` y `/{id}/reactivate` con
`{expectedVersion, reason}` (motivo omitido si esta vacio al reactivar),
`/{id}/users/{userId}/revoke` y `/{id}/revoke-sessions` con `{reason}` opcional (sin
cuerpo si el motivo recortado esta vacio). Tras exito invalida el prefijo `['platform', 'tenants']` (detalle, usuarios y
listado) y `['platform', 'metrics']`. Un 409 relee el detalle dentro de la confirmacion.
`userMessage` y `reportError` admiten contexto `tenant` para los mensajes compartidos con
Solicitudes (version distinta y version obligatoria).

## Shell de la aplicacion

`AppShell` arma la barra lateral (240 px, 72 contraida, desde `lg`), la barra superior y
el area de contenido (ancho maximo 1440 px):

* Barra lateral: marca enlazada a Inicio y control de contraer en la cabecera (desde `lg`),
  junto al logo expandido o debajo del simbolo compacto. Navegacion operativa con scroll;
  abajo, Configuracion separada y UserMenu unico. El control de usuario
  muestra iniciales, serviteca y rol; en compacto solo iniciales con nombre accesible.
  Su panel abre hacia arriba con nombre real, rol, serviteca y Cerrar sesion.
  `displayName` e `initials` viven en `auth/session.ts`.
* Orden operativo: Inicio; Ingresos (Facturas de venta, Otros ingresos, Clientes);
  Egresos (Facturas de compra, Gastos operativos, Proveedores); Inventario; Tesoreria;
  Reportes. Los padres son botones con aria-expanded/aria-controls y listas anidadas;
  no navegan ni cierran el otro grupo. Rutas y query strings conservadas.
  Pathname determina padre e hijo activos, con destinos especificos antes de Facturas;
  alta, detalle y papelera activan Facturas. Cada navegacion, incluido historial o query,
  reabre su grupo; se permite cerrarlo manteniendo el indicador del padre activo.
  No se guardan preferencias nuevas de grupos. En compacto activar un padre expande
  el sidebar y guarda expanded en servibox.sidebar; conserva foco en el boton.
  Hijos ocultos quedan fuera de Tab y de la trampa movil. Cerrar grupo o contraer
  recupera el foco; en movil padre mantiene el panel, hijo lo cierra y devuelve el
  foco al boton de la pagina de destino. Escape, SkipLink y usuario conservados.
* Barra superior (64 px): miga de pan tomada del `handle` de la ruta. Sin usuario duplicado,
  buscador ni campana. Inicio, el listado de Productos y las rutas bajo /ventas y /compras no
  montan la barra; Reportes y Configuracion tampoco la montan. El boton de menu movil se entrega por contexto de Outlet a sus
  encabezados. Conserva estado, referencia, foco, SkipLink y titulo de pestana del
  shell. Categorias, formularios de Inventario y las demas rutas conservan la barra.
* Por debajo de `lg` la barra lateral se oculta y se abre como menu sobre el contenido
  desde la barra superior; el bloque de usuario va dentro de ese menu.

## Configuracion

`SettingsPage` (`/configuracion`) monta los dos formularios a la vez, con estados y guardados
independientes. ListHeader recibe el menu movil de AppShell; sin barra superior.
Aprovecha el ancho del shell: desde 1000 px disponibles, rejilla 3fr/4fr (43/57 por ciento)
con separacion de 16 px, alineada arriba y sin igualar alturas; debajo apila Datos y Finanzas.
TenantProfileTab y FinancialSettingsTab conservan superficies compartidas. NIT/telefono
pasan a dos columnas desde 400 px dentro de Datos; Gastos/Renta desde 480 px en Finanzas.
Nombre, codigo e ICA ocupan todo el ancho. Finanzas separa Precio sugerido de Pagos con
tarjeta, sin agregar calculos ni ejemplos guardados.

* GET/PUT `/api/tenant`: name, nit normalizado y phone recortado, sin slug editable.
  NIT y telefono obligatorios; clave `['tenant']`, nombre de sesion y KPIs actualizados.
* GET/PUT `/api/inventory/financial-settings`: mismas cuatro fracciones, precision y unidades.
  Clave `['inventory', 'financial-settings']`; guardar invalida productos y categorias.
  Advertencia de divisor por categorias y aviso de recalculo conservados.
* Solo ADMIN edita en la interfaz; un 403 al guardar bloquea el formulario. Sin cambios
  o durante envio Guardar queda deshabilitado; los errores se revelan al intentar guardar.
* Un solo UnsavedChangesGuard en SettingsPage protege salida y beforeunload cuando
  cualquiera tiene cambios. Guardar uno no valida, envia ni reinicia el otro.
* Enlaces anteriores con `?tab=financiera` esperan ambas cargas iniciales (o error),
  desplazan y enfocan el contenedor financiero una vez por entrada de historial.
  No ocultan Datos ni provocan salto en entradas normales o despues de guardar.
  Parser y tipos de pestanas retirados; API, reglas de formularios y reportError intactos.
  Pantalla unificada aprobada visualmente por David el 2026-10-28.

## Panel de control

`DashboardPage` (`/inicio`) tiene cuatro bloques independientes, cada uno con su consulta
de TanStack Query y sus estados de carga, vacio y error:

| Bloque | Endpoints | Calculo en el cliente |
|-|-|-|
| Indicadores del periodo | `GET /api/reporting/kpis?desde&hasta` | rango de PeriodPicker en Bogota; clave `['kpis', desde, hasta]` |
| Productos con stock bajo | `GET /api/inventory/products`, `GET /api/inventory/categories` | `lowStockProducts`: sin stock, criticos y bajos, de menor a mayor stock, hasta 5 |
| Saldos de cuentas | `GET /api/treasury/accounts`, `GET /api/treasury/balance` | ninguno; el total es el del backend |
| Ultimas ventas | `GET /api/sales` | rango inclusivo por invoiceDate, sin anuladas, fecha e id descendentes, hasta 5 |

Las consultas viven en `src/dashboard/dashboardApi.ts` con solo los campos que usa el
panel, nombrados como en los DTO del backend.

Inicio usa periodo en URL (Este mes por defecto); desde/hasta solo en Personalizado.
Ver todas envia el rango exacto a Ventas como Personalizado. Stock y cuentas son actuales,
no dependen del periodo; cambiarlo no cambia sus claves ni vuelve a pedirlos.

## Facturas de venta

`SalesInvoicesPage` (`/ventas`) tiene tres consultas independientes, cada una con sus
estados de carga, vacio y error con reintentar:

| Bloque | Endpoint | Uso |
|-|-|-|
| Facturas | `GET /api/sales`, una sola vez (clave `['sales']`, compartida con el panel) | listado, Por cobrar y el cruce de Abonos del mes |
| Ventas del mes | `GET /api/reporting/kpis?desde&hasta` del mes en curso | `totalSales` |
| Recaudos del mes | `GET /api/treasury/movements?category=RECAUDO_VENTA&desde&hasta` | Abonos del mes, cruzado con las ventas por `saleId` |

La logica pura (filtros, periodos, busqueda, orden, indicadores y lectura y escritura de
la query string) vive en `src/sales/salesList.ts`; la paginacion en
`src/lib/pagination.ts`. Definiciones y motivos en [03-DECISIONS.md](03-DECISIONS.md).

* Query string: `q`, `estado` (`PAGADA`, `PENDIENTE`, `ANULADA`), `pago` (`CONTADO`,
  `CREDITO`), `periodo` (`mes-anterior`, `este-ano`, `todas`; sin el parametro es Este mes)
  y `pagina`. Ventas agrega `ultimos-30` y `personalizado`, este ultimo con `desde` y `hasta`
  inclusivos y validacion compartida de Reportes. Conserva las fechas al paginar y editar
  otros filtros; los indicadores del mes no cambian de alcance. Compras usa el parser
  compartido con periodos extendidos desactivados. Solo se escriben valores no predeterminados.
* Bajo `md` (768 px) la tabla se reemplaza por tarjetas apiladas con numero, cliente,
  total y estado, que enlazan al detalle.
* Las facturas ANULADAS no salen en el listado ni en el filtro de estado; la Papelera las
  listara filtrando el mismo `GET /api/sales`. Los indicadores no cambian.

## Nueva factura de venta

`NewSaleInvoicePage` (`/ventas/nueva`). Logica pura (calculo, validacion, cuerpo del POST,
avisos de stock, medio de pago, vencimiento) en `src/sales/newSale.ts`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoints |
|-|-|
| Numero sugerido | `GET /api/sales/next-invoice-number` (no reserva) |
| Datos generales | `GET /api/counterparties?role=CLIENTE`, `GET /api/treasury/accounts`; `POST /api/counterparties` desde el modal Nuevo cliente |
| Productos | `GET /api/inventory/products`, `GET /api/inventory/categories` (umbrales y `taxTypes` para la tasa de IVA) |
| Guardar | `POST /api/sales` |

* Cada bloque tiene skeleton, error con reintentar y vacio (sin cuentas, sin productos).
* Cambios sin guardar: `useBlocker` del router de datos (`createBrowserRouter`) muestra el
  modal "Descartar cambios" en cualquier navegacion interna, Cancelar incluido;
  `beforeunload` cubre recargar o cerrar la pestana. Tras guardar se permite la salida.
* El aviso de exito es un toast: `showToast` (`components/toast.ts`) y `Toaster`, montado
  en `AppShell` para que sobreviva a la navegacion hacia `/ventas`.
* Bajo `md` cada linea es una tarjeta apilada con sus etiquetas visibles; desde `md` es una
  fila con encabezado.
* En contado se propone la primera cuenta de tipo EFECTIVO por id, hasta que el usuario
  elija otra.

## Detalle de factura de venta

`SaleDetailPage` (`/ventas/:id`). Logica pura (botones por estado, resumen, rango y
validacion del abono) en `src/sales/saleDetail.ts`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoint |
|-|-|
| Factura (encabezado, datos, productos, resumen) | `GET /api/sales/{id}` |
| Abonos o pago recibido | `GET /api/treasury/movements?saleId&category=RECAUDO_VENTA` (trae `accountName`) |
| Modal Registrar abono | `GET /api/treasury/accounts`, `POST /api/sales/{id}/collections` |
| Modal Anular | `POST /api/sales/{id}/annul` |

* La factura y los abonos cargan y fallan por separado, con skeleton y reintentar.
* Tras abonar o anular se invalidan las consultas de ventas, tesoreria, productos y KPIs.
  Un rechazo del backend tambien las refresca: la factura pudo cambiar en otra pestana.
* Columnas 70 y 30 desde `lg`; bajo `md` productos y abonos pasan a tarjetas.

## Reportes

`ReportsPage` (`/reportes`). Logica pura (tipos, validacion del rango, periodo anterior,
variacion, titulo del periodo, ruta de exportacion y filas del estado de resultados) en
`src/reports/reports.ts`; reglas en [03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoint |
|-|-|
| Selector de cuenta (solo Movimientos de cuentas) | `GET /api/treasury/accounts` |
| Vista previa del Estado de resultados | `GET /api/reporting/kpis?desde&hasta` del rango |
| Variacion | `GET /api/reporting/kpis` del periodo anterior de igual duracion |
| Vista previa de Movimientos | `GET /api/treasury/movements?desde&hasta[&accountId]`, conjunto completo de movimientos activos |
| Generar reporte | `apiDownload` de `GET /api/reporting/export?type&format&desde&hasta[&accountId]` |

* `type` es `ESTADO_RESULTADOS` o `MOVIMIENTOS`; `format` es `PDF` o `XLSX`; `desde` y
  `hasta` en `AAAA-MM-DD`; `accountId` solo con `MOVIMIENTOS` y una cuenta concreta (con
  `ESTADO_RESULTADOS` el backend responde 400).
* El backend responde `Content-Disposition: attachment; filename="<tipo>_<desde>_<hasta>.<ext>"`
  con `estado-resultados` o `movimientos-cuentas` y `pdf` o `xlsx`.
* Vista previa y variacion cargan y fallan por separado, con skeleton y reintentar. La
  vista previa sigue al rango con una espera de 400 ms (`PREVIEW_DEBOUNCE_MS`) y solo si es
  valido. Mientras cambia el rango se retiran los datos anteriores, tambien durante la
  espera; no se presentan como datos del filtro nuevo.
* Un error del backend al generar queda en un `Alert` en la pantalla, con lo digitado
  intacto; el exito es un toast con el nombre del archivo.
* Encabezado propio con menu movil de AppShell. Dos columnas 3/5 (37,5/62,5 por ciento)
  desde 960 px disponibles en el contenedor; debajo se apilan. PeriodPicker usa variante
  form con fechas en auto-fit de minimo 160 px, sin cambiar los demas consumidores.
* Movimientos comparte fetchPeriodMovements con Cuentas, agregando accountId opcional.
  Consulta propia ['treasury', 'report-movements', desde, hasta, accountId]. Fecha e id
  ascendentes como el archivo, paginacion local de 10 sobre el conjunto completo y
  periodTotals compartido antes de paginar. Transferencias incluidas en ingresos/egresos.
  Cambio de tipo, cuenta o periodo reinicia pagina, incluso con el mismo rango de fechas.
  paginate ajusta la pagina visible si disminuye el conjunto; exportacion sin pagina.
  DataTable con tarjetas moviles, sin edicion; cuenta solo en global. Concepto y categoria
  de origen reales, sin pedir numeros de factura adicionales. No muestra saldos de apertura,
  cierre o acumulados. Estados propios de carga, error, vacio y ausencia de cuentas.
* Sin limite local de filas: el endpoint JSON no pagina ni trunca. La descarga conserva el
  limite configurado en backend (20000 por defecto), independiente de la paginacion visual.
  La carga de grandes volumenes en memoria queda como limitacion, sin endpoint nuevo.

## Inventario

Logica pura en `src/inventory/`: `productList.ts` (filtros, query string, estado de stock,
orden, categorias e indicadores), `productForm.ts` (valores, validacion, cuerpos del POST y
del PUT) y `categoryForm.ts` (paleta, validacion, porcentaje y fraccion). Reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Pantalla | Endpoints |
|-|-|
| Productos (`/inventario`) | `GET /api/inventory/products`, `GET /api/inventory/categories` |
| Formulario de producto | `GET /api/inventory/products/{id}` (al editar), `GET /api/inventory/categories`, `POST /api/inventory/products`, `PUT /api/inventory/products/{id}` |
| Categorias (`/inventario/categorias`) | `GET /api/inventory/categories`, `GET /api/inventory/products` (conteo), `GET /api/inventory/tax-types`, `POST /api/inventory/categories`, `PUT /api/inventory/categories/{id}` |

* Claves de TanStack Query `['inventory', 'products']` y `['inventory', 'categories']`, las
  mismas del panel y de Nueva factura (es la misma respuesta). Guardar un producto o una
  categoria invalida `['inventory']`.
* Query string de Productos: `q`, `categoria` (id), `estado` (`NORMAL`, `BAJO`, `CRITICO`,
  `SIN_STOCK`), `orden` (`descripcion`, `stock-asc`, `stock-desc`, `precio`; sin el
  parametro es `codigo`) y `pagina`. Solo se escriben los valores distintos de los de por
  defecto.
* Los enlaces al formulario llevan en `state` la query string del listado (`listSearch`);
  al guardar o cancelar se vuelve a `/inventario` con ella. Sin `state` se vuelve sin filtros.
* Indicadores no dependen del selector de categoria ni de los filtros. Cada
  bloque (indicadores, categoria, tabla) carga y falla por separado: los indicadores que solo
  usan productos siguen visibles si fallan las categorias.
* Bajo `md` la tabla pasa a tarjetas apiladas que enlazan al formulario.
* Cambios sin guardar en el formulario de producto: el mismo patron de Nueva factura
  (`useBlocker` y `beforeunload`). En el modal de categoria, Esc, la X o Cancelar con datos
  digitados cambian el contenido del modal a "Descartar cambios".

## Tesoreria

`AccountsPage` (`/cuentas`). Logica pura en `src/accounts/`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoints |
|-|-|
| Tarjetas de cuentas | `GET /api/treasury/accounts`, `GET /api/treasury/balance` (Todas las cuentas) |
| Totales y movimientos del periodo | `GET /api/treasury/movements?desde&hasta`, una sola vez para todas las cuentas |
| Origen con numero de factura | `GET /api/sales` y `GET /api/purchases`, solo si el periodo tiene movimientos con `saleId` o `purchaseId` |
| Nueva cuenta | `POST /api/treasury/accounts` |
| Editar cuenta | `PUT /api/treasury/accounts/{id}` |
| Nueva transferencia | `POST /api/treasury/transfers` |
| Exportar a Excel | `apiDownload` de `GET /api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde&hasta[&accountId]` |

* Query string: `cuenta` (id o `todas`; sin el parametro, la primera EFECTIVO por id),
  `periodo` (`hoy`, `esta-semana`, `mes-anterior`, `este-ano`, `personalizado`; sin el
  parametro es Este mes), `desde` y `hasta` (solo con Personalizado) y `pagina`.
* AccountResponse incluye `color: string | null`. POST admite `color` opcional o null;
  PUT admite `color` opcional o null para conservar el anterior. Un string debe ser
  exactamente #RRGGBB; el servidor devuelve letras mayusculas. No existe borrado.
  Formato invalido: HTTP 400, `El color debe tener el formato #RRGGBB`.
* Nueva cuenta envia name, type, initialBalance y color; Editar envia name,
  initialBalance y color, sin type. El saldo editable conserva todos sus decimales.
  Ambos modales siempre envian el color elegido. En una cuenta null, Editar propone
  el fallback estable por id y lo persiste al confirmar Guardar, aunque nada cambie.
  Cancelar esa propuesta intacta no escribe ni exige descarte.
* Claves de TanStack Query bajo `['treasury']`; crear o editar una cuenta o una transferencia
  invalida `['treasury']` (cuentas, balance y movimientos).
* accountColors define la paleta de datos persistidos y el fallback de tres colores
  por id solo para cuentas null. AccountColorField comparte valor entre paleta y
  selector nativo. No se persiste color en localStorage.
* Titulo principal y etiqueta del modulo: Tesoreria, manteniendo /cuentas.
  La miga parte de Tesoreria y agrega la cuenta seleccionada (`useBreadcrumbTail`).
  Las entidades mantienen cuenta, Nueva cuenta y sus nombres reales.
* Bajo `md` la tabla de movimientos pasa a tarjetas apiladas; las tarjetas de cuentas se
  desplazan en horizontal.

## Facturas de compra

`PurchaseInvoicesPage` (`/compras`) calca Facturas de venta: tres consultas independientes,
cada una con carga, vacio y error con reintentar.

| Bloque | Endpoint | Uso |
|-|-|-|
| Facturas | `GET /api/purchases` (clave `['purchases']`, la misma de Cuentas) | listado, Por pagar y el cruce de Pagos del mes |
| Compras del mes | `GET /api/reporting/kpis?desde&hasta` del mes en curso | `totalPurchases` |
| Pagos del mes | `GET /api/treasury/movements?category=PAGO_COMPRA&desde&hasta` | cruzado con las compras por `purchaseId` |

* Logica pura en `src/purchases/purchasesList.ts`. Los filtros, su query string (`q`,
  `estado`, `pago`, `periodo`, `pagina`), los periodos y Limpiar son los de
  `src/sales/salesList.ts`, reutilizados sin cambios.
* Orden por fecha descendente y luego id descendente. Sin ANULADAS (van a la Papelera).
* Bajo `md` la tabla pasa a tarjetas apiladas que enlazan a `/compras/:id`.

## Nueva factura de compra

`NewPurchaseInvoicePage` (`/compras/nueva`). Logica pura (calculo, saldo, validacion, cuerpo
del POST, medio de pago, errores 409) en `src/purchases/newPurchase.ts`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoints |
|-|-|
| Datos generales | `GET /api/counterparties?role=PROVEEDOR`, `GET /api/treasury/accounts`; `POST /api/counterparties` desde el modal Nuevo proveedor |
| Productos | `GET /api/inventory/products` (con `purchaseCost`), `GET /api/inventory/categories` (`taxTypes` para la tasa) |
| Guardar | `POST /api/purchases` |

* Comparte con Nueva factura de venta: `lib/businessDate.ts`, `lib/accountPayment.ts`,
  `NewCounterpartyModal` (rol PROVEEDOR) y `UnsavedChangesGuard` (`useBlocker` y
  `beforeunload`).
* Un 409 de numero repetido va bajo el campo; un 409 de saldo va en un Alert y refresca
  `['treasury', 'accounts']`. Tras guardar se invalidan compras, productos, tesoreria y KPIs.

## Detalle de factura de compra

`PurchaseDetailPage` (`/compras/:id`), calcado del detalle de venta. Logica propia (botones
por estado y validacion del pago con el saldo de la cuenta) en `src/purchases/purchaseDetail.ts`;
el resumen, el id de la ruta, el total de linea, el orden de los pagos, el rango de fecha y el
cuerpo del POST se reutilizan de `src/sales/saleDetail.ts` sin cambios. Reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoint |
|-|-|
| Factura (encabezado, datos, productos, resumen) | `GET /api/purchases/{id}` |
| Pago realizado o pagos registrados | `GET /api/treasury/movements?purchaseId&category=PAGO_COMPRA` (trae `accountName`) |
| Cuentas (respaldo del nombre, saldo disponible y modal) | `GET /api/treasury/accounts` |
| Modal Registrar pago | `POST /api/purchases/{id}/payments` |
| Modal Anular | `POST /api/purchases/{id}/annul` |

* Factura, pagos y cuentas cargan y fallan por separado, con skeleton y reintentar.
* Tras pagar o anular, y tambien ante un rechazo del backend, se invalidan compras,
  tesoreria, productos y KPIs. Un 409 de saldo refresca ademas `['treasury', 'accounts']`.
* Columnas 70 y 30 desde `lg`; bajo `md` productos y pagos pasan a tarjetas.

## Papeleras

`SalesTrashPage` (`/ventas/papelera`) y `PurchasesTrashPage` (`/compras/papelera`) son el mismo
`TrashPage` (`src/trash/TrashPage.tsx`) con una `TrashConfig` por modulo: titulo, subtitulo,
ruta y nombre del listado, rotulo y nombre del tercero, clave y consulta del listado, llamada de
recuperar y texto del modal. Logica pura en `src/trash/trashList.ts`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoint |
|-|-|
| Facturas anuladas | `GET /api/sales` o `GET /api/purchases` (claves `['sales']` y `['purchases']`, las de los listados), filtrando `ANULADA` en el cliente |
| Recuperar | `POST /api/sales/{id}/restore` o `POST /api/purchases/{id}/restore` |

* Query string: `q`, `pago` (`CONTADO`, `CREDITO`), `periodo` (`este-mes`, `mes-anterior`,
  `este-ano`; sin el parametro es Todas) y `pagina`. Solo se escriben los valores distintos de
  los de por defecto.
* Tras recuperar, y tambien ante un rechazo, se invalidan la clave del listado, `['treasury']`,
  `['inventory', 'products']` y `['kpis']`.
* Bajo `md` la tabla pasa a tarjetas apiladas con su boton Recuperar.

## Clientes y Proveedores

`CustomersPage` (`/ventas/clientes`) y `SuppliersPage` (`/compras/proveedores`) son el mismo
`CounterpartiesPage` con una `CounterpartiesConfig` por rol. Logica pura en
`src/counterparties/counterpartyList.ts` y `counterpartyForm.ts`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoint |
|-|-|
| Terceros | `GET /api/counterparties?role=CLIENTE` o `PROVEEDOR` (claves `['counterparties', rol]`, las de los formularios de factura) |
| Saldos | `GET /api/sales` o `GET /api/purchases` (claves `['sales']` y `['purchases']`) |
| Crear | `POST /api/counterparties` |
| Editar | `PUT /api/counterparties/{id}` |

* Query string: `q`, `saldo` (`pendiente`), `orden` (`saldo`; sin el parametro es nombre) y
  `pagina`. Solo se escriben los valores distintos de los de por defecto.
* Tras crear se invalida `['counterparties']`; tras editar, tambien `['sales']` y
  `['purchases']`.
* Nueva factura desde la fila: `/ventas/nueva?cliente=<id>` y `/compras/nueva?proveedor=<id>`.
* Bajo `md` la tabla pasa a tarjetas apiladas con sus dos acciones.

## Landing y registro

* `LandingPage`: navegacion con anclas a Como funciona, Funciones y Preguntas
  frecuentes, siempre accesible y con salto de linea en movil, sin menu desplegable.
  Banner exterior compartido por navbar y portada, con foto ambiental desde
  arriba hasta el final de la introduccion. Barra blanca en grupo Navegacion
  y acceso sobre foto y contenido. Main comienza en el flujo de trabajo;
  SkipLink sigue apuntando a main#contenido, omitiendo la introduccion.
  El contenedor interior limita solo texto y producto. Tres pasos con
  representaciones de venta, stock y resumen. Beneficios reutilizan
  el mismo stock-panel y muestran saldos. Las seis imagenes product-visuals-v2
  son representaciones generadas de funciones existentes, no capturas reales,
  y no llevan rotulos visibles. Reportes conserva su descripcion accesible HTML.
  FAQ y cierre comparten un contexto ambiental con fotografia absoluta de
  llantas a la izquierda con panorama 1942x809, ancho completo desde lg y
  minimo visual 840 px debajo, altura natural independiente del acordeon.
  Fundido hacia la derecha del 27 al 44% y ultimo 10% inferior desde lg;
  en movil horizontal del 28 al 60% y vertical del 60 al 82%. Velo radial
  amplio solo en la escena decorativa z0, sin pseudo-elementos en el texto.
  Texto, acordeon y panel rojo en z10; accion final con variante
  local de 56 px y flecha. Cierre con rueda transparente y pie.
  Recursos WebP locales, sin acciones HTML para los
  controles dibujados dentro de las imagenes.
  LandingPage.css contiene escala, mascaras y contenedor fluido maximo de
  1760 px limitados a #landing: margen minimo de 16 px, 24 desde lg.
  Recursos con limites propios: pasos 440/320 px, funciones 580/460,
  reporte 520. Funciones sobre canvas a ancho de ventana, sin cambiar
  el fondo de pasos; sus pistas de recursos tienen gap de 32 px desde lg.
  La barra conserva su capa
  superior independiente, sin recorte. Recursos de producto
  en WebP lossless con marcos de recorte propios a 20 px. Sin mencion al piloto.
  No cambia el tamano raiz ni otras pantallas.
  Sin capturas antiguas ni contactos de demostracion. Con sesion las acciones de
  cuenta llevan a Inicio. `index.css` aplica desplazamiento suave solo con
  `#landing` montada y sin movimiento reducido. Recursos pendientes y secuencia
  restante del rediseno en la decision de Landing del 2026-10-27.
* `RegisterPage`: solicitud de cuenta desde el 2026-10-31 (sin usuario ni contrasena).
  Reglas, sugerencia y normalizacion del codigo y cuerpo del POST en `auth/registerForm.ts`,
  que tambien exporta `usernameError` y `passwordError` para la activacion. Idempotency-Key
  por intento, acuse tras el 202 y errores segun [03-DECISIONS.md](03-DECISIONS.md).
* `ActivationPage`: lee el token del fragmento una vez, lo quita de la URL con replace, lo
  guarda solo en memoria y agrega meta referrer no-referrer mientras esta montada. Reutiliza
  la composicion y RegisterPage.css (`main#register`).
  RegisterPage.css acota la composicion a #register, foto ambiental 44% desde lg y
  formulario integrado con dos agrupaciones. Movil sin foto, altura natural;
  controles, marca y accesibilidad siguen los patrones del Login aprobado.
