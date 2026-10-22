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
  counterparties/     modal compartido Nuevo cliente o Nuevo proveedor
  trash/              papelera compartida de ventas y compras (TrashPage.tsx) y su logica
                      de filtros (trashList.ts)
  reports/            logica pura de Reportes (reports.ts)
  accounts/           consultas de Cuentas (accountsApi.ts), logica de periodos, totales y
                      origen (accountsView.ts), formularios (accountForms.ts) y los modales
                      de nueva cuenta y transferencia (AccountModals.tsx)
  inventory/          consultas de Inventario (inventoryApi.ts), logica del listado
                      (productList.ts) y de los formularios de producto y categoria
  auth/               sesion, guard de rutas y llamada de login
  components/         Button, TextField, SearchField, SelectField, ComboboxField, Alert,
                      IndicatorCard, StatusBadge, DataTable, Pagination, Modal, Toaster
                      (y su store toast.ts), CategoryDot, UnsavedChangesGuard, estados
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
| `/ventas/nueva` | privada | `NewSaleInvoicePage`, Nueva factura de venta, dentro de `AppShell` |
| `/ventas/:id` | privada | `SaleDetailPage`, Detalle de factura de venta; un id no numerico o un 404 muestran "Factura no encontrada" |
| `/ventas/papelera` | privada | `SalesTrashPage`, Papelera de ventas (`TrashPage` con la configuracion de ventas) |
| `/reportes` | privada | `ReportsPage`, Reportes, dentro de `AppShell` |
| `/inventario` | privada | `ProductsPage`, Productos, dentro de `AppShell` |
| `/inventario/nuevo` | privada | `ProductFormPage`, Nuevo producto |
| `/inventario/:id/editar` | privada | `ProductFormPage`, Editar producto; un id no numerico o un 404 muestran "Producto no encontrado" |
| `/inventario/categorias` | privada | `CategoriesPage`, Categorias, con el modal de crear y editar |
| `/cuentas` | privada | `AccountsPage`, Cuentas: saldos, movimientos del periodo, nueva cuenta, transferencia y exportacion |
| `/compras` | privada | `PurchaseInvoicesPage`, Facturas de compra, dentro de `AppShell` |
| `/compras/nueva` | privada | `NewPurchaseInvoicePage`, Nueva factura de compra |
| `/compras/:id` | privada | `PurchaseDetailPage`, Detalle de factura de compra; un id no numerico o un 404 muestran "Factura no encontrada" |
| `/compras/papelera` | privada | `PurchasesTrashPage`, Papelera de compras (`TrashPage` con la configuracion de compras) |
| `/configuracion` | privada | `PlaceholderPage` ("Proximamente") con el titulo, dentro de `AppShell` |
| cualquier otra | | redirige a `/inicio` (y de ahi a `/login` si no hay sesion) |

Las rutas privadas cuelgan de `RequireAuth`, que sin sesion valida redirige a `/login`
guardando la ruta pedida en `state.from`; tras el login se vuelve a ella. Cada ruta privada
declara su miga de pan en `handle` (`{ breadcrumb: ['Ventas', 'Facturas de venta'] }`).
Una pagina que solo conoce el ultimo tramo con sus datos (el numero de una factura) lo
reemplaza con `useBreadcrumbTail` (`layout/breadcrumb.ts`) mientras esta montada.

## Cliente API

`lib/api.ts` expone `apiFetch<T>(path, { method, body, auth })`:

* Base `/api`. En desarrollo el proxy de Vite la envia al backend (ver Proxy).
* Con `auth` (por defecto true) agrega `Authorization: Bearer <token>`.
* Una respuesta no exitosa se convierte en `ApiError` con `message` y `status`, leidos del
  cuerpo que el backend devuelve siempre: `{"error": mensaje, "status": n}`. Si el cuerpo no
  es JSON se usan `statusText` y el codigo HTTP.
* Un 401 con `auth` cierra la sesion; el guard redirige a `/login`. Las rutas publicas
  (login) usan `auth: false`: no envian token y su 401 no cierra nada, solo se muestra.

`apiDownload(path)` descarga un archivo (GET) sin cambiar `apiFetch`:

* Mismo Bearer, con `Accept: */*`. Un 401 cierra la sesion igual que `apiFetch`.
* Un error se convierte en `ApiError` leyendo el JSON del backend; si el cuerpo no es JSON,
  el mensaje es el generico (`GENERIC_ERROR_MESSAGE`) y el codigo queda solo en `status`.
* En exito toma el blob, saca el nombre de `Content-Disposition` (`filename` o
  `filename*`; si falta, `FALLBACK_FILE_NAME`), lo descarga con `URL.createObjectURL` y un
  enlace temporal con `download`, libera la URL en la siguiente vuelta y devuelve el nombre.

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
| Generar reporte | `apiDownload` de `GET /api/reporting/export?type&format&desde&hasta[&accountId]` |

* `type` es `ESTADO_RESULTADOS` o `MOVIMIENTOS`; `format` es `PDF` o `XLSX`; `desde` y
  `hasta` en `AAAA-MM-DD`; `accountId` solo con `MOVIMIENTOS` y una cuenta concreta (con
  `ESTADO_RESULTADOS` el backend responde 400).
* El backend responde `Content-Disposition: attachment; filename="<tipo>_<desde>_<hasta>.<ext>"`
  con `estado-resultados` o `movimientos-cuentas` y `pdf` o `xlsx`.
* Vista previa y variacion cargan y fallan por separado, con skeleton y reintentar. La
  vista previa sigue al rango con una espera de 400 ms (`PREVIEW_DEBOUNCE_MS`) y solo si es
  valido.
* Un error del backend al generar queda en un `Alert` en la pantalla, con lo digitado
  intacto; el exito es un toast con el nombre del archivo.
* Bajo `md` las fechas se apilan; desde `lg` el formulario y la vista previa van en dos
  columnas (2 y 3).

## Inventario

Logica pura en `src/inventory/`: `productList.ts` (filtros, query string, estado de stock,
orden, pestanas e indicadores), `productForm.ts` (valores, validacion, cuerpos del POST y
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
* Indicadores y conteos de pestanas no dependen de la pestana ni de los filtros. Cada
  bloque (indicadores, pestanas, tabla) carga y falla por separado: los indicadores que solo
  usan productos siguen visibles si fallan las categorias.
* Bajo `md` la tabla pasa a tarjetas apiladas que enlazan al formulario.
* Cambios sin guardar en el formulario de producto: el mismo patron de Nueva factura
  (`useBlocker` y `beforeunload`). En el modal de categoria, Esc, la X o Cancelar con datos
  digitados cambian el contenido del modal a "Descartar cambios".

## Cuentas

`AccountsPage` (`/cuentas`). Logica pura en `src/accounts/`; reglas en
[03-DECISIONS.md](03-DECISIONS.md).

| Bloque | Endpoints |
|-|-|
| Tarjetas de cuentas | `GET /api/treasury/accounts`, `GET /api/treasury/balance` (Todas las cuentas) |
| Totales y movimientos del periodo | `GET /api/treasury/movements?desde&hasta`, una sola vez para todas las cuentas |
| Origen con numero de factura | `GET /api/sales` y `GET /api/purchases`, solo si el periodo tiene movimientos con `saleId` o `purchaseId` |
| Nueva cuenta | `POST /api/treasury/accounts` |
| Nueva transferencia | `POST /api/treasury/transfers` |
| Exportar a Excel | `apiDownload` de `GET /api/reporting/export?type=MOVIMIENTOS&format=XLSX&desde&hasta[&accountId]` |

* Query string: `cuenta` (id o `todas`; sin el parametro, la primera EFECTIVO por id),
  `periodo` (`hoy`, `esta-semana`, `mes-anterior`, `este-ano`, `personalizado`; sin el
  parametro es Este mes), `desde` y `hasta` (solo con Personalizado) y `pagina`.
* Claves de TanStack Query bajo `['treasury']`; crear una cuenta o una transferencia
  invalida `['treasury']` (cuentas, balance y movimientos).
* La miga de pan termina en la cuenta seleccionada (`useBreadcrumbTail`).
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
