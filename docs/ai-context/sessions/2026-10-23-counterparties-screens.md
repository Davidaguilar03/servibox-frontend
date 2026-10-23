# 2026-10-23: Pantallas de Clientes y Proveedores

Rama `feat/16-counterparties-screens`.

## Hecho

* `src/counterparties/`: `CounterpartiesPage` (indicadores, filtros en la URL, tabla y
  tarjetas, acciones Editar y Nueva factura), `counterpartyList.ts` (saldo por tercero,
  indicadores, filtros, orden, Consumidor final), `counterpartyForm.ts` (validacion y cuerpos
  del POST y del PUT), `counterpartiesApi.ts` (PUT y consultas de saldo).
* `NewCounterpartyModal` con modo edicion y aviso de descartar opcional; las facturas lo
  usan como antes.
* `CustomersPage` (`/ventas/clientes`) y `SuppliersPage` (`/compras/proveedores`); botones
  Clientes y Proveedores en los encabezados de Facturas de venta y de compra.
* Nueva factura de venta y de compra leen `?cliente=` y `?proveedor=`.
* Pruebas: 487 a 534. Ninguna prueba existente cambio.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md).

## Contrato verificado en el backend

* `GET /api/counterparties?role=CLIENTE|PROVEEDOR`: ese rol mas AMBOS, por nombre; con
  CLIENTE (o sin rol) asegura antes el Consumidor final. `role=AMBOS` es 400.
* `POST`: 201 si el documento es nuevo; 200 con el tercero existente (ya AMBOS, nombre y tipo
  de documento conservados, correo y celular solo si estaban vacios) si tenia el otro rol;
  409 "Ya existe un tercero con el documento N como ROL" si ya tiene ese rol o AMBOS. Un
  campo invalido por `@Valid` es 400 "Peticion invalida"; `role=AMBOS` es 400. No recorta ni
  valida el formato del correo.
* `PUT /{id}`: recorta, correo y celular en blanco a null; 400 con mensajes por campo, 409
  "Ya existe un tercero con el documento N", 409 del Consumidor final, 404 "Tercero no
  encontrado: id".

## Prueba real

Backend dev (H2, datos de demostracion) en 8080 y Vite en 5173, con la extension de Chrome.
Se agregaron por la API ventas a credito (una anulada), compras a credito (una pagada
completa y una anulada).

* Saldos de la API (suma de `pendingBalance` de las PENDIENTE): Transportes Andinos
  91.860 (2), Laura Gomez 119.000 (1), Lubricantes del Valle 238.000 (2). La pantalla mostro
  lo mismo; Total por cobrar 210.860 y Total por pagar 238.000, iguales a Por cobrar y Por
  pagar de los listados de facturas.
* Crear cliente con correo invalido (error bajo el campo), luego valido: toast y documento
  recortado. Crear proveedor: 201. Proveedor con el documento de un cliente: 200, toast de
  promocion y etiqueta Cliente y proveedor. Cliente con el documento del proveedor: igual.
* Editar nombre, correo y celular de Laura Gomez: toast y la factura FV-0006 muestra los
  datos nuevos.
* Documento repetido: 409 bajo el campo. 222222222222: bloqueado en el cliente.
* Consumidor final con Sistema y sin Editar. Nueva factura desde la fila abre venta y compra
  con el tercero elegido; un id de otro rol se ignora.
* Busqueda sin tildes, filtro de saldo y orden en la URL. A 390 px los botones de los
  encabezados bajan de linea y la tabla pasa a tarjetas sin desplazamiento horizontal.
* Tenant recien registrado: las dos pantallas en estado vacio.

## Hallazgo corregido en la prueba

El selector de tipo de documento cortaba "Cedula de ciudadania" junto al numero; ahora van
uno debajo del otro.
