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
  lib/format.ts       formatos de moneda, fecha y valor vacio
  lib/stock.ts        estado de stock (umbrales de Autollantas)
  lib/pagination.ts   paginas de 25 y numeros de pagina a mostrar
  dashboard/          consultas del panel de control (y de ventas: kpis, sales)
  sales/              consulta de recaudos y logica del listado de facturas
  auth/               sesion, guard de rutas y llamada de login
  components/         Button, TextField, SearchField, SelectField, Alert, IndicatorCard,
                      StatusBadge, DataTable, Pagination, estados
  layout/AppShell.tsx barra lateral, barra superior y contenido
  brand/Wordmark.tsx  wordmark provisional
  pages/              una pagina por ruta
  test/               setup de Vitest y utilidades de prueba
```

## Rutas

| Ruta | Acceso | Pagina |
|-|-|-|
| `/login` | publica | `LoginPage`. Con sesion activa redirige a la pagina pedida o a `/inicio` |
| `/recuperar-contrasena` | publica | `ComingSoonPage` ("Proximamente") |
| `/crear-cuenta` | publica | `ComingSoonPage` ("Proximamente") |
| `/` | privada | redirige a `/inicio` |
| `/inicio` | privada | `DashboardPage`, el panel de control, dentro de `AppShell` |
| `/ventas` | privada | `SalesInvoicesPage`, Facturas de venta, dentro de `AppShell` |
| `/ventas/nueva`, `/ventas/papelera`, `/ventas/:id` | privada | `PlaceholderPage` ("Proximamente") con su titulo: Nueva factura, Papelera, Detalle de factura |
| `/inventario`, `/compras`, `/cuentas`, `/reportes`, `/configuracion` | privada | `PlaceholderPage` ("Proximamente") con el titulo, dentro de `AppShell` |
| cualquier otra | | redirige a `/inicio` (y de ahi a `/login` si no hay sesion) |

Las rutas privadas cuelgan de `RequireAuth`, que sin sesion valida redirige a `/login`
guardando la ruta pedida en `state.from`; tras el login se vuelve a ella. Cada ruta privada
declara su miga de pan en `handle` (`{ breadcrumb: ['Ventas', 'Facturas de venta'] }`).

## Cliente API

`lib/api.ts` expone `apiFetch<T>(path, { method, body, auth })`:

* Base `/api`. En desarrollo el proxy de Vite la envia al backend (ver Proxy).
* Con `auth` (por defecto true) agrega `Authorization: Bearer <token>`.
* Una respuesta no exitosa se convierte en `ApiError` con `message` y `status`, leidos del
  cuerpo que el backend devuelve siempre: `{"error": mensaje, "status": n}`. Si el cuerpo no
  es JSON se usan `statusText` y el codigo HTTP.
* Un 401 con `auth` cierra la sesion; el guard redirige a `/login`. Las rutas publicas
  (login) usan `auth: false`: no envian token y su 401 no cierra nada, solo se muestra.

## Proxy de desarrollo

`vite.config.ts` reenvia `/api` a `API_PROXY_TARGET` (por defecto
`http://localhost:8080`). Se cambia en `.env.local`, ver `.env.example`. El backend no
configura CORS; el motivo esta en [03-DECISIONS.md](03-DECISIONS.md).

## Autenticacion

* `POST /api/auth/login` con `tenantSlug`, `username` y `password`; responde `token`,
  `user` (`username`, `role`) y `tenant` (`name`, `slug`).
* El token se guarda en `sessionStorage` (`servibox.token`) y, junto a el, la identidad del
  login (`servibox.identity`: `username`, `role`, `tenantName`, `tenantSlug`). El slug de la
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

## Shell de la aplicacion

`AppShell` arma la barra lateral (240 px, 72 contraida, desde `lg`), la barra superior y
el area de contenido (ancho maximo 1440 px):

* Barra lateral: wordmark, menu, boton de contraer (desde `lg`) y abajo el bloque de
  usuario: iniciales en un circulo, username, rol y el boton Salir.
* Barra superior (64 px): miga de pan a la izquierda, tomada del `handle` de la ruta, y el
  nombre del tenant a la derecha. Sin buscador ni campana.
* Por debajo de `lg` la barra lateral se oculta y se abre como menu sobre el contenido
  desde la barra superior; el bloque de usuario va dentro de ese menu.

## Panel de control

`DashboardPage` (`/inicio`) tiene cuatro bloques independientes, cada uno con su consulta
de TanStack Query y sus estados de carga, vacio y error:

| Bloque | Endpoints | Calculo en el cliente |
|-|-|-|
| Indicadores del mes | `GET /api/reporting/kpis?desde&hasta` | `desde` primer dia del mes, `hasta` hoy (`monthToDate`) |
| Productos con stock bajo | `GET /api/inventory/products`, `GET /api/inventory/categories` | `lowStockProducts`: sin stock, criticos y bajos, de menor a mayor stock, hasta 5 |
| Saldos de cuentas | `GET /api/treasury/accounts`, `GET /api/treasury/balance` | ninguno; el total es el del backend |
| Ultimas ventas | `GET /api/sales` | orden por `invoiceDate` descendente (a igual fecha, id mayor), hasta 5 |

Las consultas viven en `src/dashboard/dashboardApi.ts` con solo los campos que usa el
panel, nombrados como en los DTO del backend.

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
  y `pagina`. Solo se escriben los valores distintos de los de por defecto.
* Bajo `md` (768 px) la tabla se reemplaza por tarjetas apiladas con numero, cliente,
  total y estado, que enlazan al detalle.
