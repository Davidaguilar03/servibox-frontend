# Log de decisiones tecnicas

Una entrada por decision, en orden cronologico inverso (la mas reciente arriba).

Formato de cada entrada:

```
## AAAA-MM-DD: Titulo corto de la decision

* Decision: que se decidio hacer.
* Alternativas consideradas: opciones que se evaluaron y se descartaron.
* Motivo: por que se eligio esta opcion sobre las demas.
```

## 2026-10-18: Rutas placeholder de Ventas

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
