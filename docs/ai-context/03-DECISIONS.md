# Log de decisiones tecnicas

Una entrada por decision, en orden cronologico inverso (la mas reciente arriba).

Formato de cada entrada:

```
## AAAA-MM-DD: Titulo corto de la decision

* Decision: que se decidio hacer.
* Alternativas consideradas: opciones que se evaluaron y se descartaron.
* Motivo: por que se eligio esta opcion sobre las demas.
```

## 2026-10-18: Lo que queda fuera de Nueva factura de venta

* Decision: no se implementan utilidad por linea ni total, comision del pago con tarjeta
  como gasto operativo, detalle de factura, abonos, anular, Papelera real, pantalla de
  Clientes, edicion de terceros ni envio de la factura por correo.
* Alternativas consideradas: mostrar la utilidad como en la captura; registrar la
  comision de tarjeta al guardar.
* Motivo: la utilidad exige el costo de cada producto y una regla de costo (ultimo o
  promedio) que el frontend no debe inventar; la comision es un GASTO_OPERATIVO aparte
  con su propia tarifa por cuenta, que el backend no modela en la venta. El resto son
  pantallas propias con tareas propias.

## 2026-10-18: Cambios sin guardar en Nueva factura

* Decision: con datos digitados, Cancelar y cualquier navegacion interna muestran el modal
  "Descartar cambios" (Seguir editando, Descartar cambios) con `useBlocker`, que existe
  porque la app usa el router de datos (`createBrowserRouter`). Recargar o cerrar la
  pestana avisa con `beforeunload`. Tras un guardado correcto se deja salir sin preguntar.
  "Datos digitados" es cualquier diferencia con el formulario inicial; el Consumidor final
  por defecto no cuenta.
* Alternativas consideradas: el patron de Autollantas.
* Motivo: en Autollantas `NavigationGuard` existe pero SaleForm no lo implementa: guarda
  el formulario en cache al salir y Cancelar descarta sin preguntar. En la web no hay
  cache de vistas, asi que perder lo digitado sin aviso seria peor.

## 2026-10-18: Toast de exito

* Decision: un aviso minimo (`showToast` y `Toaster` montado en `AppShell`): entra en 200
  ms (`duration-base`), se cierra solo a los 5 segundos y se anuncia con `aria-live`. Hoy
  solo lo usa "Factura FV-xxxx guardada".
* Alternativas consideradas: un Alert en el listado leido de `state` de la navegacion.
* Motivo: el aviso tiene que sobrevivir a la navegacion a `/ventas`; un store minimo
  fuera de las paginas lo resuelve sin libreria.

## 2026-10-18: Modal de nuevo cliente

* Decision: el modal pide nombre, tipo de documento (CC, NIT, CE, RUT, PASAPORTE, los del
  enum del backend), numero, correo y celular, y hace `POST /api/counterparties` con role
  CLIENTE. Un 201 (nuevo) o un 200 (era proveedor y pasa a AMBOS) selecciona el tercero
  de la respuesta, no lo escrito. Un 409 (ya es cliente) o un 400 muestran el mensaje del
  backend dentro del modal.
* Alternativas consideradas: crear el tercero al guardar la factura, como Autollantas.
* Motivo: con el 200 el backend devuelve el tercero existente con sus datos, que pueden
  diferir de lo escrito; mostrar el de la respuesta evita facturar a un nombre que no es
  el guardado.

## 2026-10-18: Numero sugerido y POST sin invoiceNumber

* Decision: el campo Numero muestra `GET /api/sales/next-invoice-number` con "Se confirma
  al guardar" y el POST va sin `invoiceNumber`. Si el backend responde 409 "Ya existe una
  factura con el numero" (otra factura tomo el consecutivo al tiempo) se reintenta una sola
  vez; si falla de nuevo se muestra el mensaje.
* Alternativas consideradas: enviar el numero sugerido.
* Motivo: el endpoint no reserva el numero; el backend asigna el consecutivo dentro de la
  transaccion. El toast muestra el numero que devolvio el POST.

## 2026-10-18: Fecha, vencimiento y tipo de pago de una factura nueva

* Decision: la fecha por defecto es hoy en America/Bogota, calculada con `Intl` y esa zona
  (`businessToday`), no con la del navegador; es editable. En Contado el vencimiento es la
  fecha y no se edita, y no se envia `dueDate`. En Credito el vencimiento por defecto es la
  fecha mas 30 dias, los botones 30, 60 y 90 dias lo recalculan desde la fecha, no puede
  ser anterior a ella, y cambiar la fecha vuelve a proponer 30 dias.
* Alternativas consideradas: un mes calendario como Autollantas (`plusMonths(1)`).
* Motivo: 30 dias es lo que piden los botones y coincide con el primero. Bogota es la zona
  de negocio del backend.

## 2026-10-18: Medio de pago con los valores del diccionario

* Decision: el medio de pago de una venta de contado se deriva del tipo de la cuenta, no de
  su nombre: EFECTIVO fija EFECTIVO y bloquea el campo; BANCO o DIGITAL ofrecen
  TRANSFERENCIA (por defecto), TARJETA_DEBITO y TARJETA_CREDITO. Se envian esos valores,
  que son los que lista el diccionario de datos del backend para `medio_pago_venta`
  (EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA); en pantalla se muestran como
  Efectivo, Transferencia, Tarjeta debito y Tarjeta credito. En credito no se envian ni
  cuenta ni medio.
* Alternativas consideradas: Efectivo, Transferencia y Tarjeta como en Autollantas, que
  ademas decide por el nombre de la cuenta (si contiene "caja").
* Motivo: el backend guarda texto libre y aun no valida, pero el diccionario manda; el
  tipo de cuenta es un dato, el nombre no. Reemplaza a "Medio de pago segun el tipo de
  cuenta".

## 2026-10-18: Calculo del IVA espejo del backend y etiqueta IVA

* Decision: `invoiceTotals` replica `SalesService.crearFactura`: por linea `base = precio *
  cantidad` e `iva = base * tasa`, sumados en doubles en el orden de las lineas;
  `total = subtotal + iva generado`. La tasa es la suma de las `rate` (fraccion, 0.19) de
  los impuestos con `isVat` de la categoria del producto. El backend no redondea en el
  servicio: redondean las columnas NUMERIC(14,2) al guardar, mitad hacia arriba sobre el
  valor decimal; el frontend aplica ese mismo `round2` al subtotal, al total y al IVA de
  cada linea. El resumen dice "IVA" y muestra total menos subtotal; la pantalla formatea
  sin decimales.
* Alternativas consideradas: redondear cada linea y sumar; mostrar `ivaPorPagar`.
* Motivo: diferencia cero con lo que devuelve el backend (verificado en la prueba real).
  `ivaPorPagar` es IVA generado menos descontable, otro concepto, y no es lo que paga el
  cliente.

## 2026-10-18: Aviso de stock al facturar

* Decision: despues de agregar o cambiar una linea, si lo que quedaria del producto da
  bajo, critico o sin stock con `stockStatus` (umbrales de su categoria, por defecto
  amarillo 5 y rojo 2), se muestra un Alert no bloqueante de advertencia (bajo) o de error
  (critico o sin stock) con el codigo y las unidades que quedarian. La cantidad no puede
  superar el stock (`max` del campo y mensaje), y un producto ya agregado no se ofrece de
  nuevo; tampoco los que tienen stock 0.
* Alternativas consideradas: el aviso de Autollantas, que llega como toast despues de
  guardar y toma 0 como umbral por defecto.
* Motivo: avisar antes de guardar deja corregir la cantidad; la regla es la misma del
  panel, sin duplicarla.

## 2026-10-18: Facturas anuladas fuera del listado

* Decision: el listado de Facturas de venta deja fuera las ANULADAS y el filtro de estado
  queda en Todos, Pagada y Pendiente. La Papelera las listara filtrando el mismo
  `GET /api/sales` en el cliente. Los indicadores no cambian.
* Alternativas consideradas: mantenerlas con el filtro Anulada (version anterior).
* Motivo: el diseno manda las anuladas a la Papelera y el subtitulo del listado lo dice.

## 2026-10-18: Rutas placeholder de Ventas

* Estado: `/ventas/nueva` ya no es placeholder, ver "Nueva factura de venta" en
  [01-ARCHITECTURE.md](01-ARCHITECTURE.md).

* Decision: `/ventas/nueva` (Nueva factura), `/ventas/papelera` (Papelera) y `/ventas/:id`
  (Detalle de factura) existen como paginas "Proximamente" con su titulo y su miga de pan.
  El listado ya enlaza a ellas.
* Alternativas consideradas: no enlazar hasta tenerlas; deshabilitar los botones.
* Motivo: los enlaces del listado y del panel quedan en su sitio definitivo y la ruta no
  cambia cuando llegue cada pantalla. Nueva factura, detalle, abonos, anular, papelera real,
  exportar y ordenar por columnas quedan fuera de esta tarea.

## 2026-10-18: Facturas de venta: filtros en el cliente con estado en la URL

* Decision:
  * `GET /api/sales` se pide una sola vez; busqueda, estado, forma de pago, periodo, orden
    y paginacion se resuelven en el cliente (ver "Paginacion y filtros en el cliente").
  * Los filtros y la pagina viven en la query string (`q`, `estado`, `pago`, `periodo`,
    `pagina`), asi que se conservan al volver desde el detalle y al recargar. Escribir en
    el buscador reemplaza la entrada del historial; cambiar un filtro vuelve a la pagina 1.
  * Busqueda por numero de factura o nombre del cliente, sin distinguir mayusculas ni
    tildes. Una venta sin tercero se muestra y se busca como "Consumidor final".
  * Periodos por `invoiceDate`, con hoy calculado en America/Bogota (la zona de negocio
    del backend): Este mes (por defecto), Mes anterior, Este ano y Todas.
  * Limpiar deja todo en Todos o Todas, periodo incluido, para que el vacio por filtros
    siempre tenga salida.
  * Orden por fecha de factura descendente y luego numero descendente (comparacion
    numerica). Paginas de 25 filas.
  * Vence muestra la raya en contado o sin `dueDate`.
* Alternativas consideradas: filtros en estado de React; paginacion en el servidor;
  Limpiar volviendo a Este mes.
* Motivo: la URL es la unica fuente que sobrevive a recargar y a la navegacion atras sin
  otro almacenamiento. Bogota y no la zona del navegador para que el mes coincida con las
  fechas que asigna el backend. Si Limpiar volviera a Este mes, un mes sin ventas dejaria
  al usuario en el mismo vacio.

## 2026-10-18: Indicadores de Facturas de venta

* Decision:
  * Ventas del mes: `totalSales` de `GET /api/reporting/kpis` del primer dia del mes a hoy
    (Bogota).
  * Por cobrar: suma de `pendingBalance` de las ventas en estado PENDIENTE; el texto
    secundario es el numero de esas facturas. No depende del periodo.
  * Abonos del mes: suma de los movimientos de `GET /api/treasury/movements` con
    `category=RECAUDO_VENTA` del mes cuya venta es a credito. Movimiento y venta se cruzan
    por `saleId` en el cliente con la lista de ventas ya cargada.
  * Ninguno muestra variacion contra el mes anterior (fuera de alcance).
* Alternativas consideradas: Abonos con todos los RECAUDO_VENTA; filtrar por venta con un
  `saleId` por peticion.
* Motivo: el recaudo de una venta de contado es su pago completo al emitirla, no un abono
  (terminologia en `servibox-backend/docs/ai-context/02-CONVENTIONS.md`). El backend ya
  excluye los movimientos de facturas anuladas, asi que el cliente no los filtra. Un solo
  listado de movimientos del mes evita una peticion por factura.

## 2026-10-18: Identidad de sesion guardada junto al token

* Decision: el login devuelve `user` (`username`, `role`) y `tenant` (`name`, `slug`), y
  `session.ts` los guarda en `sessionStorage` (`servibox.identity`) junto al token. La
  barra lateral muestra username y rol; la barra superior y el panel, el nombre del tenant.
  Una sesion guardada sin identidad, o con una ilegible, usa el `sub` y el `role` del JWT y
  el slug recordado, sin romper.
* Alternativas consideradas: seguir mostrando el slug; pedir la identidad a otro endpoint.
* Motivo: el backend ya la entrega en el login, sin peticiones extra. `sessionStorage`
  porque vive y muere con el token. Reemplaza a "La barra superior muestra el slug de la
  serviteca".

## 2026-10-18: Estado de stock: Sin stock solo en cero y variante Stock critico

* Decision: `src/lib/stock.ts` separa el cero del critico:
  * stock 0 (o nulo): "Sin stock";
  * mayor que 0 y menor o igual al umbral rojo: "Stock critico", tono de error;
  * mayor que el rojo y menor o igual al amarillo: "Bajo stock", advertencia;
  * si no, normal. Umbral nulo: amarillo 5 y rojo 2 (Autollantas).
  * El panel lista los tres primeros estados de menor a mayor stock, hasta 5.
* Alternativas consideradas: la regla de Autollantas tal cual, con "Sin stock" para todo
  lo critico.
* Motivo: "Sin stock" con unidades en bodega confunde. **Stock critico es una variante de
  `StatusBadge` que el manual no define: debe validarla el disenador.** Reemplaza las
  etiquetas de "Estado de stock replicado de Autollantas"; los umbrales siguen iguales.

## 2026-10-18: La barra superior muestra el slug de la serviteca, no su nombre

* Estado: reemplazada por "Identidad de sesion guardada junto al token".

* Decision: la barra superior y el subtitulo del panel muestran el slug guardado en
  `localStorage` al ingresar (`servibox.tenantSlug`) junto al usuario (`sub` del JWT).
* Alternativas consideradas: pedir el nombre del tenant a un endpoint; leerlo del JWT.
* Motivo: el backend aun no devuelve el nombre del tenant: el login responde solo
  `{token}` y el JWT trae `sub`, `role` y el id del tenant, no su nombre. Cuando exista un
  endpoint o un claim con el nombre, se reemplaza el slug.

## 2026-10-18: Lo que queda fuera del panel de control

* Decision: el panel no tiene variacion contra el mes anterior, buscador global, campana
  de notificaciones ni selector de periodo, aunque la captura del manual los muestra.
* Alternativas consideradas: implementarlos con lo que hay en la API.
* Motivo: no hay endpoint de busqueda ni modelo de notificaciones en el backend; la
  variacion exige definir como se compara un mes en curso contra uno completo, y el
  selector de periodo depende de esa misma definicion. Se dejan para tareas propias en vez
  de inventar comportamiento.

## 2026-10-18: Periodo del panel fijo en "Este mes"

* Decision: los indicadores del panel cubren del primer dia del mes en curso a hoy, en
  fechas locales del navegador, pedidos a `GET /api/reporting/kpis?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`.
  "Este mes" se muestra como etiqueta fija, sin selector.
* Alternativas consideradas: KPIs globales (sin desde ni hasta); un selector de periodo.
* Motivo: el mes en curso es la pregunta diaria del taller y la captura del manual lo
  usa. El selector queda fuera, ver la entrada anterior.

## 2026-10-18: Estado de stock replicado de Autollantas

* Estado: las etiquetas cambiaron en "Estado de stock: Sin stock solo en cero y variante
  Stock critico"; los umbrales siguen vigentes.

* Decision: `src/lib/stock.ts` decide el estado de un producto con la regla de Autollantas
  (`StockAlertsController.analizarProducto` y `InventoryService.getStockAlertBreakdown`),
  con los umbrales de su categoria (`yellowStockMin`, `redStockMin`):
  * stock menor o igual al umbral rojo: critico;
  * si no, stock menor o igual al umbral amarillo: bajo;
  * si no, normal.
  * Umbral nulo: amarillo 5 y rojo 2, los valores por defecto de Autollantas. Stock nulo
    cuenta como 0, como en la tabla de alertas de Autollantas.
  * En la interfaz, critico es la etiqueta "Sin stock", bajo es "Bajo stock" y normal es
    "Disponible". Ojo: un critico puede tener stock mayor que 0 si el umbral rojo lo es.
  * El panel lista los bajos y criticos de menor a mayor stock, hasta 5.
* Alternativas consideradas: una regla propia (por ejemplo, "Sin stock" solo con stock 0);
  pedir el estado al backend.
* Motivo: mismas alertas que ya conocen los usuarios de Autollantas, y el backend no
  expone el estado. No se replica el respaldo de Autollantas para un producto sin
  categoria conocida (usar la categoria "General" o la primera de la lista): en ServiBox la
  categoria es obligatoria y viene en la misma respuesta. Las categorias sembradas por el
  perfil dev tienen umbrales 0 y 0, asi que ahi solo el stock 0 es critico.

## 2026-10-18: Medio de pago segun el tipo de cuenta

* Estado: reemplazada por "Medio de pago con los valores del diccionario".

* Decision: el medio de pago que se muestra en ventas y compras se deriva del tipo de la
  cuenta: `EFECTIVO` es "Efectivo"; `BANCO` o `DIGITAL` es "Transferencia" o "Tarjeta"; una
  factura a credito sin cuenta deja el medio vacio.
* Alternativas consideradas: un campo propio de medio de pago en la factura.
* Motivo: el backend no guarda un medio de pago; lo que existe es la cuenta que recibe o
  entrega el dinero, con su tipo (ver Treasury en
  `servibox-backend/docs/ai-context/02-CONVENTIONS.md`). Derivarlo evita un dato que podria
  contradecir a la cuenta.

## 2026-10-18: IVA mostrado como total menos subtotal

* Decision: en las vistas de factura el IVA se muestra como `total - subtotal`, con la
  etiqueta "IVA".
* Alternativas consideradas: sumar el `ivaAmount` de las lineas en el cliente; mostrar
  `ivaPorPagar`.
* Motivo: `total` y `subtotal` vienen del backend y la diferencia es exactamente el IVA de
  la factura, sin recalcular nada en el cliente. `ivaPorPagar` es otro concepto (IVA
  generado menos descontable) y no debe rotularse como IVA.

## 2026-10-18: Paginacion y filtros en el cliente

* Decision: los listados se paginan y filtran en el navegador sobre la lista completa que
  devuelve el backend.
* Alternativas consideradas: paginacion y filtros en el servidor con parametros de
  consulta.
* Motivo: la API actual devuelve listas completas por tenant y el volumen de una serviteca
  es bajo. Si un listado crece, se pasa ese listado al servidor sin cambiar los demas.

## 2026-10-18: Clientes dentro de Ventas y Proveedores dentro de Compras

* Decision: el menu lateral tiene Inicio, Inventario, Ventas, Compras, Cuentas, Reportes y
  Configuracion. Clientes es una seccion de Ventas y Proveedores una de Compras; no hay
  item de Terceros.
* Alternativas consideradas: un item Terceros; items separados Clientes y Proveedores.
* Motivo: el usuario piensa en clientes cuando vende y en proveedores cuando compra. En el
  backend los dos son roles de un mismo tercero (`Counterparty`), pero esa unificacion es
  del modelo de datos, no de la navegacion.

## 2026-10-18: Tokens como unica fuente visual

* Decision: `src/styles/tokens.css` define los tokens del manual de estilos ServiBox v1.0
  en el bloque `@theme` de Tailwind y vacia las escalas por defecto de color, radio, sombra
  y puntos de corte. Los componentes nunca usan hexadecimales literales.
* Alternativas consideradas: la paleta por defecto de Tailwind con colores de marca
  agregados; constantes de color en TypeScript.
* Motivo: un solo lugar para cambiar la identidad visual, y una utilidad fuera del manual
  ni siquiera se genera. `color-action` separa el fondo del boton primario de la marca para
  poder ajustarlo sin tocar el resto.

## 2026-10-18: Token en sessionStorage

* Decision: el JWT se guarda en `sessionStorage`; el slug de la serviteca, que no es
  secreto, en `localStorage`.
* Alternativas consideradas: `localStorage`; cookie `HttpOnly` emitida por el backend;
  solo memoria.
* Motivo: `sessionStorage` se borra al cerrar la pestana, asi que una sesion olvidada en un
  equipo compartido del taller no queda abierta, y sobrevive a recargar la pagina, cosa que
  la memoria no. La cookie `HttpOnly` protege mejor ante XSS pero exige cambios en el
  backend (emitir la cookie, CSRF), que hoy entrega el token en el cuerpo. Sin refresh: al
  vencer `exp` se cierra la sesion.

## 2026-10-18: Proxy de Vite en desarrollo, sin CORS

* Decision: en desarrollo el navegador llama a `/api` en el mismo origen y el proxy de Vite
  lo reenvia al backend (`API_PROXY_TARGET`, por defecto `http://localhost:8080`). En
  produccion un proxy inverso sirve el frontend y el backend en el mismo origen. El backend
  no configura CORS.
* Alternativas consideradas: habilitar CORS en Spring Security para el origen del
  frontend.
* Motivo: con un solo origen no hay peticiones de origen cruzado, ni preflight, ni una
  lista de origenes que mantener por entorno. El frontend usa rutas relativas y no necesita
  conocer la URL del backend.
